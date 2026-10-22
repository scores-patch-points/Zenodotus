import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMind } from "./mind-priors.mjs";
import * as E from "./eotm.mjs";

// The merged log lives in the sibling mnemosyne checkout; skip (with the reason) when it is absent.
const LOG = new URL("../../../mnemosyne/mind.eot", import.meta.url).pathname, HAVE = existsSync(LOG);
const ART = ["ring1-genre-gated-report.json", "coraal-units-report.json", "ring1-spiral3-report.json", "ring1-spiral3-check-report.json", "perspective-profiles-report.json"];
const stage = () => { const d = mkdtempSync(join(tmpdir(), "mind-")) + "/"; for (const f of ART) copyFileSync(new URL(`./${f}`, import.meta.url), d + f); mkdirSync(d + "provenance"); for (const f of ["revisions.json", "standpoints.json"]) copyFileSync(new URL(`./provenance/${f}`, import.meta.url), d + `provenance/${f}`); return d; };

test("the merged log and its artifacts verify: ring1-english and ring1-associates recompute to the log's roots", { skip: !HAVE && "no ../mnemosyne/mind.eot checkout" }, async () => {
  const m = await loadMind({ logPath: LOG, dir: stage() });
  assert.ok(m.chainOk);
  assert.equal(m.domains["udhr-core/ring1-english"].verified, true, m.domains["udhr-core/ring1-english"].reason);
  assert.equal(m.domains["udhr-core/ring1-associates"].verified, true);
  assert.equal(m.overIndexed.standing, "candidate"); assert.deepEqual(m.overIndexed.ac, [], "the folder-labelled anti-colonial items are withdrawn"); assert.equal(m.associates, null, "the associates are withdrawn: no priors offered");
});

test("fail closed: an altered artifact withholds ITS domain only", { skip: !HAVE && "no checkout" }, async () => {
  const d = stage(), g = JSON.parse(readFileSync(d + "ring1-genre-gated-report.json", "utf8"));
  g.survival.firstPerson = g.survival.firstPerson.filter((x) => !x.survives).concat(g.survival.firstPerson.filter((x) => x.survives).slice(1));   // one first-person survivor removed
  writeFileSync(d + "ring1-genre-gated-report.json", JSON.stringify(g));
  const m = await loadMind({ logPath: LOG, dir: d });
  assert.equal(m.domains["udhr-core/ring1-english"].verified, false); assert.equal(m.overIndexed, null, "no priors from a domain that does not verify");
  assert.equal(m.domains["udhr-core/ring1-associates"].verified, true, "the other domain is unaffected (it verifies as the withdrawn, empty set)");
});

test("fail closed: a missing artifact withholds the domain with a stated reason", { skip: !HAVE && "no checkout" }, async () => {
  const d = stage(); writeFileSync(d + "coraal-units-report.json", "not json");
  const m = await loadMind({ logPath: LOG, dir: d });
  assert.equal(m.domains["udhr-core/ring1-english"].verified, false); assert.match(m.domains["udhr-core/ring1-english"].reason, /unreadable|missing/); assert.equal(m.overIndexed, null);
});

test("fail closed: a tampered log withholds everything", { skip: !HAVE && "no checkout" }, async () => {
  const buf = Buffer.from(readFileSync(LOG)); buf[40] ^= 1; const p = join(mkdtempSync(join(tmpdir(), "mindlog-")), "mind.eot"); writeFileSync(p, buf);
  const m = await loadMind({ logPath: p, dir: stage() });
  assert.equal(m.chainOk, false); assert.ok(Object.values(m.domains).every((v) => v.verified === false)); assert.equal(m.associates, null); assert.equal(m.overIndexed, null);
});

test("the charter verifies from its two small artifacts alone: the rebuilt root equals the log's, no event log needed", { skip: !HAVE && "no checkout" }, async () => {
  const m = await loadMind({ logPath: LOG, needs: ["charter"] });
  assert.equal(m.domains["udhr-core"].verified, true, m.domains["udhr-core"].reason); assert.equal(m.charter.relations.length, 16); assert.equal(m.overIndexed, null, "not requested, not loaded"); assert.equal(m.associates, null);
});

