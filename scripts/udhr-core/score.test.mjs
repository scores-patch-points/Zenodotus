import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { guardedReader, score, loadGold } from "./score-aligner.mjs";
import { CORPUS } from "./derive-gold.mjs";
// The mechanical sidecar readings (udhr-*.txt.eot.jsonl) were removed from the published corpus (readings do not live in Zenodotus). Tests that need them say so and skip; they run where the sidecars exist.
const HAVE_SIDECARS = existsSync(new URL("udhr-spa.txt.eot.jsonl", CORPUS)), NO_SIDECARS = "the mechanical sidecar readings (udhr-*.txt.eot.jsonl) are not in the published corpus";

test("leak guard: a non-pivot aligner cannot read the hand/golden files or the sidecars that embed them", () => {
  const read = guardedReader();
  for (const f of ["udhr-spa.txt.hand.eot.jsonl", "udhr-spa.golden.json", "udhr-spa.txt.eot.json", "udhr-eng.txt.eot.json", "udhr-spa.spans.jsonl"]) assert.throws(() => read(f), /leak guard/, f);
  assert.ok(read("udhr-spa.txt").length > 1000);
});

test("leak guard: the mechanical reading IS allowed to a non-pivot aligner", { skip: !HAVE_SIDECARS && NO_SIDECARS }, () => {
  assert.ok(guardedReader()("udhr-spa.txt.eot.jsonl").length > 1000);
});

test("the gold used for scoring excludes provisional links and residue", () => {
  const g = loadGold("swh");
  assert.ok(g.props.length > 80 && g.props.every((p) => p.extent[0] < p.extent[1]));
});

test("scoring is deterministic and pre-registered thresholds are applied as written", { skip: !HAVE_SIDECARS && NO_SIDECARS }, () => {
  const a = score(), b = score();
  assert.deepEqual(a, b);
  for (const code of ["spa", "arb", "cmn_hans"]) assert.equal(a[code].clears.B3a, false);
  assert.equal(a.arb.B3a, 0, "the stack's reader emits no clause propositions for Arabic");
  assert.equal(a.cmn_hans.B3a, 0, "nor for Chinese");
});
