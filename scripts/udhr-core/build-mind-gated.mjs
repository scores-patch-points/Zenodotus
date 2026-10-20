// udhr-core/build-mind-gated.mjs — read into the log HOW READING CHANGED THE READER'S UNDERSTANDING, from admitted sources only (perspective-gate.mjs).
//
// A record names (1) what was read (`source`: the root of the evidence), (2) the change in the reader's world-model (before/after roots, the items that entered or left) and
// (3) how much it changed (Bayesian surprise). It is not a copy of what the sources say.
//   ring1-english (existing domain, step 2): CORAAL speakers' words over-index five units against novels (coraal-units.mjs): items `cr:6 cr:21 cr:23 cr:25 cr:26`. Appended to the
//     tip the log already holds (refused unless the tip equals the root of the 8 items the earlier steps left). Source = root of the 55 admitted CORAAL files' content hashes.
//     SURPRISE: the Beta carry model over the universe of (corpus, unit) items, replayed over the three steps, step 2's value.
//   ring1-associates (new domain): the gated associates (ring1-spiral3-report.json) that survive Wiktionary (ring1-spiral3-check-report.json), as (unit, word) pairs, by id.
// NOT recorded: vocabulary extensions (they change what the reader can parse, not what it understands, and none moved a conclusion), nor anything from a source the gate does not admit.
// Usage: node build-mind-gated.mjs <path to the log>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { makeCarryModel } from "./surprise.mjs";
import { domainTip } from "./revise.mjs";
import { admitted } from "./perspective-gate.mjs";
import { ROOT } from "./ring1.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex"), id8 = (n) => sha(n).slice(0, 16), NONE = "00".repeat(16), rootOf = (set) => sha([...set].sort().join("\n")).slice(0, 32), out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-gated.mjs <log>");
const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url));
const w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : []));

// ---- ring1-english step 2: CORAAL ----
const prior = new Set(["ac:4", "ac:13", "ac:21", "fp:4", "fp:16", "fp:23", "fp:25", "fp:27"]), DOM1 = "udhr-core/ring1-english", dom1 = E.domainOf(DOM1), tip = domainTip(readFileSync(out), DOM1);
if (!tip || tip.root !== rootOf(prior)) throw new Error(`the log's ring1-english tip (${tip?.root}) is not the root of the earlier conclusion (${rootOf(prior)}): refusing to append`);
const cu = JSON.parse(read("coraal-units-report.json")), cr = cu.out.surviving.map((u) => `cr:${u}`), set2 = new Set([...prior, ...cr]), after = rootOf(set2);
const files = w2(join(ROOT, "11-multi-language/dialects-pidgins-creoles/coraal")).filter((p) => admitted(p).admit).sort(), source = sha(files.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 20);
const universe = []; for (const c of ["ac", "fp", "cr"]) for (let u = 0; u < 31; u++) universe.push(`${c}:${u}`);
const step0 = new Set(JSON.parse(read("ring1-report.json")).overIndexed.anticolonial.match(/art (\d+)/g).map((s) => `ac:${s.slice(4)}`).concat(JSON.parse(read("ring1-report.json")).overIndexed.firstPerson.match(/art (\d+)/g).map((s) => `fp:${s.slice(4)}`)));
const model = makeCarryModel(universe); model.observe(step0); model.observe(prior); const surprise = model.observe(set2);
E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom1, step: 2, source, before: tip.root, after, surpriseBits: surprise, absorbedBits: 0, changes: cr.map((i) => ({ id: id8(`ring1:${i}`), from: 0, to: 1 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom1, root: after, setRoot: sha(Buffer.concat([read("ring1-report.json"), read("ring1-genre-gated-report.json"), read("coraal-units-report.json")])).slice(0, 32), editions: 3, units: set2.size }));

// ---- ring1-associates ----
const sp = JSON.parse(read("ring1-spiral3-report.json")), ck = JSON.parse(read("ring1-spiral3-check-report.json")), dropped = new Set(ck.out.K2_dropped.map((s) => s.split(" ")[0]));
const pairs = new Set(sp.associates.filter((a) => !dropped.has(a.word)).flatMap((a) => a.units.map((x) => `assoc:${x.u}:${a.word}`))), units = new Set([...pairs].map((p) => +p.split(":")[1])), dom2 = E.domainOf("udhr-core/ring1-associates");
const carry = makeCarryModel(Array.from({ length: 31 }, (_, u) => u)), s2 = carry.observe(units), r2 = rootOf(pairs);
E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom2, step: 0, source: sha(read("ring1-spiral3-report.json")).slice(0, 20), before: NONE, after: r2, surpriseBits: s2, absorbedBits: 0, changes: [...pairs].map((p) => ({ id: id8(p), from: 0, to: 1 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom2, root: r2, setRoot: sha(Buffer.concat([read("ring1-spiral3-report.json"), read("ring1-spiral3-check-report.json")])).slice(0, 32), editions: 1, units: pairs.size }));
const v = E.scan(readFileSync(out));
console.log(JSON.stringify({ ok: v.ok, records: v.records?.length, bytes: readFileSync(out).length, ring1english: { step: 2, items: set2.size, entered: cr, surpriseBits: +surprise.toFixed(2), corporaFiles: files.length }, associates: { pairs: pairs.size, units: units.size, dropped: [...dropped], surpriseBits: +s2.toFixed(2) } }, null, 1));
