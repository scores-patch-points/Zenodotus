// udhr-core/build-mind-regions.mjs — record in the mind how reading the anti-colonial voices BY PLACE changed what the mind knows: which units a region's voices concentrate on, beyond the general block.
// Domain udhr-core/ring1-regions. ITEMS `<region>:<unit>` (region in africa, india, caribbean) for the units region-read.mjs found particular to a region (>= 190/200 bootstrap wins over the `global` block and ratio >= 1.25).
// One step: the conclusion goes from nothing to the set. Surprise: the Beta carry model over the 3 x 31 universe. source = root over the sha256 of every document read (provenance/regions-docs.json). setRoot = hash of the report and the manifest.
// Only ADMITTED sources (perspective-gate.mjs). A region with no particular unit contributes no item (Africa and India differ from the block without a unit that clears the bar; that is in the report, not in the log).
// Usage: node build-mind-regions.mjs <path to the log>
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { makeCarryModel } from "./surprise.mjs";
const sha = (x) => createHash("sha256").update(x).digest("hex"), id8 = (n) => sha(n).slice(0, 16), NONE = "00".repeat(16), rootOf = (s) => sha([...s].sort().join("\n")).slice(0, 32), out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-regions.mjs <log>");
const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url)), rep = JSON.parse(read("region-read-report.json")).out, man = JSON.parse(read("provenance/regions-docs.json"));
const items = new Set(Object.entries(rep).flatMap(([r, v]) => v.units.map((u) => `${r}:${u}`))), universe = ["africa", "india", "caribbean"].flatMap((r) => Array.from({ length: 31 }, (_, u) => `${r}:${u}`));
const s = makeCarryModel(universe).observe(items), dom = E.domainOf("udhr-core/ring1-regions"), after = rootOf(items), docRoot = sha(Object.values(man.sets).flatMap((x) => x.files.map((f) => f.sha256)).join("\n")).slice(0, 20);
if (docRoot !== man.root.slice(0, 20)) throw new Error("the manifest root does not match its own files");
E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step: 0, source: docRoot, before: NONE, after, surpriseBits: s, absorbedBits: 0, changes: [...items].map((i) => ({ id: id8(`region:${i}`), from: 0, to: 1 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: after, setRoot: sha(Buffer.concat([read("region-read-report.json"), read("provenance/regions-docs.json")])).slice(0, 32), editions: 4, units: items.size }));
const v = E.scan(readFileSync(out)); console.log(JSON.stringify({ ok: v.ok, records: v.records.length, bytes: readFileSync(out).length, items: [...items], surpriseBits: +s.toFixed(2), source: docRoot }));
