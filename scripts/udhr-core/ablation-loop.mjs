// udhr-core/ablation-loop.mjs — can the ablation delta SNIFF part of speech, and does it get stronger as established evidence accumulates?
//
// Method (khora native/adapters/text/ablation-grain-pressure.js, reused as designed; this file only supplies the evidence and the tests):
//   for a word, take up to 4 real sentences containing it; embed them as-is and with the word replaced by "___"; the word's DELTA is
//   norm(embed(with)) - norm(embed(ablated)), normalised. A class centroid is the mean delta of its settled words. A word is sniffed to the class
//   whose centroid has the larger cosine; MARGIN = |cos(nominal) - cos(other)|. The classes are the stack's own decision: NOMINAL (NOUN, PROPN) vs OTHER.
//   Embedder: nomic-embed-text through the LOCAL Ollama (127.0.0.1:11435). No text leaves this machine.
// Established evidence = the English POS prior's dominant class (>= 0.8 of >= 5 counts) for lower-case alphabetic words, with their sentences taken from
// the English ring-1 documents. The treebank file khora built from is not on this disk; the prior's counts are its residue.
//
// PRE-REGISTERED before the first run (2026-10-19); "null" = 200 draws:
//   B1  SNIFF. Centroids from the 400-word-per-class training split; accuracy on the disjoint 300-word-per-class test split exceeds the MAXIMUM
//       accuracy over 200 draws that shuffle the test words' labels.
//   B2  CALIBRATION (the claim that FAILED in khora's own test, 0.171 vs 0.220). Accuracy in the top margin third of test words exceeds accuracy in the
//       bottom third by more than the MAXIMUM such difference over 200 draws that shuffle margins across test words.
//   B3  COMPOUNDING. Training centroids from N settled words per class, N in {20,40,80,160,320}, 20 random subsets each, scored on the fixed test split:
//       holds iff mean accuracy rises monotonically over N AND accuracy at N=320 beats accuracy at N=20 in at least 19 of 20 paired subsets.
//   B4  WIKTIONARY. The 64 UDHR words the English prior did not know, with the verdict Wiktionary gave (live-lookup-64-report.json). Only PURE words
//       (every listed POS nominal, or none nominal) are scored; mixed-POS words are counted and set aside, not forced into a class. Base centroids =
//       the full training split. Claim: accuracy on pure words exceeds the MAXIMUM over 200 label shuffles. Then the 63 other settled words are added
//       to the centroids (leave-one-out) and accuracy is re-measured; REPORTED, not claimed (63 words against 800 are a small push).
//   Control  each claim is reversed by a null draw reaching the real value. Training and test words are disjoint (a seeded split of words, not of
//            sentences); a B4 word is never in the training split because it is unknown to the prior.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";

const OLLAMA = "http://127.0.0.1:11435/api/embed", MASK = "___", NCTX = 4;
const TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
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
const rnd = mulberry(77);

// ---- established evidence ----------------------------------------------------------------------------------------------------------------
const m = await modelOf("eng"), forms = m.hearing.posPrior.forms;
const klass = (w) => { const c = forms[w]; if (!c) return null; const t = Object.values(c).reduce((a, b) => a + b, 0); if (t < 5) return null; const n = ((c.NOUN ?? 0) + (c.PROPN ?? 0)) / t; return n >= 0.8 ? "nominal" : n <= 0.2 && (c.X ?? 0) / t < 0.5 ? "other" : null; };
const report = JSON.parse(readFileSync(new URL("./live-lookup-64-report.json", import.meta.url)));
const udhrWords = new Set(report.results.map((r) => r.word));
const cand = new Set(); for (const w of Object.keys(forms)) if (/^[a-z]{3,}$/.test(w) && klass(w)) cand.add(w);

