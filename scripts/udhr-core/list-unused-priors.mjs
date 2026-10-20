// Priors that exist in janus/priors but that no UDHR edition resolves to: candidates for a code-mapping fix.
import { readFileSync, readdirSync } from "node:fs";
import { findPosPrior } from "./read-beings.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname;
const PRI = new URL("../../../janus/priors/", import.meta.url).pathname;
const have = readdirSync(PRI).filter((f) => /^pos-[a-z0-9-]+\.json$/.test(f)).map((f) => f.replace(/^pos-|\.json$/g, ""));
const used = new Set();
for (const f of readdirSync(DIR).filter((x) => /^udhr-.+\.txt$/.test(x))) {
  const raw = readFileSync(DIR + f, "utf8"), stem = f.replace(/^udhr-|\.txt$/g, "");
  const code = ((raw.split("\n")[1] ?? "").match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  const r = await findPosPrior(code, stem);
  if (r) used.add(r.name);
}
const unused = have.filter((n) => !used.has(n));
console.log(`priors ${have.length}, used by an edition ${used.size}, unused ${unused.length}`);
console.log(unused.join(" "));
