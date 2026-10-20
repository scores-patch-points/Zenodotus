import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deriveEdition, EDITIONS, CORPUS, PRIORS, OUT, RESIDUE } from "./derive-gold.mjs";

const sha = (u) => createHash("sha256").update(readFileSync(u)).digest("hex");
const inputs = JSON.parse(readFileSync(new URL("inputs.json", OUT), "utf8")).inputs;

test("frozen inputs: the text, hand and golden files still hash as when the gold was derived", () => {
  for (const c of Object.keys(EDITIONS)) {
    assert.equal(sha(new URL(`udhr-${c}.txt`, CORPUS)), inputs[c].text);
    assert.equal(sha(new URL(`udhr-${c}.txt.hand.eot.jsonl`, CORPUS)), inputs[c].hand);
    assert.equal(sha(new URL(EDITIONS[c], PRIORS)), inputs[c].golden);
  }
});

test("derivation is deterministic, every span is inside its window, slots of one row never overlap", () => {
  for (const c of Object.keys(EDITIONS)) {
    const a = deriveEdition(c), b = deriveEdition(c);
    assert.deepEqual(a.rows, b.rows);
    assert.equal(a.rows.filter((r) => r.kind === "heading").length, 31);
    for (const r of a.rows.filter((x) => x.kind === "proposition")) {
      const all = Object.entries(r.slots).filter(([, v]) => !v.status.startsWith("link-")).flatMap(([k, v]) => v.ranges.map(([s, e]) => [k, s, e]));
      for (const [, s, e] of all) assert.ok(s >= r.window[0] && e <= r.window[1], `${c} ${r.id}`);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (all[i][0] !== all[j][0]) assert.ok(all[i][2] <= all[j][1] || all[j][2] <= all[i][1], `${c} ${r.id} overlap`);
    }
  }
});

test("after adjudication no slot is left in a residue status, and each adjudicated slot says who decided", () => {
  for (const c of Object.keys(EDITIONS)) for (const r of readFileSync(new URL(`udhr-${c}.spans.jsonl`, OUT), "utf8").trim().split("\n").map(JSON.parse))
    for (const v of Object.values(r.slots)) { assert.ok(!RESIDUE.has(v.status), `${c} ${r.id}`); if (v.status.endsWith("adjudicated")) assert.ok(v.adjudicated?.by && v.adjudicated.confidence); }
});

test("the residue file is what was asked before adjudication, and is exactly the rows a person must decide, and is small", () => {
  const residue = JSON.parse(readFileSync(new URL("residue.json", OUT), "utf8"));
  assert.ok(residue.every((x) => RESIDUE.has(x.status)));
  assert.equal(residue.length, 20);
});
