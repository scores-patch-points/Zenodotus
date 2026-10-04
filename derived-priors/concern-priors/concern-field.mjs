#!/usr/bin/env node
// live_priors/derived-priors/concern-priors/concern-field.mjs — the concern field.
//
// ConcernField@1 — "what kinds of things this giver gives a shit about, and
// how it dwells on them": a byte-addressed, mechanical print of the FULL
// ORIGINAL text of every speakable archon in the ethos corpus. It is the
// memory half of the POV design: the "for whom" transform that steers the
// material given to the model reads THIS, not a hand-authored role summary.
//
// WHAT THIS PRINT IS AND IS NOT. It is a TYPING OF MATTERING: what kinds of
// things count as what, for whom — the pathos layer of each voice. It does
// not change how the reasoning works. Logos is untouched by this print: the
// fold, the engine, the nulls all run as they ran. Pathos never gates and
// never grades; it discloses whose stake the claim is (the house law,
// stack-digest.mjs). The shadow's only use is to say WHOSE voice is live on
// a topic and what material that voice should be offered — the activation
// of the relevant archons — never to re-weight a claim's own standing.
//
// WHAT IT PRINTS
//   spread-dwellings   the terms the canon RETURNS TO — spread across more
//                      of the text than other terms of the same frequency
//   intensity-dwellings the terms the canon returns to INTENSELY —
//                      concentrated in fewer blocks than its own peers
//   entities           the case-cased proper-noun candidates the canon holds
//                      as its own (a script with no case → named gap)
// Every admitted term ships the byte spans where the canon dwells on it.
//
// THE NULL IS THE TEXT'S OWN POPULATION (the house's standing shape —
// elenchus born mass, anchoring, pronouns: "the null is the caller's own
// distribution"). A term's null is the giver's own terms at the SAME
// frequency (the power-of-two count bin is the neighborhood): the floor is
// the MAX over 39 seeded bootstrap draws from that neighborhood — the
// elenchus idiom, "the max over reruns IS the false-positive floor". A
// function word distributes like every other function word and is refused
// by its own peers; a dwelling term must beat the whole neighborhood at
// its own frequency. No shuffle is used — the permutation null was
// measured and REFUSED here (2026-10-01): it cannot see the text's own
// grammatical regularity, so it admitted die/nicht/ein as dwellings.
//
// DISCIPLINE (the house's, inherited — no hand-set numbers):
//   minLen/minCount    declared structural bounds, in the header
//   blocks             derived: sqrt of the token count, clamped [4,64]
//   the null           the giver's own count-neighborhood, 39 seeded
//                      bootstrap draws, floor = max (resolution 1/40 =
//                      0.025 < RERUN_NULL.alpha = 0.05, the standing)
//   determinism        by construction (seeded)
//   stability          a second, independent seed arm re-runs the whole
//                      admission; the prior is the INTERSECTION, and the
//                      drops are recorded as the dissent — never silent
//
// The basin kind-induction organ (entity-kind-induction.js) is a NAMED GAP,
// never approximated: it needs entity features this recipe does not
// fabricate; the control that would close it is recorded in each prior.
//
//   node concern-field.mjs              build every speakable archon
//   node concern-field.mjs nietzsche    build one archon
//   node concern-field.mjs --list       the speakable cast + sources
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createSeededRng, seedFrom } from "../../../khora/native/kernel/rng.js";
import { RERUN_NULL } from "../../../khora/native/eval/lavar/elenchus-bar.mjs";

const ROOT = "/Users/mlacy/Documents/3.0";
const MANIFEST_DIR = path.join(ROOT, "eo-teachings/manifest");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "concern-fields");
const GAPS = path.join(HERE, "named-gaps.jsonl");

// ── declared parameters (structural, in the header, never tuned) ──────────
const MIN_LEN = 3; // a 1-2 letter run is a particle in most of these scripts
const MIN_COUNT = 3; // below 3 occurrences a spread of 1-3 blocks cannot be a dwelling
const NULL_DRAWS = 39; // budget, disclosed: resolution 1/40 < RERUN_NULL.alpha
const ALPHA = RERUN_NULL.alpha; // the house's standing 0.05
const SEED_PREFIX = "concern-field@1";
const MAX_ADDRS = 8; // byte-span budget per admitted term

const SPEAKABLE = new Set(["verified", "verified_local_archive_pending"]);

