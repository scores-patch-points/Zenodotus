#!/usr/bin/env node
// eot-sidecar2.mjs — EOTReading@2: readings kept beside their sources,
// under LP7 and its amendment. The successor to the erased eot-sidecar.mjs
// generation (LP7 records the erasure; this file is the bar being met).
//
// NO READING FROM NOWHERE. Every sidecar this writes:
//   1. carries rows that meet the proposition bar — ring 0's rows are
//      PROJECTIONS OF HAND ADJUDICATION (goldens/reading/*.golden.json),
//      reader typed "hand-adjudication"; this generator adjudicates
//      nothing and re-verifies every span against raw bytes at its own
//      door (P5.2);
//   2. declares the ground it read with — ReadingPriors@1, the seed
//      compiled from the hand-inspected UDHR core ("start with the hand
//      inspected UDHR and then spiral out throughout the repo of priors");
//   3. measures surprise as HYPERGRAPH DELTA — typed events against the
//      graph accumulated by the readings before it, never a perplexity
//      (LP7 amendment, user direction verbatim).
//
// RING 0 (this file's default run): the 13 hand-golden source files.
// The five UDHR languages build the Rosetta graph SEQUENTIALLY in the
// adjudication order (en → ar → es → zh → sw — a declared construction
// order, not a claim of independence; Goal 6's caveat stands): each
// language's sidecar carries the typed graph events its reading
// contributed — corroborations (witness union, LP2), cell-variants
// (construction splits), absences, unique-so-far props. The eight other
// hand sources contribute frames and act-lexicon evidence (they are the
// spiral's inner ring) and carry their own censuses.
//
// RING 1 (--ring1 <file...> | --ring1-sample): rosetta-structural
// readings of unread UDHR editions. What ring 1 may claim, and no more:
// the file's own declared identity (its 4-line OHCHR header), its native
// title, article regions detected from the file's own bytes (short
// heading lines carrying a decimal-digit run — ASCII plus the received
// Arabic-Indic/Extended-Arabic-Indic/Devanagari/Bengali digit blocks,
// giver Unicode), aligned to the rosetta act skeleton, and the prop
// expectations AS TYPED GAPS (no_lexicon) — a reading that cannot read a
// language says so, it does not guess (LP4: absence of a reading is a
// fact about the reader). Ring-1 sidecars are typed derived: true (Goal 5
// firewall — never counted as adjudication, never as convergence).
//
// Act-expectation checks exclude self-evidence: a row is checked only
// against expectations whose witnesses come from OTHER source documents
// (plus the received VerbNet tier, always external). Self-confirmation is
// not a measurement.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const GOLD = path.join(ROOT, "goldens", "reading");

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const collapse = (t) => String(t ?? "").replace(/_/g, "").replace(/\s+/g, " ").trim();

const PRIORS_PATH = path.join(ROOT, "derived-priors", "reading-priors", "reading-priors-v1.json");
const ACT_PRIOR_PATH = path.join(ROOT, "derived-priors", "act-priors", "act-prior-en.json");
const MORPH_PATH = path.join(ROOT, "..", "eoreader7", "native", "priors", "morphology-eng.json");

// The ONE head-extraction implementation lives in build-reading-priors.mjs
// (imported, never copied — the P22/P24 drift lesson): election by
// measured UD verb-share dominance, no hand list anywhere.
import { headOf, loadPosForms } from "./build-reading-priors.mjs";
import { adversarialLayers, grainSurvival } from "./reading-hypotheses.mjs";

const priors = JSON.parse(fs.readFileSync(PRIORS_PATH, "utf8"));
const actPrior = JSON.parse(fs.readFileSync(ACT_PRIOR_PATH, "utf8"));
const morphology = fs.existsSync(MORPH_PATH) ? JSON.parse(fs.readFileSync(MORPH_PATH, "utf8")) : { forms: {} };
const posForms = loadPosForms();

let gitCommit = "unknown";
try { gitCommit = (await import("node:child_process")).execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(); } catch {}

