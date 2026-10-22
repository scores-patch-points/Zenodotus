// udhr-core/build-sniff-lang.mjs — fit and test a nominal-vs-other sniff for ANOTHER language from a UD treebank. Usage:
//   node build-sniff-lang.mjs <lang> <treebank.conllu> <word-regex-source> <output-model.json>
// e.g. node build-sniff-lang.mjs spa data-ud-spa/es_gsd-ud-train.conllu '^[a-zñáéíóúü]{3,}$' sniff-spa.json
// Same method, split (seeded word-disjoint 70/30, 3200 / 800 occurrences per class) and decision rules as ablation-suffix.mjs and build-sniff.mjs.
// The embedder is the LOCAL nomic-embed-text, an English-centric model; whether its delta says anything in this language is one of the claims.
//
// PRE-REGISTERED for Spanish before the first run (2026-10-19); bootstrap = 200 paired resamples of the test occurrences:
//   L0  the DELTA ALONE carries signal: its test accuracy exceeds the MAXIMUM over 200 label shuffles.
//   L1  combined beats delta alone in >= 190 of 200 resamples.     L2  combined beats spelling alone in >= 190 of 200 resamples.
//   L3  reported, not claimed: delta vs spelling (English: 78 of 200, no better).
//   L4  calibration: top-third accuracy of the combined score minus bottom-third exceeds the MAXIMUM over 200 margin shuffles.
//   L5  accepted accuracy at the out-of-fold threshold (>= 0.90 above it, >= 100 items) is at least 0.88 on the test split; coverage reported.
//   L6  the saved model reproduces every test vote after a JSON round trip.
//   A failed L0 or L2 means the embedder adds nothing in this language and the model is spelling alone: it is then saved as such, flagged, not as a delta sniff.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { suffixCounts, suffixLogOdds, centroidsOf, deltaMargin, fitLogistic, score, norm } from "./sniff.mjs";

