// udhr-core/mind-priors.mjs — load the mind log as PRIORS, fail closed.
//
// The log holds identities, not data. This verifies the chain (eotm scan), then for each domain RECOMPUTES the root it should hold from the artifacts in `dir`
// (reports and structure files) and compares it with the log's last GROUND. A domain whose root does not match, or whose artifact is missing, is WITHHELD: its priors
// are null and the reason is stated. Nothing returned is a settled prior: every prior carries standing "candidate" (witnessed by the reading that made it) except the charter's
// STATED relations, which are "given" (giver: the UN General Assembly; ground: the charter root), as hyperlexicon-link.mjs files them. A reader that wants a settled prior
// still takes it from a named giver in janus/priors.
// ACTIVATION BY NEED: `needs` names what the caller will use and ONLY those domains' artifacts are opened: "charter" (referents.json + relations.json, ~19 KB; the structure is rebuilt from them and its
// root recomputed WITHOUT the 23 MB event log), "overIndexed" (ring-1 sets), "associates". Default: all three. `deep: true` additionally recomputes the beings domains and cross-checks the charter against the
// rebuilt event log (about 5 s, ~900 MB peak). Measured by mind-falsify.mjs: before `needs` existed every load opened every ring-1 artifact and the charter was reachable only through the deep path.
// `deep: true` also recomputes the two beings domains and the charter root from the rebuilt event log (about a minute; needs udhr-core.eot.json built by `node all.mjs`).
import { readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import * as E from "./eotm.mjs";
import { domainTip } from "./revise.mjs";

const sha = (x) => createHash("sha256").update(x).digest("hex"), rootOf = (set) => sha([...set].sort().join("\n")).slice(0, 32);
export const DOMAINS = ["udhr-core", "udhr-core/propositions", "udhr-core/beings", "udhr-core/beings-independent", "udhr-core/ring1-english", "udhr-core/ring1-associates"];
const here = new URL("./", import.meta.url).pathname;

export const NEEDS = ['charter', 'overIndexed', 'associates'];
const CHARTER_SCHEMA = 'UDHRCharterRoot@1';
/** The charter's root from the two small artifacts alone: the structure charter.mjs structureOf() reads from the ledger, rebuilt from referents.json (modal paragraph counts) and relations.json (stated relations). */
export function charterRootFromArtifacts(referents, relations) {
  const refs = [['ref:udhr:declaration', 'declaration', null], ['ref:udhr:preamble', 'preamble', null]];
  for (let n = 1; n <= 30; n++) { const c = referents.modal?.[String(n)]?.count; if (!Number.isInteger(c)) throw new Error(`no paragraph count for article ${n}`); refs.push([`ref:udhr:article:${n}`, 'article', c]); for (let k = 1; k <= c; k++) refs.push([`ref:udhr:article:${n}:p:${k}`, 'paragraph', null]); }
  refs.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const rels = relations.relations.filter((r) => r.standing === 'stated').map((r) => [r.kind, r.left, r.right]).sort((a, b) => (a.join() < b.join() ? -1 : 1));
  return sha(JSON.stringify({ schema: CHARTER_SCHEMA, referents: refs, relations: rels })).slice(0, 32);
}

/** The immutable core, checked from the LOG ALONE (the pinned prefix already contains the core's roots): core.json beside the log pins the record count, the byte length, the prefix hash and the ground. */
export function checkCore(buf, scan, core) {
  const dom = E.domainOf(core.domain), d = scan.records.map(E.decode), mine = d.map((x, i) => (x.domain === dom ? i : -1)).filter((i) => i >= 0);
  if (mine.length !== core.records || mine.some((i, k) => i !== k)) return `the core domain holds ${mine.length} record(s) at positions ${mine.slice(0, 9).join(",")}; the pin says the first ${core.records}`;
  const end = scan.records[core.records]?.offset ?? buf.length;
  if (end !== core.bytes) return `the core ends at byte ${end}; the pin says ${core.bytes}`;
  if (sha(buf.subarray(0, core.bytes)) !== core.prefixSha256) return "the core's bytes differ from the pinned prefix hash";
  const g = d.filter((x) => x.domain === dom && x.kind === "GROUND").at(-1);
  if (!g || g.root !== core.charterRoot || g.setRoot !== core.editionSetRoot) return "the core's ground differs from the pinned charter root or edition-set root";
  return null;
}

export async function loadMind({ logPath, dir = here, deep = false, needs = NEEDS } = {}) {
  const buf = readFileSync(logPath), scan = E.scan(buf), out = { chainOk: scan.ok, records: scan.records?.length ?? 0, domains: {}, charter: null, overIndexed: null, associates: null, beingsPairs: null };
  if (!scan.ok) { for (const d of DOMAINS) out.domains[d] = { verified: false, reason: `the log does not verify: ${scan.error}` }; return out; }
  const coreFile = dirname(logPath) + "/core.json";
  if (existsSync(coreFile)) { const bad = checkCore(buf, scan, JSON.parse(readFileSync(coreFile, "utf8"))); out.core = bad ? { pinned: true, intact: false, reason: bad } : { pinned: true, intact: true }; if (bad) { for (const d of DOMAINS) out.domains[d] = { verified: false, reason: `the immutable core is not intact: ${bad}` }; return out; } }
  else out.core = { pinned: false, intact: null, reason: "no core.json beside the log: nothing pins the core" };
  const read = (f) => { const p = dir + f; return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };
  const verdict = (name, expected, why) => { const tip = domainTip(buf, name); out.domains[name] = !tip ? { verified: false, reason: "no ground in the log" } : expected == null ? { verified: false, root: tip.root, reason: why } : { verified: tip.root === expected, root: tip.root, expected, reason: tip.root === expected ? "recomputed root equals the log's" : "recomputed root DIFFERS from the log's" }; return out.domains[name].verified; };

  const want = new Set(needs);
  // ring1-english: survivors of the genre control (admitted sources) + the CORAAL units
  if (want.has('overIndexed')) try {
    const g = read("ring1-genre-gated-report.json"), c = read("coraal-units-report.json");
    const set = new Set([...g.survival.anticolonial.filter((x) => x.survives).map((x) => `ac:${x.unit}`), ...g.survival.firstPerson.filter((x) => x.survives).map((x) => `fp:${x.unit}`), ...c.out.surviving.map((u) => `cr:${u}`)]);
    if (verdict("udhr-core/ring1-english", rootOf(set))) out.overIndexed = { standing: "candidate", source: out.domains["udhr-core/ring1-english"].root, ac: [...set].filter((i) => i.startsWith("ac:")).map((i) => +i.slice(3)), fp: [...set].filter((i) => i.startsWith("fp:")).map((i) => +i.slice(3)), cr: [...set].filter((i) => i.startsWith("cr:")).map((i) => +i.slice(3)) };
  } catch (e) { verdict("udhr-core/ring1-english", null, `artifact missing or unreadable: ${e.message.slice(0, 60)}`); }
  // ring1-associates
  if (want.has('associates')) try {
    const sp = read("ring1-spiral3-report.json"), ck = read("ring1-spiral3-check-report.json"), dropped = new Set(ck.out.K2_dropped.map((s) => s.split(" ")[0]));
    const kept = sp.associates.filter((a) => !dropped.has(a.word)), pairs = new Set(kept.flatMap((a) => a.units.map((x) => `assoc:${x.u}:${a.word}`)));
    if (verdict("udhr-core/ring1-associates", rootOf(pairs))) out.associates = { standing: "candidate", source: out.domains["udhr-core/ring1-associates"].root, byWord: new Map(kept.map((a) => [a.word, a.units.map((x) => ({ unit: x.u, share: x.share, lift: x.lift }))])) };
  } catch (e) { verdict("udhr-core/ring1-associates", null, `artifact missing or unreadable: ${e.message.slice(0, 60)}`); }
  // the Declaration's structure: rebuilt and re-hashed from the two small artifacts (no event log)
  if (want.has('charter')) try {
    const rj = read('referents.json'), rl = read('relations.json');
    if (verdict('udhr-core', charterRootFromArtifacts(rj, rl))) out.charter = { root: out.domains['udhr-core'].root, referents: rj.modal, relations: rl.relations, standing: { stated: 'given', interpretive: 'candidate' } };
  } catch (e) { verdict('udhr-core', null, `artifact missing or unreadable: ${e.message.slice(0, 60)}`); }
  // the beings domains (and an independent cross-check of the charter) need the rebuilt event log
  if (deep) {
    const { loadLedger, LOG } = await import("./build.mjs"), { structureRoot } = await import("./charter.mjs"), { readAll, modalNN, mutualPairs, rootOf: pairRoot } = await import("./build-mind-beings.mjs");
    if (existsSync(LOG)) { const ledger = loadLedger(JSON.parse(readFileSync(LOG, "utf8"))); if (structureRoot(ledger) !== out.domains["udhr-core"]?.root) { out.domains["udhr-core"] = { verified: false, root: out.domains["udhr-core"]?.root, reason: "the event log's charter root differs from the artifacts'" }; out.charter = null; } }
    const { rows } = await readAll({ settle: () => null }), ind = rows.filter((r) => r.kind !== "projected-from-UDHR");
    const pi = mutualPairs(modalNN(ind)); if (verdict("udhr-core/beings-independent", pairRoot(pi))) out.beingsPairs = { standing: "candidate", source: out.domains["udhr-core/beings-independent"].root, pairs: pi };
    verdict("udhr-core/beings", pairRoot(mutualPairs(modalNN(rows))));
  } else { verdict("udhr-core/beings", null, "not checked (deep: false)"); verdict("udhr-core/beings-independent", null, "not checked (deep: false)"); }
  for (const [n, k] of [["udhr-core", "charter"], ["udhr-core/ring1-english", "overIndexed"], ["udhr-core/ring1-associates", "associates"]]) if (!want.has(k)) out.domains[n] = { verified: false, reason: `not requested (needs: ${[...want].join(",") || "none"})` };
  verdict("udhr-core/propositions", null, "needs the five hand-adjudicated gold editions");
  return out;
}
