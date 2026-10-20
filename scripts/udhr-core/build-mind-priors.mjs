// udhr-core/build-mind-priors.mjs — read the grown priors and the ring-1 associates INTO the mind log, as conclusions, by identity and not by text.
//
// WHY NOT THE WORDS: the log records differences that make a difference. None of the ~8,000 words the sniffs settled moved a conclusion about the Declaration
// (the UDHR editions raise 0 to 11 unknown-word needs each), and putting them in would turn a 9 KB log into an 80 KB one. What changed is WHAT EACH LANGUAGE'S
// READING NOW KNOWS: that is a set, and a set is identified by its root. The extension files stay in the repo (scripts/udhr-core/*-prior-extension.json) and the
// log holds the root that names exactly those bytes.
//
// DOMAIN 1  udhr-core/priors-grown.   ITEMS  `ext:<lang>:<root16>` where root = sha256 of the extension's sorted "word<TAB>class" lines.
//   CONCLUSION  the set of language extensions the mind holds. A step is a record only if the set changed (a new or changed extension).
//   SURPRISE    per step, Bayesian (Itti & Baldi): KL(Beta(1+nominal, 1+other) || Beta(1,1)), in bits: how far the extension's learned class mix is from the
//               uninformed prior over the nominal share. It is a property of the extension, not of the order.
//   STEPS       eng (ring-1 read), spa (Sniff@2 read; Sniff@1's 1,887 are superseded), por, hat. Accepted sniff votes only, `source: "sniff"`, revisable.
// DOMAIN 2  udhr-core/ring1-associates.   ITEMS  `assoc:<unit>:<word>`: the nominal words ring 1's English voices associate with a unit of the Declaration
//   (replicated on held-out documents, ring1-spiral2) that survive Wiktionary (ring1-spiral-check drops "prohibit", "whar", "gwine"). One step. SURPRISE:
//   the Beta carry model over the 31 units (does a unit have any associate), as for every other carry domain.
// The setRoot of each GROUND is the hash of the evidence files' bytes. Usage: node build-mind-priors.mjs <path to the log>
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { klBeta, bits, makeCarryModel } from "./surprise.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex"), id8 = (n) => sha(n).slice(0, 16), NONE = "00".repeat(16), rootOf = (set) => sha([...set].sort().join("\n")).slice(0, 32);
const out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-priors.mjs <log>");
const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url));

// ---- domain 1 ----
const EXT = [["eng", "eng-prior-extension.json"], ["spa", "spa-prior-extension2.json"], ["por", "por-prior-extension.json"], ["hat", "hat-prior-extension.json"]];
const dom1 = E.domainOf("udhr-core/priors-grown"), steps1 = []; let prev = { set: new Set(), root: NONE }; const raws = [];
EXT.forEach(([lang, f], step) => {
  const raw = read(f), j = JSON.parse(raw), ents = Object.entries(j.entries), nN = ents.filter(([, v]) => v.cls === "nominal").length, nO = ents.length - nN;
  const root = sha(ents.map(([w, v]) => `${w}\t${v.cls}`).sort().join("\n")).slice(0, 16), item = `ext:${lang}:${root}`, set = new Set([...prev.set, item]), after = rootOf(set);
  const s = bits(klBeta(1 + nN, 1 + nO, 1, 1)); raws.push(raw);
  E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom1, step, source: sha(raw).slice(0, 20), before: prev.root, after, surpriseBits: s, absorbedBits: 0, changes: [{ id: id8(item), from: 0, to: 1 }] }));
  steps1.push({ step, lang, words: ents.length, nominal: nN, other: nO, surpriseBits: +s.toFixed(2) }); prev = { set, root: after };
});
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom1, root: prev.root, setRoot: sha(Buffer.concat(raws)).slice(0, 32), editions: steps1.length, units: prev.set.size }));

// ---- domain 2 ----
const spiral = JSON.parse(read("ring1-spiral2-report.json")), chk = JSON.parse(read("ring1-spiral-check-report.json")), dropped = new Set(chk.out.K2_dropped.map((s) => s.split(" ")[0]));
const pairs = spiral.associates.filter((a) => !dropped.has(a.word)).flatMap((a) => a.units.map((x) => `assoc:${x.u}:${a.word}`)), set2 = new Set(pairs);
const units = new Set(pairs.map((p) => +p.split(":")[1])), carry = makeCarryModel(Array.from({ length: 31 }, (_, u) => u)), s2 = carry.observe(units), dom2 = E.domainOf("udhr-core/ring1-associates"), r2 = rootOf(set2);
E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom2, step: 0, source: sha(read("ring1-spiral2-report.json")).slice(0, 20), before: NONE, after: r2, surpriseBits: s2, absorbedBits: 0, changes: [...set2].map((p) => ({ id: id8(p), from: 0, to: 1 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom2, root: r2, setRoot: sha(Buffer.concat([read("ring1-spiral2-report.json"), read("ring1-spiral-check-report.json")])).slice(0, 32), editions: 1, units: set2.size }));
const v = E.scan(readFileSync(out));
console.log(JSON.stringify({ ok: v.ok, records: v.records?.length, bytes: readFileSync(out).length, priorsGrown: steps1, associates: { pairs: set2.size, unitsWithAssociates: units.size, dropped: [...dropped], surpriseBits: +s2.toFixed(2) } }, null, 1));