const DESCRIPTOR = {
  generator: "scripts/eot-sidecar2.mjs@1",
  law: "POLICIES.md LP7 + 2026-08-31 amendment (surprise is hypergraph delta)",
  rule: "goldens/reading/RULE.md R1-R12 + fourth amendment (triadic minimum)",
  priors: { path: "derived-priors/reading-priors/reading-priors-v1.json", sha256: sha256(fs.readFileSync(PRIORS_PATH)) },
  actPrior: { path: "derived-priors/act-priors/act-prior-en.json", sha256: sha256(fs.readFileSync(ACT_PRIOR_PATH)) },
  livePriors: { commit: gitCommit },
};
const RECIPE_ID = sha256(JSON.stringify(DESCRIPTOR)).slice(0, 16);

// ---- ring 0 ----

const ROSETTA_ORDER = ["udhr", "udhr-arb", "udhr-spa", "udhr-cmn_hans", "udhr-swh"];
const LANG_OF = { udhr: "en", "udhr-arb": "ar", "udhr-spa": "es", "udhr-cmn_hans": "zh", "udhr-swh": "sw" };

const goldens = fs.readdirSync(GOLD).filter((f) => f.endsWith(".golden.json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(GOLD, f), "utf8")));
const bySpecimen = Object.fromEntries(goldens.map((g) => [g.specimen, g]));

// group goldens by source file — one source, one sidecar (LP2)
const byPath = {};
for (const g of goldens) (byPath[g.path] ??= []).push(g);

function verifyRows(raw, rows, specimen) {
  let ok = 0; const bad = [];
  for (const r of rows) {
    const slice = collapse(raw.slice(r.span.start, r.span.end));
    const must = [];
    if (!r.resolution && r.subject) must.push(collapse(r.subject).split(" ").slice(-2).join(" "));
    must.push(collapse(r.relation).split(" ").pop());
    if (r.object) {
      const w = collapse(r.object).replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((x) => x.length > 2)[0];
      if (w) must.push(w);
    }
    const missing = must.filter((m) => !slice.toLowerCase().includes(m.toLowerCase()) && !slice.includes(m));
    if (missing.length) bad.push({ specimen, ground: r.ground, missing });
    else ok++;
  }
  return { ok, bad };
}

// non-self act-expectation check: golden tier excludes same-source witnesses;
// VerbNet tier (received) always consulted for English heads
export function checkAct(row, lang, selfSpecimens) {
  const surface = collapse(row.relation).toLowerCase();
  const tryKeys = [`${lang}|${surface}`];
  let head = null;
  if (lang === "en") { head = headOf(surface, posForms); if (head) tryKeys.push(`en|${head}`); }
  for (const key of tryKeys) {
    const entries = (priors.actExpectations.expectations[key] ?? [])
      .filter((e) => !selfSpecimens.has(e.witness.split("@")[0]));
    if (entries.length) {
      const ops = [...new Set(entries.map((e) => e.op))];
      return { tier: "golden", key, expectedOps: ops, verdict: ops.includes(row.phasepost.op) ? "act-agreement" : "act-departure" };
    }
  }
  if (lang === "en" && head) {
    let entry = actPrior.forms[head];
    if (!entry) { const lemmas = morphology.forms?.[head]; if (lemmas?.length) entry = actPrior.forms[lemmas[0]]; }
    if (entry) {
      const ops = entry.standing === "unanimous" ? [entry.op] : entry.candidates.map((c) => c.op);
      return { tier: "verbnet", key: `en|${head}`, expectedOps: ops, standing: entry.standing, verdict: ops.includes(row.phasepost.op) ? "act-agreement" : "act-departure" };
    }
  }
  if (lang === "en" && !head) return { tier: "mechanical", key: null, verdict: "no-verb-head", note: "no token reaches VERB dominance — the copula rule or an unattested predicate; a typed gap, never a guess" };
  return { tier: null, key: null, verdict: "no-expectation" };
}

function census(rows) {
  const c = {};
  for (const r of rows) if (r.clause !== "heading") {
    const cell = `${r.phasepost.op}·${r.phasepost.grain}`;
    c[cell] = (c[cell] ?? 0) + 1;
  }
  return c;
}

// rosetta graph state, built sequentially across the five UDHR readings
export function rosettaEvents(lang, langsBefore) {
  const events = { founded: [], corroborated: [], "cell-variant": [], "polarity-variant": [], absent: [], "unique-so-far": [] };
  for (const [prop, m] of Object.entries(priors.rosetta.matrix)) {
    const here = m.cellsByLang[lang];
    const before = langsBefore.filter((l) => m.presentIn.includes(l));
    if (here && !before.length) {
      events[langsBefore.length === 0 ? "founded" : "unique-so-far"].push({ prop, cells: here });
    } else if (here && before.length) {
      const cellsBefore = new Set(before.flatMap((l) => m.cellsByLang[l]));
      const newCells = here.filter((c) => !cellsBefore.has(c));
      const rowsHere = priors.rosetta.props[prop].languages[lang] ?? [];
      const rowsBefore = before.flatMap((l) => priors.rosetta.props[prop].languages[l] ?? []);
      const polHere = new Set(rowsHere.map((r) => r.polarity));
      const polBefore = new Set(rowsBefore.map((r) => r.polarity));
      const polNew = [...polHere].filter((p) => !polBefore.has(p));
      if (newCells.length) {
        // a construction split: the polarity difference, when present, is
        // part of the SAME split (the A4 negative-existential family:
        // SEG·P− "no distinction shall be made" vs NUL·P+ "there is no
        // distinguishing"), never a second event
        events["cell-variant"].push({ prop, cells: newCells, against: [...cellsBefore], ...(polNew.length ? { polarity: { here: [...polHere], before: [...polBefore] } } : {}) });
      } else if (polNew.length) {
        // same cell, mirrored polarity — the restriction construction
        // family (en "only with consent" + vs ar لا…إلا −). Both sides'
        // reasons ride the event so a reader can check it is a disclosed
        // construction and not a genuine contradiction.
        events["polarity-variant"].push({ prop, polarity: polNew, against: [...polBefore], becauseHere: rowsHere[0]?.because ?? null, becauseBefore: rowsBefore[0]?.because ?? null });
      } else {
        events.corroborated.push({ prop, cells: here, witnesses: before.length + 1 });
      }
    } else if (!here && before.length) {
      events.absent.push({ prop, presentIn: before });
    }
  }
  return events;
}

function frameStanding(myCensus, langsBefore) {
  if (!langsBefore.length) return { standing: "frame-founded-here", census: myCensus };
  const agg = {};
  for (const l of langsBefore) {
    const spec = ROSETTA_ORDER.find((s) => LANG_OF[s] === l);
    for (const [c, n] of Object.entries(priors.frames[spec].census)) agg[c] = (agg[c] ?? 0) + n;
  }
  const newCells = Object.keys(myCensus).filter((c) => !agg[c]);
  const unattested = Object.keys(agg).filter((c) => !myCensus[c]);
  return { standing: "measured-against-family-frame", familySoFar: agg, census: myCensus, cellsNewHere: newCells, cellsUnattestedHere: unattested };
}

function ring0Sidecar(srcPath, specs) {
  const rawPath = path.join(ROOT, srcPath);
  const raw = fs.readFileSync(rawPath, "utf8");
  const selfSpecimens = new Set(specs.map((g) => g.specimen));

  let checked = 0, ok = 0; const bad = [];
  const propositions = []; const acts = [];
  const actCheck = { "act-agreement": 0, "act-departure": 0, "no-expectation": 0, "no-verb-head": 0, departures: [] };

  for (const g of specs) {
    const lang = LANG_OF[g.specimen] ?? (g.specimen === "quran-2-37" ? "ar" : ["gen-1", "gen-2"].includes(g.specimen) ? "he" : ["mark-1-15", "mark-16-6"].includes(g.specimen) ? "grc" : "en");
    const v = verifyRows(raw, g.rows, g.specimen);
    checked += g.rows.length; ok += v.ok; bad.push(...v.bad);
    for (const r of g.rows) {
      if (r.clause === "heading") {
        acts.push({ kind: "ground-opening", specimen: g.specimen, name: r.relation, ground: r.ground, cell: r.phasepost, span: r.span });
        continue;
      }
      const check = checkAct(r, lang, selfSpecimens);
      actCheck[check.verdict] = (actCheck[check.verdict] ?? 0) + 1;
      if (check.verdict === "act-departure") actCheck.departures.push({ specimen: g.specimen, ground: r.ground, key: check.key, tier: check.tier, expectedOps: check.expectedOps, adjudicated: r.phasepost.op });
      const { sentence, phasepost, ...rest } = r;
      propositions.push({ specimen: g.specimen, language: lang, ...rest, cell: phasepost, actExpectation: check });
    }
  }

  const isRosetta = specs.length === 1 && ROSETTA_ORDER.includes(specs[0].specimen);
  let surprise = null; let layers = null; let fold = null;
  const NEVER_DONE = "a sidecar is never done (LP8): layers append, the fold is recomputed on every append, nothing here is a final reading";
  if (isRosetta) {
    const spec = specs[0].specimen;
    const lang = LANG_OF[spec];
    const langsBefore = ROSETTA_ORDER.slice(0, ROSETTA_ORDER.indexOf(spec)).map((s) => LANG_OF[s]);
    const events = rosettaEvents(lang, langsBefore);
    surprise = {
      definition: priors.surprise.definition,
      order: { position: langsBefore.length, langsBefore, note: "the declared adjudication order, not a claim of independence (Goal 6)" },
      graphEvents: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, { count: v.length, items: v }])),
      frame: frameStanding(census(specs[0].rows), langsBefore),
      actExpectations: { ...actCheck, note: "checked against non-self witnesses + the received VerbNet tier only" },
    };
    // LP8: the adversarial-prior ledger, scored against this reading's own
    // adjudicated rows — competing hypotheses about what minimizes
    // hypergraph surprise, ranked by measurement.
    const adv = adversarialLayers(priors, lang, langsBefore);
    layers = [
      { layer: 0, kind: "reading", hypothesis: "hand-adjudication + sequential graph events (the favored reading)", recipeId: RECIPE_ID },
      ...adv.layers,
    ];
    // Goal 6's blind panel, appended as its own layer when its score
    // exists (LP8: a genuinely independent reading pass joins the ledger;
    // the ledger is why it can)
    const scorePath = path.join(GOLD, "goal6", "score.json");
    let goal6Note = null;
    if (fs.existsSync(scorePath)) {
      const score = JSON.parse(fs.readFileSync(scorePath, "utf8"));
      layers.push({
        layer: layers.length, kind: "blind-adjudication", reader: "Goal 6 LLM-proxy panel — one context-isolated reader for this language, blind to the other languages and to the stored rows (goldens/reading/goal6/)",
        scored: true,
        agreementWithStored: score.panelVsStored[lang],
        panelKappa: { cell: score.panelVsPanel.cell.kappa, op: score.panelVsPanel.op.kappa, grain: score.panelVsPanel.grain.kappa, floor: score.floor },
        proxy: score.proxy,
      });
      goal6Note = `blind adjudication (proxy): GRAIN clears the ${score.floor} floor (kappa ${score.panelVsPanel.grain.kappa}); CELL does not (${score.panelVsPanel.cell.kappa}) — the op carries convention, the grain is the invariant (GOAL6-RESULTS.md)`;
    }
    fold = {
      statement: NEVER_DONE,
      ranking: adv.ranking,
      grainLaw: langsBefore.length
        ? "an op-level variant against the join is ordinary translation information; a GRAIN break is rare (20/23 splits preserve grain corpus-wide) and reads as an alarm"
        : "founding reading — the ranking activates from the second language onward",
      ...(goal6Note ? { goal6: goal6Note } : {}),
    };
  } else {
    surprise = {
      definition: priors.surprise.definition,
      graphEvents: { note: "this source founds its own specimens' propositions; it joins no rosetta graph yet — its evidence seeds the act lexicon for the spiral" },
      frame: { standing: "own-census", census: Object.fromEntries(specs.map((g) => [g.specimen, census(g.rows)])) },
      actExpectations: { ...actCheck, note: "checked against non-self witnesses + the received VerbNet tier only" },
    };
    layers = [{ layer: 0, kind: "reading", hypothesis: "hand-adjudication (the favored reading)", recipeId: RECIPE_ID }];
    fold = { statement: NEVER_DONE, note: "no adversarial layers yet — the shipped hypotheses predict from a prior reading of the same document, which this source does not have; the ledger appends when one exists" };
  }

  return {
    schema: "EOTReading@2",
    supersedes: "EOTReading@1 — erased 2026-08-31 (LP7)",
    source: { path: srcPath, sha256: sha256(raw), chars: raw.length },
    reader: { kind: "hand-adjudication", recipeId: RECIPE_ID, descriptor: DESCRIPTOR, specimens: specs.map((g) => `${g.specimen}@${RECIPE_ID}`) },
    ground: {
      seed: "ReadingPriors@1 checkpoint (a projection of the live goldens at the recipe's named commit — LP7 second amendment: checkpoints, never weights)",
      consumed: isRosetta
        ? ["rosetta graph of the languages before this one", "family frame so far", "act expectations (non-self + VerbNet)", "the proposition bar"]
        : ["act expectations (non-self + VerbNet)", "the proposition bar"],
    },
    windows: specs.map((g) => ({ specimen: g.specimen, ...g.window })),
    admission: { gate: "hand-adjudication under RULE.md", offered: propositions.length, heard: propositions.length, turnedAway: 0 },
    spanSelfVerification: { checked, ok, bad, method: "re-run fresh at generation: raw.slice(span) must contain subject head, relation head, first object word (collapsed comparison)" },
    surprise,
    layers,
    fold,
    propositions,
    acts,
    revisions: [],
    lastRun: { recipeId: RECIPE_ID, at: new Date().toISOString() },
  };
}

