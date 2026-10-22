// Run the pre-registered convergence test once, file it as a `verify` event in the log and on penelope's record.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadLedger, LOG, MANIFEST } from "./build.mjs";
import { runConvergence, CONTROL, CONVERGENCE_SCHEMA } from "./convergence.mjs";
import { structureRoot } from "./charter.mjs";
import { recordHyperlexiconEpoch } from "../../../penelope/organs/hyperlexicon-record.mjs";

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const eotFile = JSON.parse(readFileSync(LOG, "utf8"));
const ledger = loadLedger(eotFile);
const root = structureRoot(ledger);
const r = runConvergence(ledger, { setRoot: manifest.root });
const before = ledger.events.length;
ledger.event({ stage: "verify", unit: "charter:udhr", transform: "convergence", detail: { ...r, charterRoot: root, control: CONTROL } });
writeFileSync(LOG, JSON.stringify(ledger.eot({ root: ledger.events.at(-1).event_id })) + "\n");
writeFileSync(new URL("./convergence.json", import.meta.url), JSON.stringify({ ...r, charterRoot: root, control: CONTROL }, null, 1) + "\n");

// penelope's append-only ledger of the hyperlexicon: the epoch is filed with evidence and its falsifying control
const EPOCHS = new URL("./epochs.json", import.meta.url);
const history = existsSync(EPOCHS) ? JSON.parse(readFileSync(EPOCHS, "utf8")) : [];
const c16 = r.curve.find((c) => c.k === r.claimK);
const epochId = `hl:epoch:udhr-core:convergence:${manifest.root}`;
const next = history.some((h) => h.id === epochId) ? history : recordHyperlexiconEpoch(history, {   // append-only: an epoch already on the record is not re-filed
  id: `hl:epoch:udhr-core:convergence:${manifest.root}`, at: "2026-10-19T00:00:00.000Z",
  reading: "udhr-core: leave-k-out convergence of the referent structure", rowId: `charter:udhr:${root}`,
  acted: r.holds ? "corroborated" : "refuted",
  verdict: { method: "leave_k_out_convergence", success: r.holds, effect: c16.articleExact, pValue: null, witness: `${r.editions} editions; ${r.draws} draws/k; seed ${manifest.root}` },
  reason: `${CONVERGENCE_SCHEMA}: article-level structure reproduced by ${c16.articleExact * 100}% of draws at k=${r.claimK}; whole-structure (with preamble) by ${c16.wholeExact * 100}%`,
  falsifyingControl: CONTROL,
});
writeFileSync(EPOCHS, JSON.stringify(next, null, 1) + "\n");
console.log(JSON.stringify({ added: ledger.events.length - before, holds: r.holds, softest: r.softest }));
console.log("k   articleExact wholeExact meanJ   minJ    preambleHasStructure");
for (const c of r.curve) console.log(String(c.k).padEnd(4), String(c.articleExact).padEnd(12), String(c.wholeExact).padEnd(10), String(c.meanJaccard).padEnd(7), String(c.minJaccard).padEnd(7), c.preambleHasStructure);
