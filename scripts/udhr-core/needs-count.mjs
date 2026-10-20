// How many needs does ingestion actually raise (nothing looked up yet)? This is the whole demand on the outside sources.
import { readAll } from "./build-mind-beings.mjs";
const { rows } = await readAll({ settle: () => null });
const per = rows.map((r) => r.needs.length).sort((a, b) => a - b);
const q = (p) => per[Math.min(per.length - 1, Math.floor(p * per.length))];
const all = new Set(); for (const r of rows) for (const n of r.needs) all.add(`${r.code}|${n.surface}`);
const byKind = {}; for (const r of rows) { const k = r.kind; (byKind[k] ??= { editions: 0, needs: 0 }); byKind[k].editions++; byKind[k].needs += r.needs.length; }
const five = ["eng", "spa", "arb", "cmn_hans", "swh"].map((s) => { const r = rows.find((x) => x.file === `udhr-${s}.txt`); return `${s}:${r ? r.needs.length : "-"}`; });
console.log(JSON.stringify({ editionsRead: rows.length, editionsWithANeed: rows.filter((r) => r.needs.length).length, needsPerEdition: { median: q(0.5), p90: q(0.9), max: per.at(-1) }, totalDistinctNeeds: all.size, unseenBeingsAdmitted: rows.reduce((a, r) => a + r.unseenAdmitted, 0), byPriorKind: byKind, pilotFive: five.join(" ") }, null, 1));
