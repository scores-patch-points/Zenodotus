// Measure the cues against each other.
//  1. layout vs the digit-numbered headings (independent cue) on editions where both apply
//  2. structural DP vs layout on every layout edition (flatten the blank runs so layout cannot fire)
import { readFileSync, readdirSync } from "node:fs";
import * as seg from "./segment.mjs";
const dir = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const c = { layout: 0, numbered: 0, structural: 0, gap: 0, numberCheck: { agrees: 0, disagrees: 0, "n/a": 0 }, structuralVsLayout: { same: 0, off: 0, gap: 0 } };
const off = [];
for (const f of readdirSync(dir).filter((x) => /^udhr-.*\.txt$/.test(x)).sort()) {
  const t = readFileSync(new URL(f, dir), "utf8"), a = seg.segmentEdition(t);
  if (a.gap) { c.gap++; continue; }
  c[a.method]++; c.numberCheck[a.numberCheck]++;
  if (a.method !== "layout") continue;
  const flat = t.replace(/\n{3,}/g, "\n\n").split("\n").map((l, i) => i >= 4 && l.trim().length <= 40 ? l.replace(/\p{Nd}+/gu, "#") : l).join("\n");
  const b = seg.segmentEdition(flat);
  if (b.gap || b.method !== "structural") { c.structuralVsLayout.gap++; continue; }
  const ia = seg.blocksOf(t).blocks.map((x) => x.start), ib = seg.blocksOf(flat).blocks.map((x) => x.start);
  const key = (arr, u) => arr.indexOf(u.heading.start);
  const same = a.units.length === b.units.length && a.units.every((u, k) => u.unit === b.units[k].unit && key(ia, u) === key(ib, b.units[k]));
  if (same) c.structuralVsLayout.same++; else { c.structuralVsLayout.off++; off.push(f); }
}
console.log(JSON.stringify(c));
if (off.length) console.log("structural off:", off.length, off.slice(0, 12).join(" "));
