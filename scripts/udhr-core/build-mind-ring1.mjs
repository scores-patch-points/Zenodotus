// udhr-core/build-mind-ring1.mjs — append the ring-1 reading to the mind log as a domain: which units of the Declaration the voices of the dispossessed
// speak to MORE than the controls do. The log holds the conclusion's CHANGES with their Bayesian surprise, never the text read.
//
// DOMAIN  udhr-core/ring1-english.   ITEMS  (corpus, unit): ac = 21-anti-colonial (English), fp = 20-first-person-voices (English); unit 0..30.
// CONCLUSION  the set of items that over-index. FIXED BEFORE THE BUILD (2026-10-19):
//   step 0  evidence: against neutral English novels (ring1-report.json). The conclusion is each corpus's over-indexed units as ring 1 reported them.
//   step 1  evidence: against the genre control (ring1-genre-report.json). A unit STAYS only if it survived every control it was put through; a unit that
//           failed one LEAVES; a unit never put through the genre control (Article 10, whose novels ratio was a small-base artifact) LEAVES and is reported
//           as unconfirmed, not as refuted.
//   A step is a record only if the conclusion changed (the same difference-that-makes-a-difference gate as every other domain). Surprise = KL of the
//   Beta(1,1) carry model per item over the steps so far. The GROUND's setRoot is the hash of the two report files that were the evidence.
// Usage: node build-mind-ring1.mjs <path to the log>   (appends in place; refuses a log that does not verify)
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { makeCarryModel } from "./surprise.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex"), id8 = (n) => sha(n).slice(0, 16), NONE = "00".repeat(16);
const out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-ring1.mjs <log>");
const rawA = readFileSync(new URL("./ring1-report.json", import.meta.url)), rawB = readFileSync(new URL("./ring1-genre-report.json", import.meta.url));
const r1 = JSON.parse(rawA), g = JSON.parse(rawB);
const parse = (s) => [...s.matchAll(/art (\d+)/g)].map((m) => +m[1]);
const step0 = new Set([...parse(r1.overIndexed.anticolonial).map((u) => `ac:${u}`), ...parse(r1.overIndexed.firstPerson).map((u) => `fp:${u}`)]);
const tested = new Map([...g.survival.anticolonial.map((x) => [`ac:${x.unit}`, x.survives]), ...g.survival.firstPerson.map((x) => [`fp:${x.unit}`, x.survives])]);
const step1 = new Set([...step0].filter((i) => tested.get(i) === true));
const unconfirmed = [...step0].filter((i) => !tested.has(i));
const universe = []; for (const c of ["ac", "fp"]) for (let u = 0; u < 31; u++) universe.push(`${c}:${u}`);
const root = (s) => sha([...s].sort().join("\n")).slice(0, 32);

const dom = E.domainOf("udhr-core/ring1-english"), model = makeCarryModel(universe), steps = [];
let prev = { set: new Set(), root: NONE };
[[step0, "against neutral novels", rawA], [step1, "against the genre control", rawB]].forEach(([set, label, raw], step) => {
  const s = model.observe(set), r = root(set);
  if (r === prev.root) return;
  const changes = []; for (const i of new Set([...prev.set, ...set])) if (prev.set.has(i) !== set.has(i)) changes.push({ id: id8(`ring1:${i}`), from: prev.set.has(i) ? 1 : 0, to: set.has(i) ? 1 : 0 });
  E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step, source: sha(raw).slice(0, 20), before: prev.root, after: r, surpriseBits: s, absorbedBits: 0, changes }));
  steps.push({ step, evidence: label, items: set.size, entered: changes.filter((c) => c.to).length, left: changes.filter((c) => !c.to).length, surpriseBits: +s.toFixed(2) });
  prev = { set, root: r };
});
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: prev.root, setRoot: sha(Buffer.concat([rawA, rawB])).slice(0, 32), editions: steps.length, units: prev.set.size }));
const v = E.scan(readFileSync(out));
console.log(JSON.stringify({ ok: v.ok, records: v.records?.length, steps, finalConclusion: [...prev.set].sort(), unconfirmed, left: [...step0].filter((i) => !step1.has(i)).sort() }, null, 1));
