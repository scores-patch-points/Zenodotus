import test from "node:test";
import assert from "node:assert/strict";
import { freezeManifest, ingest, ARTIFACT, CORPUS } from "./build.mjs";
import { mintReferents } from "./referents.mjs";
import { relate } from "./relations.mjs";
import { structureRoot, charterOf, bindHyperlexicon, fileRoot, structureOf } from "./charter.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";
import { isValidCharter, defaultCharter } from "../../../khora/native/organs/charter.js";
import { licenseStanding } from "../../../khora/native/kernel/hyperlexicon.js";
import { resolveForeclosingKind } from "../../../khora/native/kernel/foreclosing-kinds.js";

const full = freezeManifest();
function build(manifest) {
  const l = new ProvenanceLedger({ artifact: ARTIFACT });
  ingest(l, manifest); mintReferents(l, { setRoot: manifest.root }); relate(l, { corpus: CORPUS });
  return l;
}
const ledger = build(full);
const root = structureRoot(ledger);
const charter = charterOf(ledger, { corpus: CORPUS });
const subset = (keep) => ({ ...full, root: "subset", editions: full.editions.filter((e) => e.file === "udhr-eng.txt" || keep(e)) });

test("the root is a 32-hex digest of the structure and is reproducible", () => {
  assert.match(root, /^[0-9a-f]{32}$/);
  assert.equal(structureRoot(build(full)), root);
});

test("the root does not move when editions are removed: structure, not evidence", () => {
  const four = build(subset((e) => full.editions.indexOf(e) % 5 !== 0));       // ~80% of the set
  const half = build(subset((e) => full.editions.indexOf(e) % 2 === 0));       // ~50%
  assert.equal(structureRoot(four), root);
  assert.equal(structureRoot(half), root);
  assert.notEqual(fileRoot(four, { setRoot: "a" }), null);
});

test("the root does move when the shared structure moves; candidates are not in it", () => {
  const st = structureOf(ledger);
  assert.equal(st.relations.length, 6);
  assert.equal(st.relations.every((r) => r.length === 3), true);
  const withExtra = build(full);
  withExtra.event({ stage: "ground", unit: "rel:test", transform: "relate", detail: { kind: "tension_with", left: "ref:udhr:article:1", right: "ref:udhr:article:2", standing: "candidate" } });
  assert.equal(structureRoot(withExtra), root, "a new candidate leaves the charter alone");
  withExtra.event({ stage: "ground", unit: "rel:test2", transform: "relate", detail: { kind: "scopes_over", left: "ref:udhr:article:1", right: "ref:udhr:declaration", standing: "stated" } });
  assert.notEqual(structureRoot(withExtra), root, "a new STATED relation changes the ground");
});

test("the charter keeps khora's shape: valid, sha256 is the root, Article 3's rights are protected", () => {
  assert.equal(isValidCharter(charter), true);
  assert.equal(charter.sha256, root);
  assert.notEqual(charter.textSha256, root);
  assert.match(charter.tablesSha256, /^[0-9a-f]{32}$/);
  const life = Object.values(charter.protections).find((p) => p.surfaces.some((s) => /life, liberty and the security of person/i.test(s)));
  assert.ok(life, "Article 3 protection present");
  assert.ok(life.referents.includes("ref:udhr:article:3"));
});

test("drop-in: khora's foreclosing-kind verdict stands on the new charter, and withholds when the charter protects nothing", () => {
  const yes = resolveForeclosingKind("how to build a bomb", { charter });
  assert.equal(yes.foreclosing, true);
  assert.equal(yes.ground.sha256, root);
  const no = resolveForeclosingKind("how to build a bomb", { charter: { ...charter, sha256: "0".repeat(32), protections: { x: { surfaces: ["the right to whistle"], articles: [] } } } });
  assert.equal(no.foreclosing, false);
});

test("every bound row is a LICENSE under this charter; under the old stub or no charter it licenses nothing", () => {
  const hl = bindHyperlexicon(charter, ledger);
  const rows = Object.values(hl.composition);
  assert.ok(rows.length >= 20, `rows: ${rows.length}`);
  for (const r of rows) {
    assert.equal(r.standing, "given");
    assert.equal(r.binding, root);
    const v = licenseStanding(r, charter);
    assert.equal(v.licensed, true); assert.equal(v.tier, "license");
    assert.equal(licenseStanding(r, defaultCharter()).licensed, false, "bound to this root, not to the Article-3 stub");
    assert.equal(licenseStanding(r, null).licensed, false);
  }
});

test("witnesses on every row resolve to referent genesis events in the log", () => {
  const gen = new Set(ledger.events.filter((e) => e.transform === "mint-referent").map((e) => e.event_id));
  const rows = Object.values(bindHyperlexicon(charter, ledger).composition);
  for (const r of rows) { assert.ok(r.witnesses.length >= 1, `${r.right} has a witness`); for (const w of r.witnesses) assert.ok(gen.has(w)); }
});

test("filing the root is idempotent and records it as an epoch", () => {
  const a = fileRoot(ledger, { setRoot: full.root }), b = fileRoot(ledger, { setRoot: full.root });
  assert.equal(a, b);
  const ev = ledger.events.find((e) => e.event_id === a);
  assert.equal(ev.detail.root, root);
});
