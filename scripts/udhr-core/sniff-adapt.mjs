// udhr-core/sniff-adapt.mjs — how much labelled creole text closes the gap? Adapt the English sniff to Singlish and test on Singlish's own TEST file.
//
// sniff-creole.mjs showed the frozen English Sniff@2 reaching 78.0% on Singlish (all three files) with calibration intact, but its English accept threshold
// (0.518) gave only 83.3% accepted accuracy. Here Singlish train_sample + dev are the ONLY adaptation data; test.conll is touched once, at the end.
// Methods (centroids always the English ones: the delta space is not re-learned):
//   A0  frozen English Sniff@2, English weights and threshold.
//   A1  RECALIBRATE: re-fit only the 5 weights and the accept threshold on Singlish train+dev, English tables unchanged.
//   A3  ADAPT: add the Singlish counts to the English suffix / previous-word / next-word tables, then re-fit weights and threshold.
// All Singlish-trained quantities use out-of-fold features (two folds by WORD) so nothing is scored on counts that contain it; the accept threshold is the
// loosest cut whose out-of-fold training accuracy above it is >= 0.90 (>= 100 items).
//
// PRE-REGISTERED before the first run (2026-10-20); bootstrap = 200 paired resamples of the test occurrences:
//   G1  A3 beats A0 in at least 190 of 200 resamples.        G2  A1 beats A0 in at least 190 of 200 resamples (is recalibration alone enough?).
//   G3  accepted accuracy of A3 at its own threshold is at least 0.85 on the test file (the K4 bar that the frozen English threshold missed); coverage reported.
//   G4  reported: a learning curve of A1 and A3 test accuracy for N = 100, 200, 400, 800 and all Singlish adaptation occurrences (10 random subsets each).
//   Cautions: Singlish train_sample is a SAMPLE of the original training set; one creole, one register (online text); words ARE disjoint between folds but the
//   same sentences' other words can recur across train and test through the treebank's shared topics.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { suffixLogOdds, deltaMargin, ctxLogOdds, norm } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___", WORD = /^[a-z]{3,}$/;
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const M = JSON.parse(readFileSync(new URL("./sniff-eng2.json", import.meta.url), "utf8")), rnd = mulberry(8);
const DIR = new URL("../Zenodotus/11-multi-language/dialects-pidgins-creoles/creoleval/pos_singlish/", import.meta.url).pathname;
function load(file) {
  const sentences = []; let cur = null;
  for (const line of readFileSync(DIR + file, "utf8").split("\n")) { if (!line.trim()) { if (cur?.length) sentences.push(cur); cur = null; continue; } if (line.startsWith("#")) continue; cur ??= []; const c = line.split("\t"); if (/^\d+$/.test(c[0])) cur.push({ form: c[1], upos: c[3] }); }
  if (cur?.length) sentences.push(cur);
  const byWord = new Map();
  for (const s of sentences) { if (s.length < 6 || s.length > 40) continue; const forms = s.map((t) => t.form); s.forEach((t, idx) => { if (!WORD.test(t.form)) return; const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return; const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form, prev: (forms[idx - 1] ?? "<s>").toLowerCase(), next: (forms[idx + 1] ?? "</s>").toLowerCase() }); byWord.set(t.form, k); } }); }
  return [...byWord.values()].flat();
}
async function withDelta(occ) { const A = (await embed(occ.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(occ.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm); return occ.map((u, i) => ({ ...u, d: norm(A[i].map((v, j) => v - B[i][j])) })); }
const adapt = [...load("train_sample.conll"), ...load("dev.conll")], testOcc = load("test.conll");
const adaptD = await withDelta(adapt), testD = await withDelta(testOcc);
console.log(JSON.stringify({ adaptationOccurrences: adaptD.length, nominalShare: +(adaptD.filter((x) => x.truth === "nominal").length / adaptD.length).toFixed(3), testOccurrences: testD.length }));

// tables: English counts (+ optional Singlish counts)
function counts(xs, key) { const t = {}; for (const x of xs) (t[key === "word" ? x.word.slice(-3) : x[key]] ??= [0, 0])[x.truth === "nominal" ? 0 : 1]++; return t; }
const sufT = (xs) => { const t = { 1: {}, 2: {}, 3: {} }; for (const x of xs) for (const k of [1, 2, 3]) (t[k][x.word.slice(-k)] ??= [0, 0])[x.truth === "nominal" ? 0 : 1]++; return t; };
const mergeFlat = (a, b) => { const o = {}; for (const [k, v] of Object.entries(a)) o[k] = v.slice(); for (const [k, v] of Object.entries(b)) { o[k] ??= [0, 0]; o[k][0] += v[0]; o[k][1] += v[1]; } return o; };
const mergeSuf = (a, b) => ({ 1: mergeFlat(a[1], b[1]), 2: mergeFlat(a[2], b[2]), 3: mergeFlat(a[3], b[3]) });
const tabs = (xs, useSg) => {
  const nn = xs.filter((x) => x.truth === "nominal").length, base = { nom: 3200, oth: 3200 };       // the English training set was balanced 3200 / 3200
  const prior = Math.log((base.nom + (useSg ? nn : 0)) / (base.oth + (useSg ? xs.length - nn : 0)));
  return { suffix: { t: useSg ? mergeSuf(M.suffix.t, sufT(xs)) : M.suffix.t, prior: useSg ? prior : M.suffix.prior }, prev: { t: useSg ? mergeFlat(M.ctx.prev.t, counts(xs, "prev")) : M.ctx.prev.t, prior: useSg ? prior : M.ctx.prev.prior }, next: { t: useSg ? mergeFlat(M.ctx.next.t, counts(xs, "next")) : M.ctx.next.t, prior: useSg ? prior : M.ctx.next.prior } };
};
const feats = (xs, T) => xs.map((x) => [deltaMargin(x.d, M.centroids), suffixLogOdds(T.suffix, x.word), ctxLogOdds(T.prev, x.prev), ctxLogOdds(T.next, x.next), 1]);
function fit(X, y, iters = 800, lr = 0.5) { let w = [0, 0, 0, 0, 0]; for (let it = 0; it < iters; it++) { const g = [0, 0, 0, 0, 0]; X.forEach((x, i) => { let z = 0; for (let k = 0; k < 5; k++) z += w[k] * x[k]; const p = 1 / (1 + Math.exp(-z)); for (let k = 0; k < 5; k++) g[k] += (p - y[i]) * x[k]; }); w = w.map((v, k) => v - (lr * g[k]) / X.length); } return w; }
const dot = (w, x) => w.reduce((s, v, k) => s + v * x[k], 0);
function build(xs, useSg) {                                // returns { weights, threshold, tables } using out-of-fold features within xs
  const words = shuffle([...new Set(xs.map((x) => x.word))].sort(), mulberry(3)), half = new Set(words.slice(0, words.length >> 1));
  const A = xs.filter((x) => half.has(x.word)), B = xs.filter((x) => !half.has(x.word));
  const X = [...feats(A, tabs(B, useSg)), ...feats(B, tabs(A, useSg))], rows = [...A, ...B], y = rows.map((r) => (r.truth === "nominal" ? 1 : 0)), w = fit(X, y);
  const oof = X.map((x, i) => ({ s: dot(w, x), truth: rows[i].truth })).sort((a, b) => Math.abs(b.s) - Math.abs(a.s)); let hit = 0, thr = null;
  oof.forEach((r, i) => { if ((r.s >= 0 ? "nominal" : "other") === r.truth) hit++; if (hit / (i + 1) >= 0.9 && i >= 99) thr = Math.abs(r.s); });
  return { weights: w, threshold: thr, tables: tabs(xs, useSg) };
}
const run = (model, xs) => { const X = feats(xs, model.tables); return xs.map((x, i) => { const s = dot(model.weights, X[i]); return { truth: x.truth, cls: s >= 0 ? "nominal" : "other", cs: Math.abs(s) }; }); };
const acc = (rs) => rs.filter((r) => r.cls === r.truth).length / rs.length;
const A0 = { weights: M.weights, threshold: M.threshold, tables: tabs([], false) }, A1 = build(adaptD, false), A3 = build(adaptD, true);
const r0 = run(A0, testD), r1 = run(A1, testD), r3 = run(A3, testD);
const boots = Array.from({ length: 200 }, () => { const idx = Array.from({ length: testD.length }, () => Math.floor(rnd() * testD.length)); const pick = (rs) => acc(idx.map((i) => rs[i])); return { a0: pick(r0), a1: pick(r1), a3: pick(r3) }; });
const wins = (a, b) => boots.filter((r) => r[a] > r[b]).length, above = A3.threshold == null ? [] : r3.filter((r) => r.cs >= A3.threshold), above1 = A1.threshold == null ? [] : r1.filter((r) => r.cs >= A1.threshold);
const curve = [100, 200, 400, 800, adaptD.length].map((n) => { const a1 = [], a3 = []; for (let k = 0; k < 10; k++) { const sub = n >= adaptD.length ? adaptD : shuffle(adaptD, rnd).slice(0, n); a1.push(acc(run(build(sub, false), testD))); a3.push(acc(run(build(sub, true), testD))); } const mean = (v) => +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(3); return { n, A1: mean(a1), A3: mean(a3) }; });
const out = {
  accuracy: { A0_frozenEnglish: +acc(r0).toFixed(3), A1_recalibrated: +acc(r1).toFixed(3), A3_adapted: +acc(r3).toFixed(3) },
  G1: { wins: `${wins("a3", "a0")}/200`, holds: wins("a3", "a0") >= 190 }, G2: { wins: `${wins("a1", "a0")}/200`, holds: wins("a1", "a0") >= 190 },
  G3: { threshold: A3.threshold == null ? null : +A3.threshold.toFixed(3), acceptedAccuracy: above.length ? +acc(above).toFixed(3) : null, coverage: +(above.length / r3.length).toFixed(3), holds: above.length > 0 && acc(above) >= 0.85, A1: { threshold: A1.threshold == null ? null : +A1.threshold.toFixed(3), acceptedAccuracy: above1.length ? +acc(above1).toFixed(3) : null, coverage: +(above1.length / r1.length).toFixed(3) } },
  G4_learningCurve: curve, weights: { A0: M.weights.map((v) => +v.toFixed(2)), A1: A1.weights.map((v) => +v.toFixed(2)), A3: A3.weights.map((v) => +v.toFixed(2)) },
};
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./sniff-adapt-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
