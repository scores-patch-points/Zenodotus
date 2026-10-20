import test from "node:test";
import assert from "node:assert/strict";
import { readUnits } from "./read-beings.mjs";
import { makeSettler, prioritise, drain } from "./lookup.mjs";

// A tiny language the prior knows only partly: "drug" and "voda" are seen nouns; "zorbik" is unseen (admitted on its frame); "plekt" is unseen too.
const posPrior = { schema: "POSPrior@1", forms: { drug: { NOUN: 30 }, voda: { NOUN: 30 }, i: { CCONJ: 50 }, v: { ADP: 50 }, pit: { VERB: 20 } } };
const hearing = { posPrior, ear: null, framePrior: { schema: "FramePrior@1", frames: { "*|*": { NOUN: 8, VERB: 2 } }, marginal: { NOUN: 8, VERB: 2 } } };   // an unseen form is admitted on its frame alone
const frames = ["drug i zorbik v voda", "voda i drug", "zorbik plekt drug", "plekt voda zorbik", "drug i voda v zorbik plekt"];

test("a need is raised only for unseen forms; forms the prior has settled are never asked about", () => {
  const r = readUnits(frames, hearing, { settle: () => null });
  const asked = r.needs.map((n) => n.surface);
  assert.ok(asked.length >= 1 && asked.every((s) => s === "zorbik" || s === "plekt"), `needs: ${asked.join(",")}`);
  assert.ok(!asked.includes("drug") && !asked.includes("voda"), "settled forms are never looked up");
  for (const n of r.needs) assert.ok(!(n.surface in posPrior.forms));
  assert.equal(r.unseenAdmitted >= r.needs.length, true);
});

test("'unknown' is exactly what the reader treats as unseen: absent, or held only as X; a known stem before an apostrophe is known", async () => {
  const { isUnknownWord } = await import("./read-beings.mjs");
  const prior = { forms: { house: { NOUN: 9 }, do: { AUX: 9 }, foreignname: { X: 5 }, mixed: { X: 1, NOUN: 3 } } };
  assert.equal(isUnknownWord(prior, "house"), false);
  assert.equal(isUnknownWord(prior, "zebra"), true);
  assert.equal(isUnknownWord(prior, "foreignname"), true, "a form the prior holds only as X is unknown for the question of what it names");
  assert.equal(isUnknownWord(prior, "mixed"), false, "X below half is not enough to call it unknown");
  assert.equal(isUnknownWord(prior, "don't"), false, "the stem before the apostrophe is known (do + n't)");
  assert.equal(isUnknownWord(prior, "zebra's"), true);
});

test("an answer settles the need: nominal keeps the being, other drops it, no entry in this language leaves it a need", () => {
  const base = readUnits(frames, hearing, { settle: () => null });
  const target = base.needs[0]?.surface;
  assert.ok(target, "the toy prior must raise at least one need, or this test checks nothing");
  const keep = readUnits(frames, hearing, { settle: makeSettler({ [target]: { xx: [{ pos: "noun", glosses: ["x"] }] } }, "xx") });
  assert.ok(keep.list.some((b) => b.surface === target) && !keep.needs.some((n) => n.surface === target));
  const drop = readUnits(frames, hearing, { settle: makeSettler({ [target]: { xx: [{ pos: "verb", glosses: ["x"] }] } }, "xx") });
  assert.ok(!drop.list.some((b) => b.surface === target), "a form settled as a verb stops being a being");
  const other = readUnits(frames, hearing, { settle: makeSettler({ [target]: { yy: [{ pos: "noun", glosses: ["x"] }] } }, "xx") });
  assert.ok(other.needs.some((n) => n.surface === target), "an entry in another language settles nothing here");
  const never = readUnits(frames, hearing, { settle: makeSettler({}, "xx") });
  assert.ok(never.needs.some((n) => n.surface === target), "never looked up is still a need");
});

test("the queue goes most-consequential first, never asks twice, and reports each answer to the caller", async () => {
  const needs = [{ surface: "a", mentions: 2, units: 2 }, { surface: "b", mentions: 9, units: 5 }, { surface: "c", mentions: 4, units: 4 }];
  assert.deepEqual(prioritise(needs).map((n) => n.surface), ["b", "c", "a"]);
  const asked = [], answered = [];
  const n = await drain(needs, { fetchEntry: async (f) => { asked.push(f); return { xx: [] }; }, onAnswer: async (f) => answered.push(f), limit: 2 });
  assert.equal(n, 2);
  assert.deepEqual(asked, ["b", "c"]);
  assert.deepEqual(answered, ["b", "c"]);
});
