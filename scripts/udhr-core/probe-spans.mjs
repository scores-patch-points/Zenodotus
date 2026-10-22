// Can tight sub-paragraph spans be DERIVED from the gold's own surface strings (end1 / label / end2)?
import { readFileSync } from "node:fs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const EDS = ["eng", "spa", "arb", "cmn_hans", "swh"];
const norm = (s) => s.normalize("NFC").replace(/\s+/g, " ").trim();
function locate(para, needle) {                      // all occurrences of needle in para, whitespace-insensitive
  const rx = new RegExp(needle.normalize("NFC").trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "gu");
  return [...para.matchAll(rx)].map((m) => [m.index, m.index + m[0].length]);
}
const tot = {};
for (const c of EDS) {
  const buf = readFileSync(new URL(`udhr-${c}.txt`, DIR));
  const obs = readFileSync(new URL(`udhr-${c}.txt.hand.eot.jsonl`, DIR), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1");
  const t = { rows: 0, ends: 0, unique: 0, multiple: 0, missing: 0, ordered: 0, ordTotal: 0, miss: [] };
  for (const o of obs) {
    if (!o.end1 && !o.end2) continue;                  // headings
    t.rows++;
    const para = buf.subarray(o.at[0], o.at[1]).toString("utf8");
    const found = {};
    for (const [slot, s] of [["end1", o.end1], ["label", o.label], ["end2", o.end2]]) {
      if (!s) continue; t.ends++;
      const hits = locate(para, s);
      if (hits.length === 1) { t.unique++; found[slot] = hits[0]; } else if (hits.length > 1) { t.multiple++; found[slot] = hits; } else { t.missing++; if (t.miss.length < 3) t.miss.push(`${o.prop}.${slot}: ${s.slice(0, 40)}`); }
    }
    const pos = ["end1", "label", "end2"].map((k) => found[k]).filter((x) => x && typeof x[0] === "number");
    if (pos.length === 3) { t.ordTotal++; if (pos[0][0] < pos[1][0] && pos[1][0] < pos[2][0]) t.ordered++; }
  }
  console.log(c.padEnd(9), `rows ${t.rows}  surfaces ${t.ends}  unique ${t.unique} (${(100 * t.unique / t.ends).toFixed(0)}%)  repeated ${t.multiple}  not found ${t.missing}  subject<relation<object in ${t.ordered}/${t.ordTotal} fully-located rows`, t.miss.length ? "\n          e.g. " + t.miss.join(" | ") : "");
}
