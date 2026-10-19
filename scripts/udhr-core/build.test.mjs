import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freezeManifest, ingest, loadLedger, ARTIFACT } from "./build.mjs";
import { ProvenanceLedger } from "../../../penelope/organs/generation/provenance.mjs";

const manifest = freezeManifest();

test("516 editions frozen; root is reproducible", () => {
  assert.equal(manifest.count, 516);
  assert.equal(freezeManifest().root, manifest.root);
  assert.match(manifest.root, /^[0-9a-f]{32}$/);
});

test("ingest is deterministic and a second ingest into the saved log adds nothing", () => {
  const a = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(a, manifest);
  const b = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(b, manifest);
  assert.deepEqual(a.eot(), b.eot());
  const again = ingest(loadLedger(JSON.parse(JSON.stringify(a.eot()))), manifest);
  assert.equal(again.added, 0);
});

test("every edition is accounted for: segmented + gap = 516, and every anchor is inside its file", () => {
  const l = new ProvenanceLedger({ artifact: ARTIFACT }); const st = ingest(l, manifest);
  assert.equal(st.layout + st.numbered + st.structural + st.gaps, 516);
  const bytes = new Map([...l.sources.values()].map((s) => [s.source_id, s.meta.bytes]));
  for (const ev of l.events) if (ev.range) assert.ok(ev.range.start >= 0 && ev.range.end <= bytes.get(ev.source_id), `${ev.event_id} out of bounds`);
});

test("article anchors reproduce the English text verbatim", () => {
  const l = new ProvenanceLedger({ artifact: ARTIFACT }); ingest(l, manifest);
  const src = [...l.sources.values()].find((s) => s.locator.endsWith("udhr-eng.txt"));
  const buf = readFileSync(new URL("../../06-government-legal/un-udhr/udhr-eng.txt", import.meta.url));
  const a = l.events.find((e) => e.source_id === src.source_id && e.unit === "article:1");
  assert.match(buf.subarray(a.detail.paragraphs[0][0], a.detail.paragraphs[0][1]).toString("utf8"), /^All human beings are born free and equal/);
});