function slugOf(handle) {
  return String(handle).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── the cast: pythia's own loadManifest contract (pythia.mjs:63-77), kept
// identical here so the field and the oracle can never disagree on who speaks
function loadCast() {
  const byKey = new Map();
  for (const f of fs.readdirSync(MANIFEST_DIR)) {
    if (!f.endsWith(".json")) continue;
    let r;
    try { r = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, f), "utf8")); } catch { continue; }
    const key = String(r.handle ?? "").toLowerCase();
    if (!key || !r.giver) continue;
    const speakable = SPEAKABLE.has(r.status) && typeof r.quote === "string" && Number.isInteger(r.c0) && Number.isInteger(r.c1) && typeof r.source?.path === "string";
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, { ...r, speakable });
    else if (speakable && !prev.speakable) byKey.set(key, { ...r, speakable });
  }
  return byKey;
}

function blocksFor(nTokens) {
  return Math.max(4, Math.min(64, Math.floor(Math.sqrt(nTokens))));
}

// tokens with original byte spans; a run shorter than MIN_LEN is a particle;
// `cased` marks a token whose first letter is genuinely uppercase (a letter
// that has a case and is wearing it — sentence-initial tokens qualify, the
// entity layer below separates the two)
function tokenize(text) {
  const re = /\p{L}+/gu;
  const out = [];
  for (let m; (m = re.exec(text)) !== null;) {
    const t = m[0];
    if (t.length < MIN_LEN) continue;
    const first = t[0];
    out.push({ low: t.toLowerCase(), cased: first === first.toUpperCase() && first !== first.toLowerCase(), start: m.index, end: m.index + t.length });
  }
  return out;
}

// per-term block-count map: total entries == tokens, one pass
function countPass(tokens, B) {
  const blockSize = Math.max(1, Math.ceil(tokens.length / B));
  const perTerm = new Map();
  let upper = 0;
  let lower = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const b = Math.floor(i / blockSize);
    const t = tokens[i];
    let m = perTerm.get(t.low);
    if (!m) { m = new Map(); perTerm.set(t.low, m); }
    m.set(b, (m.get(b) ?? 0) + 1);
    if (t.cased) upper += 1; else lower += 1;
  }
  return { perTerm, upper, lower };
}

function statsOf(m) {
  let count = 0;
  let maxInBlock = 0;
  for (const c of m.values()) { count += c; if (c > maxInBlock) maxInBlock = c; }
  return { count, spread: m.size, maxshare: count ? maxInBlock / count : 0 };
}

// the null is the text's own population at the same frequency: the power-of-
// two count bin IS the neighborhood, and a term's floor is the MAX over
// NULL_DRAWS seeded draws from that bin WITHOUT the term itself (leave-one-
// out: the null is the population the term must distinguish itself from —
// a bin of one cannot be its own null and is refused honestly, never run)
function arm(observed, tokens, B, sha, armId) {
  const stats = new Map();
  for (const [low, m] of observed.perTerm) {
    const s = statsOf(m);
    if (s.count >= MIN_COUNT) stats.set(low, s);
  }
  const bins = new Map();
  for (const [low, s] of stats) {
    const bin = Math.floor(Math.log2(s.count));
    let members = bins.get(bin);
    if (!members) { members = []; bins.set(bin, members); }
    members.push({ low, ...s });
  }
  const rng = createSeededRng(seedFrom(`${SEED_PREFIX}|${sha}|${armId}`));
  const admitted = [];
  for (const [low, s] of stats) {
    const bin = Math.floor(Math.log2(s.count));
    const members = bins.get(bin);
    if (!members || members.length < 2) continue; // a bin of one is its own null: refused honestly
    const peers = members.filter((m) => m.low !== low); // leave-one-out: the population to beat
    if (!peers.length) continue;
    let spreadMax = 0;
    let shareMax = 0;
    let spreadExceed = 0;
    let shareExceed = 0;
    for (let d = 0; d < NULL_DRAWS; d += 1) {
      const peer = peers[Math.floor(rng() * peers.length)];
      if (peer.spread > spreadMax) spreadMax = peer.spread;
      if (peer.maxshare > shareMax) shareMax = peer.maxshare;
      if (peer.spread >= s.spread) spreadExceed += 1;
      if (peer.maxshare >= s.maxshare) shareExceed += 1;
    }
    const dwell = [];
    let pValue = null;
    if (s.spread > spreadMax) {
      dwell.push("spread");
      pValue = (spreadExceed + 1) / (NULL_DRAWS + 1);
    }
    if (s.maxshare > shareMax) {
      dwell.push("intensity");
      const pv = (shareExceed + 1) / (NULL_DRAWS + 1);
      if (pValue === null || pv < pValue) pValue = pv;
    }
    if (dwell.length) admitted.push({ low, ...s, dwell, pValue });
  }
  return admitted;
}

