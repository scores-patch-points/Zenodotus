// udhr-core/hyperlexicon-link.mjs — the hyperlexicon is linked AT INGESTION: every conclusion the mind reaches has a row in the table, with the standing its
// evidence earns, and a change to the table is itself a difference recorded in the log (domain `udhr-core/hyperlexicon`).
//
//   given      the relations the Declaration STATES (relations.mjs STATED), each bound to the charter root: a license in khora's sense
//              (licenseStanding is true under that charter and false under any other).
//   candidate  everything else the evidence nominates: the 10 interpretive readings (relations.mjs CANDIDATES) and every mutual nearest-neighbour unit
//              pair the beings reading concludes, witnessed by the editions that voted for it. Nomination is not reasoning permission: a candidate
//              becomes given only through a charter binding, never through the number of languages that agree.
// This is MY mapping (rows keyed by the units' referents), the first one that is defined enough to test; khora has no composition semantics for it.
import { createHash } from "node:crypto";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance } from "../../../khora/native/kernel/hyperlexicon.js";
import { STATED, CANDIDATES } from "./relations.mjs";
import { modalNN, mutualPairs } from "./build-mind-beings.mjs";
import { makeCarryModel } from "./surprise.mjs";
import * as E from "./eotm.mjs";

export const GIVER = "Universal Declaration of Human Rights — UN General Assembly resolution 217 A (III), 1948; the relation as the text states it";
export const unitKey = (u) => (u === 0 ? "ref:udhr:preamble" : `ref:udhr:article:${u}`);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const rowName = (r) => `row:${r.left}|${r.right}`;

/** The rows that do not depend on the beings: stated -> given, interpretive -> candidate. */
export function baseTable(charterRoot) {
  let hl = createHyperlexicon();
  for (const [kind, left, , right] of STATED) hl = giveHyperlexiconAffordance(hl, { left, right, giver: GIVER, binding: charterRoot, witnesses: [], meta: { kind, source: "stated" } });
  hl = admitHyperlexiconCandidates(hl, CANDIDATES.map(([kind, left, right, basis]) => ({ left, right, witnesses: [], meta: { kind, source: "interpretive", basis } })));
  return hl;
}

/** Add the beings conclusion: every mutual pair is a CANDIDATE row, witnessed by the editions whose reading voted for it. */
export function withPairs(hl, pairs, rows) {
  const cands = pairs.map((p) => {
    const [u, v] = p.split("-").map(Number);
    const witnesses = rows.filter((r) => r.nn[u] === v || r.nn[v] === u).map((r) => r.sid);
    return { left: unitKey(u), right: unitKey(v), witnesses, meta: { kind: "binds_with", source: "beings" } };
  });
  return admitHyperlexiconCandidates(hl, cands);
}

/** Identity of the table's STANDINGS (witness counts are evidence, not a difference): sorted (left, right, standing, binding). */
export const tableRoot = (hl) => sha(JSON.stringify(Object.values(hl.composition).map((r) => [r.left, r.right, r.standing, r.binding ?? null]).sort((a, b) => (a.join() < b.join() ? -1 : 1)))).slice(0, 32);
const rowSet = (hl) => new Set(Object.values(hl.composition).map(rowName));

/** Replay the editions in reading order; append a DMDN record each time the TABLE changes, then a GROUND. Returns the final table and the steps. */
export function replayHyperlexicon(out, rows, { domainName = "udhr-core/hyperlexicon", charterRoot }) {
  const dom = E.domainOf(domainName), base = baseTable(charterRoot);
  const universe = new Set([...rowSet(base), ...Array.from({ length: 31 }, (_, u) => Array.from({ length: 31 }, (_, v) => (u < v ? `row:${unitKey(u)}|${unitKey(v)}` : null)).filter(Boolean)).flat()]);
  const model = makeCarryModel(universe);
  let prev = { set: new Set(), root: "00".repeat(16), hl: null }, absorbed = 0; const steps = [];
  rows.forEach((r, step) => {
    const pairs = mutualPairs(modalNN(rows.slice(0, step + 1)));
    const hl = withPairs(base, pairs, rows.slice(0, step + 1));
    const set = rowSet(hl), root = tableRoot(hl);
    const s = model.observe(set);
    if (root === prev.root) { absorbed += s; return; }
    const changes = [];
    for (const n of new Set([...prev.set, ...set])) if (prev.set.has(n) !== set.has(n)) changes.push({ id: sha(n).slice(0, 16), from: prev.set.has(n) ? 1 : 0, to: set.has(n) ? 1 : 0 });
    E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step, source: r.sid.replace(/^src_/, ""), before: prev.root, after: root, surpriseBits: s, absorbedBits: absorbed, changes }));
    steps.push({ step, rows: set.size, given: Object.values(hl.composition).filter((x) => x.standing === "given").length, entered: changes.filter((c) => c.to).length, left: changes.filter((c) => !c.to).length, surpriseBits: +s.toFixed(2) });
    absorbed = 0; prev = { set, root, hl };
  });
  E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: prev.root, setRoot: sha(rows.map((r) => r.sid).join("\n")).slice(0, 32), editions: rows.length, units: prev.set.size }));
  return { hl: prev.hl, root: prev.root, steps };
}