// ---- ring 1: rosetta-structural ----

// Decimal digits for ANY script, mechanically — no hand-picked block
// list (the first cut named five blocks by hand, which is the stop-list
// hack one level down: a sample of a closed set standing in for the
// whole). The giver is The Unicode Standard's own guarantee: every Nd
// block is exactly ten CONTIGUOUS characters with ascending values 0-9,
// so a digit's zero is found by walking down while the previous
// codepoint is still Nd (at most 9 steps). Covers Thai, Burmese, Khmer,
// Tibetan, Tamil, N'Ko — every decimal-digit script at once. Ideographic
// numerals (kanji 一二三) are NOT Nd — a genuinely different numeral
// system, refused and disclosed, never converted by a per-language table
// (the succession.js trap).
const isNd = (cp) => /\p{Nd}/u.test(String.fromCodePoint(cp));
function digitValue(cp) {
  if (!isNd(cp)) return null;
  let zero = cp;
  while (zero - 1 >= 0 && isNd(zero - 1) && cp - (zero - 1) <= 9) zero--;
  return cp - zero;
}
export function digitRunValue(run) {
  let v = 0; let block = null;
  for (const ch of run) {
    const cp = ch.codePointAt(0);
    const d = digitValue(cp);
    if (d === null) return null;
    const zero = cp - d;
    if (block !== null && zero !== block) return null; // a mixed-block run is noise, not a number
    block = zero;
    v = v * 10 + d;
  }
  return v;
}

