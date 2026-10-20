// udhr-core/ablation-context.mjs — does the NEIGHBOURING WORDS' evidence make the sniff stronger? Usage: node ablation-context.mjs <lang> <treebank> <word-regex>
// Adds two features to the combined sniff (ablation delta + word ending): the smoothed log-odds of "nominal" given the PREVIOUS word, and given the NEXT word
// (lower-cased forms, "<s>" / "</s>" at the edges), learned on the training occurrences. Same data, split (seed 91, word-disjoint 70/30, 3200 / 800 per
// class), out-of-fold weight fitting and bootstrap as ablation-suffix.mjs / build-sniff-lang.mjs, so the baseline is the SAME combined classifier.
//
// PRE-REGISTERED before the first run (2026-10-19), for each of English (UD English-EWT) and Spanish (UD Spanish-GSD):
//   M1  the classifier WITH context beats the one WITHOUT in at least 190 of 200 paired bootstrap resamples of the test occurrences.
//   M2  its calibration holds: top-third accuracy minus bottom-third exceeds the MAXIMUM over 200 margin shuffles.
//   M3  reported, not claimed: accuracy with and without, and accepted accuracy / coverage at the out-of-fold threshold (>= 0.90 above it, >= 100 items).
//   Caution recorded in advance: the neighbour words are words of the TREEBANK domain; a context table learned there may not transfer to other text, and a
//   high score on the test split does not say it will. Transfer is not tested here.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { suffixCounts, suffixLogOdds, centroidsOf, deltaMargin, norm } from "./sniff.mjs";

