import { readFileSync } from "node:fs";
import { hearingFor } from "./read-beings.mjs";
import { loadLedger, LOG, CORPUS } from "./build.mjs";
const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
const eds = [...full.sources.values()].map((s) => s.locator.split("/").pop()).sort();
let ok = 0, gap = 0, unspaced = 0; const miss = {};
for (const f of eds) {
  const raw = readFileSync(new URL(f, CORPUS), "utf8");
  const code = (raw.split("\n")[1].match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  const h = await hearingFor(code, raw.slice(300, 900), f.replace(/^udhr-|\.txt$/g, ''));
  if (h.gap) { gap++; if (h.unspaced) unspaced++; miss[f] = code; } else ok++;
}
console.log(JSON.stringify({ editions: eds.length, haveHearing: ok, noPrior: gap, ofWhichUnspacedScript: unspaced }));

console.log("no prior (first 60):", Object.keys(miss).map((f) => f.replace(/^udhr-|\.txt$/g, "")).slice(0, 60).join(" "));
