// udhr-core/build-mind-standpoints.mjs — record how reading each STANDPOINT changed the reader's understanding of what that standpoint recurs on, in its own terms.
// Domain udhr-core/standpoints. Items are (standpoint, being): `sp:<standpoint>:<noun>`, the 20 nouns most distinctive of the standpoint against the other admitted standpoints
// (perspective-profiles.mjs PP2), for the standpoints provenance/standpoints.json selects (PP1 held-out validation passed and the signal is not collection or period style).
// One DMDN per standpoint (step = order in the file); SURPRISE: the Beta carry model over the universe of every standpoint's candidate items, replayed in order.
// No Declaration unit is involved. Source = sha256 prefix of the profiles report. Candidate standing; the log holds the change, never the text read.
// Usage: node build-mind-standpoints.mjs <path to the log>
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { makeCarryModel } from "./surprise.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex"), id8 = (n) => sha(n).slice(0, 16), NONE = "00".repeat(16), rootOf = (set) => sha([...set].sort().join("\n")).slice(0, 32), out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-standpoints.mjs <log>");
const here = (f) => new URL(`./${f}`, import.meta.url), sel = JSON.parse(readFileSync(here("provenance/standpoints.json"), "utf8")), rawReport = readFileSync(here(sel.report)), report = JSON.parse(rawReport);
export const itemsOf = (rep, g) => rep.out[g].top20.map((s) => `sp:${g}:${s.split(" ")[0]}`);
const universe = Object.keys(report.out).flatMap((g) => itemsOf(report, g)), model = makeCarryModel(universe), DOM = "udhr-core/standpoints", dom = E.domainOf(DOM), source = sha(rawReport).slice(0, 20);
let cum = new Set(), before = NONE, steps = [];
sel.recorded.forEach((g, step) => {
  const add = itemsOf(report, g); for (const i of add) cum.add(i);
  const s = model.observe(new Set(cum)), after = rootOf(cum);
  E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step, source, before, after, surpriseBits: s, absorbedBits: 0, changes: add.map((i) => ({ id: id8(i), from: 0, to: 1 })) }));
  steps.push({ standpoint: g, items: add.length, surpriseBits: +s.toFixed(2) }); before = after;
});
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: before, setRoot: sha(Buffer.concat([rawReport, readFileSync(here("provenance/standpoints.json")), readFileSync(here("perspective-policy.json"))])).slice(0, 32), editions: sel.recorded.length, units: cum.size }));
const v = E.scan(readFileSync(out)); console.log(JSON.stringify({ ok: v.ok, records: v.records?.length, bytes: readFileSync(out).length, steps }, null, 1));