// addresses: the first occurrence byte-span per block, up to MAX_ADDRS blocks
function addressesOf(tokens, B, low) {
  const blockSize = Math.max(1, Math.ceil(tokens.length / B));
  const seen = new Set();
  const out = [];
  for (let i = 0; i < tokens.length && out.length < MAX_ADDRS; i += 1) {
    const t = tokens[i];
    if (t.low !== low) continue;
    const b = Math.floor(i / blockSize);
    if (seen.has(b)) continue;
    seen.add(b);
    out.push({ block: b, start: t.start, end: t.end });
  }
  return out;
}

function buildOne(rec) {
  const srcPath = path.join(ROOT, rec.source.path);
  if (!fs.existsSync(srcPath)) {
    return { gap: true, why: `source missing at build time: ${rec.source.path}` };
  }
  const bytes = fs.readFileSync(srcPath);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  const text = bytes.toString("utf8");
  const tokens = tokenize(text);
  const B = blocksFor(tokens.length);
  if (!tokens.length) return { gap: true, why: "text yields no tokens" };

  const observed = countPass(tokens, B);
  const casedScript = observed.upper > 0;

  const a1 = arm(observed, tokens, B, sha, "a");
  const a2 = arm(observed, tokens, B, sha, "b");
  const byLow = new Map(a1.map((t) => [t.low, t]));
  const terms = [];
  const instability = { secondSeedOnly: [], droppedBySecondSeed: [] };
  for (const t of a2) {
    const inA1 = byLow.has(t.low);
    if (inA1) terms.push(t);
    else instability.secondSeedOnly.push(t.low);
  }
  for (const t of a1) {
    if (!byLow.has(t.low)) instability.droppedBySecondSeed.push(t.low);
  }
  terms.sort((a, b) => b.count - a.count || b.spread - a.spread);

  // the entity layer: genuinely cased tokens (upper-count >= lower-count) —
  // a token cased only at sentence start never qualifies; no case → gap
  let entities = [];
  if (casedScript) {
    const caseCounts = new Map();
    for (const t of tokens) {
      let c = caseCounts.get(t.low);
      if (!c) { c = { upper: 0, lower: 0 }; caseCounts.set(t.low, c); }
      if (t.cased) c.upper += 1; else c.lower += 1;
    }
    const set = new Set(terms.map((t) => t.low));
    for (const [low, c] of caseCounts) {
      if (c.upper < MIN_COUNT || c.upper < c.lower) continue;
      if (!set.has(low)) continue; // entities are a typed subset of the admitted dwells
      const addr = addressesOf(tokens, B, low);
      entities.push({ name: low, count: c.upper + c.lower, upper: c.upper, lower: c.lower, addresses: addr });
    }
    entities.sort((a, b) => b.count - a.count);
  }

  const measured = { tokens: tokens.length, vocab: observed.perTerm.size, casedScript };
  const prior = {
    schema: "ConcernField@1",
    standing: "pathos-typing: what counts as mattering, for whom — discloses whose stake the claim is; never a gate, never a grade; reasoning (logos) is untouched by this print",
    handle: rec.handle,
    giver: rec.giver,
    work: rec.work,
    source: { path: rec.source.path, sha256: sha, chars: text.length },
    recipe: {
      script: "live_priors/derived-priors/concern-priors/concern-field.mjs",
      minLen: MIN_LEN, minCount: MIN_COUNT, blocks: B, nullDraws: NULL_DRAWS, alpha: ALPHA,
      seeds: [`${SEED_PREFIX}|${sha}|a`, `${SEED_PREFIX}|${sha}|b`], maxAddresses: MAX_ADDRS,
    },
    protocol: {
      null: "the text's own term population at the same frequency (the power-of-two count bin is the neighborhood); the floor is the MAX over seeded draws from the bin WITHOUT the term itself (leave-one-out) — the elenchus measured-floor idiom, and the house's standing 'the null is the caller's own distribution'",
      resolution: `1/${NULL_DRAWS + 1}`,
      stability: "two independent seed arms; the prior is the intersection; the drops are recorded as the dissent",
    },
    measured,
    terms: terms.map((t) => ({ term: t.low, count: t.count, spread: t.spread, maxshare: t.maxshare, dwell: t.dwell, pValue: t.pValue, addresses: addressesOf(tokens, B, t.low) })),
    entities: entities.length ? entities : { status: casedScript ? "none" : "gap", why: casedScript ? "no genuinely cased token cleared the dwell null" : "script has no case (no proper-noun layer by construction)" },
    kindInduction: {
      status: "gap",
      why: "the basin organ (kernel/entity-kind-induction.js) needs entity features this recipe does not fabricate",
      control: "feed this recipe's entity records as entityFeatures into induceEntityKindCandidates; stable basins become the kind print — until then, kinds are a named gap",
    },
    instability,
    expectedSpurious: (measured.vocab * (1 / (NULL_DRAWS + 1))).toFixed(1),
    falsifyingControl: "a term in `terms` whose byte span does not contain the term at that address; a recipe rerun that does not reproduce byte-identical output; two same-source-independent archons whose term sets overlap at Jaccard >= 0.5; or a second-seed arm that drops every admission — any of these breaks the print.",
  };
  return { prior };
}

