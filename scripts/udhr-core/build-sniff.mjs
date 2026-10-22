// udhr-core/build-sniff.mjs — fit and save the English sniff (sniff-eng.json) from UD English-EWT (CC BY-SA 4.0), then check it on held-out words.
//
// Same data and split as ablation-suffix.mjs (seed 91; 3200 / 800 occurrences per class; words disjoint between train and test).
// The ACCEPT THRESHOLD is set from OUT-OF-FOLD TRAINING scores only: the smallest |score| such that, among training occurrences at or above it, the
// out-of-fold accuracy is >= 0.90. The test split is then used once, to measure that threshold.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   V1  On the test split, accuracy among occurrences with |score| >= threshold is at least 0.88 (0.02 slack for the shift from train to test).
//   V2  Coverage (the share of test occurrences at or above the threshold) is reported, not claimed. If it is under 0.15 the threshold is too strict to
//       save lookups and the sniff is useful only as an ordering.
//   V3  The model file round-trips: reloading it from JSON reproduces every test vote exactly.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { suffixCounts, suffixLogOdds, centroidsOf, deltaMargin, fitLogistic, score, norm } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___";
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const rnd = mulberry(91);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };

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
const withD = async (us) => { const d = await deltas(us); return us.map((u, i) => ({ ...u, d: d[i] })); };
const train = [...(await withD(TR.nominal)), ...(await withD(TR.other))], test = [...(await withD(TE.nominal)), ...(await withD(TE.other))];

// out-of-fold features -> weights and threshold
const trW = shuffle([...new Set(train.map((x) => x.word))].sort(), rnd), half = new Set(trW.slice(0, trW.length >> 1));
const A = train.filter((x) => half.has(x.word)), B = train.filter((x) => !half.has(x.word));
const feats = (xs, from) => { const c = centroidsOf(from), s = suffixCounts(from); return xs.map((x) => [deltaMargin(x.d, c), suffixLogOdds(s, x.word), 1]); };
const oofX = [...feats(A, B), ...feats(B, A)], oofRows = [...A, ...B], oofY = oofRows.map((x) => (x.truth === "nominal" ? 1 : 0));
const weights = fitLogistic(oofX, oofY);
const oof = oofX.map((x, i) => ({ s: weights[0] * x[0] + weights[1] * x[1] + weights[2], truth: oofRows[i].truth })).sort((a, b) => Math.abs(b.s) - Math.abs(a.s));
let hit = 0, threshold = Infinity;
oof.forEach((r, i) => { if ((r.s >= 0 ? "nominal" : "other") === r.truth) hit++; if (hit / (i + 1) >= 0.9 && i >= 99) threshold = Math.abs(r.s); });      // the loosest cut that still keeps >= 0.90 above it (at least 100 items)
const model = { schema: "Sniff@1", provenance: { language: "eng", period: "2010s", region: "web text, mixed international sources", corpus: "UD_English-EWT train, word-disjoint 70% split", giver: "Universal Dependencies (CC BY-SA 4.0)", embedder: "nomic-embed-text, single-sentence deltas" }, classes: ["nominal", "other"], centroids: centroidsOf(train), suffix: suffixCounts(train), weights, threshold: +threshold.toFixed(4), n: { train: train.length } };

// test, once
const votes = test.map((x) => { const s = score(model, x.d, x.word); return { s, cls: s >= 0 ? "nominal" : "other", truth: x.truth, word: x.word }; });
const above = votes.filter((v) => Math.abs(v.s) >= model.threshold);
const reloaded = JSON.parse(JSON.stringify(model)), same = test.every((x, i) => (score(reloaded, x.d, x.word) >= 0 ? "nominal" : "other") === votes[i].cls);
const out = {
  threshold: model.threshold, weights: weights.map((w) => +w.toFixed(3)),
  V1_acceptedAccuracy: { accuracy: +(above.filter((v) => v.cls === v.truth).length / above.length).toFixed(3), minimum: 0.88, holds: above.filter((v) => v.cls === v.truth).length / above.length >= 0.88 },
  V2_coverage: +(above.length / votes.length).toFixed(3),
  overallAccuracy: +(votes.filter((v) => v.cls === v.truth).length / votes.length).toFixed(3),
  V3_roundTrip: same,
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./sniff-eng.json", import.meta.url), JSON.stringify(model) + "\n");
writeFileSync(new URL("./build-sniff-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
