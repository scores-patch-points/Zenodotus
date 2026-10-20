// udhr-core/ablation-treebank.mjs — the ablation-delta sniff re-measured on HUMAN-ANNOTATED labels (UD English-EWT, CC BY-SA 4.0, data-ud-ewt/).
//
// ablation-loop.mjs labelled words from the English POS prior's counts. Here every unit is ONE real occurrence in a treebank sentence, labelled by the
// annotator for THAT token (nominal = NOUN, PROPN; other = VERB, ADJ, ADV, AUX, NUM, PRON, ADP, DET, CCONJ, PART, SCONJ), so homographs are scored as
// they occur. A unit's delta is norm(embed(sentence)) - norm(embed(sentence with the token replaced by "___")), normalised: the live case, one sentence.
// Embedder: nomic-embed-text through the LOCAL Ollama (127.0.0.1:11435). Words are split into disjoint train/test sets by a seeded shuffle of WORDS.
//
// PRE-REGISTERED before the first run (2026-10-19); "null" = 200 draws; same decision rule and the same four claims as ablation-loop.mjs:
//   T1  SNIFF. Accuracy on the test occurrences (800 per class) exceeds the MAXIMUM over 200 label shuffles.
//   T2  CALIBRATION (khora's own test of this failed: 0.171 vs 0.220). Top-margin third accuracy minus bottom-margin third accuracy exceeds the MAXIMUM
//       over 200 draws that shuffle margins across test occurrences.
//   T3  COMPOUNDING. Centroids from N training occurrences per class, N in {50,100,200,400,800,1600}, 20 random subsets each, on the fixed test set:
//       holds iff mean accuracy rises monotonically over N AND accuracy at N=1600 beats N=50 in at least 19 of 20 paired subsets.
//   T4  WIKTIONARY. The 46 PURE UDHR words (live-lookup-64-report.json: every listed POS nominal, or none nominal), scored from up to 4 real sentences
//       pooled as ablation-loop.mjs did, with the treebank centroids: accuracy exceeds the MAXIMUM over 200 label shuffles. (That claim tied its null at
//       0.717 with prior-built centroids; this asks whether human labels do better. Reported next to the old number.)
//   Control  each claim is reversed by a null draw reaching the real value. A tie is a failure. No word is in both train and test.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";

const OLLAMA = "http://127.0.0.1:11435/api/embed", MASK = "___";
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const rnd = mulberry(91);
const embed = async (texts) => {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    for (let a = 0; ; a++) {
      try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; }
      catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); }
    }
  }
  return out;
};
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
const meanVec = (vs) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);
const acc = (xs) => xs.filter((x) => x.cls === x.truth).length / xs.length;
const sniff = (d, cN, cO) => { const a = cos(d, cN), b = cos(d, cO); return { cls: a >= b ? "nominal" : "other", margin: Math.abs(a - b) }; };

// ---- the treebank -------------------------------------------------------------------------------------------------------------------------
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
    if (!/^[a-z]{3,}$/.test(t.form)) return;                       // lower-case alphabetic forms only (the same population the prior tests)
    const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return;
    const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth }); byWord.set(t.form, k); }
  });
}
const words = shuffle([...byWord.keys()].sort(), rnd);
const units = (ws) => ws.flatMap((w) => byWord.get(w));
const TRAIN_PER = 3200, TEST_PER = 800;
const take = (pool, per) => { const out = { nominal: [], other: [] }; for (const u of pool) if (out[u.truth].length < per) out[u.truth].push(u); return out; };
const cut = Math.floor(words.length * 0.7), trainW = new Set(words.slice(0, cut));
const TR = take(units(words.slice(0, cut)), TRAIN_PER), TE = take(units(words.slice(cut)), TEST_PER);
console.log(JSON.stringify({ sentences: sentences.length, words: words.length, train: { nominal: TR.nominal.length, other: TR.other.length }, test: { nominal: TE.nominal.length, other: TE.other.length } }));

async function deltas(us) {
  const w = us.map((u) => u.forms.join(" ")), a = us.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" "));
  const A = (await embed(w)).map(norm), B = (await embed(a)).map(norm);
  return A.map((x, i) => norm(x.map((v, j) => v - B[i][j])));
}
const [dTrN, dTrO, dTeN, dTeO] = [await deltas(TR.nominal), await deltas(TR.other), await deltas(TE.nominal), await deltas(TE.other)];
const cN = norm(meanVec(dTrN)), cO = norm(meanVec(dTrO));
const test = [...dTeN.map((d) => ({ d, truth: "nominal" })), ...dTeO.map((d) => ({ d, truth: "other" }))];
const scored = test.map((t) => ({ ...t, ...sniff(t.d, cN, cO) }));

const T1real = acc(scored), T1null = Array.from({ length: 200 }, () => { const lab = shuffle(scored.map((x) => x.truth), rnd); return scored.filter((x, i) => x.cls === lab[i]).length / scored.length; });
const byMargin = [...scored].sort((a, b) => a.margin - b.margin), third = Math.floor(scored.length / 3), gap = (xs) => acc(xs.slice(-third)) - acc(xs.slice(0, third));
const T2real = gap(byMargin), T2null = Array.from({ length: 200 }, () => { const mg = shuffle(scored.map((x) => x.margin), rnd); return gap(scored.map((x, i) => ({ ...x, margin: mg[i] })).sort((a, b) => a.margin - b.margin)); });
const curve = [50, 100, 200, 400, 800, 1600].map((n) => {
  const accs = Array.from({ length: 20 }, () => { const a = norm(meanVec(shuffle(dTrN, rnd).slice(0, n))), b = norm(meanVec(shuffle(dTrO, rnd).slice(0, n))); return acc(test.map((t) => ({ ...t, cls: sniff(t.d, a, b).cls }))); });
  return { n, accs, mean: accs.reduce((x, y) => x + y, 0) / 20 };
});
const mono = curve.every((c, i) => !i || c.mean > curve[i - 1].mean), wins = curve[0].accs.filter((a, i) => curve.at(-1).accs[i] > a).length;

