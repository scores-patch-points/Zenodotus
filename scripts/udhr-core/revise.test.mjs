import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as E from "./eotm.mjs";
import { modalNN, mutualPairs, rootOf, pairId8 } from "./build-mind-beings.mjs";
import { applyEvidence, domainTip, reviseSurprise } from "./revise.mjs";

const UNITS = 31, NAME = "test/beings";
// Three editions agreeing that unit 0 and unit 1 are each other's neighbour, unit 2 and 3 likewise.
const base = () => { const nn = new Array(UNITS).fill(-1); nn[0] = 1; nn[1] = 0; nn[2] = 3; nn[3] = 2; return nn; };
const rows0 = () => [0, 1, 2].map((i) => ({ sid: `src_${String(i).padStart(20, "0")}`, nn: base() }));

function seed(path, rows) {
  E.create(path);
  const dom = E.domainOf(NAME), pairs = mutualPairs(modalNN(rows));
  E.append(path, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step: 0, source: rows[0].sid.replace(/^src_/, ""), before: "00".repeat(16), after: rootOf(pairs), surpriseBits: 1, absorbedBits: 0, changes: pairs.map((p) => ({ id: pairId8(p), from: 0, to: 1 })) }));
  E.append(path, E.KIND.GROUND, E.enc.ground({ domain: dom, root: rootOf(pairs), setRoot: "ab".repeat(16), editions: rows.length, units: pairs.length }));
}

test("evidence that changes nothing appends nothing: the log is byte-identical", () => {
  const p = `${tmpdir()}/_rev1.eotm`, rows = rows0(); seed(p, rows);
  const before = readFileSync(p);
  const nn = base(); nn[10] = 11;                       // one edition now hears a neighbour for unit 10; it is nobody's mutual pair
  const r = applyEvidence(p, NAME, rows, 1, nn);
  assert.equal(r.changed, false);
  assert.ok(r.surpriseBits > 0, "the belief moved even though the conclusion did not");
  assert.ok(readFileSync(p).equals(before));
});

test("evidence that moves the conclusion appends one REVISE and one GROUND, earlier bytes untouched, chain intact", () => {
  const p = `${tmpdir()}/_rev2.eotm`, rows = rows0(); seed(p, rows);
  const before = readFileSync(p);
  // two of three editions now say unit 0's neighbour is 5: the modal neighbour of 0 changes, so the pair 0-1 is no longer mutual
  const nn1 = base(); nn1[0] = 5;
  const first = applyEvidence(p, NAME, rows, 1, nn1);
  assert.equal(first.changed, false, "one edition out of three is not yet a plurality");
  const rows1 = rows.map((r, i) => (i === 1 ? { ...r, nn: nn1 } : r));
  const second = applyEvidence(p, NAME, rows1, 2, nn1);
  assert.equal(second.changed, true);
  const after = readFileSync(p);
  assert.ok(after.subarray(0, before.length).equals(before), "append-only");
  const s = E.scan(after); assert.ok(s.ok, s.error);
  const dec = s.records.map(E.decode), tail = dec.slice(-2);
  assert.deepEqual(tail.map((d) => d.kind), ["REVISE", "GROUND"]);
  assert.equal(tail[0].after, tail[1].root, "the revision lands on the new ground");
  assert.equal(tail[0].step, 2);
  assert.ok(tail[0].surpriseBits > 0);
  assert.equal(domainTip(after, NAME).root, second.root);
});

test("a log that does not hold the conclusion the rows imply is refused, not revised", () => {
  const p = `${tmpdir()}/_rev3.eotm`, rows = rows0(); seed(p, rows);
  const drifted = rows.map((r) => ({ ...r, nn: base().map((v, u) => (u === 0 ? 7 : v)) }));
  assert.throws(() => applyEvidence(p, NAME, drifted, 0, base()), /disagree/);
});

test("revision surprise: zero when the reading is unchanged, positive when a neighbour moves", () => {
  const rows = rows0();
  assert.equal(reviseSurprise(rows, 0, base()), 0);
  const moved = base(); moved[0] = 9;
  assert.ok(reviseSurprise(rows, 0, moved) > 0);
});