const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const files = shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))), rnd);
const ctx = new Map(); let docs = 0;
for (const p of files) {
  if (docs >= 500) break;
  const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language)) continue; docs++;
  const perDoc = new Map();
  for (const s of gutenbergBody(body).slice(0, 80000).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    const toks = s.match(TOK) ?? []; if (toks.length < 6 || toks.length > 40) continue;
    for (const raw of new Set(toks.map((t) => t.toLowerCase()))) {
      if (!cand.has(raw) && !udhrWords.has(raw)) continue;
      const k = ctx.get(raw) ?? []; if (k.length >= NCTX || (perDoc.get(raw) ?? 0) >= 1) continue;
      k.push(s); ctx.set(raw, k); perDoc.set(raw, 1);
    }
  }
}
for (const f of m.frames) for (const s of f.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+/)) for (const raw of new Set((s.match(TOK) ?? []).map((t) => t.toLowerCase()))) if (udhrWords.has(raw)) { const k = ctx.get(raw) ?? []; if (k.length < NCTX && !k.includes(s)) { k.push(s); ctx.set(raw, k); } }
console.log(JSON.stringify({ docsScanned: docs, candidateWordsWithContexts: [...ctx.keys()].filter((w) => cand.has(w) && ctx.get(w).length >= NCTX).length }));

const mask = (s, w) => s.replace(new RegExp(`\\b${w}\\b`, "i"), MASK);
async function deltasFor(words) {
  const withP = words.map((w) => ctx.get(w).slice(0, NCTX).join("\n")), ablP = words.map((w) => ctx.get(w).slice(0, NCTX).map((s) => mask(s, w)).join("\n"));
  const A = (await embed(withP)).map(norm), B = (await embed(ablP)).map(norm);
  return A.map((a, i) => norm(a.map((x, j) => x - B[i][j])));
}
const full = (cls) => [...ctx].filter(([w, c]) => c.length >= NCTX && cand.has(w) && klass(w) === cls).map(([w]) => w).sort();
const pick = (cls) => shuffle(full(cls), rnd).slice(0, 700);
const nom = pick("nominal"), oth = pick("other");
if (Math.min(nom.length, oth.length) < 700) console.log(`WARNING: only ${nom.length} nominal / ${oth.length} other words with ${NCTX} contexts; split sizes shrink`);
const nTrain = Math.min(400, Math.floor(Math.min(nom.length, oth.length) * 4 / 7)), nTest = Math.min(300, Math.min(nom.length, oth.length) - nTrain);
const split = (ws) => ({ train: ws.slice(0, nTrain), test: ws.slice(nTrain, nTrain + nTest) });
const [SN, SO] = [split(nom), split(oth)];
console.log(`embedding ${2 * (nTrain + nTest)} words (+ UDHR) with the local nomic-embed-text ...`);
const [dTrN, dTrO, dTeN, dTeO] = await Promise.all([deltasFor(SN.train), deltasFor(SO.train), deltasFor(SN.test), deltasFor(SO.test)]);

