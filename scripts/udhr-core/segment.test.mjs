import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { segmentEdition, TEMPLATE } from "./segment.mjs";
const ROOT = new URL("../../06-government-legal/un-udhr/", import.meta.url);

test("English: numbered, 31 units, every paragraph count matches the template", () => {
  const t = readFileSync(new URL("udhr-eng.txt", ROOT), "utf8");
  const s = segmentEdition(t);
  assert.equal(s.method, "layout");
  assert.equal(s.numberCheck, "agrees");
  assert.equal(s.units.length, 31);
  assert.deepEqual(s.units.slice(1).map((u) => u.paragraphs.length), TEMPLATE);
  const buf = Buffer.from(t, "utf8");
  const a1 = s.units[1];
  assert.match(buf.subarray(a1.heading.start, a1.heading.end).toString(), /^Article 1$/);
  assert.match(buf.subarray(a1.paragraphs[0][0], a1.paragraphs[0][1]).toString(), /^All human beings are born free/);
});

test("digit-less edition is read by layout; with the layout flattened it falls to structural and still yields 31 units", () => {
  const raw = readFileSync(new URL("udhr-009.txt", ROOT), "utf8");
  assert.equal(segmentEdition(raw).method, "layout");
  const flat = raw.replace(/\n{3,}/g, "\n\n");
  const s = segmentEdition(flat);
  assert.equal(s.method, "structural");
  assert.equal(s.units.length, 31);
});

test("an edition with no preamble is 30 units and says so", () => {
  const s = segmentEdition(readFileSync(new URL("udhr-057.txt", ROOT), "utf8"));
  assert.equal(s.preamble, false);
  assert.equal(s.units.length, 30);
  assert.equal(s.units[0].unit, "article:1");
});

test("garbage is a gap, never a guess", () => {
  assert.ok(segmentEdition("a\nb\nc\nd\nonly\none\n").gap);
});
