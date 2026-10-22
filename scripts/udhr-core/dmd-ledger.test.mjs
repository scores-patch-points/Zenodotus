import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadLedger, LOG } from "./build.mjs";
import { countsOf } from "./convergence.mjs";
import { structureRoot } from "./charter.mjs";
import { measure } from "./dmd-ledger.mjs";

const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));

test("no single edition makes a difference to the conclusion; the stable window is small and always found", () => {
  const m = measure(countsOf(full), { orders: 40 });
  assert.equal(m.charterRoot, structureRoot(full));
  assert.deepEqual(m.pivotalEditions, []);
  assert.equal(m.window.noWindowFound, 0);
  assert.ok(m.window.stable.charterRoot.max <= 64, `max ${m.window.stable.charterRoot.max}`);
  assert.ok(m.window.stable.articleStructure.max <= m.window.stable.charterRoot.max);
});
