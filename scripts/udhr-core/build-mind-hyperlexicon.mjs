// Append the hyperlexicon domain to a COPY of the mind log (default: _scratch.eot), over the independent-prior editions.   node build-mind-hyperlexicon.mjs [out.eot]
import { copyFileSync, readFileSync } from "node:fs";
import { readAll } from "./build-mind-beings.mjs";
import { replayHyperlexicon } from "./hyperlexicon-link.mjs";
import { domainTip } from "./revise.mjs";

const SRC = new URL("./mind.eot", import.meta.url).pathname;
const out = process.argv[2] ?? new URL("./_scratch.eot", import.meta.url).pathname;
copyFileSync(SRC, out);
const charterRoot = domainTip(readFileSync(out), "udhr-core")?.root;
if (!charterRoot) throw new Error("the log holds no udhr-core ground to bind the given rows to");
const { rows } = await readAll();
const independent = rows.filter((r) => r.kind !== "projected-from-UDHR");
const r = replayHyperlexicon(out, independent, { charterRoot });
const all = Object.values(r.hl.composition);
console.log(JSON.stringify({ charterRoot, editions: independent.length, records: r.steps.length, rowsAtEnd: all.length, given: all.filter((x) => x.standing === "given").length, candidate: all.filter((x) => x.standing === "candidate").length, beingsPairsAsCandidates: all.filter((x) => x.meta?.source === "beings").length, bytes: readFileSync(out).length }, null, 1));
for (const s of r.steps.slice(0, 8)) console.log(JSON.stringify(s));
console.log("...");
for (const s of r.steps.slice(-3)) console.log(JSON.stringify(s));
