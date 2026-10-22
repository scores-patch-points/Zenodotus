// udhr-core/build-mind-revise.mjs — REVISE: withdraw what the folder-label finding invalidated (provenance/revisions.json; evidence: colonial-studies-audit.json).
//   ring1-english: items ac:* came from 21-anti-colonial documents admitted on a folder-level label; they leave the set (from 1 to 0), the other items stay.
//   ring1-associates: every (unit, word) pair was learned on those documents plus first-person ones, never separated; the whole set leaves (conclusion: empty).
// Each is a REVISE record (late evidence about a source already read) with a fresh GROUND. SURPRISE: the Beta carry model replayed over the earlier steps, then the withdrawal.
// Refused unless each domain's tip equals the root of the set this revision starts from. Usage: node build-mind-revise.mjs <path to the log>
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { makeCarryModel } from "./surprise.mjs";
import { domainTip } from "./revise.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex"), id8 = (n) => sha(n).slice(0, 16), rootOf = (set) => sha([...set].sort().join("\n")).slice(0, 32), out = process.argv[2]; if (!out) throw new Error("usage: node build-mind-revise.mjs <log>");
const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url)), rev = JSON.parse(read("provenance/revisions.json")), source = rev.auditSha256Prefix;
if (!/^[0-9a-f]{20}$/.test(source)) throw new Error("revisions.json needs a 20-hex auditSha256Prefix");
const audit = sha(read("colonial-studies-audit.json")); if (!audit.startsWith(source)) throw new Error(`colonial-studies-audit.json (${audit.slice(0, 20)}) is not the audit revisions.json cites (${source})`);

// ---- ring1-english ----
const DOM1 = "udhr-core/ring1-english", dom1 = E.domainOf(DOM1), tip1 = domainTip(readFileSync(out), DOM1);
const cu = JSON.parse(read("coraal-units-report.json")), prior = new Set(["ac:4", "ac:13", "ac:21", "fp:4", "fp:16", "fp:23", "fp:25", "fp:27"]), cr = cu.out.surviving.map((u) => `cr:${u}`), from = new Set([...prior, ...cr]);
if (!tip1 || tip1.root !== rootOf(from)) throw new Error(`ring1-english tip (${tip1?.root}) is not the root of the set this revision starts from (${rootOf(from)})`);
const gone = rev["ring1-english"].withdraw, to = new Set([...from].filter((i) => !gone.includes(i)));
const universe = []; for (const c of ["ac", "fp", "cr"]) for (let u = 0; u < 31; u++) universe.push(`${c}:${u}`);
const rr = JSON.parse(read("ring1-report.json")), arts = (s) => (s.match(/art (\d+)/g) ?? []).map((x) => x.slice(4));
const step0 = new Set([...arts(rr.overIndexed.anticolonial).map((u) => `ac:${u}`), ...arts(rr.overIndexed.firstPerson).map((u) => `fp:${u}`)]);
const m1 = makeCarryModel(universe); m1.observe(step0); m1.observe(prior); m1.observe(from); const s1 = m1.observe(to);
E.append(out, E.KIND.REVISE, E.enc.revise({ domain: dom1, step: 2, source, before: tip1.root, after: rootOf(to), surpriseBits: s1, absorbedBits: 0, changes: gone.map((i) => ({ id: id8(`ring1:${i}`), from: 1, to: 0 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom1, root: rootOf(to), setRoot: tip1.setRoot, editions: tip1.editions, units: to.size }));

// ---- ring1-associates ----
const DOM2 = "udhr-core/ring1-associates", dom2 = E.domainOf(DOM2), tip2 = domainTip(readFileSync(out), DOM2);
const sp = JSON.parse(read("ring1-spiral3-report.json")), ck = JSON.parse(read("ring1-spiral3-check-report.json")), dropped = new Set(ck.out.K2_dropped.map((s) => s.split(" ")[0]));
const pairs = new Set(sp.associates.filter((a) => !dropped.has(a.word)).flatMap((a) => a.units.map((x) => `assoc:${x.u}:${a.word}`)));
if (!tip2 || tip2.root !== rootOf(pairs)) throw new Error(`ring1-associates tip (${tip2?.root}) is not the root of the pairs this revision starts from (${rootOf(pairs)})`);
const units = new Set([...pairs].map((p) => +p.split(":")[1])), m2 = makeCarryModel(Array.from({ length: 31 }, (_, u) => u)); m2.observe(units); const s2 = m2.observe(new Set());
const empty = rootOf([]);
E.append(out, E.KIND.REVISE, E.enc.revise({ domain: dom2, step: 0, source, before: tip2.root, after: empty, surpriseBits: s2, absorbedBits: 0, changes: [...pairs].map((p) => ({ id: id8(p), from: 1, to: 0 })) }));
E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom2, root: empty, setRoot: tip2.setRoot, editions: tip2.editions, units: 0 }));
const v = E.scan(readFileSync(out));
console.log(JSON.stringify({ ok: v.ok, records: v.records?.length, bytes: readFileSync(out).length, ring1english: { withdrawn: gone, items: to.size, surpriseBits: +s1.toFixed(2) }, associates: { withdrawnPairs: pairs.size, surpriseBits: +s2.toFixed(2) } }, null, 1));
