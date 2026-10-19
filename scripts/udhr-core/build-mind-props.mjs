// udhr-core/build-mind-props.mjs — the second conclusion in the same log: the propositions the UDHR makes, language-independent.
// Witnesses: the five hand-adjudicated readings (eng, spa, arb, cmn_hans, swh), read in that order. Each carries propositions
// with a shared id (`udhr:enjoy-freedoms`) and sits in a paragraph referent. The conclusion after k editions is the set of
// propositions carried by MORE THAN HALF of the k (the same majority rule as the structure), each with the referent it sits in
// (the modal one among its carriers; for the preamble, whose paragraphs are not a shared structure, the unit). A record is
// appended only when that conclusion changes; its surprise is the Bayesian surprise of the carry model (Beta(1,1) per proposition).
// Five witnesses is what there is: this is wording-grain evidence from hand adjudication, NOT a mechanical convergence over 515.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadGold, GOLD_EDITIONS } from "./probe-gold.mjs";
import { loadLedger, LOG } from "./build.mjs";
import { makeCarryModel } from "./surprise.mjs";
import * as E from "./eotm.mjs";

export const DOMAIN = E.domainOf("udhr-core/propositions");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const id8 = (name) => sha(name).slice(0, 16);
const NONE = "00".repeat(16);

export function buildProps(out) {
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const srcOf = (code) => [...full.sources.values()].find((s) => s.locator.endsWith(`udhr-${code}.txt`)).source_id.replace(/^src_/, "");
  const gold = Object.fromEntries(GOLD_EDITIONS.map((c) => [c, loadGold(c)]));
  const key = (a) => (!a ? "?" : a.heading ? `${a.unit}#h` : a.unit === "preamble" ? "preamble" : `${a.unit}/${a.p}`);
  const carried = Object.fromEntries(GOLD_EDITIONS.map((c) => { const m = new Map(); for (const p of gold[c].props) if (p.prop && !m.has(p.prop)) m.set(p.prop, key(p.start)); return [c, m]; }));
  const universe = new Set(GOLD_EDITIONS.flatMap((c) => [...carried[c].keys()]));
  const model = makeCarryModel(universe);
  const conclusion = (codes) => {
    const out = new Map();
    for (const p of universe) {
      const have = codes.filter((c) => carried[c].has(p));
      if (have.length * 2 <= codes.length) continue;                               // strictly more than half
      const tally = new Map(); for (const c of have) { const k = carried[c].get(p); tally.set(k, (tally.get(k) ?? 0) + 1); }
      out.set(p, [...tally].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0]);
    }
    return out;
  };
  const rootOf = (m) => sha(JSON.stringify([...m].sort((a, b) => (a[0] < b[0] ? -1 : 1)))).slice(0, 32);

  let prev = { map: new Map(), root: NONE }, absorbed = 0, written = 0; const steps = [];
  GOLD_EDITIONS.forEach((code, step) => {
    const s = model.observe(new Set(carried[code].keys()));
    const now = conclusion(GOLD_EDITIONS.slice(0, step + 1)), root = rootOf(now);
    if (root === prev.root) { absorbed += s; return; }
    const changes = [];
    for (const p of universe) { const a = prev.map.has(p) ? 1 : 0, b = now.has(p) ? 1 : 0; if (a !== b) changes.push({ id: id8(p), from: a, to: b }); }
    const moved = [...now].filter(([p, k]) => prev.map.has(p) && prev.map.get(p) !== k).length;
    E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: DOMAIN, step, source: srcOf(code), before: prev.root, after: root, surpriseBits: s, absorbedBits: absorbed, changes }));
    steps.push({ step, code, surpriseBits: +s.toFixed(2), absorbedBits: +absorbed.toFixed(2), inConclusion: now.size, entered: changes.filter((c) => c.to).length, left: changes.filter((c) => !c.to).length, movedReferent: moved });
    absorbed = 0; written++; prev = { map: now, root };
  });
  const inputs = JSON.parse(readFileSync(new URL("./gold/inputs.json", import.meta.url), "utf8")).inputs;
  const setRoot = sha(GOLD_EDITIONS.map((c) => `${c}\0${inputs[c].hand}\0${inputs[c].golden}`).join("\n")).slice(0, 32);
  E.append(out, E.KIND.GROUND, E.enc.ground({ domain: DOMAIN, root: prev.root, setRoot, editions: GOLD_EDITIONS.length, units: prev.map.size }));
  return { written, steps, final: prev.map.size, root: prev.root, absorbedAfterLast: absorbed, universe: universe.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = new URL("./mind.eot", import.meta.url).pathname;
  const r = buildProps(out);
  console.log(JSON.stringify({ dmdnRecords: r.written, finalPropositions: r.final, universe: r.universe, root: r.root, absorbedAfterLast: +r.absorbedAfterLast.toFixed(2), bytes: readFileSync(out).length }));
  for (const s of r.steps) console.log(JSON.stringify(s));
}
