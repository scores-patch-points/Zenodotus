// udhr-core/region-read.mjs — do voices from different PLACES speak to different rights? Ring 1 treated the admitted anti-colonial documents as one block; each declares a region.
// Groups (admitted English documents of 21-anti-colonial, by the declared `region`): africa (africa, south africa, egypt, algeria), india, caribbean (caribbean, west indies, cuba), and the reference block
// `global` (declared "global"). Each region is contrasted with `global`, so the contrast is within the same collection (genre and curation are shared more than with the novels). The English Declaration
// model and profile are ring1.mjs's.
// PRE-REGISTERED before the run (2026-10-20):
//   RG1  for each region, the total-variation distance between its profile and `global`'s exceeds the MAXIMUM over 200 draws that reassign documents between the two (sizes kept).
//   RG2  a unit is PARTICULAR to a region iff its share exceeds `global`'s in at least 190 of 200 bootstrap resamples of documents AND the ratio is at least 1.25. Reported per region.
//   Caution fixed in advance: region is metadata, and period, genre (treatise, speech, memoir) and translation are NOT controlled; a regional difference may be an era or genre difference.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, profileDocument, meanOf, permutationTest, walk, frontmatter, gutenbergBody, mulberry, ROOT } from "./ring1.mjs";
import { admitted } from "./perspective-gate.mjs";
const isEn = (l) => /^(en|english)\b/i.test(l ?? ""), GROUP = (r) => { r = (r ?? "").toLowerCase().split(/[;,(]/)[0].trim(); return /^(africa|south africa|egypt|algeria)$/.test(r) ? "africa" : r === "india" ? "india" : /^(caribbean|west indies|cuba)$/.test(r) ? "caribbean" : r === "global" ? "global" : null; };
const m = await modelOf("eng"), docs = { africa: [], india: [], caribbean: [], global: [] };
for (const p of walk(join(ROOT, "21-anti-colonial"))) { const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language) || !admitted(p).admit) continue; const g = GROUP(meta.region); if (g) docs[g].push({ p, text: gutenbergBody(body) }); }
const prof = (ds) => ds.map((d) => profileDocument(d.text, m)).filter(Boolean).map((r) => r.profile), P = Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, prof(v)]));
console.log(JSON.stringify({ documents: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, `${P[k].length} profiled of ${v.length}`])) }));
const rr = mulberry(53), boot = (a) => Array.from({ length: a.length }, () => a[Math.floor(rr() * a.length)]), unit = (u) => (u === 0 ? "preamble" : `art ${u}`), out = {};
for (const r of ["africa", "india", "caribbean"]) {
  const RG1 = permutationTest(P[r], P.global), wins = new Array(31).fill(0); for (let i = 0; i < 200; i++) { const a = meanOf(boot(P[r])), b = meanOf(boot(P.global)); for (let u = 0; u < 31; u++) if (a[u] > b[u]) wins[u]++; }
  const a = meanOf(P[r]), b = meanOf(P.global), part = a.map((x, u) => ({ u, wins: wins[u], ratio: b[u] ? x / b[u] : null, share: x })).filter((x) => x.wins >= 190 && x.ratio >= 1.25).sort((x, y) => y.ratio - x.ratio);
  out[r] = { documents: P[r].length, RG1, RG2_particularUnits: part.map((x) => `${unit(x.u)} x${x.ratio.toFixed(2)} (${x.wins}/200, ${(x.share * 100).toFixed(1)}%)`), underIndexed: a.map((x, u) => ({ u, ratio: b[u] ? x / b[u] : 9 })).filter((x) => x.ratio <= 0.8).sort((x, y) => x.ratio - y.ratio).slice(0, 4).map((x) => `${unit(x.u)} x${x.ratio.toFixed(2)}`), units: part.map((x) => x.u) };
}
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./region-read-report.json", import.meta.url), JSON.stringify({ documents: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.length])), out }, null, 1) + "\n");
