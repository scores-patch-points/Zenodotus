// udhr-core/ablation-suffix.mjs — the embedding ABLATION proper: what does the ablation delta add beyond spelling, and what does spelling add to the delta?
//
// Same units as ablation-treebank.mjs (same seeded word split, same 3200/800 occurrences per class from UD English-EWT, same local nomic-embed-text deltas).
// Three classifiers, all binary nominal vs other:
//   D  delta only       signed cosine margin to the two class centroids (what T1 measured: 0.748)
//   S  spelling only    log-odds of the word's last-3-character suffix (backing off to 2 and 1), smoothed, learned on training occurrences
//   C  combined         logistic regression on [delta margin, spelling log-odds, bias]
// To avoid scoring on anything fitted on test data, the training occurrences are split into two folds by WORD; D's margin and S's table for fold A come
// from fold B and vice versa; C's weights are fitted on those out-of-fold features. Test features come from the full-train centroids and suffix table.
//
// PRE-REGISTERED before the first run (2026-10-19); bootstrap = 200 resamples of the test occurrences (with replacement), paired across classifiers:
//   U1  C beats D: accuracy(C) > accuracy(D) in at least 190 of 200 resamples.
//   U2  C beats S: accuracy(C) > accuracy(S) in at least 190 of 200 resamples. (If this fails the embedding adds nothing to spelling, and we say so.)
//   U3  D beats S: accuracy(D) > accuracy(S) in at least 190 of 200 resamples. Reported either way: it is the plain answer to "is the delta better than
//       reading the ending?".
//   U4  C is calibrated: top-margin-third accuracy minus bottom-third exceeds the MAXIMUM over 200 draws that shuffle |C score| across test occurrences.
//   U5  On the 17 pure-verdict words from ablation-rank-report.json whose D vote was wrong (the -ed and -ly nominal votes), C's vote is reported; not claimed.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___";
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const rnd = mulberry(91);                           // SAME seed and call order as ablation-treebank.mjs: the word split is identical
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
const meanVec = (vs) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);

