// udhr-core/referent-lexicon.mjs — a word's MEANING as the Declaration units it names, learned from reading, across the editions already read.
//
// For every edition (all 233 with a part-of-speech prior), every word the edition's own ear hears in a unit (31 units: preamble + 30 articles) is entered with the
// SET of units it appears in. Nothing outside the Declaration is used: the referents are the aligned units, which are the same in every language. The weight of a
// word is ln(31 / df), df = the units it appears in, as in ring1.mjs. The lexicon is a projection of the reading, rebuilt in seconds.
//
// PRE-REGISTERED before the first run (2026-10-20):
//   L1  POSITIVE CONTROL, replication across translations. For every language code with two or more editions, words present in two editions of it: the mean Jaccard of
//       their unit sets exceeds the MAXIMUM over 200 draws that permute the unit sets among the shared words. (Words keep their referents when the translation changes.)
//   L2  CROSS-LINGUAL. For each gold pair (gold/udhr-xling-pairs.json, only pairs whose forms occur in the three editions eng, spa, por_BR), the English word's idf-weighted
//       unit vector is ranked by cosine against EVERY word of the Spanish edition, and of the Portuguese edition. Ties are credited fractionally. Top-5 hit rate, averaged
//       over pairs and over the two target languages, exceeds the MAXIMUM over 200 draws that reassign the gold targets at random.
//   L3  reported, not claimed: top-1 and top-5 per target language, the share of gold English words that occur in exactly one unit (where ties are unavoidable),
//       and the 8 pairs with the best and the 8 with the worst fractional rank.
import { readFileSync, writeFileSync } from "node:fs";
import { readAll } from "./build-mind-beings.mjs";
import { tokensOf, shuffle, mulberry } from "./ring1.mjs";
import { UNITS } from "./read-beings.mjs";
const rnd = mulberry(101), { rows } = await readAll({ settle: () => null });
const lex = (r) => { const m = new Map(); r.frames.forEach((f, u) => { for (const w of new Set(tokensOf(f, r.hearing.ear))) { if (!/^\p{L}[\p{L}\p{M}'’]*$/u.test(w) || w.length < 2) continue; (m.get(w) ?? m.set(w, new Set()).get(w)).add(u); } }); return m; };
const L = new Map(rows.map((r) => [r.file, { r, lex: lex(r) }]));
console.log(JSON.stringify({ editions: rows.length, languageCodes: new Set(rows.map((r) => r.code)).size, wordsMean: Math.round([...L.values()].reduce((a, x) => a + x.lex.size, 0) / L.size) }));

// ---- L1 ----
const byCode = new Map(); for (const r of rows) (byCode.get(r.code) ?? byCode.set(r.code, []).get(r.code)).push(r);
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const L1rows = []; for (const [code, rs] of byCode) { if (rs.length < 2) continue; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const A = L.get(rs[i].file).lex, B = L.get(rs[j].file).lex, shared = [...A.keys()].filter((w) => B.has(w) && A.get(w).size < UNITS * 0.5); if (shared.length < 30) continue; const real = shared.reduce((s, w) => s + jac(A.get(w), B.get(w)), 0) / shared.length; const nulls = Array.from({ length: 200 }, () => { const sh = shuffle(shared, rnd); return shared.reduce((s, w, k) => s + jac(A.get(w), B.get(sh[k])), 0) / shared.length; }); L1rows.push({ code, a: rs[i].file, b: rs[j].file, shared: shared.length, real: +real.toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), holds: real > Math.max(...nulls) }); } }
// ---- L2 ----
const gold = JSON.parse(readFileSync(new URL("./gold/udhr-xling-pairs.json", import.meta.url), "utf8")).pairs;
const E = L.get("udhr-eng.txt")?.lex, S = L.get("udhr-spa.txt")?.lex, P = L.get("udhr-por_BR.txt")?.lex;
const vec = (set) => { const w = Math.log(UNITS / set.size), v = new Array(UNITS).fill(0); for (const u of set) v[u] = w; return v; };
const cosv = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < UNITS; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
const used = gold.map(([e, s, p]) => ({ e, s, p })).filter((x) => E.has(x.e) && S.has(x.s) && P.has(x.p));
function rankInfo(srcSet, lexT, target) { const q = vec(srcSet), sc = new Map([...lexT].map(([w, set]) => [w, cosv(q, vec(set))])), st = sc.get(target); let greater = 0, ties = 0; for (const s of sc.values()) { if (s > st + 1e-12) greater++; else if (Math.abs(s - st) <= 1e-12) ties++; } return { greater, ties }; }
const hit = (ri, k) => Math.max(0, Math.min(1, (k - ri.greater) / ri.ties));
const score = (targets) => { const out = { spa: [], por: [] }; used.forEach((x, i) => { out.spa.push(rankInfo(E.get(x.e), S, targets.s[i])); out.por.push(rankInfo(E.get(x.e), P, targets.p[i])); }); return out; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length, real = score({ s: used.map((x) => x.s), p: used.map((x) => x.p) });
const top = (k) => mean([...real.spa, ...real.por].map((ri) => hit(ri, k))), topL = (arr, k) => mean(arr.map((ri) => hit(ri, k)));
const nulls = Array.from({ length: 200 }, () => { const ss = shuffle(used.map((x) => x.s), rnd), pp = shuffle(used.map((x) => x.p), rnd), sc = score({ s: ss, p: pp }); return mean([...sc.spa, ...sc.por].map((ri) => hit(ri, 5))); });
const frac = (ri) => (ri.greater + (ri.ties - 1) / 2) / ((ri.greater + ri.ties) || 1), ranked = used.map((x, i) => ({ pair: `${x.e}→${x.s}/${x.p}`, rank: +(real.spa[i].greater + real.spa[i].ties / 2 + real.por[i].greater + real.por[i].ties / 2).toFixed(1) })).sort((a, b) => a.rank - b.rank);
const out = {
  L1: { pairsOfEditions: L1rows.length, editionPairsHolding: L1rows.filter((r) => r.holds).length, meanJaccard: +mean(L1rows.map((r) => r.real)).toFixed(3), meanNullMax: +mean(L1rows.map((r) => r.nullMax)).toFixed(3), holds: L1rows.length > 0 && L1rows.every((r) => r.holds), sample: L1rows.slice(0, 5) },
  L2: { goldPairsUsed: used.length, of: gold.length, top5: +top(5).toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), nullMean: +mean(nulls).toFixed(3), holds: top(5) > Math.max(...nulls) },
  L3: { top1: { spa: +topL(real.spa, 1).toFixed(3), por: +topL(real.por, 1).toFixed(3) }, top5: { spa: +topL(real.spa, 5).toFixed(3), por: +topL(real.por, 5).toFixed(3) }, englishGoldInOneUnit: +(used.filter((x) => E.get(x.e).size === 1).length / used.length).toFixed(3), best: ranked.slice(0, 8).map((r) => `${r.pair}(${r.rank})`).join(" "), worst: ranked.slice(-8).map((r) => `${r.pair}(${r.rank})`).join(" ") },
};
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./referent-lexicon-report.json", import.meta.url), JSON.stringify({ out, L1rows }, null, 1) + "\n");
