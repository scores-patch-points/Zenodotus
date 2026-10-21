// udhr-core/charter-align.mjs — how do a charter's provisions relate to the Declaration's units? (UNDRIP first; the six UN languages)
// For each language L the Declaration's edition in L gives a model (ring1.mjs: beings per unit, idf weights). UNDRIP's edition in L is cut into its 46 provisions
// (charters/ground.mjs provisionsOf, the charters session's code, imported unchanged) and each provision is scored against the 31 units. A provision "speaks to" a unit only if its best idf-cosine beats the 95th percentile of
// a NULL made from the language's own text (the provisions' words shuffled across the 46 slots, 100 times); otherwise it speaks to NO unit in that language.
// RUN 2 (same day, claims unchanged): run 1 found Arabic matched nothing (null threshold exactly 0): the Arabic text layer is written in Arabic Presentation Forms with elongation marks (U+0640) inside words.
// Texts are now NFKC-normalised and U+0640 is removed before cutting and scoring. Run 1 is kept in _align-run1.log.
// Page scans (manifest `via: ocr:`) are text, not structure: they are used here only if the manifest marks them readable, and flagged.
//
// PRE-REGISTERED before the first run (2026-10-20):
//   A1  CROSS-LINGUAL CONSISTENCY. A provision is CONSENSUAL if at least 4 of the 6 languages speak to the SAME unit. The number of consensual provisions exceeds the MAXIMUM over 200 permutations that
//       shuffle the provisions independently within each language (breaking the correspondence between translations).
//   A2  reported: the strongest consensual provisions with their Declaration unit (read by eye), and the units no provision reaches.
//   A3  reported, not claimed: the provisions that speak to NO unit in at least 4 languages ("what the charter says that the Declaration's own vocabulary does not reach"), listed by number.
//   Control: the null redeals the provisions' words and the correspondence; a language whose model or cut fails is dropped with its reason, and A1 is judged on the languages that remain (at least 4 needed).
import { readFileSync, existsSync } from "node:fs";
import { modelOf, scoreTokens, tokensOf, shuffle, mulberry } from "./ring1.mjs";
import { provisionsOf } from "./charters/ground.mjs";
const DIR = new URL("../../06-government-legal/charters/undrip/", import.meta.url), N = 46, rnd = mulberry(77);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", DIR), "utf8")), via = Object.fromEntries(manifest.editions.map((e) => [e.code, e.via ?? "text-layer"]));
const LANGS = { en: "eng", fr: "fra", es: "spa", ru: "rus", ar: "arb", zh: "cmn_hans" }, unit = (u) => (u === 0 ? "preamble" : `art ${u}`);
const per = {}, dropped = {};
for (const [code, stem] of Object.entries(LANGS)) {
  const f = new URL(`${code}.txt`, DIR); if (!existsSync(f)) { dropped[code] = "no text"; continue; }
  const m = await modelOf(stem); if (!m) { dropped[code] = `no Declaration model for ${stem}`; continue; }
  const prov = provisionsOf(readFileSync(f, "utf8").normalize("NFKC").replace(/\u0640/g, ""), N); if (!prov) { dropped[code] = `could not be cut into ${N} provisions`; continue; }
  const toks = prov.map((p) => tokensOf(p, m.hearing.ear)), lens = toks.map((t) => t.length), pool = toks.flat(), nullMax = [];
  for (let r = 0; r < 100; r++) { const sh = shuffle(pool, rnd); let o = 0; for (const n of lens) { const sc = scoreTokens(sh.slice(o, o + n), m); o += n; nullMax.push(sc ? Math.max(...sc.s) : 0); } }
  nullMax.sort((a, b) => a - b); const thr = nullMax[Math.floor(nullMax.length * 0.95)];
  const rows = toks.map((t) => { const sc = scoreTokens(t, m); if (!sc) return null; const best = Math.max(...sc.s); return best > thr ? sc.s.indexOf(best) : null; });
  per[code] = { stem, via: via[code], speaking: rows.filter((x) => x != null).length, rows, thr: +thr.toFixed(3) };
}
const langs = Object.keys(per), consensus = (rowsByLang) => { const out = []; for (let k = 0; k < N; k++) { const votes = new Map(); for (const l of langs) { const u = rowsByLang[l][k]; if (u != null) votes.set(u, (votes.get(u) ?? 0) + 1); } const best = [...votes].sort((a, b) => b[1] - a[1])[0]; out.push(best && best[1] >= 4 ? { unit: best[0], agree: best[1] } : null); } return out; };
const real = consensus(Object.fromEntries(langs.map((l) => [l, per[l].rows]))), nReal = real.filter(Boolean).length;
const nulls = Array.from({ length: 200 }, () => consensus(Object.fromEntries(langs.map((l) => [l, shuffle(per[l].rows, rnd)]))).filter(Boolean).length);
const noUnit = Array.from({ length: N }, (_, k) => langs.filter((l) => per[l].rows[k] == null).length).map((c, k) => (c >= 4 ? k + 1 : null)).filter(Boolean);
const reached = new Set(real.filter(Boolean).map((x) => x.unit));
const out = { languagesUsed: langs, dropped, perLanguage: Object.fromEntries(langs.map((l) => [l, { edition: per[l].via, provisionsSpeakingToAUnit: `${per[l].speaking} of ${N}`, nullThreshold: per[l].thr }])),
  A1: { consensualProvisions: nReal, nullMax: Math.max(...nulls), nullMean: +(nulls.reduce((a, b) => a + b, 0) / nulls.length).toFixed(2), holds: langs.length >= 4 && nReal > Math.max(...nulls) },
  A2: { strongest: real.map((x, k) => (x ? { provision: k + 1, unit: unit(x.unit), agree: `${x.agree} of ${langs.length}` } : null)).filter(Boolean).sort((a, b) => parseInt(b.agree) - parseInt(a.agree)).slice(0, 12), unitsReached: [...reached].sort((a, b) => a - b).map(unit) },
  A3_speakToNoUnitInAtLeast4Languages: noUnit };
console.log(JSON.stringify(out, null, 1));
