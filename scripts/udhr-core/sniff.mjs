// udhr-core/sniff.mjs — a part-of-speech SNIFF for words the language's prior does not know: nominal vs other, with a calibrated confidence.
//
// Evidence: the ablation delta of one real sentence (khora ablation-grain-pressure.js: embed(sentence) - embed(sentence with the word masked)) scored
// against two class centroids, combined with the word's ending (smoothed log-odds of its last 3/2/1 letters) by a two-feature logistic. Both parts are
// learned from a human-annotated treebank (build-sniff.mjs); the model is a small JSON file with its provenance.
//
// STANDING RULES (the user's, 2026-09-23, kept):
//   - A sniff is a REVISABLE PRESSURE, never a verdict. It is called only for a word the prior does not know (`isUnknownWord`); a word the prior knows is
//     refused with a typed error, never second-guessed.
//   - Its answer carries `source: "sniff"` so a log record can tell it from a settled lookup. A lookup, when it lands, replaces it.
//   - `accept` is true only above the threshold at which out-of-fold accuracy was >= 0.90 on the training data; below it the word stays a need.
//   - POS is language- and period-specific: this model is English, 2010s web text; it carries that in `provenance` and is not applied to other languages.
// The embedder is injected (`embed(texts) -> vectors`), so this file does no I/O.
import { isUnknownWord } from "./read-beings.mjs";

const MASK = "___";
export const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
export const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
export const meanVec = (vs) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);

/** counts of nominal/other by suffix length, as a plain object so it serialises; returns log-odds scorer */
export function suffixCounts(xs) {
  const t = { 1: {}, 2: {}, 3: {} };
  for (const x of xs) for (const k of [1, 2, 3]) { const s = x.word.slice(-k); (t[k][s] ??= [0, 0])[x.truth === "nominal" ? 0 : 1]++; }
  const nN = xs.filter((x) => x.truth === "nominal").length;
  return { t, prior: Math.log(nN / (xs.length - nN)) };
}
export function suffixLogOdds({ t, prior }, word) {
  let lo = 0;
  for (const k of [1, 2, 3]) { const c = t[k][word.slice(-k)]; if (c) lo = Math.log((c[0] + 1) / (c[1] + 1)) - prior; }      // the longest suffix seen wins; shorter ones are the backoff
  return lo;
}
export const centroidsOf = (xs) => ({ nominal: norm(meanVec(xs.filter((x) => x.truth === "nominal").map((x) => x.d))), other: norm(meanVec(xs.filter((x) => x.truth === "other").map((x) => x.d))) });
export const deltaMargin = (d, c) => (cos(d, c.nominal) - cos(d, c.other)) * 20;

export function fitLogistic(X, y, iters = 800, lr = 0.5) {
  let w = [0, 0, 0];
  for (let it = 0; it < iters; it++) { const g = [0, 0, 0]; X.forEach((x, i) => { const p = 1 / (1 + Math.exp(-(w[0] * x[0] + w[1] * x[1] + w[2] * x[2]))); for (let k = 0; k < 3; k++) g[k] += (p - y[i]) * x[k]; }); w = w.map((v, k) => v - (lr * g[k]) / X.length); }
  return w;
}
/** v2: log-odds of "nominal" given the PREVIOUS / NEXT word (lower-cased; "<s>" / "</s>" at the edges), smoothed, from training occurrences. Plain objects so they serialise. */
export function ctxCounts(xs, key) {
  const t = {}; for (const x of xs) (t[x[key]] ??= [0, 0])[x.truth === "nominal" ? 0 : 1]++;
  const nN = xs.filter((x) => x.truth === "nominal").length; return { t, prior: Math.log(nN / (xs.length - nN)) };
}
export const ctxLogOdds = ({ t, prior }, w) => { const c = t[w]; return c ? Math.log((c[0] + 1) / (c[1] + 1)) - prior : 0; };
/** the words either side of `word` in `sentence` (first whole-token match, case-insensitive) */
export function neighbours(sentence, word) {
  const toks = (sentence.match(/\p{L}+(?:['’]\p{L}+)?/gu) ?? []).map((t) => t.toLowerCase()), i = toks.indexOf(word.toLowerCase());
  return { prev: i > 0 ? toks[i - 1] : "<s>", next: i >= 0 && i + 1 < toks.length ? toks[i + 1] : "</s>" };
}
export const score2 = (model, d, word, prev, next) => model.weights[0] * deltaMargin(d, model.centroids) + model.weights[1] * suffixLogOdds(model.suffix, word) + model.weights[2] * ctxLogOdds(model.ctx.prev, prev) + model.weights[3] * ctxLogOdds(model.ctx.next, next) + model.weights[4];
export const score = (model, d, word) => model.weights[0] * deltaMargin(d, model.centroids) + model.weights[1] * suffixLogOdds(model.suffix, word) + model.weights[2];

/** The delta of one sentence for one word, from the injected embedder. */
export async function deltaOf(embed, sentence, word) {
  const masked = sentence.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), MASK);
  if (masked === sentence) throw new Error(`sniff: "${word}" does not occur in the sentence`);
  const [a, b] = (await embed([sentence, masked])).map(norm);
  return norm(a.map((v, j) => v - b[j]));
}

/**
 * sniff(model, posPrior, word, sentence, embed) -> { word, cls, score, accept, source: "sniff", revisable: true }
 * Throws if the prior already knows the word: a settled word is never second-guessed.
 */
export async function sniff(model, posPrior, word, sentence, embed) {
  if (!isUnknownWord(posPrior, word)) throw new Error(`sniff: the prior already knows "${word}"`);
  const d = await deltaOf(embed, sentence, word), nb = neighbours(sentence, word);
  const s = model.ctx ? score2(model, d, word, nb.prev, nb.next) : score(model, d, word);
  return Object.freeze({ word, cls: s >= 0 ? "nominal" : "other", score: +s.toFixed(4), accept: Math.abs(s) >= model.threshold, source: "sniff", revisable: true });
}
