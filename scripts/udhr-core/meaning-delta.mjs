// udhr-core/meaning-delta.mjs — can MEANING be learned from usage, grounded in the Declaration's units?
//
// A word's usage vector = the mean, over up to 12 real ring-1 sentences (at most one per document), of the ablation delta: norm(embed(sentence)) minus
// norm(embed(sentence with the word masked)), the same local nomic-embed-text signal the POS sniff uses, here read as "what this word contributed".
// Labels: the unit of the Declaration that holds the word as one of ITS OWN beings in the English edition (words held by exactly one unit, >= 4 letters,
// >= 8 contexts found). The Declaration's text is NOT used to build the vector: only ring-1 usage is (21-anti-colonial, 20-first-person-voices, English).
//
// PRE-REGISTERED before the first run (2026-10-20):
//   MN1  leave-one-out nearest-neighbour (k = 5 neighbours by cosine of usage vectors, unit votes weighted by cosine) recovers the word's unit with accuracy
//        above the MAXIMUM over 200 draws that permute the unit labels among the words.
//   MN2  reported, not claimed: the same words classified by the CO-OCCURRENCE profile used in ring1-spiral.mjs (the unit its paragraphs vote for), and the
//        majority-unit rate, so the delta can be read against a baseline that needs no embedder and against the unit prior.
//   MN3  reported: accuracy by unit, the 10 words the usage vector assigns most confidently and correctly, and the 10 most confident errors (read by eye).
//   Caution fixed in advance: the unit prior is uneven (a few units hold most of the Declaration's beings), so a high accuracy can be the prior; the permutation
//   null keeps that distribution and the majority rate is printed beside it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, scoreTokens, tokensOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { norm, cos } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___", TOK = /\p{L}+(?:['’]\p{L}+)?/gu, rnd = mulberry(17);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const m = await modelOf("eng"), unitsOf = new Map();
m.B.forEach((set, u) => { for (const w of set) if (/^[a-z]{4,}$/.test(w)) (unitsOf.get(w) ?? unitsOf.set(w, []).get(w)).push(u); });
const labelled = [...unitsOf].filter(([, us]) => us.length === 1).map(([w, us]) => [w, us[0]]), want = new Map(labelled);
const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const ctx = new Map(), co = new Map(); let docs = 0;
for (const p of shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))).sort(), rnd)) {
  if (docs >= 700) break;
  const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language)) continue; docs++;
  const seen = new Set();
  for (const para of gutenbergBody(body).slice(0, 120000).split(/\n\s*\n/)) {
    const toks = tokensOf(para, m.hearing.ear); if (toks.length < 3) continue;
    const sc = scoreTokens(toks, m), tot = sc ? sc.s.reduce((a, b) => a + b, 0) : 0;
    for (const w of new Set(toks)) if (want.has(w) && tot) { let a = co.get(w); if (!a) { a = new Float64Array(31); co.set(w, a); } for (let u = 0; u < 31; u++) a[u] += sc.mass * (sc.s[u] / tot); }
    for (const s of para.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
      const t = s.match(TOK) ?? []; if (t.length < 6 || t.length > 40) continue;
      for (const w of new Set(t.map((x) => x.toLowerCase()))) if (want.has(w) && !seen.has(w)) { const k = ctx.get(w) ?? []; if (k.length < 12) { k.push(s); ctx.set(w, k); seen.add(w); } }
    }
  }
}
const words = labelled.filter(([w]) => (ctx.get(w)?.length ?? 0) >= 8).map(([w, u]) => ({ word: w, unit: u }));
console.log(JSON.stringify({ docsScanned: docs, labelledWords: labelled.length, withEnoughContexts: words.length, units: new Set(words.map((x) => x.unit)).size }));
const mask = (s, w) => s.replace(new RegExp(`\\b${w}\\b`, "i"), MASK), flat = words.flatMap((x) => ctx.get(x.word).map((s) => ({ word: x.word, s })));
const A = (await embed(flat.map((x) => x.s))).map(norm), B = (await embed(flat.map((x) => mask(x.s, x.word)))).map(norm), sum = new Map(), cnt = new Map();
flat.forEach((x, i) => { const d = norm(A[i].map((v, j) => v - B[i][j])), s = sum.get(x.word) ?? new Array(d.length).fill(0); d.forEach((v, j) => (s[j] += v)); sum.set(x.word, s); cnt.set(x.word, (cnt.get(x.word) ?? 0) + 1); });
words.forEach((x) => (x.vec = norm(sum.get(x.word))));

const K = 5, loo = (labels) => words.map((x, i) => { const sims = words.map((y, j) => (j === i ? null : [cos(x.vec, y.vec), labels[j]])).filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, K), vote = new Map(); for (const [c, l] of sims) vote.set(l, (vote.get(l) ?? 0) + Math.max(c, 0)); const best = [...vote].sort((a, b) => b[1] - a[1])[0]; return { pred: best[0], conf: best[1] / ([...vote.values()].reduce((a, b) => a + b, 0) || 1) }; });
const truth = words.map((x) => x.unit), res = loo(truth), acc = res.filter((r, i) => r.pred === truth[i]).length / words.length;
const nulls = Array.from({ length: 200 }, () => { const sh = shuffle(truth, rnd), r = loo(sh); return r.filter((q, i) => q.pred === sh[i]).length / words.length; });
const majority = Math.max(...[...new Set(truth)].map((u) => truth.filter((t) => t === u).length)) / words.length;
const coAcc = words.filter((x) => { const a = co.get(x.word); if (!a) return false; const base = a.reduce((p, q) => p + q, 0); return a.indexOf(Math.max(...a)) === x.unit; }).length / words.length;
const byUnit = {}; words.forEach((x, i) => { const u = byUnit[x.unit] ??= { n: 0, hit: 0 }; u.n++; if (res[i].pred === x.unit) u.hit++; });
const rank = words.map((x, i) => ({ word: x.word, unit: x.unit, pred: res[i].pred, conf: +res[i].conf.toFixed(2), ok: res[i].pred === x.unit })).sort((a, b) => b.conf - a.conf);
const out = {
  words: words.length, MN1: { accuracy: +acc.toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), nullMean: +(nulls.reduce((a, b) => a + b, 0) / 200).toFixed(3), holds: acc > Math.max(...nulls) },
  MN2: { majorityUnitRate: +majority.toFixed(3), coOccurrenceProfileAccuracy: +coAcc.toFixed(3) },
  MN3: { byUnit: Object.fromEntries(Object.entries(byUnit).filter(([, v]) => v.n >= 5).map(([u, v]) => [u === "0" ? "preamble" : `art${u}`, `${v.hit}/${v.n}`])), confidentCorrect: rank.filter((r) => r.ok).slice(0, 10).map((r) => `${r.word}→${r.pred}`).join(" "), confidentErrors: rank.filter((r) => !r.ok).slice(0, 10).map((r) => `${r.word}(${r.unit})→${r.pred}`).join(" ") },
};
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./meaning-delta-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
