import test from "node:test";
import assert from "node:assert/strict";
import { freezeManifest, ingest, ARTIFACT } from "./build.mjs";
import { mintReferents } from "./referents.mjs";
import { relate } from "./relations.mjs";
import { structureRoot } from "./charter.mjs";
import { CORPUS } from "./build.mjs";
import { countsOf, deriveStructure, runConvergence, margins, GRID } from "./convergence.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";

const manifest = freezeManifest();
const ledger = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(ledger, manifest); mintReferents(ledger, { setRoot: manifest.root }); relate(ledger, { corpus: CORPUS });
const counts = countsOf(ledger), ids = [...counts.keys()].sort();

test("the experiment's derivation IS the charter's: the full set yields the charter root", () => {
  assert.equal(deriveStructure(counts, ids).root, structureRoot(ledger));
  assert.equal(ids.length, 515);
});

test("a run is deterministic under its seed and differs under another", () => {
  const a = runConvergence(ledger, { setRoot: manifest.root, draws: 40, grid: [1, 8, 16] });
  const b = runConvergence(ledger, { setRoot: manifest.root, draws: 40, grid: [1, 8, 16] });
  const c = runConvergence(ledger, { setRoot: manifest.root, seed: "other", draws: 40, grid: [1, 8, 16] });
  assert.deepEqual(a.curve, b.curve);
  assert.notDeepEqual(a.curve, c.curve);
});

test("one edition alone is not enough: the preamble gets a false structure at k=1", () => {
  const r = runConvergence(ledger, { setRoot: manifest.root, draws: 100, grid: [1] });
  assert.equal(r.curve[0].wholeExact < 1, true);
  assert.ok(r.curve[0].preambleHasStructure > 0.9, "nearly every single edition invents a preamble structure; only those with no preamble do not");
});

test("margins: Article 12 is far from flipping; the preamble has no majority", () => {
  const m = margins(counts, ids);
  assert.ok(m.find((x) => x.unit === "article:12").margin > 400);
  assert.equal(m.find((x) => x.unit === "preamble").majority, false);
});
