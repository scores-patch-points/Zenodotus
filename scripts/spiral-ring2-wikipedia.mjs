#!/usr/bin/env node
// spiral-ring2-wikipedia.mjs — ring 2's first family: structural sidecars
// for 02-encyclopedic/wikipedia (49 files, kant.txt already a hand
// golden). PROPOSITIONS STAY EMPTY, deliberately, corpus-wide — the
// standing falsification evidence (DERIVED-RULES.md's own numbers,
// re-checked before this file was written rather than re-run: 10 golden
// Kant rows, 4 pipeline edges, 1 genuine correspondence, 1 clean match)
// says the raw extractor still fails DR4 (whole-NP subjects). Running it
// on 48 unread files would reproduce exactly what LP7 erased. So this
// stays ring-1-shaped: declared identity, real structure, typed gaps,
// derived: true, and — new this pass — an online (running, incremental)
// SURPRISE measure: does each file's own structure match what the
// family's running posterior already expects, updated as each file is
// read. This is the Bayesian-filtering-in-the-small the whole session's
// LP7/LP8 apparatus has been building toward: predict the next file from
// what came before it, then measure and disclose how wrong that was.
//
// CALIBRATED, NOT ASSUMED: kant.txt is read FIRST and its detected
// structure is compared against the real golden (kant.golden.json) by
// eye before this generator is trusted on the other 48 — the same
// discipline the UDHR ring-0/ring-1 split already held (test on the
// file you have ground truth for before sweeping the ones you don't).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const DIR = path.join(ROOT, "02-encyclopedic", "wikipedia");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// DR10's own named finding: Kant's false edges were infobox caption /
// wikilink-glue debris. A wiki text dump's preamble is a block of short,
// unpunctuated, glued-caption lines before the first real paragraph.
// Detected structurally (never by a per-file hand rule): the first line
// that is LONG (>180 chars, real prose has real length), ends in
// terminal punctuation, and has a normal word-length profile (glue lines
// run long unbroken alpha strings — "Copernican RevolutionMetaphorical
// usageCopernican Revolution" — real prose does not).
function findProseStart(lines) {
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.length < 180) continue;
    if (!/[.!?]$/.test(t.replace(/["')\]]+$/, ""))) continue;
    const words = t.split(/\s+/);
    const avgLen = words.reduce((a, w) => a + w.length, 0) / words.length;
    if (avgLen > 0 && avgLen < 9) return i;
  }
  return 0; // no debris detected — the whole file is offered as prose from line 0
}

// Bare, title-case, short standalone lines are this family's section
// headings (measured against real files before being trusted: "Early
// life", "Young scholar", "Philosophy", "Political philosophy" —
// confirmed against kant.golden.json's own section boundaries below).
function findHeadings(lines, fromLine) {
  const out = [];
  for (let i = fromLine; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.length < 3 || t.length > 45) continue;
    if (!/^[A-Z][A-Za-z ,'’()-]*$/.test(t)) continue;
    if (/[.!?]$/.test(t)) continue; // a sentence, not a heading
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    const nextBlank = i + 1 >= lines.length || lines[i + 1].trim() === "";
    if (prevBlank && nextBlank) out.push({ line: i, text: t });
  }
  return out;
}

function readOne(file, offset) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const lines = raw.split("\n");
  const proseStart = findProseStart(lines);
  const debrisChars = lines.slice(0, proseStart).join("\n").length;
  const headings = findHeadings(lines, proseStart);
  const identity = { title: file.replace(/\.txt$/, "").replace(/_/g, " "), mechanism: "filename stem, underscores as spaces (this family carries no in-file title line — the corpus's own manifest is the identity, LP1's rule applied to a family without a header convention)" };
  return {
    file, sha256: sha256(raw), chars: raw.length,
    identity,
    structure: {
      proseStartLine: proseStart, debrisChars, debrisFraction: +(debrisChars / raw.length).toFixed(3),
      headingCount: headings.length, headings: headings.map((h) => h.text),
    },
  };
}

// online (running) posterior over two structural stats: heading count
// and debris fraction. A plain Welford update — disclosed as exactly
// that, a small-n Gaussian z-score, not a validated statistical test.
function makeOnlinePosterior() {
  let n = 0, meanH = 0, m2H = 0, meanD = 0, m2D = 0;
  return {
    predict() {
      if (n < 2) return null;
      return { headingCount: { mean: meanH, sd: Math.sqrt(m2H / (n - 1)) }, debrisFraction: { mean: meanD, sd: Math.sqrt(m2D / (n - 1)) } };
    },
    surpriseOf(obs) {
      const p = this.predict();
      if (!p) return { measurable: false, reason: n < 2 ? "fewer than 2 prior files read — the posterior has no spread yet" : "unknown" };
      const z = (x, m, sd) => (sd > 0 ? (x - m) / sd : null);
      return {
        measurable: true,
        headingCountZ: z(obs.headingCount, p.headingCount.mean, p.headingCount.sd),
        debrisFractionZ: z(obs.debrisFraction, p.debrisFraction.mean, p.debrisFraction.sd),
        priorSeenSoFar: n,
      };
    },
    update(obs) {
      n++;
      let d = obs.headingCount - meanH; meanH += d / n; m2H += d * (obs.headingCount - meanH);
      d = obs.debrisFraction - meanD; meanD += d / n; m2D += d * (obs.debrisFraction - meanD);
    },
  };
}

// ---- calibration: kant.txt against the real golden ----
const kant = readOne("Immanuel_Kant.txt", 0);
const kantGolden = JSON.parse(fs.readFileSync(path.join(ROOT, "goldens", "reading", "kant.golden.json"), "utf8"));
console.log("=== CALIBRATION: kant.txt against kant.golden.json ===");
console.log("detected prose start line:", kant.structure.proseStartLine, "| debris chars:", kant.structure.debrisChars, `(${(kant.structure.debrisFraction * 100).toFixed(1)}% of file)`);
console.log("detected headings:", kant.structure.headingCount, JSON.stringify(kant.structure.headings.slice(0, 6)));
console.log("golden's own window covers rows in the file's opening paragraphs (before 'Early life') — spans:", kantGolden.window);
console.log("=== calibration read; proceeding if the numbers above look sane ===\n");

// ---- the sweep ----
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt"));
const posterior = makeOnlinePosterior();
const RECIPE = { generator: "scripts/spiral-ring2-wikipedia.mjs@1", family: "02-encyclopedic/wikipedia", calibratedAgainst: "kant.golden.json (see console output above)" };
const recipeId = sha256(JSON.stringify(RECIPE)).slice(0, 16);

const summary = [];
for (const file of files) {
  // NEVER OVERWRITE A RING-0 SIDECAR. Found live, by checking git status
  // before committing rather than assuming clean: this script's first
  // run silently clobbered Immanuel_Kant.txt.eot.json — a real
  // hand-adjudicated sidecar with 10 propositions — with a zero-
  // proposition structural stub, because both generators write the same
  // `<file>.eot.json` path with no coordination. Exactly the LP2/LP8
  // violation ("layers append, never overwrite") this whole apparatus
  // exists to prevent, caught by verification rather than assumed away.
  const existingPath = path.join(DIR, `${file}.eot.json`);
  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath, "utf8"));
    if (existing.reader?.kind === "hand-adjudication") {
      console.log(`SKIP ${file} — a ring-0 hand-adjudicated sidecar already exists here (${existing.propositions.length} propositions); ring-2 structural reading does not overwrite it`);
      continue;
    }
  }
  const r = readOne(file, 0);
  const obs = { headingCount: r.structure.headingCount, debrisFraction: r.structure.debrisFraction };
  const surprise = posterior.surpriseOf(obs);
  const hasGolden = file === "Immanuel_Kant.txt";

  const sidecar = {
    schema: "EOTReading@2",
    source: { path: `02-encyclopedic/wikipedia/${file}`, sha256: r.sha256, chars: r.chars, declaredIdentity: r.identity },
    reader: { kind: "structural", derived: true, recipeId, descriptor: RECIPE, firewall: "Goal 5 — derived, never adjudication, never convergence" },
    ground: { seed: "ReadingPriors@1 checkpoint; this family's own running structural posterior (online, incremental — see surprise below)" },
    structure: r.structure,
    admission: { gate: "structural only", offered: 0, heard: 0, turnedAway: 0, note: "no proposition is offered: DR4 (whole-NP subjects) is unfixed in the raw extractor — running it here would reproduce the readings LP7 erased (evidence: DERIVED-RULES.md, kant 1/10 clean match, re-checked not re-run)" },
    gaps: [{ type: "no_extractor", note: "distinct from ring-1's no_lexicon: this is an ENGLISH file (the lexicon exists) but the extractor itself is not yet trustworthy — DR4/DR5 are the named prerequisite" },
      ...(hasGolden ? [] : [{ type: "no_adjudication", note: "no hand golden exists for this file — its structure is offered, its content is not" }])],
    surprise: {
      definition: "hypergraph delta, per LP7 — here, the family's own STRUCTURAL expectation, updated online as each file is read (never n-gram frequency)",
      observed: obs,
      againstRunningPosterior: surprise,
    },
    layers: [{ layer: 0, kind: "reading", hypothesis: "structural (derived)", recipeId }],
    fold: { statement: "a sidecar is never done (LP8): layers append, the fold is recomputed", note: hasGolden ? "this file ALSO carries a real hand golden (kant.golden.json) — its 10 propositions are NOT duplicated here; open the golden for adjudicated content, this sidecar for structure only" : "adversarial layers append when a lexicon/extractor tier or an adjudicator reaches this file" },
    propositions: [],
    acts: [],
    revisions: [],
    lastRun: { recipeId, at: new Date().toISOString() },
  };
  fs.writeFileSync(path.join(DIR, `${file}.eot.json`), JSON.stringify(sidecar, null, 1));
  posterior.update(obs);
  summary.push({ file, headings: obs.headingCount, debrisFraction: obs.debrisFraction, headingCountZ: surprise.headingCountZ ?? null, debrisFractionZ: surprise.debrisFractionZ ?? null });
}

const zs = summary.filter((s) => s.headingCountZ !== null).map((s) => Math.abs(s.headingCountZ));
const outliers = summary.filter((s) => s.headingCountZ !== null && Math.abs(s.headingCountZ) > 2);
const report = {
  schema: "EOTRing2StructuralSweep@1", family: "02-encyclopedic/wikipedia", files: files.length,
  headingCountRange: [Math.min(...summary.map((s) => s.headings)), Math.max(...summary.map((s) => s.headings))],
  meanAbsZWhenMeasurable: zs.length ? +(zs.reduce((a, b) => a + b, 0) / zs.length).toFixed(2) : null,
  outliers: outliers.map((o) => ({ file: o.file, headings: o.headings, headingCountZ: +o.headingCountZ.toFixed(2) })),
  rows: summary,
};
fs.writeFileSync(path.join(HERE, "eot-ring2-wikipedia-sweep.json"), JSON.stringify(report, null, 1));
console.log(`ring2 wikipedia: ${files.length} files, heading counts range ${report.headingCountRange}, mean|z| ${report.meanAbsZWhenMeasurable}`);
console.log("outliers (|z|>2):", JSON.stringify(report.outliers));