function ring1Sidecar(srcPath) {
  const raw = fs.readFileSync(path.join(ROOT, srcPath), "utf8");
  const lines = raw.split("\n");
  const header = {
    identityClaim: lines[0]?.trim() ?? null,
    language: null, code: null,
    mechanism: "the file's own 4-line OHCHR header, read verbatim",
  };
  const m = /^Language:\s*(.+?)\s*\(([^)]+)\)\s*$/.exec(lines[1] ?? "");
  if (m) { header.language = m[1]; header.code = m[2]; }

  // article-region detection over the file's own bytes
  const found = []; let unplaced = 0;
  let offset = 0; let last = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i >= 5) {
      const t = line.trim();
      const runs = t.match(/\p{Nd}+/gu) ?? [];
      const hasLetter = /\p{L}/u.test(t);
      if (t.length > 0 && t.length <= 40 && runs.length === 1 && hasLetter) {
        const n = digitRunValue(runs[0]);
        if (n !== null && n >= 1 && n <= 30) {
          if (n > last) { found.push({ article: n, heading: t, span: { start: offset + line.indexOf(t), end: offset + line.indexOf(t) + t.length } }); last = n; }
          else unplaced++;
        }
      }
    }
    offset += line.length + 1;
  }
  const foundNums = found.map((f) => f.article);
  const missing = [];
  for (let n = 1; n <= 30; n++) if (!foundNums.includes(n)) missing.push(n);

  const expectedProps = Object.keys(priors.rosetta.props).length;
  return {
    schema: "EOTReading@2",
    source: { path: srcPath, sha256: sha256(raw), chars: raw.length, declaredIdentity: header },
    reader: { kind: "rosetta-structural", derived: true, recipeId: RECIPE_ID, descriptor: DESCRIPTOR, firewall: "Goal 5 — derived, never adjudication, never convergence" },
    ground: { seed: "ReadingPriors@1 checkpoint — rosetta skeleton: preamble + 30 article acts, 107 prop expectations (a projection of the live goldens; recompiled, never edited)" },
    structure: {
      identityConfirmed: header.identityClaim === "Universal Declaration of Human Rights",
      nativeTitle: (lines.slice(5).find((l) => l.trim()) ?? "").trim(),
      articleRegions: { expected: 30, found: found.length, headings: found, missingNumbers: missing, unplacedNumberedLines: unplaced, digitDetection: "any Unicode Nd block, the zero found by the Standard\u2019s own contiguity guarantee (ten contiguous ascending digits) — no hand-picked block list; ideographic numerals are not Nd and stay a disclosed refusal" },
    },
    admission: { gate: "structural only", offered: 0, heard: 0, turnedAway: 0, note: "no proposition is offered: this reader has no lexicon for this language and says so" },
    gaps: [{ type: "no_lexicon", language: header.code, expectedProps, note: "the rosetta expects these propositions here; reading them awaits a lexicon ring or an adjudicator for this language — typed, never guessed (LP4)" }],
    layers: [{ layer: 0, kind: "reading", hypothesis: "rosetta-structural (derived)", recipeId: RECIPE_ID }],
    fold: { statement: "a sidecar is never done (LP8): layers append, the fold is recomputed on every append", note: "adversarial layers append when a lexicon ring or an adjudicator reaches this language" },
    surprise: {
      definition: priors.surprise.definition,
      graphEvents: {
        structural: {
          missingArticles: missing,
          note: missing.length
            ? "articles the rosetta skeleton expects and this file's own detectable numbering does not show — includes the known unnumbered-first-article pattern ('Article premier'); a gap in detection is disclosed as such, never silently repaired"
            : "every expected article region present — the skeleton is corroborated, near-zero surprise",
        },
      },
    },
    propositions: [],
    acts: found.map((f) => ({ kind: "ground-opening", ground: `article-${f.article}`, name: f.heading, span: f.span, alignedTo: "rosetta acts skeleton" })),
    revisions: [],
    lastRun: { recipeId: RECIPE_ID, at: new Date().toISOString() },
  };
}

