import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as E from "./eotm.mjs";
import { klDirichlet, makeModel } from "./surprise.mjs";
import { buildMind, DOMAIN } from "./build-mind.mjs";
import { loadLedger, LOG } from "./build.mjs";
import { structureRoot } from "./charter.mjs";
import { countsOf, deriveStructure } from "./convergence.mjs";

const out = `${tmpdir()}/_udhr.eotm`;
const built = buildMind(out);
const buf = readFileSync(out), scan = E.scan(buf);
const dec = scan.records.map(E.decode);

test("the log verifies, is tiny, and every record is a difference that made a difference or the ground under them", () => {
  assert.ok(scan.ok);
  assert.ok(buf.length < 2048, `${buf.length} bytes`);
  assert.deepEqual(dec.map((d) => d.kind), ["DMD", "DMD", "DMD", "DMD", "WINDOW", "MARGINS", "GROUND"]);
  for (const d of dec.filter((x) => x.kind === "DMD")) assert.notEqual(d.before, d.after, "a record that changed nothing is not a record");
});

test("replaying the editions in the same order reproduces exactly the recorded change points, and no others", () => {
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8"))), counts = countsOf(full);
  const order = [...counts.keys()].sort((a, b) => (full.sources.get(a).locator < full.sources.get(b).locator ? -1 : 1));
  const points = []; let prev = "00".repeat(16);
  order.forEach((id, i) => { const r = deriveStructure(counts, order.slice(0, i + 1)).root; if (r !== prev) { points.push(i); prev = r; } });
  assert.deepEqual(dec.filter((d) => d.kind === "DMD").map((d) => d.step), points);
  assert.equal(prev, structureRoot(full));
  assert.equal(dec.at(-1).root, structureRoot(full));
  assert.equal(dec.filter((d) => d.kind === "DMD").at(-1).after, dec.at(-1).root, "the last difference lands on the ground");
});

test("the chain is tamper-evident and an append to a broken log is refused", () => {
  const bad = Buffer.from(buf); bad[20] ^= 1;
  assert.equal(E.scan(bad).ok, false);
  const p = `${tmpdir()}/_bad.eotm`; writeFileSync(p, bad);
  assert.throws(() => E.append(p, E.KIND.GROUND, E.enc.ground({ domain: DOMAIN, root: "00".repeat(16), setRoot: "00".repeat(16), editions: 0, units: 0 })), /broken log/);
  assert.equal(E.scan(buf.subarray(0, buf.length - 3)).ok, false, "a truncated tail is detected");
});

test("append-only: appending leaves every earlier byte unchanged; an unknown kind is skipped by length", () => {
  const p = `${tmpdir()}/_app.eotm`; copyFileSync(out, p);
  E.append(p, 0x7f, Buffer.from("future record"));
  const after = readFileSync(p);
  assert.ok(after.subarray(0, buf.length).equals(buf));
  const s = E.scan(after); assert.ok(s.ok);
  assert.equal(E.decode(s.records.at(-1)).kind, "UNKNOWN(127)");
});

test("surprise is Bayesian: zero for no update, falls as the same thing is seen again, larger for the unexpected", () => {
  assert.equal(klDirichlet([2, 3, 4], [2, 3, 4]), 0);
  const m = makeModel([1]); const seq = [0, 1, 2, 3, 4].map(() => m.observe(new Map([[1, 1]])));
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] < seq[i - 1], `habituation at ${i}`);
  assert.ok(m.observe(new Map([[1, 3]])) > seq.at(-1));
});

test("the surprise absorbed without a change is recorded, so what did NOT make a difference is still accounted for", () => {
  const d = dec.filter((x) => x.kind === "DMD");
  assert.ok(d[1].absorbedBits > 0);
  assert.ok(built.absorbedAfterLast > d.reduce((s, x) => s + x.surpriseBits, 0), "most surprise made no difference");
});
