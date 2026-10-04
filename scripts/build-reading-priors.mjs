#!/usr/bin/env node
// build-reading-priors.mjs — compile ReadingPriors@1: the SEED for every
// reading this corpus takes from here on, under LP7 ("no reading from
// nowhere") and its same-day amendment ("things are surprising to the
// extent they change our hypergraph, not ngram frequency" — user
// direction, verbatim).
//
// THE SEED IS THE HAND-INSPECTED UDHR, AND THE SPIRAL GOES OUT FROM IT.
// User direction, near-verbatim (2026-08-31): "if we need to begin with a
// seed, let's start with the hand inspected UDHR and then spiral out
// throughout the repo of priors." So this artifact is compiled FROM the
// hand-adjudicated goldens (goldens/reading/*.golden.json — the UDHR five
// as the core, the thirteen other hand specimens as the inner ring), plus
// the received tiers that already exist with named givers (ActPrior@1
// from VerbNet, MorphologyPrior@1 from UniMorph — pointers, never copies:
// predigest.js's inventory posture). Nothing in here is machine-read;
// every golden-tier expectation traces to a hand-adjudicated row by
// specimen and ground address.
//
// What a consumer gets, per LP7's three clauses:
//   1. the proposition bar (pointer to RULE.md's fourth amendment);
//   2. GROUND to read with — expectations, not filters: per-surface and
//      per-head act expectations with witnesses; per-family frame
//      censuses; the Rosetta matrix (every UDHR prop × five languages,
//      rows in full); the structural act skeleton (preamble + 30
//      articles);
//   3. the surprise definition — hypergraph delta, typed events, never a
//      perplexity. FoldReadingPrior@1 (n-gram) is inventoried below with
//      that exclusion stated on it.
//
// FIREWALLS, stated here because this file is where they bind:
//   - Goal 5 (ROSETTA-GOALS.md): a reading DERIVED by alignment is typed
//     derived and never counted as independent convergence. Every
//     expectation here carries its witnesses so a consumer can exclude
//     self-evidence (a UDHR sidecar's act-expectation check must not
//     consult UDHR-witnessed expectations — that would be
//     self-confirmation wearing a measurement's clothes).
//   - Goal 6: cross-language agreement numbers computed from this matrix
//     measure one reader's consistency until independent adjudication
//     exists. The matrix says so on itself.
//
// Head extraction (English only) is MEASUREMENT, not a list (user
// direction, 2026-08-31: "I don't like stop lists, they're a hack" — and
// widget.js's own recorded law: a hand list is a sample of an open class
// standing in for the whole). `headOf` below elects the content head of
// an adjudicated relation string from POSPrior@1's real UD_English-EWT
// counts: among the tokens whose measured dominant class is VERB at the
// declared share floor, the one with the MAXIMAL verb share wins,
// earliest on ties. That maxima rule is what handles aux-capable verbs
// without naming any of them: "have" is VERB-dominant in the treebank
// (963 VERB vs 745 AUX — main-verb have is real English), but in "have
// resulted in" it loses to "resulted" (verb share 1.0 vs 0.56) purely by
// measurement. "shall"/"is"/"has" are AUX-dominant and never electable;
// "the" is DET; "right" never reaches VERB dominance. A token the
// treebank never attests is never elected — no evidence, no election
// (the POS gate's own conservative design, LP6). No VERB-dominant token
// at all -> null head -> the copula rule / no-expectation path.
// Non-English surfaces are keyed whole (Goal 5's own shape:
// "have pledged" / "تعهدت" / "se han comprometido" realize one act).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const GOLD = path.join(ROOT, "goldens", "reading");
const OUT_DIR = path.join(ROOT, "derived-priors", "reading-priors");
const OUT = path.join(OUT_DIR, "reading-priors-v1.json");
export const POS_PRIOR_REL = "derived-priors/pos-priors/pos-prior-en.json";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const fileSha = (p) => sha256(fs.readFileSync(p));

// Declared, not tuned: wordclass.js's own dominantClass takes a
// caller-declared floor; 0.5 is the same "more than half of attested
// uses" bar LP6's vocabulary gate already validated corpus-wide.
export const POS_MIN_SHARE = 0.5;

export function loadPosForms() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, POS_PRIOR_REL), "utf8")).forms;
}