// ---- main (guarded so tests can import the organs above without
// generating anything — the same pattern build-reading-priors.mjs holds) ----
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
const args = process.argv.slice(2);
const RING0_SOURCES = new Set(ROSETTA_ORDER.map((sp) => bySpecimen[sp].path));
let ring1Files;
if (args.includes("--ring1-all")) {
  // THE SWEEP (LP6's discipline met: the 5-edition diverse sample ran,
  // was measured and committed first — scripts/eot-sidecar2-RESULTS.md):
  // every un-udhr edition except the five ring-0 golden sources.
  ring1Files = fs.readdirSync(path.join(ROOT, "06-government-legal", "un-udhr"))
    .filter((f) => f.endsWith(".txt"))
    .map((f) => `06-government-legal/un-udhr/${f}`)
    .filter((p) => !RING0_SOURCES.has(p))
    .sort();
} else if (args.includes("--ring1-sample")) {
  ring1Files = ["udhr-fra.txt", "udhr-rus.txt", "udhr-jpn.txt", "udhr-007.txt", "udhr-hin.txt"]
    .map((f) => `06-government-legal/un-udhr/${f}`)
    .filter((p) => fs.existsSync(path.join(ROOT, p)));
} else {
  ring1Files = args.filter((a) => !a.startsWith("--"));
}