const [lang, tb, wordRe, outModel] = process.argv.slice(2); if (!outModel) throw new Error("usage: node build-sniff-lang.mjs <lang> <treebank> <word-regex> <out-model.json>");
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
    const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form }); byWord.set(t.form, k); }
  });
}
const words = shuffle([...byWord.keys()].sort(), rnd), units = (ws) => ws.flatMap((w) => byWord.get(w));
const take = (pool, per) => { const out = { nominal: [], other: [] }; for (const u of pool) if (out[u.truth].length < per) out[u.truth].push(u); return out; };
const cut = Math.floor(words.length * 0.7), TR = take(units(words.slice(0, cut)), 3200), TE = take(units(words.slice(cut)), 800);
const perClass = Math.min(TR.nominal.length, TR.other.length, TE.nominal.length * 4, TE.other.length * 4);
console.log(JSON.stringify({ lang, sentences: sentences.length, words: words.length, train: { nominal: TR.nominal.length, other: TR.other.length }, test: { nominal: TE.nominal.length, other: TE.other.length } }));
async function deltas(us) {
  const A = (await embed(us.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(us.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm);
  return A.map((x, i) => norm(x.map((v, j) => v - B[i][j])));
}
const withD = async (us) => { const d = await deltas(us); return us.map((u, i) => ({ ...u, d: d[i] })); };
const train = [...(await withD(TR.nominal)), ...(await withD(TR.other))], test = [...(await withD(TE.nominal)), ...(await withD(TE.other))];

const trW = shuffle([...new Set(train.map((x) => x.word))].sort(), rnd), half = new Set(trW.slice(0, trW.length >> 1));
const A = train.filter((x) => half.has(x.word)), B = train.filter((x) => !half.has(x.word));
const feats = (xs, from) => { const c = centroidsOf(from), s = suffixCounts(from); return xs.map((x) => [deltaMargin(x.d, c), suffixLogOdds(s, x.word), 1]); };
const oofX = [...feats(A, B), ...feats(B, A)], oofRows = [...A, ...B], weights = fitLogistic(oofX, oofRows.map((x) => (x.truth === "nominal" ? 1 : 0)));
const oof = oofX.map((x, i) => ({ s: weights[0] * x[0] + weights[1] * x[1] + weights[2], truth: oofRows[i].truth })).sort((a, b) => Math.abs(b.s) - Math.abs(a.s));
let hit = 0, threshold = Infinity; oof.forEach((r, i) => { if ((r.s >= 0 ? "nominal" : "other") === r.truth) hit++; if (hit / (i + 1) >= 0.9 && i >= 99) threshold = Math.abs(r.s); });
const model = { schema: "Sniff@1", provenance: { language: lang, corpus: `${tb} word-disjoint 70% split`, giver: "Universal Dependencies (CC BY-SA 4.0)", embedder: "nomic-embed-text (English-centric), single-sentence deltas" }, classes: ["nominal", "other"], centroids: centroidsOf(train), suffix: suffixCounts(train), weights, threshold: Number.isFinite(threshold) ? +threshold.toFixed(4) : null, n: { train: train.length } };

const cs = model.centroids, sf = model.suffix;
const T = test.map((x) => { const d = deltaMargin(x.d, cs), s = suffixLogOdds(sf, x.word), c = weights[0] * d + weights[1] * s + weights[2]; return { truth: x.truth, D: d >= 0 ? "nominal" : "other", S: s >= 0 ? "nominal" : "other", C: c >= 0 ? "nominal" : "other", cs: Math.abs(c), word: x.word, d: x.d }; });
const accOf = (xs, k) => xs.filter((x) => x[k] === x.truth).length / xs.length;
const boots = Array.from({ length: 200 }, () => { const s = Array.from({ length: T.length }, () => T[Math.floor(rnd() * T.length)]); return { D: accOf(s, "D"), S: accOf(s, "S"), C: accOf(s, "C") }; });
const wins = (a, b) => boots.filter((r) => r[a] > r[b]).length;
const L0null = Array.from({ length: 200 }, () => { const lab = shuffle(T.map((x) => x.truth), rnd); return T.filter((x, i) => x.D === lab[i]).length / T.length; });
const byS = [...T].sort((a, b) => a.cs - b.cs), third = Math.floor(T.length / 3), gap = (xs) => accOf(xs.slice(-third), "C") - accOf(xs.slice(0, third), "C");
const L4null = Array.from({ length: 200 }, () => { const sc = shuffle(T.map((x) => x.cs), rnd); return gap(T.map((x, i) => ({ ...x, cs: sc[i] })).sort((a, b) => a.cs - b.cs)); });
const above = model.threshold == null ? [] : T.filter((x) => x.cs >= model.threshold);
const reload = JSON.parse(JSON.stringify(model)), L6 = test.every((x, i) => (score(reload, x.d, x.word) >= 0 ? "nominal" : "other") === T[i].C);
const out = {
  lang, accuracy: { delta: +accOf(T, "D").toFixed(3), spelling: +accOf(T, "S").toFixed(3), combined: +accOf(T, "C").toFixed(3) },
  L0_deltaCarriesSignal: { accuracy: +accOf(T, "D").toFixed(3), nullMax: +Math.max(...L0null).toFixed(3), holds: accOf(T, "D") > Math.max(...L0null) },
  L1_combinedBeatsDelta: { wins: `${wins("C", "D")}/200`, holds: wins("C", "D") >= 190 }, L2_combinedBeatsSpelling: { wins: `${wins("C", "S")}/200`, holds: wins("C", "S") >= 190 },
  L3_deltaVsSpelling: `${wins("D", "S")}/200`, L4_calibration: { top: +accOf(byS.slice(-third), "C").toFixed(3), bottom: +accOf(byS.slice(0, third), "C").toFixed(3), gap: +gap(byS).toFixed(3), nullMax: +Math.max(...L4null).toFixed(3), holds: gap(byS) > Math.max(...L4null) },
  L5_accepted: { threshold: model.threshold, accuracy: above.length ? +accOf(above, "C").toFixed(3) : null, coverage: +(above.length / T.length).toFixed(3), holds: above.length > 0 && accOf(above, "C") >= 0.88 }, L6_roundTrip: L6,
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL(`./${outModel}`, import.meta.url), JSON.stringify(model) + "\n");
writeFileSync(new URL(`./build-sniff-${lang}-report.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
