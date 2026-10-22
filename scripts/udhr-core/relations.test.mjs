import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freezeManifest, ingest, loadLedger, ARTIFACT, CORPUS } from "./build.mjs";
import { mintReferents, DECLARATION } from "./referents.mjs";
import { relate, witnesses, STATED, CANDIDATES } from "./relations.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";

const manifest = freezeManifest();
const ledger = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(ledger, manifest);
mintReferents(ledger, { setRoot: manifest.root });
const res = relate(ledger, { corpus: CORPUS });
const rels = ledger.events.filter((e) => e.transform === "relate");
const eng = readFileSync(new URL("udhr-eng.txt", CORPUS));

test("every stated relation is anchored to bytes that are the quoted phrase, verbatim", () => {
  const stated = rels.filter((e) => e.detail.standing === "stated");
  assert.equal(stated.length, STATED.length);
  for (const e of stated) {
    const quote = STATED.find((s) => s[0] === e.detail.kind)[2];
    assert.equal(eng.subarray(e.range.start, e.range.end).toString("utf8"), quote);
    assert.ok(e.source_id, "a stated relation has a source");
  }
});

test("candidates carry no anchor and a basis; none is mislabelled stated", () => {
  const c = rels.filter((e) => e.detail.standing === "candidate");
  assert.equal(c.length, CANDIDATES.length);
  for (const e of c) { assert.equal(e.source_id, undefined); assert.equal(e.range, undefined); assert.ok(e.detail.basis.length > 20); }
});

test("every relation joins referents that exist in the log (ids resolve to genesis events)", () => {
  const gen = new Set(ledger.events.filter((e) => e.transform === "mint-referent").map((e) => e.event_id));
  for (const e of rels) { assert.ok(gen.has(e.parent)); assert.ok(gen.has(e.ibid)); }
  assert.ok(rels.some((e) => e.detail.right === DECLARATION));
});

test("the stated relations all point at the whole: the UDHR cites no article by number", () => {
  assert.ok(STATED.every((s) => s[3] === DECLARATION));
  const text = eng.toString("utf8");
  assert.equal(/\b(?:Article|Articles)\s+\d+/.test(text.split("Article 1")[1].replace(/Article \d+\n/g, "")), false);
});

test("witness counts: each stating paragraph is aligned in most editions; a relation is not claimed beyond that", () => {
  const w = witnesses(ledger);
  for (const r of w.filter((x) => x.standing === "stated")) assert.ok(r.editions >= 450, `${r.id}: ${r.editions}`);
});

test("filing again into the saved log adds nothing", () => {
  const again = relate(loadLedger(JSON.parse(JSON.stringify(ledger.eot()))), { corpus: CORPUS });
  assert.equal(again.added, 0);
  assert.equal(res.added, STATED.length + CANDIDATES.length);
});

test("relating into a log that lacks the reading edition throws rather than anchoring nothing", () => {
  assert.throws(() => relate(Object.assign(new ProvenanceLedger({ artifact: ARTIFACT }), {}), { corpus: CORPUS }), /not in the log/);
});
