import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { loadLedger, LOG } from "./build.mjs";
import { mindAt } from "./mind.mjs";

const have = existsSync(new URL(LOG));
const ledger = have ? loadLedger(JSON.parse(readFileSync(LOG, "utf8"))) : null;
const epochs = existsSync(new URL("./epochs.json", import.meta.url)) ? JSON.parse(readFileSync(new URL("./epochs.json", import.meta.url), "utf8")) : [];

test("the mind at cursor 0 is empty; at the end it has the root, six stated relations, ten candidates", { skip: !have }, () => {
  const none = mindAt(ledger, { cursor: 0 });
  assert.equal(none.charterRoot, null);
  assert.match(none.judgment, /nothing on the ledger yet/);
  const all = mindAt(ledger, { epochs });
  assert.match(all.charterRoot, /^[0-9a-f]{32}$/);
  assert.equal(all.stated.length, 6);
  assert.equal(all.candidates.length, 10);
  assert.ok(all.variants.byType.attested > 0);
  assert.match(all.judgment, /earned: charter:udhr@/);
  assert.match(all.judgment, /withheld-candidate:/);
});

test("the mind is a pure fold: an earlier cursor never sees later events", { skip: !have }, () => {
  const mid = mindAt(ledger, { cursor: ledger.events.findIndex((e) => e.transform === "relate") });
  assert.equal(mid.stated.length, 0);
  assert.ok(mid.referents > 0);
});

// The convergence event is filed by run-convergence.mjs (part of `node all.mjs`), not by build.mjs: a log that has not been through it has nothing to carry.
const hasConvergence = have && ledger.events.some((e) => e.transform === "convergence");
test("the convergence verdict on the record is carried into the mind", { skip: hasConvergence ? false : "no convergence event in this log: run `node all.mjs` first (convergence-absent)" }, () => {
  const m = mindAt(ledger, { epochs });
  assert.equal(m.convergence.holds, true);
  assert.equal(m.convergence.articleExactAtClaim, 1);
  assert.deepEqual(m.refuted, []);
});
