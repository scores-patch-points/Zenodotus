// SECOND RUN (2026-10-20): the first run (max 3 units, referent-alignment-v1-report.json) was UNDERPOWERED by its own rule (6 and 8 gold-covered pairs, 10 needed;
// 22 and 32 aligned pairs in all; precision where scorable 6/6 and 7/8). This run raises the distinctiveness limit from 3 units to 5 (env MAXDF=5), nothing else, with the
// SAME claim L4 (precision >= 0.80, >= 10 gold-covered pairs per language to be judged), set before this run's results were seen. A fail here is a fail.
// udhr-core/referent-alignment.mjs — which words in two languages name the SAME referents, as a conclusion the mind log can hold.
//
// From referent-lexicon.mjs: each edition's words carry the set of units they appear in. A pair (English word w, other-language word v) is ALIGNED iff
//   (a) both appear in 1 to MAXDF units (3 in the first run, 5 in the second) (distinctive: a word spread over the Declaration cannot be placed),
//   (b) v is the UNIQUE best match for w by cosine of the idf-weighted unit vectors, with no tie at the top, AND
//   (c) w is the UNIQUE best match for v among English words (mutual, no ties both ways).
// Languages: Spanish (spa) and Portuguese (por_BR) against English (eng), from the editions already read. Nothing outside the Declaration is used.
//
// PRE-REGISTERED before the first run (2026-10-20):
//   L4  PRECISION. Among aligned pairs whose English word is one of the gold pairs (gold/udhr-xling-pairs.json, forms present in all three editions),
//       the fraction whose other-language word equals the gold target is at least 0.80 for each of Spanish and Portuguese. At least 10 gold-covered pairs are
//       needed in each language for the claim to be judged; fewer is reported as "underpowered", not as a pass.
//   L5  reported, not claimed: the number of aligned pairs per language, the share of the English edition's distinctive words that get aligned, and 12 aligned
//       pairs per language read by eye (a sample not restricted to the gold list).
// If L4 holds, the aligned pairs are written to referent-alignment.json (word pairs, with their unit sets) and the log records the SET by identity.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readAll } from "./build-mind-beings.mjs";
import { tokensOf, mulberry, shuffle } from "./ring1.mjs";
import { UNITS } from "./read-beings.mjs";
const MAXDF = +(process.env.MAXDF ?? 3);
const { rows } = await readAll({ settle: () => null }), rnd = mulberry(3);
const lex = (r) => { const m = new Map(); r.frames.forEach((f, u) => { for (const w of new Set(tokensOf(f, r.hearing.ear))) { if (!/^\p{L}[\p{L}\p{M}'’]*$/u.test(w) || w.length < 3) continue; (m.get(w) ?? m.set(w, new Set()).get(w)).add(u); } }); return m; };
const get = (file) => lex(rows.find((r) => r.file === file)), E = get("udhr-eng.txt"), T = { spa: get("udhr-spa.txt"), por: get("udhr-por_BR.txt") };
const vec = (set) => { const w = Math.log(UNITS / set.size), v = new Array(UNITS).fill(0); for (const u of set) v[u] = w; return v; }, cosv = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < UNITS; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
const dist = (m) => new Map([...m].filter(([, s]) => s.size >= 1 && s.size <= MAXDF).map(([w, s]) => [w, vec(s)]));
const bestUnique = (q, pool) => { let best = null, bs = -1, tie = false; for (const [w, v] of pool) { const s = cosv(q, v); if (s > bs + 1e-12) { bs = s; best = w; tie = false; } else if (Math.abs(s - bs) <= 1e-12) tie = true; } return tie ? null : best; };
const gold = JSON.parse(readFileSync(new URL("./gold/udhr-xling-pairs.json", import.meta.url), "utf8")).pairs, ED = dist(E), result = {}, files = {};
for (const [lang, idx] of [["spa", 1], ["por", 2]]) {
  const other = dist(T[lang]), pairs = [];
  for (const [w, q] of ED) { const v = bestUnique(q, other); if (v && bestUnique(other.get(v), ED) === w) pairs.push([w, v, [...E.get(w)], [...T[lang].get(v)]]); }
  const tgt = new Map(gold.filter((g) => E.has(g[0]) && T[lang].has(g[idx])).map((g) => [g[0], g[idx]])), cov = pairs.filter(([w]) => tgt.has(w)), ok = cov.filter(([w, v]) => tgt.get(w) === v).length;
  const sample = shuffle(pairs, rnd).slice(0, 12).map(([w, v]) => `${w}→${v}`).join("  ");
  result[lang] = { alignedPairs: pairs.length, distinctiveEnglishWords: ED.size, shareAligned: +(pairs.length / ED.size).toFixed(3), L4: { goldCovered: cov.length, correct: ok, precision: cov.length ? +(ok / cov.length).toFixed(3) : null, minimum: 0.8, judged: cov.length >= 10, holds: cov.length >= 10 && ok / cov.length >= 0.8 }, wrongOnGold: cov.filter(([w, v]) => tgt.get(w) !== v).map(([w, v]) => `${w}→${v}(gold ${tgt.get(w)})`), sample };
  files[lang] = pairs.map(([w, v, uw, uv]) => ({ eng: w, [lang]: v, unitsEng: uw, unitsOther: uv }));
}
console.log(JSON.stringify(result, null, 1));
const ok = Object.values(result).every((r) => r.L4.holds);
if (ok) { writeFileSync(new URL("./referent-alignment.json", import.meta.url), JSON.stringify({ schema: "ReferentAlignment@1", note: "words that name the same Declaration units in two editions: distinctive, mutual best, no ties", editions: { eng: "udhr-eng", spa: "udhr-spa", por: "udhr-por_BR" }, pairs: files }) + "\n"); console.log("L4 holds in both: referent-alignment.json written"); } else console.log("L4 did not hold in both languages: nothing written");
writeFileSync(new URL("./referent-alignment-report.json", import.meta.url), JSON.stringify(result, null, 1) + "\n");