const [lang, tb, wordRe] = process.argv.slice(2); if (!wordRe) throw new Error("usage: node ablation-context.mjs <lang> <treebank> <word-regex>");
const WORD = new RegExp(wordRe, "u"), OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___";
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const rnd = mulberry(91);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const sentences = []; let cur = null;
for (const line of readFileSync(new URL(tb, import.meta.url), "utf8").split("\n")) {
  if (!line.trim()) { if (cur?.length) sentences.push(cur); cur = null; continue; }
  if (line.startsWith("#")) continue; cur ??= [];
  const c = line.split("\t"); if (/^\d+$/.test(c[0])) cur.push({ form: c[1], upos: c[3] });
}
const byWord = new Map();
for (const s of sentences) {
  if (s.length < 6 || s.length > 40) continue;
  const forms = s.map((t) => t.form);
  s.forEach((t, idx) => {
    if (!WORD.test(t.form)) return;
    const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return;
    const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form, prev: (forms[idx - 1] ?? "<s>").toLowerCase(), next: (forms[idx + 1] ?? "</s>").toLowerCase() }); byWord.set(t.form, k); }
  });
}
const words = shuffle([...byWord.keys()].sort(), rnd), units = (ws) => ws.flatMap((w) => byWord.get(w));
const take = (pool, per) => { const out = { nominal: [], other: [] }; for (const u of pool) if (out[u.truth].length < per) out[u.truth].push(u); return out; };
const cut = Math.floor(words.length * 0.7), TR = take(units(words.slice(0, cut)), 3200), TE = take(units(words.slice(cut)), 800);
async function deltas(us) { const A = (await embed(us.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(us.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm); return A.map((x, i) => norm(x.map((v, j) => v - B[i][j]))); }
const withD = async (us) => { const d = await deltas(us); return us.map((u, i) => ({ ...u, d: d[i] })); };
const train = [...(await withD(TR.nominal)), ...(await withD(TR.other))], test = [...(await withD(TE.nominal)), ...(await withD(TE.other))];

function ctxTable(xs, key) { const t = new Map(); for (const x of xs) { const c = t.get(x[key]) ?? [0, 0]; c[x.truth === "nominal" ? 0 : 1]++; t.set(x[key], c); } const nN = xs.filter((x) => x.truth === "nominal").length, prior = Math.log(nN / (xs.length - nN)); return (w) => { const c = t.get(w); return c ? Math.log((c[0] + 1) / (c[1] + 1)) - prior : 0; }; }
const feats = (xs, from) => { const c = centroidsOf(from), s = suffixCounts(from), p = ctxTable(from, "prev"), n = ctxTable(from, "next"); return xs.map((x) => [deltaMargin(x.d, c), suffixLogOdds(s, x.word), p(x.prev), n(x.next), 1]); };
function fit(X, y, cols, iters = 800, lr = 0.5) { let w = new Array(cols.length).fill(0); for (let it = 0; it < iters; it++) { const g = new Array(cols.length).fill(0); X.forEach((x, i) => { let z = 0; cols.forEach((c, k) => (z += w[k] * x[c])); const p = 1 / (1 + Math.exp(-z)); cols.forEach((c, k) => (g[k] += (p - y[i]) * x[c])); }); w = w.map((v, k) => v - (lr * g[k]) / X.length); } return w; }
const trW = shuffle([...new Set(train.map((x) => x.word))].sort(), rnd), half = new Set(trW.slice(0, trW.length >> 1));
const A = train.filter((x) => half.has(x.word)), B = train.filter((x) => !half.has(x.word)), oofRows = [...A, ...B];
const oofX = [...feats(A, B), ...feats(B, A)], oofY = oofRows.map((x) => (x.truth === "nominal" ? 1 : 0));
const WITHOUT = [0, 1, 4], WITH = [0, 1, 2, 3, 4], wo = fit(oofX, oofY, WITHOUT), wi = fit(oofX, oofY, WITH);
const testX = feats(test, train), z = (x, cols, w) => cols.reduce((s, c, k) => s + w[k] * x[c], 0);
const T = test.map((x, i) => { const a = z(testX[i], WITHOUT, wo), b = z(testX[i], WITH, wi); return { truth: x.truth, base: a >= 0 ? "nominal" : "other", ctx: b >= 0 ? "nominal" : "other", cs: Math.abs(b) }; });
const accOf = (xs, k) => xs.filter((x) => x[k] === x.truth).length / xs.length;
const boots = Array.from({ length: 200 }, () => { const s = Array.from({ length: T.length }, () => T[Math.floor(rnd() * T.length)]); return { base: accOf(s, "base"), ctx: accOf(s, "ctx") }; });
const wins = boots.filter((r) => r.ctx > r.base).length;
const byS = [...T].sort((a, b) => a.cs - b.cs), third = Math.floor(T.length / 3), gap = (xs) => accOf(xs.slice(-third), "ctx") - accOf(xs.slice(0, third), "ctx");
const nulls = Array.from({ length: 200 }, () => { const sc = shuffle(T.map((x) => x.cs), rnd); return gap(T.map((x, i) => ({ ...x, cs: sc[i] })).sort((a, b) => a.cs - b.cs)); });
const oofS = oofX.map((x, i) => ({ s: z(x, WITH, wi), truth: oofRows[i].truth })).sort((a, b) => Math.abs(b.s) - Math.abs(a.s));
let hit = 0, thr = null; oofS.forEach((r, i) => { if ((r.s >= 0 ? "nominal" : "other") === r.truth) hit++; if (hit / (i + 1) >= 0.9 && i >= 99) thr = Math.abs(r.s); });
const above = thr == null ? [] : T.filter((x) => x.cs >= thr);
const out = { lang, accuracy: { withoutContext: +accOf(T, "base").toFixed(3), withContext: +accOf(T, "ctx").toFixed(3) }, weightsWith: wi.map((v) => +v.toFixed(3)), M1: { wins: `${wins}/200`, holds: wins >= 190 }, M2: { top: +accOf(byS.slice(-third), "ctx").toFixed(3), bottom: +accOf(byS.slice(0, third), "ctx").toFixed(3), gap: +gap(byS).toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), holds: gap(byS) > Math.max(...nulls) }, M3: { threshold: thr == null ? null : +thr.toFixed(3), acceptedAccuracy: above.length ? +accOf(above, "ctx").toFixed(3) : null, coverage: +(above.length / T.length).toFixed(3) } };
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL(`./ablation-context-${lang}-report.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
