import test from "node:test";
import assert from "node:assert/strict";
import { freezeManifest, ingest, loadLedger, ARTIFACT, CORPUS } from "./build.mjs";
import { mintReferents } from "./referents.mjs";
import { fileVariants, classify } from "./variants.mjs";
import { structureRoot } from "./charter.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";

const manifest = freezeManifest();
const ledger = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(ledger, manifest); mintReferents(ledger, { setRoot: manifest.root });
const rootBefore = structureRoot(ledger);
const res = fileVariants(ledger);
const vars = ledger.events.filter((e) => e.transform === "variant");
const find = (unit, kind, value) => vars.find((e) => e.unit === unit && e.detail.kind === kind && String(e.detail.value) === String(value));

test("classify: typed by evidence, not by count alone", () => {
  assert.equal(classify({ editions: 3, languageStems: 3, directRead: 0 }), "artifact-suspect");
  assert.equal(classify({ editions: 3, languageStems: 3, directRead: 2 }), "attested");
  assert.equal(classify({ editions: 3, languageStems: 1, directRead: 3 }), "singular");
  assert.equal(classify({ editions: 1, languageStems: 1, directRead: 1 }), "singular");
});

test("Article 2 given as one paragraph is a widely attested alternative, read directly, kept beside the modal two", () => {
  const v = find("ref:udhr:article:2", "paragraph-count", 1);
  assert.equal(v.detail.modal, 2);
  assert.equal(v.detail.type, "attested");
  assert.equal(v.detail.textualCriticism, "revision-candidate");
  assert.ok(v.detail.support.editions >= 40 && v.detail.support.directRead >= 40);
  assert.equal(v.detail.editions.length, v.detail.support.editions);
});

test("the preamble is unsettled: every observed count is filed and none is called the mode", () => {
  const pre = vars.filter((e) => e.unit === "ref:udhr:preamble" && e.detail.kind === "paragraph-count");
  assert.ok(pre.length >= 10);
  assert.ok(pre.every((e) => e.detail.type === "unsettled" && e.detail.modal === null && e.detail.textualCriticism === null));
});

test("editions with no preamble are filed as an omission, and the gap edition is not among them", () => {
  const o = find("ref:udhr:preamble", "omission", "absent");
  assert.equal(o.detail.type, "omission");
  const names = o.detail.editions.map((id) => ledger.sources.get(id).locator);
  assert.ok(names.some((n) => n.endsWith("udhr-057.txt")));
  assert.ok(!names.some((n) => n.endsWith("udhr-chv.txt")), "chv has no units at all; it is a gap, not an omission");
  assert.equal(o.detail.editions.length, 20);
});

test("every carrier resolves to an edition in the log; variants never touch the charter root", () => {
  for (const v of vars) for (const id of v.detail.editions) assert.ok(ledger.sources.has(id));
  assert.equal(structureRoot(ledger), rootBefore);
});

test("filing again into the saved log adds nothing", () => {
  assert.equal(fileVariants(loadLedger(JSON.parse(JSON.stringify(ledger.eot())))).added, 0);
  assert.ok(res.added > 40);
});