test("fail closed: an altered paragraph count withholds the charter", { skip: !HAVE && "no checkout" }, async () => {
  const d = stage(); for (const f of ["referents.json", "relations.json"]) copyFileSync(new URL(`./${f}`, import.meta.url), d + f);
  const rj = JSON.parse(readFileSync(d + "referents.json", "utf8")); rj.modal["2"].count = 3; writeFileSync(d + "referents.json", JSON.stringify(rj));
  const m = await loadMind({ logPath: LOG, dir: d, needs: ["charter"] });
  assert.equal(m.domains["udhr-core"].verified, false); assert.equal(m.charter, null);
});

test("activation by need: a load for the charter opens neither ring-1 nor associate artifacts", { skip: !HAVE && "no checkout" }, async () => {
  const fs = (await import("node:fs")).default, sync = (await import("node:module")).default, orig = fs.readFileSync, opened = new Set(); fs.readFileSync = function (p, ...r) { if (typeof p === "string" && p.endsWith(".json")) opened.add(p.split("/").pop()); return orig.call(this, p, ...r); }; sync.syncBuiltinESMExports();
  try { const { loadMind: lm } = await import("./mind-priors.mjs?activation"); await lm({ logPath: LOG, needs: ["charter"] }); } finally { fs.readFileSync = orig; sync.syncBuiltinESMExports(); }
  assert.deepEqual([...opened].filter((f) => /ring1|coraal|referents|relations/.test(f)).sort(), ["referents.json", "relations.json"]);
});

// ---- the immutable core ----
const CORE_JSON = new URL("../../../mnemosyne/core.json", import.meta.url).pathname, HAVE_CORE = HAVE && existsSync(CORE_JSON);
const withCore = (logBytes) => { const dir = mkdtempSync(join(tmpdir(), "corelog-")); writeFileSync(join(dir, "mind.eot"), logBytes); copyFileSync(CORE_JSON, join(dir, "core.json")); return join(dir, "mind.eot"); };

test("the merged log's core is intact against core.json, and the loader says so", { skip: !HAVE_CORE && "no mnemosyne checkout with core.json" }, async () => {
  const m = await loadMind({ logPath: withCore(readFileSync(LOG)), dir: stage() });
  assert.deepEqual(m.core, { pinned: true, intact: true }); assert.equal(m.domains["udhr-core/ring1-english"].verified, true);
});

test("fail closed: a log whose core was REWRITTEN AND RE-CHAINED (so the chain verifies) is refused by the pin", { skip: !HAVE_CORE && "no core.json" }, async () => {
  const pin = JSON.parse(readFileSync(CORE_JSON, "utf8")), real = E.scan(readFileSync(LOG)), forged = join(mkdtempSync(join(tmpdir(), "forge-")), "mind.eot"); E.create(forged);
  real.records.forEach((r, i) => { let payload = Buffer.from(r.payload); if (i === 0) payload[20] ^= 1; E.append(forged, r.kind, payload); });          // first core record altered, chain recomputed
  assert.equal(E.scan(readFileSync(forged)).ok, true, "the forged log's chain verifies: only the pin can catch it");
  copyFileSync(CORE_JSON, join(forged, "../core.json"));
  const m = await loadMind({ logPath: forged, dir: stage() });
  assert.equal(m.core.intact, false); assert.match(m.core.reason, /pinned prefix hash|ground differs/); assert.ok(Object.values(m.domains).every((d) => d.verified === false)); assert.equal(m.associates, null);
});

test("a log with no core.json is loaded but says nothing pins the core", { skip: !HAVE && "no checkout" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "nopin-")); copyFileSync(LOG, join(dir, "mind.eot"));
  const m = await loadMind({ logPath: join(dir, "mind.eot"), dir: stage() }); assert.equal(m.core.pinned, false);
});
