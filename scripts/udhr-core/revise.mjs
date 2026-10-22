// udhr-core/revise.mjs — late evidence changes the holograph in real time, through the same gate as everything else.
//
// An outside answer (lookup.mjs: Wiktionary today, Wikidata later) settles a need; the edition it concerns is re-read; its row changes. If the
// conclusion (the mutual-pair set) changes, the log gets a REVISE record and a fresh GROUND. If it does not, NOTHING is appended: the answer is
// cached and the log is byte-identical. The surprise recorded is that of the REVISION itself: KL(posterior with the new reading || posterior
// with the old one), summed over the units whose nearest neighbour moved.
import { readFileSync } from "node:fs";
import * as E from "./eotm.mjs";
import { modalNN, mutualPairs, rootOf, pairId8 } from "./build-mind-beings.mjs";
import { klDirichlet, bits, ALPHA, K } from "./surprise.mjs";
import { UNITS } from "./read-beings.mjs";

/** The domain's current standing in a log: its LAST GROUND record. */
export function domainTip(buf, domainName) {
  const dom = E.domainOf(domainName), s = E.scan(buf);
  if (!s.ok) throw new Error(`broken log: ${s.error}`);
  const g = s.records.map(E.decode).filter((d) => d.kind === "GROUND" && d.domain === dom).at(-1);
  return g ? { root: g.root, setRoot: g.setRoot, editions: g.editions, units: g.units } : null;
}

/** Bayesian surprise (bits) of replacing row `idx`'s nearest-neighbour map with `newNn`. */
export function reviseSurprise(rows, idx, newNn) {
  let nats = 0;
  for (let u = 0; u < UNITS; u++) {
    const oldV = rows[idx].nn[u], newV = newNn[u];
    if (oldV === newV) continue;
    const old = new Array(K).fill(ALPHA);
    for (const r of rows) if (r.nn[u] >= 0) old[r.nn[u]] += 1;
    const neu = old.slice();
    if (oldV >= 0) neu[oldV] -= 1;
    if (newV >= 0) neu[newV] += 1;
    nats += klDirichlet(neu, old);
  }
  return bits(nats);
}

/** Apply new evidence about edition `idx`. Returns { changed, surpriseBits, root } and appends to `out` only when the conclusion moved. */
export function applyEvidence(out, domainName, rows, idx, newNn) {
  const tip = domainTip(readFileSync(out), domainName);
  const before = rootOf(mutualPairs(modalNN(rows)));
  if (!tip) throw new Error(`no standing for domain ${domainName} in this log`);
  if (tip.root !== before) throw new Error(`the log (${tip.root}) and the rows (${before}) disagree: refusing to revise a conclusion the log does not hold`);
  const surpriseBits = reviseSurprise(rows, idx, newNn);
  const next = rows.map((r, i) => (i === idx ? { ...r, nn: newNn } : r));
  const pairsBefore = mutualPairs(modalNN(rows)), pairsAfter = mutualPairs(modalNN(next)), after = rootOf(pairsAfter);
  if (after === before) return { changed: false, surpriseBits, root: before };
  const was = new Set(pairsBefore), now = new Set(pairsAfter), changes = [];
  for (const p of new Set([...was, ...now])) if (was.has(p) !== now.has(p)) changes.push({ id: pairId8(p), from: was.has(p) ? 1 : 0, to: now.has(p) ? 1 : 0 });
  const dom = E.domainOf(domainName);
  E.append(out, E.KIND.REVISE, E.enc.revise({ domain: dom, step: idx, source: rows[idx].sid.replace(/^src_/, ""), before, after, surpriseBits, absorbedBits: 0, changes }));
  E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: after, setRoot: tip.setRoot, editions: tip.editions, units: pairsAfter.length }));
  return { changed: true, surpriseBits, root: after, rows: next };
}
