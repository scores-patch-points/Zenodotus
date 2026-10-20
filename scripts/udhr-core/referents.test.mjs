import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freezeManifest, ingest, loadLedger, ARTIFACT } from "./build.mjs";
import { mintReferents, coverage, articleKey, paragraphKey, PREAMBLE } from "./referents.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";

const manifest = freezeManifest();
const ledger = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(ledger, manifest);
const res = mintReferents(ledger, { setRoot: manifest.root });
const referent = (key) => ledger.events.find((e) => e.transform === "mint-referent" && e.unit === key);

test("referents are nameless: genesis carries no source and no range; ids are structural", () => {
  const g = referent(articleKey(12));
  assert.equal(g.source_id, undefined);
  assert.equal(g.range, undefined);
  assert.equal(g.detail.setRoot, manifest.root);
  assert.equal(g.unit, "ref:udhr:article:12");
});

test("the mode over 515 editions reproduces the English paragraph structure for all 30 articles", () => {
  const T = [1,2,1,1,1,1,1,1,1,1,2,1,2,2,2,3,2,1,1,2,3,1,4,1,2,3,2,1,3,1];
  T.forEach((n, i) => assert.equal(res.modal.get(i + 1).count, n, `article ${i + 1}`));
});

test("the preamble has no majority paragraph structure, so it gets an article-level referent only", () => {
  assert.equal(referent("ref:udhr:preamble").detail.paragraphs, null);
  assert.equal(referent(paragraphKey(PREAMBLE, 1)), undefined);
});

test("membership carries segmentation method + confidence as evidence and points at the edition's own event", () => {
  const eng = [...ledger.sources.values()].find((s) => s.locator.endsWith("udhr-eng.txt"));
  const m = ledger.events.find((e) => e.transform === "member" && e.source_id === eng.source_id && e.unit === paragraphKey(2, 2));
  assert.equal(m.detail.method, "layout");
  assert.equal(m.detail.numberCheck, "agrees");
  assert.equal(m.detail.confidence.of, 30);
  assert.equal(ledger.events.find((e) => e.event_id === m.ibid).unit, paragraphKey(2, 2));
  const buf = readFileSync(new URL("../../06-government-legal/un-udhr/udhr-eng.txt", import.meta.url));
  assert.match(buf.subarray(m.range.start, m.range.end).toString("utf8"), /^Furthermore, no distinction shall be made/);
  assert.equal(ledger.events.find((e) => e.event_id === m.parent).stage, "arrange");
});

test("an edition whose paragraph count differs is a member of the article only, and the divergence is recorded", () => {
  const div = ledger.events.find((e) => e.transform === "member" && e.detail.paragraphDivergence);
  assert.ok(div, "some edition diverges");
  assert.match(div.unit, /^ref:udhr:article:\d+$/);
  const siblings = ledger.events.filter((e) => e.transform === "member" && e.source_id === div.source_id && e.unit.startsWith(div.unit + ":p:"));
  assert.equal(siblings.length, 0);
});

test("minting again into the saved log adds nothing; every edition with a unit is counted once per referent", () => {
  const again = mintReferents(loadLedger(JSON.parse(JSON.stringify(ledger.eot()))), { setRoot: manifest.root });
  assert.equal(again.added, 0);
  const cov = coverage(ledger);
  assert.ok(cov.get(articleKey(1)).editions >= 515);
  assert.ok(cov.get("ref:udhr:preamble").editions >= 494);
});
