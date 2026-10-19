// One command: rebuild the whole UDHR core from the corpus and print the mind.   node all.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const here = (f) => new URL(f, import.meta.url).pathname;
const run = (f) => execFileSync(process.execPath, [here(f)], { encoding: "utf8", maxBuffer: 1 << 28 });
run("build.mjs");                 // steps 1-7: edition set, segmentation, log, referents, relations, charter root, variants
run("run-convergence.mjs");       // step 9: pre-registered leave-k-out test, filed on the log and the record
run("dmd-ledger.mjs");           // window, pivots, margins
run("build-mind.mjs");           // the one log: mind.eot (paragraph structure)
run("build-mind-props.mjs");     // appended to it: the propositions (five hand-adjudicated readings)
const { loadLedger, LOG } = await import("./build.mjs");
const { mindAt } = await import("./mind.mjs");
const epochs = JSON.parse(readFileSync(here("epochs.json"), "utf8"));
const mind = mindAt(loadLedger(JSON.parse(readFileSync(LOG, "utf8"))), { epochs });
writeFileSync(here("mind.json"), JSON.stringify(mind, null, 1) + "\n");
console.log(mind.judgment.slice(0, 600) + (mind.judgment.length > 600 ? " …" : ""));
console.log(JSON.stringify({ charterRoot: mind.charterRoot, referents: mind.referents, stated: mind.stated.length, candidates: mind.candidates.length, variants: mind.variants, convergence: mind.convergence }, null, 1));
