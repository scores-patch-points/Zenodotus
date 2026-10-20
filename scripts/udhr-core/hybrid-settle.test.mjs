import test from "node:test";
import assert from "node:assert/strict";
import { makeHybridSettler, entryKind } from "./hybrid-settle.mjs";

const e = (...pos) => ({ en: pos.map((p) => ({ pos: p, glosses: [] })) });
const entries = { dignity: e("noun"), supplemented: e("verb"), strive: e("verb", "noun"), arbitrary: e("adjective", "noun"), nothing: { de: [{ pos: "noun" }] }, gone: null };
const sniffed = new Map([["strive", "other"], ["arbitrary", "other"], ["unlooked", "nominal"]]);
const settle = makeHybridSettler(entries, "en", sniffed);

test("a pure Wiktionary list settles by itself, and the sniff is not consulted", () => {
  assert.equal(settle("dignity"), "nominal"); assert.equal(settle("supplemented"), "other");
  assert.equal(settle.why("dignity").source, "wiktionary-pure");
  const against = makeHybridSettler(entries, "en", new Map([["dignity", "other"]]));
  assert.equal(against("dignity"), "nominal", "a sniff never overrides a pure verdict");
});

test("a mixed list defers to the accepted sniff vote, and stays a need without one", () => {
  assert.equal(entryKind(entries.strive, "en"), "mixed");
  assert.equal(settle("strive"), "other"); assert.equal(settle.why("strive").source, "sniff-mixed");
  assert.equal(makeHybridSettler(entries, "en")("strive"), null, "no accepted vote: unsettled, not guessed");
});

test("a word never asked, or with no entry in this language, settles only on an accepted sniff vote (provisional)", () => {
  assert.equal(settle("unlooked"), "nominal"); assert.equal(settle.why("unlooked").source, "sniff-unasked");
  assert.equal(settle("nothing"), null); assert.equal(settle("gone"), null); assert.equal(settle("never-seen"), null);
  assert.equal(makeHybridSettler(entries, "en", new Map([["nothing", "other"]]))("nothing"), "other");
});

test("the reader accepts it as a settle function", async () => {
  const { readUnits } = await import("./read-beings.mjs");
  const posPrior = { schema: "POSPrior@1", forms: { drug: { NOUN: 30 }, voda: { NOUN: 30 }, i: { CCONJ: 50 }, v: { ADP: 50 } } };
  const hearing = { posPrior, ear: null, framePrior: { schema: "FramePrior@1", frames: { "*|*": { NOUN: 8, VERB: 2 } }, marginal: { NOUN: 8, VERB: 2 } } };
  const frames = ["drug i zorbik v voda", "voda i drug", "zorbik plekt drug", "plekt voda zorbik", "drug i voda v zorbik plekt"];
  const before = readUnits(frames, hearing, { settle: () => null });
  const after = readUnits(frames, hearing, { settle: makeHybridSettler({ zorbik: e("noun") }, "en") });
  assert.ok(before.needs.some((n) => n.surface === "zorbik"), "zorbik is a need before settlement (else this test proves nothing)");
  assert.ok(!after.needs.some((n) => n.surface === "zorbik"), "a settled word is no longer a need");
});