const sentences = []; let cur = null;
for (const line of readFileSync(new URL("./data-ud-ewt/en_ewt-ud-train.conllu", import.meta.url), "utf8").split("\n")) {
  if (!line.trim()) { if (cur?.length) sentences.push(cur); cur = null; continue; }
  if (line.startsWith("#")) continue; cur ??= [];
  const c = line.split("\t"); if (/^\d+$/.test(c[0])) cur.push({ form: c[1], upos: c[3] });
}
const byWord = new Map();
for (const s of sentences) {
  if (s.length < 6 || s.length > 40) continue;
  const forms = s.map((t) => t.form);
  s.forEach((t, idx) => {
    if (!/^[a-z]{3,}$/.test(t.form)) return;
    const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return;
    const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form }); byWord.set(t.form, k); }
  });
}
const words = shuffle([...byWord.keys()].sort(), rnd), units = (ws) => ws.flatMap((w) => byWord.get(w));
const take = (pool, per) => { const out = { nominal: [], other: [] }; for (const u of pool) if (out[u.truth].length < per) out[u.truth].push(u); return out; };
const cut = Math.floor(words.length * 0.7), TR = take(units(words.slice(0, cut)), 3200), TE = take(units(words.slice(cut)), 800);
async function deltas(us) {
  const A = (await embed(us.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(us.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm);
  return A.map((x, i) => norm(x.map((v, j) => v - B[i][j])));
}
const train = [], test = [];
for (const [cls, us] of [["nominal", TR.nominal], ["other", TR.other]]) { const d = await deltas(us); us.forEach((u, i) => train.push({ ...u, d: d[i] })); }
for (const [cls, us] of [["nominal", TE.nominal], ["other", TE.other]]) { const d = await deltas(us); us.forEach((u, i) => test.push({ ...u, d: d[i] })); }
console.log(JSON.stringify({ train: train.length, test: test.length }));

// ---- classifiers ----------------------------------------------------------------------------------------------------------------------------
const centroids = (xs) => [norm(meanVec(xs.filter((x) => x.truth === "nominal").map((x) => x.d))), norm(meanVec(xs.filter((x) => x.truth === "other").map((x) => x.d)))];
const margin = (d, [cN, cO]) => cos(d, cN) - cos(d, cO);                   // signed: > 0 votes nominal
function suffixTable(xs) {
  const t = { 1: new Map(), 2: new Map(), 3: new Map() };
  for (const x of xs) for (const k of [1, 2, 3]) { const s = x.word.slice(-k), c = t[k].get(s) ?? [0, 0]; c[x.truth === "nominal" ? 0 : 1]++; t[k].set(s, c); }
  const nN = xs.filter((x) => x.truth === "nominal").length, nO = xs.length - nN, prior = Math.log(nN / nO);
  return (w) => { let lo = 0; for (const k of [1, 2, 3]) { const c = t[k].get(w.slice(-k)); if (c) lo = Math.log((c[0] + 1) / (c[1] + 1)) - prior + 0 * lo; } return lo; };       // the longest suffix seen wins; backs off to shorter ones
}
// out-of-fold features for the training set
const trW = shuffle([...new Set(train.map((x) => x.word))].sort(), rnd), half = new Set(trW.slice(0, trW.length >> 1));
const foldA = train.filter((x) => half.has(x.word)), foldB = train.filter((x) => !half.has(x.word));
const feat = (xs, from) => { const cs = centroids(from), sf = suffixTable(from); return xs.map((x) => [margin(x.d, cs) * 20, sf(x.word), 1]); };
const oofX = [...feat(foldA, foldB), ...feat(foldB, foldA)], oofY = [...foldA, ...foldB].map((x) => (x.truth === "nominal" ? 1 : 0));
let w = [0, 0, 0];
for (let it = 0; it < 800; it++) { const g = [0, 0, 0]; oofX.forEach((x, i) => { const p = 1 / (1 + Math.exp(-(w[0] * x[0] + w[1] * x[1] + w[2] * x[2]))); for (let k = 0; k < 3; k++) g[k] += (p - oofY[i]) * x[k]; }); w = w.map((v, k) => v - (0.5 * g[k]) / oofX.length); }
const csFull = centroids(train), sfFull = suffixTable(train);
const row = (x) => ({ D: margin(x.d, csFull), S: sfFull(x.word), C: w[0] * margin(x.d, csFull) * 20 + w[1] * sfFull(x.word) + w[2] });
const T = test.map((x) => { const r = row(x); return { truth: x.truth, word: x.word, D: r.D >= 0 ? "nominal" : "other", S: r.S >= 0 ? "nominal" : "other", C: r.C >= 0 ? "nominal" : "other", cScore: Math.abs(r.C) }; });
const accOf = (xs, k) => xs.filter((x) => x[k] === x.truth).length / xs.length;
const boots = Array.from({ length: 200 }, () => { const s = Array.from({ length: T.length }, () => T[Math.floor(rnd() * T.length)]); return { D: accOf(s, "D"), S: accOf(s, "S"), C: accOf(s, "C") }; });
const wins = (a, b) => boots.filter((r) => r[a] > r[b]).length;
const byScore = [...T].sort((a, b) => a.cScore - b.cScore), third = Math.floor(T.length / 3), gap = (xs) => accOf(xs.slice(-third), "C") - accOf(xs.slice(0, third), "C");
const u4null = Array.from({ length: 200 }, () => { const sc = shuffle(T.map((x) => x.cScore), rnd); return gap(T.map((x, i) => ({ ...x, cScore: sc[i] })).sort((a, b) => a.cScore - b.cScore)); });

// U5: the earlier spot-check words D got wrong
let u5 = null;
try {
  const rep = JSON.parse(readFileSync(new URL("./ablation-rank-report.json", import.meta.url)));
  const wrong = rep.results.filter((r) => (r.truth === "nominal" || r.truth === "other") && r.cls !== r.truth);
  const ds = await deltas(wrong.map((r) => ({ forms: [r.word], idx: 0 })).map((u, i) => { return { forms: ["He said that the " + wrong[i].word + " was there ."], idx: 4 }; }));
  u5 = wrong.map((r, i) => { const m = margin(ds[i], csFull) * 20, c = w[0] * m + w[1] * sfFull(r.word) + w[2]; return { word: r.word, truth: r.truth, deltaVote: r.cls, combinedVote: c >= 0 ? "nominal" : "other" }; });
} catch {}

const out = {
  accuracy: { delta: +accOf(T, "D").toFixed(3), spelling: +accOf(T, "S").toFixed(3), combined: +accOf(T, "C").toFixed(3) },
  weights: { margin: +w[0].toFixed(3), spelling: +w[1].toFixed(3), bias: +w[2].toFixed(3) },
  U1_combinedBeatsDelta: { wins: `${wins("C", "D")}/200`, holds: wins("C", "D") >= 190 },
  U2_combinedBeatsSpelling: { wins: `${wins("C", "S")}/200`, holds: wins("C", "S") >= 190 },
  U3_deltaBeatsSpelling: { wins: `${wins("D", "S")}/200`, holds: wins("D", "S") >= 190 },
  U4_calibration: { topThird: +accOf(byScore.slice(-third), "C").toFixed(3), bottomThird: +accOf(byScore.slice(0, third), "C").toFixed(3), gap: +gap(byScore).toFixed(3), nullMax: +Math.max(...u4null).toFixed(3), holds: gap(byScore) > Math.max(...u4null) },
  U5_earlierDeltaMisses: u5,
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ablation-suffix-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