function main() {
  const cast = loadCast();
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const [k, r] of [...cast.entries()].sort()) {
      console.log(`${k.padEnd(20)} ${r.speakable ? "speaks" : "silent".padEnd(5)} ${(r.giver ?? "").slice(0, 30).padEnd(30)} ${r.source?.path ?? ""}`);
    }
    return;
  }
  const want = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());
  fs.mkdirSync(OUT, { recursive: true });
  let built = 0, gaps = 0;
  const rows = [];
  const seenGaps = new Set();
  try {
    for (const l of fs.readFileSync(GAPS, "utf8").split("\n").filter(Boolean)) {
      try { seenGaps.add(JSON.parse(l).handle); } catch { continue; }
    }
  } catch { /* first run */ }
  for (const [key, rec] of [...cast.entries()].sort()) {
    if (want.length && !want.includes(key)) continue;
    if (!rec.speakable) {
      // the whole cast is covered: an archon with no verified words and no
      // canon in the priors is a NAMED GAP, never shadowed from nothing
      if (seenGaps.has(rec.handle)) continue;
      const why = `not speakable (${rec.status}); no verified quote and the full original text is not in the priors — the shadow requires the canon, never a guess`;
      rows.push({ schema: "ConcernGap@1", handle: rec.handle, giver: rec.giver ?? "", why, at: new Date().toISOString() });
      seenGaps.add(rec.handle);
      console.log(`  GAP   ${String(rec.handle).padEnd(18)} ${why.slice(0, 90)}`);
      gaps += 1;
      continue;
    }
    const slug = slugOf(rec.handle);
    const out = path.join(OUT, `${slug}.json`);
    if (want.length === 0 && fs.existsSync(out)) continue; // incremental: only the missing
    const res = buildOne(rec);
    if (res.gap) {
      if (seenGaps.has(rec.handle)) continue;
      gaps += 1;
      const row = { schema: "ConcernGap@1", handle: rec.handle, giver: rec.giver, why: res.why, at: new Date().toISOString() };
      rows.push(row);
      seenGaps.add(rec.handle);
      console.log(`  GAP   ${rec.handle.padEnd(18)} ${res.why}`);
      continue;
    }
    fs.writeFileSync(out, JSON.stringify(res.prior, null, 1) + "\n");
    built += 1;
    const t = res.prior.terms.length;
    const e = Array.isArray(res.prior.entities) ? res.prior.entities.length : res.prior.entities.status;
    console.log(`  built ${rec.handle.padEnd(18)} ${String(t).padStart(4)} dwell terms · ${String(e).padStart(3)} entities · ${res.prior.source.chars} chars`);
  }
  if (rows.length) fs.appendFileSync(GAPS, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`\nconcern-fields: ${built} built · ${gaps} new named gaps · ${cast.size} handles in the whole cast · ${want.length ? "filtered" : "incremental"}`);
}

const isMain = (() => { try { return import.meta.url === `file://${path.resolve(process.argv[1] ?? "")}`; } catch { return false; } })();
if (isMain) main();

export { loadCast, buildOne, slugOf, MIN_LEN, MIN_COUNT, NULL_DRAWS, ALPHA, MAX_ADDRS };