export function headOf(relation, posForms, { minShare = POS_MIN_SHARE } = {}) {
  const toks = String(relation ?? "").toLowerCase()
    .replace(/[^\p{L}\p{N}' ]/gu, " ").split(/\s+/).filter(Boolean);
  let best = null;
  for (let i = 0; i < toks.length; i++) {
    const counts = posForms[toks[i]];
    if (!counts) continue; // unattested — never elected
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const verbShare = (counts.VERB ?? 0) / total;
    const top = Math.max(...Object.values(counts));
    const dominant = total > 0 && (counts.VERB ?? 0) === top && verbShare >= minShare;
    if (dominant && (!best || verbShare > best.verbShare)) best = { token: toks[i], verbShare, i };
  }
  return best ? best.token : null;
}

const LANG_OF = Object.freeze({
  udhr: "en", "udhr-arb": "ar", "udhr-spa": "es",
  "udhr-cmn_hans": "zh", "udhr-swh": "sw",
  kant: "en", alice: "en", ripgrep: "en",
  "gen-1": "he", "gen-2": "he",
  "mark-1-15": "grc", "mark-16-6": "grc",
  "quran-2-37": "ar", "quran-2-37-en": "en",
  "lear-division": "en", "lear-disclaim": "en", "lear-france": "en",
  "tempest-abjure": "en",
});

const UDHR_SET = new Set(["udhr", "udhr-arb", "udhr-spa", "udhr-cmn_hans", "udhr-swh"]);
const ROSETTA_ORDER = ["udhr", "udhr-arb", "udhr-spa", "udhr-cmn_hans", "udhr-swh"];

const familyOf = (g) =>
  UDHR_SET.has(g.specimen) ? "un-udhr" : g.path.split("/")[0];

export function buildReadingPriors({ goldens, posForms }) {
  const actExpectations = {}; // key `${lang}|${form}` -> [{op,grain,polarity,witness}...]
  const addExp = (key, entry) => {
    (actExpectations[key] ??= []).push(entry);
  };

  const frames = {}; // per specimen census + per family aggregate
  const famAgg = {};
  const rosettaProps = {}; // prop -> { order, languages: {lang: [rows]} }
  const rosettaActs = {}; // ground -> { languages: {lang: {name, span}} }
  let orderCounter = 0;

  for (const g of goldens) {
    const lang = LANG_OF[g.specimen] ?? "und";
    const fam = familyOf(g);
    const census = {};
    for (const r of g.rows) {
      const isHeading = r.clause === "heading";
      const cell = `${r.phasepost.op}·${r.phasepost.grain}`;
      if (!isHeading) {
        census[cell] = (census[cell] ?? 0) + 1;
        const witness = `${g.specimen}@${r.ground}`;
        const entry = { op: r.phasepost.op, grain: r.phasepost.grain, polarity: r.polarity, witness };
        const surface = String(r.relation).replace(/\s+/g, " ").trim();
        addExp(`${lang}|${surface.toLowerCase()}`, { ...entry, keyKind: "surface" });
        if (lang === "en") {
          const head = headOf(surface, posForms);
          if (head) addExp(`en|${head}`, { ...entry, keyKind: "head" });
        }
      }
      if (UDHR_SET.has(g.specimen)) {
        if (isHeading) {
          (rosettaActs[r.ground] ??= { languages: {} }).languages[lang] =
            { name: r.relation, cell, span: r.span };
        } else {
          if (!rosettaProps[r.prop]) rosettaProps[r.prop] = { order: orderCounter++, languages: {} };
          (rosettaProps[r.prop].languages[lang] ??= []).push({
            cell, polarity: r.polarity, clause: r.clause, role: r.role,
            ground: r.ground, subject: r.subject, relation: r.relation,
            object: r.object, span: r.span, embedded: r.embedded,
            resolution: r.resolution, alternate: r.alternate ? `${r.alternate.op}·${r.alternate.grain}` : null,
            because: r.because,
          });
        }
      }
    }
    frames[g.specimen] = { language: lang, family: fam, propositions: Object.values(census).reduce((a, b) => a + b, 0), census };
    const agg = (famAgg[fam] ??= { propositions: 0, census: {}, specimens: [] });
    agg.specimens.push(g.specimen);
    agg.propositions += frames[g.specimen].propositions;
    for (const [c, n] of Object.entries(census)) agg.census[c] = (agg.census[c] ?? 0) + n;
  }

  // per-prop language presence/absence + cell agreement, precomputed so a
  // consumer reads the matrix without re-deriving it
  const matrix = {};
  for (const [prop, rec] of Object.entries(rosettaProps)) {
    const langs = Object.keys(rec.languages);
    const cellsByLang = Object.fromEntries(
      Object.entries(rec.languages).map(([l, rows]) => [l, [...new Set(rows.map((r) => r.cell))]]));
    const allCells = [...new Set(Object.values(cellsByLang).flat())];
    matrix[prop] = {
      order: rec.order,
      presentIn: langs,
      absentIn: ROSETTA_ORDER.map((s) => LANG_OF[s]).filter((l) => !langs.includes(l)),
      cellsByLang,
      agreement: allCells.length === 1 ? "unanimous" : "construction-split",
    };
  }

  return { actExpectations, frames, families: famAgg, rosettaProps, rosettaActs, matrix };
}

// ---- main (guarded: importing this module for headOf/loadPosForms must
// not trigger a build — eot-sidecar2.mjs imports the ONE implementation
// rather than growing a second copy, the P22/P24 drift lesson) ----
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  // module consumers stop here
} else {

const goldens = fs.readdirSync(GOLD).filter((f) => f.endsWith(".golden.json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(GOLD, f), "utf8")));
const posForms = loadPosForms();

const { actExpectations, frames, families, rosettaProps, rosettaActs, matrix } =
  buildReadingPriors({ goldens, posForms });

const actPriorPath = path.join(ROOT, "derived-priors", "act-priors", "act-prior-en.json");
const morphologyPath = path.join(ROOT, "..", "eoreader7", "native", "priors", "morphology-eng.json");

const artifact = {
  schema: "ReadingPriors@1",
  standing: {
    kind: "checkpoint",
    statement: "a PROJECTION of the live record at a named moment, never a weight file (LP7's second amendment: the universe of meaning lives LIVE — the goldens with their append-only revisions, the readings' appended logs, the source bytes — and this artifact is where that record stood when compiled). Superseded by RECOMPILING from the live sources; hand-editing it is the cache LP2 forbids, one level up.",
    regenerate: "node scripts/build-reading-priors.mjs",
    livesLive: "goldens/reading/*.golden.json (R12 revisions append), the sidecars' own logs (LP2), derived-priors/pos-priors + act-priors (each its own checkpoint of a received giver)",
  },
  giver: {
    seed: "the hand-inspected UDHR goldens (five languages, 651 rows) as the core, the thirteen other hand-adjudicated specimens as the inner ring — user direction 2026-08-31: 'start with the hand inspected UDHR and then spiral out throughout the repo of priors'",
    compiledFrom: goldens.map((g) => `${g.specimen} (${g.rows.length} rows, ${g.path})`),
    rule: "goldens/reading/RULE.md R1-R12 + fourth amendment (the triadic minimum)",
    law: "POLICIES.md LP7 + same-day amendment (surprise is hypergraph delta)",
  },
  proposition: {
    bar: "a proposition is a difference that makes a difference — the triadic minimum of assertions: a term, an operator, and the state or ground the move lands against (RULE.md fourth amendment). Rows meet it or fold, disclosed.",
  },
  posPrior: {
    pointer: POS_PRIOR_REL,
    schema: "POSPrior@1",
    sha256: fileSha(path.join(ROOT, POS_PRIOR_REL)),
    giver: "Universal Dependencies UD_English-EWT, CC BY-SA 4.0 (scripts/build-pos-prior.mjs — ambiguity preserved, no winner picked at build time)",
    minShare: POS_MIN_SHARE,
    mechanism: "head extraction is MEASUREMENT, never a list: among a relation's tokens whose UD dominant class is VERB at minShare, the maximal verb share wins (earliest on ties) — aux-capable verbs lose to unambiguous ones by counts alone; unattested tokens are never elected; no VERB-dominant token means no head (the copula rule / no-expectation path)",
  },
  actExpectations: {
    note: "key `${lang}|${form}` — form is the whole relation surface (all languages) or the POS-prior-elected English content head (keyKind on each entry). Every entry carries its hand witness (specimen@ground). CONSUMER RULE: exclude entries whose witness shares the document family under check — self-evidence confirms nothing.",
    tiers: {
      golden: "the entries below — hand-adjudicated, strongest",
      verbnet: { pointer: "derived-priors/act-priors/act-prior-en.json", schema: "ActPrior@1", sha256: fileSha(actPriorPath), note: "4,569 English forms, 3,697 unanimous / 872 contested (contested carry full candidate sets, never a coin flip); received giver VerbNet 3" },
      morphology: { pointer: "../khora/native/priors/morphology-eng.json", schema: "MorphologyPrior@1", sha256: fs.existsSync(morphologyPath) ? fileSha(morphologyPath) : null, note: "form→lemma bridge for tier-2 lookups on inflected heads" },
    },
    expectations: actExpectations,
  },
  mechanicalRules: {
    pointer: "goldens/reading/RULE.md Part II",
    members: [
      "copula rules 1-5 (predicate shape decides the cell — no lexicon needed)",
      "A3 modality never moves the phasepost", "A4 existential-negative → NUL polarity +",
      "A5 translocation → SIG, grain from the landing", "A6 revision → SYN",
      "R6 polarity is a field, never a phasepost mover",
    ],
  },
  frames,
  families,
  rosetta: {
    note: "THE STONE: every UDHR proposition × five hand-read languages, rows in full, joined on prop (R9). Goal 6 caveat rides every agreement figure here: one reader adjudicated all five languages with the others in view — this measures that reader's consistency until independent adjudication exists.",
    languages: ROSETTA_ORDER.map((s) => ({ specimen: s, language: LANG_OF[s] })),
    props: rosettaProps,
    acts: rosettaActs,
    matrix,
  },
  surprise: {
    definition: "things are surprising to the extent they change our hypergraph, not ngram frequency (user direction, verbatim — LP7 amendment 2026-08-31). Surprise is the TYPED CHANGE an increment makes to the accumulated graph, never a perplexity.",
    events: {
      founded: "first reading establishes a proposition (the seed's own rows)",
      corroborated: "a later reading lands the same prop, same cell and polarity — witness union (LP2), near-zero surprise",
      "cell-variant": "same prop, a cell outside the set already on the graph — a construction split, real surprise, both cells kept; a polarity difference riding the same split (the A4 negative-existential family) folds into this event, never a second one",
      "polarity-variant": "same prop, SAME cell, mirrored polarity — the restriction construction family (en 'only with consent' + vs ar لا…إلا −); the event carries both sides' reasons so a reader can confirm a disclosed construction rather than a contradiction; a genuine contradiction is this event with no restriction in either reason",
      absent: "a prop the graph expects, not found in this reading — absence surprise (the Arabic missing whereas-clause class)",
      "unique-so-far": "a prop first seen in this reading — maximal surprise, may be corroborated by later rings",
      "frame-departure": "a reading's cell census departing the family frame so far",
      "act-agreement | act-departure | no-expectation": "per-row check of the adjudicated cell against non-self act expectations; no-expectation is a typed gap, never a guess",
    },
    excluded: "FoldReadingPrior@1 (derived-priors/fold-reading-priors/) — n-gram/compression novelty. May rank candidates (LP4 accelerator posture: decide where to look, never what is true); is NOT surprise.",
  },
  spiral: {
    declaration: "ring order for reading the corpus outward from the seed; each ring reads WITH the graph accumulated by the rings before it, appends what it hears (LP2), and its surprise is what it changed.",
    rings: [
      { ring: 0, scope: "the 13 hand-golden source files (five UDHR + kant, alice, ripgrep, Gen, Mark, both Quran texts, pg100)", claims: "full propositions — projections of hand adjudication, reader typed hand-adjudication", status: "this pass" },
      { ring: 1, scope: "the remaining un-udhr editions (516 files, 511 unread)", claims: "declared identity, script, structural acts aligned to the rosetta skeleton, per-language prop expectations as TYPED GAPS (no_lexicon) until a lexicon ring or an adjudicator reaches that language; anything derived is typed derived (Goal 5 firewall)", status: "SWEPT 2026-08-31 (after the 5-edition diverse sample validated the detector — LP6's discipline): 511 editions read structurally, distribution and outlier classes typed in scripts/eot-sidecar2-RESULTS.md and scripts/eot-ring1-sweep.json" },
      { ring: 2, scope: "outward by family: 06-government-legal, then the goldens' own families (02-encyclopedic, 01-literature-books, 09-source-code, 14-holy-texts), then the rest", claims: "English documents may consult the act lexicon; all claims re-verified against source bytes before assertion (LP4)", status: "named, not scheduled" },
    ],
  },
  pointers: {
    posPrior: { note: "POSPrior@1 (UD_English-EWT) — TYPE-level vocabulary gate, LP6's own validated fix; a filter by design, listed here as apparatus, not ground" },
    compiledExperience: { pointer: "the-fold predigest.js → EOCompiledPriors@1", note: "reader-plane stance/rhythm memory, walled from world vocabulary" },
    closedClasses: { pointer: "../khora/native/adapters/text/priors.js", note: "determiners, negation, anaphora registers, per-entry givers" },
  },
  compiledAt: new Date().toISOString(),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 1));
const stat = fs.statSync(OUT);
console.log(`ReadingPriors@1 -> ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(0)}KB)`);
console.log(`  goldens: ${goldens.length}; act expectation keys: ${Object.keys(actExpectations).length}`);
console.log(`  rosetta props: ${Object.keys(rosettaProps).length}; acts: ${Object.keys(rosettaActs).length}`);
const splits = Object.values(matrix).filter((m) => m.agreement === "construction-split").length;
const absences = Object.values(matrix).filter((m) => m.absentIn.length).length;
console.log(`  matrix: ${splits} construction-splits, ${absences} props absent in >=1 language`);

} // invokedDirectly