// ---- T4: the UDHR words Wiktionary settled ------------------------------------------------------------------------------------------------
const m = await modelOf("eng"), report = JSON.parse(readFileSync(new URL("./live-lookup-64-report.json", import.meta.url)));
const NOMTAG = new Set(["noun", "proper noun"]), TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const verdicts = report.results.map((r) => { const tags = (r.pos ?? "").split("/").filter(Boolean), nn = tags.filter((t) => NOMTAG.has(t)).length; return { word: r.word, truth: nn === tags.length && nn ? "nominal" : nn === 0 && tags.length ? "other" : "mixed" }; }).filter((x) => x.truth !== "mixed");
const want = new Set(verdicts.map((x) => x.word)), ctx = new Map();
const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
let docs = 0;
for (const p of shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))), mulberry(77))) {
  if (docs >= 500) break;
  const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language)) continue; docs++;
  const seen = new Set();
  for (const s of gutenbergBody(body).slice(0, 80000).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    const toks = s.match(TOK) ?? []; if (toks.length < 6 || toks.length > 40) continue;
    for (const w of new Set(toks.map((t) => t.toLowerCase()))) if (want.has(w) && !seen.has(w)) { const k = ctx.get(w) ?? []; if (k.length < 4) { k.push(s); ctx.set(w, k); seen.add(w); } }
  }
}
for (const f of m.frames) for (const s of f.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+/)) for (const w of new Set((s.match(TOK) ?? []).map((t) => t.toLowerCase()))) if (want.has(w)) { const k = ctx.get(w) ?? []; if (k.length < 4 && !k.includes(s)) { k.push(s); ctx.set(w, k); } }
const mask = (s, w) => s.replace(new RegExp(`\\b${w}\\b`, "i"), MASK);
const scoredW = verdicts.filter((x) => ctx.get(x.word)?.length);
const wd = (await Promise.all([embed(scoredW.map((x) => ctx.get(x.word).join("\n"))), embed(scoredW.map((x) => ctx.get(x.word).map((s) => mask(s, x.word)).join("\n")))])).reduce((A, B) => A.map((a, i) => norm(norm(a).map((v, j) => v - norm(B[i])[j]))));
const w4 = scoredW.map((x, i) => ({ ...x, d: wd[i] }));
const T4real = w4.filter((x) => sniff(x.d, cN, cO).cls === x.truth).length / w4.length;
const T4null = Array.from({ length: 200 }, () => { const lab = shuffle(w4.map((x) => x.truth), rnd); return w4.filter((x, i) => sniff(x.d, cN, cO).cls === lab[i]).length / w4.length; });

const out = {
  T1_sniff: { accuracy: +T1real.toFixed(3), nullMax: +Math.max(...T1null).toFixed(3), holds: T1real > Math.max(...T1null) },
  T2_calibration: { topThird: +acc(byMargin.slice(-third)).toFixed(3), bottomThird: +acc(byMargin.slice(0, third)).toFixed(3), gap: +T2real.toFixed(3), nullMax: +Math.max(...T2null).toFixed(3), holds: T2real > Math.max(...T2null), khoraEarlier: "0.171 top vs 0.220 bottom (failed)" },
  T3_compounding: { curve: curve.map((c) => ({ n: c.n, mean: +c.mean.toFixed(3) })), monotone: mono, pairedWins: `${wins}/20`, holds: mono && wins >= 19 },
  T4_wiktionary: { scoredWords: w4.length, nominal: w4.filter((x) => x.truth === "nominal").length, accuracy: +T4real.toFixed(3), nullMax: +Math.max(...T4null).toFixed(3), holds: T4real > Math.max(...T4null), earlierPriorBuilt: "0.717 vs null max 0.717 (tied, failed)" },
  marginBands: [0, 1, 2, 3, 4].map((q) => { const n = Math.floor(scored.length / 5), xs = byMargin.slice(q * n, q === 4 ? undefined : (q + 1) * n); return { quintile: q + 1, accuracy: +acc(xs).toFixed(3), minMargin: +xs[0].margin.toFixed(4) }; }),
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ablation-treebank-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
// the centroids themselves: small, derived from CC BY-SA text, so they carry the same licence and a provenance line
writeFileSync(new URL("./ablation-treebank-centroids.json", import.meta.url), JSON.stringify({ schema: "AblationGrainPrior@1", provenance: { language: "eng", period: "2010s", region: "web text, mixed international sources", corpus: "UD_English-EWT train, word-disjoint 70% split", giver: "Universal Dependencies (CC BY-SA 4.0)", embedder: "nomic-embed-text, single-occurrence deltas" }, classes: ["nominal", "other"], n: { nominal: dTrN.length, other: dTrO.length }, centroids: { nominal: cN, other: cO } }) + "\n");
