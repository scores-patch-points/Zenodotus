import { readFileSync } from "node:fs";
import { hearingFor, readUnits, UNITS } from "./read-beings.mjs";
import { loadLedger, LOG, CORPUS } from "./build.mjs";
const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
const byEd = new Map();
for (const e of full.events) { if (e.stage !== "arrange" || !e.unit || e.unit === "title") continue; if (!byEd.has(e.source_id)) byEd.set(e.source_id, []); byEd.get(e.source_id).push(e); }
const ord = (u) => (u === "preamble" ? 0 : +u.slice(8));
const rows = [];
for (const [sid, evs] of [...byEd].sort((a, b) => (full.sources.get(a[0]).locator < full.sources.get(b[0]).locator ? -1 : 1))) {
  const f = full.sources.get(sid).locator.split("/").pop(), raw = readFileSync(new URL(f, CORPUS), "utf8"), buf = Buffer.from(raw, "utf8");
  const code = (raw.split("\n")[1].match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  const h = await hearingFor(code, raw.slice(300, 900), f.replace(/^udhr-|\.txt$/g, "")); if (h.gap) continue;
  evs.sort((a, b) => ord(a.unit) - ord(b.unit));
  if (evs.length !== UNITS) continue;                                   // editions with no preamble have 30 units: not comparable unit-for-unit
  const frames = evs.map((e) => e.detail.paragraphs.map(([s, t]) => buf.subarray(s, t).toString("utf8")).join(" \n"));
  const r = readUnits(frames, h); if (r.gap) continue;
  rows.push({ file: f, code, nn: r.nn, beings: r.beings });
}
console.log("readable editions with all 31 units:", rows.length);
// modal nearest neighbour per unit, and its share
let sum = 0, strong = 0; const per = [];
for (let u = 0; u < UNITS; u++) { const t = new Map(); for (const r of rows) if (r.nn[u] >= 0) t.set(r.nn[u], (t.get(r.nn[u]) ?? 0) + 1); const best = [...t].sort((a, b) => b[1] - a[1])[0]; const of = [...t.values()].reduce((a, b) => a + b, 0); per.push({ u, nn: best?.[0], share: +(best?.[1] / of).toFixed(3) }); sum += best?.[1] / of; if (best?.[1] / of > 0.5) strong++; }
console.log("mean modal-NN share:", (sum / UNITS).toFixed(3), " units with a majority NN:", strong, "/", UNITS);
console.log(per.map((x) => `${x.u}->${x.nn}:${x.share}`).join(" "));
// null: permute the unit labels of each edition's nn map independently
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let nsum = 0; const NR = 20;
for (let rep = 0; rep < NR; rep++) {
  const perm = rows.map(() => { const p = Array.from({ length: UNITS }, (_, i) => i); for (let i = UNITS - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; });
  let s2 = 0;
  for (let u = 0; u < UNITS; u++) { const t = new Map(); rows.forEach((r, k) => { const pu = perm[k][u], pn = r.nn[pu] >= 0 ? perm[k][r.nn[pu]] : -1; if (pn >= 0) t.set(pn, (t.get(pn) ?? 0) + 1); }); const best = Math.max(...t.values()); s2 += best / [...t.values()].reduce((a, b) => a + b, 0); }
  nsum += s2 / UNITS;
}
console.log("null (unit labels permuted per edition) mean modal-NN share:", (nsum / NR).toFixed(3));
const bySize = rows.map((r) => r.beings); console.log("beings per edition: min/median/max", Math.min(...bySize), bySize.sort((a, b) => a - b)[bySize.length >> 1], Math.max(...bySize));