let failures = 0;
if (!args.length || args.includes("--ring0")) {
  // the five rosetta languages first, in the declared order, then the rest
  const orderedPaths = [
    ...ROSETTA_ORDER.map((s) => bySpecimen[s].path),
    ...Object.keys(byPath).filter((p) => !ROSETTA_ORDER.some((s) => bySpecimen[s].path === p)),
  ];
  for (const srcPath of orderedPaths) {
    const specs = byPath[srcPath];
    const sc = ring0Sidecar(srcPath, specs);
    if (sc.spanSelfVerification.bad.length) { console.error(`${srcPath}: ${sc.spanSelfVerification.bad.length} span failures`); failures++; }
    const out = path.join(ROOT, srcPath + ".eot.json");
    fs.writeFileSync(out, JSON.stringify(sc, null, 1));
    const ev = sc.surprise.graphEvents;
    const evStr = ev.founded ? Object.entries(ev).filter(([, v]) => v.count).map(([k, v]) => `${k}:${v.count}`).join(" ") : "seed";
    console.log(`ring0 ${srcPath} -> ${specs.map((g) => g.specimen).join("+")}: ${sc.propositions.length} props, ${sc.acts.length} acts, spans ${sc.spanSelfVerification.ok}/${sc.spanSelfVerification.checked} | ${evStr}`);
  }
}
const sweep = [];
for (const p of ring1Files) {
  const sc = ring1Sidecar(p);
  fs.writeFileSync(path.join(ROOT, p + ".eot.json"), JSON.stringify(sc, null, 1));
  const ar = sc.structure.articleRegions;
  sweep.push({
    file: p.split("/").pop(), language: sc.source.declaredIdentity.language,
    code: sc.source.declaredIdentity.code, identityConfirmed: sc.structure.identityConfirmed,
    found: ar.found, missing: ar.missingNumbers, unplaced: ar.unplacedNumberedLines,
  });
  if (!args.includes("--ring1-all")) console.log(`ring1 ${p} [${sc.source.declaredIdentity.language}]: ${ar.found}/30 articles, missing [${ar.missingNumbers.join(",")}], unplaced ${ar.unplacedNumberedLines}`);
}
if (args.includes("--ring1-all")) {
  const dist = {};
  for (const r of sweep) dist[r.found] = (dist[r.found] ?? 0) + 1;
  const summary = {
    schema: "EOTRing1Sweep@1",
    recipeId: RECIPE_ID,
    editions: sweep.length,
    articleDistribution: Object.fromEntries(Object.entries(dist).sort((a, b) => b[0] - a[0])),
    identityUnconfirmed: sweep.filter((r) => !r.identityConfirmed).map((r) => r.file),
    at: new Date().toISOString(),
    rows: sweep,
  };
  fs.writeFileSync(path.join(HERE, "eot-ring1-sweep.json"), JSON.stringify(summary, null, 1));
  console.log(`ring1 sweep: ${sweep.length} editions -> scripts/eot-ring1-sweep.json`);
  console.log("  found-articles distribution:", JSON.stringify(summary.articleDistribution));
  console.log("  identity unconfirmed:", summary.identityUnconfirmed.length);
}
if (failures) process.exit(1);
} // invokedDirectly