const sniff = (d, cN, cO) => { const a = cos(d, cN), b = cos(d, cO); return { cls: a >= b ? "nominal" : "other", margin: Math.abs(a - b) }; };
const test = [...dTeN.map((d) => ({ d, truth: "nominal" })), ...dTeO.map((d) => ({ d, truth: "other" }))];
const cN = norm(meanVec(dTrN)), cO = norm(meanVec(dTrO));
const scored = test.map((t) => ({ ...t, ...sniff(t.d, cN, cO) }));
const acc = (xs) => xs.filter((x) => x.cls === x.truth).length / xs.length;
const B1real = acc(scored), B1null = Array.from({ length: 200 }, () => { const lab = shuffle(scored.map((x) => x.truth), rnd); return scored.filter((x, i) => x.cls === lab[i]).length / scored.length; });
const byMargin = [...scored].sort((a, b) => a.margin - b.margin), third = Math.floor(scored.length / 3);
const gap = (xs) => acc(xs.slice(-third)) - acc(xs.slice(0, third));
const B2real = gap(byMargin), B2null = Array.from({ length: 200 }, () => { const mg = shuffle(scored.map((x) => x.margin), rnd); const ys = scored.map((x, i) => ({ ...x, margin: mg[i] })).sort((a, b) => a.margin - b.margin); return gap(ys); });
const curve = [20, 40, 80, 160, 320].filter((n) => n <= nTrain).map((n) => {
  const accs = Array.from({ length: 20 }, () => { const a = norm(meanVec(shuffle(dTrN, rnd).slice(0, n))), b = norm(meanVec(shuffle(dTrO, rnd).slice(0, n))); return acc(test.map((t) => ({ ...t, cls: sniff(t.d, a, b).cls }))); });
  return { n, accs, mean: accs.reduce((x, y) => x + y, 0) / 20 };
});
const mono = curve.every((c, i) => !i || c.mean > curve[i - 1].mean), first = curve[0], last = curve.at(-1);
const pairedWins = first.accs.filter((a, i) => last.accs[i] > a).length;

// B4: the Wiktionary words
const NOMTAG = new Set(["noun", "proper noun"]);
const w64 = report.results.map((r) => { const tags = (r.pos ?? "").split("/").filter(Boolean), nn = tags.filter((t) => NOMTAG.has(t)).length; return { word: r.word, truth: nn === tags.length && nn ? "nominal" : nn === 0 && tags.length ? "other" : "mixed" }; });
const pure = w64.filter((x) => x.truth !== "mixed" && (ctx.get(x.word) ?? []).length >= 1);
const dW = await deltasFor(pure.map((x) => x.word));
const w4 = pure.map((x, i) => ({ ...x, d: dW[i] }));
const accW = (a, b, ws = w4) => ws.filter((x) => sniff(x.d, a, b).cls === x.truth).length / ws.length;
const B4real = accW(cN, cO), B4null = Array.from({ length: 200 }, () => { const lab = shuffle(w4.map((x) => x.truth), rnd); return w4.filter((x, i) => sniff(x.d, cN, cO).cls === lab[i]).length / w4.length; });
const loo = w4.filter((x, i) => { const others = w4.filter((_, j) => j !== i), n2 = others.filter((o) => o.truth === "nominal").map((o) => o.d), o2 = others.filter((o) => o.truth === "other").map((o) => o.d); return sniff(x.d, norm(meanVec([...dTrN, ...n2])), norm(meanVec([...dTrO, ...o2]))).cls === x.truth; }).length / w4.length;

const out = {
  split: { trainPerClass: nTrain, testPerClass: nTest },
  B1_sniff: { accuracy: +B1real.toFixed(3), nullMax: +Math.max(...B1null).toFixed(3), holds: B1real > Math.max(...B1null) },
  B2_calibration: { topThirdAcc: +acc(byMargin.slice(-third)).toFixed(3), bottomThirdAcc: +acc(byMargin.slice(0, third)).toFixed(3), gap: +B2real.toFixed(3), nullMax: +Math.max(...B2null).toFixed(3), holds: B2real > Math.max(...B2null) },
  B3_compounding: { curve: curve.map((c) => ({ n: c.n, mean: +c.mean.toFixed(3) })), monotone: mono, pairedWinsN320over20: `${pairedWins}/20`, holds: mono && pairedWins >= 19 },
  B4_wiktionary: { words: w64.length, pure: pure.length, mixedSetAside: w64.filter((x) => x.truth === "mixed").length, noContext: w64.filter((x) => x.truth !== "mixed").length - pure.length, nominalPure: pure.filter((x) => x.truth === "nominal").length, accuracy: +B4real.toFixed(3), nullMax: +Math.max(...B4null).toFixed(3), holds: B4real > Math.max(...B4null), accuracyAfterAddingSettledLOO: +loo.toFixed(3) },
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ablation-loop-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
