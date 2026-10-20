import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as E from "./eotm.mjs";
import { baseTable, withPairs, tableRoot, replayHyperlexicon, unitKey } from "./hyperlexicon-link.mjs";
import { licenseStanding } from "../../../khora/native/kernel/hyperlexicon.js";
import { defaultCharter } from "../../../khora/native/organs/charter.js";

const ROOT = "18aa32ed202156bb6132c954091dfb5c";
const nnWith = (pairs) => { const nn = new Array(31).fill(-1); for (const [u, v] of pairs) { nn[u] = v; nn[v] = u; } return nn; };
const mk = (i, pairs) => ({ sid: `src_${String(i).padStart(20, "0")}`, nn: nnWith(pairs) });

test("stated relations are GIVEN and bound to the charter root; they license under that charter and under no other", () => {
  const hl = baseTable(ROOT), given = Object.values(hl.composition).filter((r) => r.standing === "given");
  assert.equal(given.length, 6);
  for (const r of given) {
    assert.equal(licenseStanding(r, { sha256: ROOT }).licensed, true);
    assert.equal(licenseStanding(r, defaultCharter()).licensed, false, "not under the Article-3 stub");
    assert.equal(licenseStanding(r, null).licensed, false);
  }
  assert.equal(Object.values(hl.composition).filter((r) => r.standing === "candidate").length, 10);
});

test("beings pairs enter as CANDIDATES with the editions that voted as witnesses; agreement never makes them given", () => {
  const rows = [mk(0, [[4, 5]]), mk(1, [[4, 5]]), mk(2, [[4, 5]])];
  const hl = withPairs(baseTable(ROOT), ["4-5"], rows);
  const row = hl.composition[`${unitKey(4)}\u0000${unitKey(5)}`];
  assert.equal(row.standing, "candidate");
  assert.equal(row.witnesses.length, 3);
  assert.equal(Object.values(hl.composition).filter((r) => r.standing === "given").length, 6);
});

test("witnesses are evidence, not a difference: more voters leave the table root alone", () => {
  const r2 = [mk(0, [[4, 5]]), mk(1, [[4, 5]])], r3 = [...r2, mk(2, [[4, 5]])];
  assert.equal(tableRoot(withPairs(baseTable(ROOT), ["4-5"], r2)), tableRoot(withPairs(baseTable(ROOT), ["4-5"], r3)));
  assert.notEqual(tableRoot(withPairs(baseTable(ROOT), ["4-5"], r2)), tableRoot(withPairs(baseTable(ROOT), [], r2)));
});

test("ingestion records a table change only when the table changed, ends on its ground, and the chain verifies", () => {
  const p = `${tmpdir()}/_hl.eotm`; E.create(p);
  // pair 4-5 from the start; edition 3 adds 8-10; the 4th and 5th change nothing
  const rows = [mk(0, [[4, 5]]), mk(1, [[4, 5]]), mk(2, [[4, 5], [8, 10]]), mk(3, [[4, 5], [8, 10]]), mk(4, [[4, 5], [8, 10]])];
  const r = replayHyperlexicon(p, rows, { charterRoot: ROOT });
  const dec = E.scan(readFileSync(p)).records.map(E.decode);
  const diffs = dec.filter((d) => d.kind === "DMDN");
  assert.ok(diffs.length >= 2 && diffs.length < rows.length, `${diffs.length} records for ${rows.length} editions`);
  for (const d of diffs) assert.notEqual(d.before, d.after);
  for (let i = 1; i < diffs.length; i++) assert.equal(diffs[i].before, diffs[i - 1].after);
  assert.equal(diffs.at(-1).after, dec.at(-1).root);
  assert.equal(dec.at(-1).root, r.root);
  assert.equal(diffs[0].changes.filter((c) => c.to).length, 6 + 10 + 1, "first record: 6 given + 10 interpretive + the first pair");
});
