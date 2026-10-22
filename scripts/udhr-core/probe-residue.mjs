// Dump every slot that is NOT uniquely located, with the paragraph, so it can be read by hand.
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const EDS = process.argv.slice(2).length ? process.argv.slice(2) : ["eng", "spa", "arb", "cmn_hans", "swh"];
function locate(para, needle) {
  const rx = new RegExp(needle.normalize("NFC").trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "gu");
  return [...para.matchAll(rx)].map((m) => [m.index, m.index + m[0].length]);
}
const out = [];
for (const c of EDS) {
  const buf = readFileSync(new URL(`udhr-${c}.txt`, DIR));
  const obs = readFileSync(new URL(`udhr-${c}.txt.hand.eot.jsonl`, DIR), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1");
  for (const o of obs) {
    if (!o.end1 && !o.end2) continue;
    const para = buf.subarray(o.at[0], o.at[1]).toString("utf8").replace(/\s+/g, " ").trim();
    for (const [slot, s] of [["subject", o.end1], ["relation", o.label], ["object", o.end2]]) {
      if (!s) continue;
      const h = locate(para, s);
      if (h.length === 1) continue;
      out.push({ c, prop: o.prop, ground: o.ground, slot, surface: s, hits: h.length, note: o.resolutionNote ?? null, para: para.length > 230 ? para.slice(0, 230) + "…" : para });
    }
  }
}
writeFileSync(new URL("residue.json", import.meta.url), JSON.stringify(out, null, 1));
for (const r of out) console.log(`[${r.c}] ${r.prop} (${r.ground}) ${r.slot}=«${r.surface}» hits=${r.hits}${r.note ? " NOTE: " + r.note.slice(0, 90) : ""}\n     ${r.para}`);
console.log("TOTAL", out.length);
