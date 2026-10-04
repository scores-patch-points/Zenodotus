// mechanical-ladder.mjs — DR1's own named ~31%: the copula rules + A3/A4 +
// the published frame table (RULE.md Part II, sixth amendment), as a real
// classifier over a row's own surface form. LP8's named next candidate,
// built as its own instrument rather than forced into
// reading-hypotheses.mjs's language-sequential shape — that ledger scores
// "what does the corpus's OWN history predict"; this scores "what does
// the row's OWN SURFACE predict, with no history at all." Different axis,
// worth keeping apart (a design lesson, not an oversight).
//
// EVERY CLOSED CLASS BELOW IS RECEIVED, NEVER HAND-SAMPLED. The whole
// session's own law (user, verbatim: "I don't like stop lists, they're a
// hack") governs here exactly as it governed headOf: a GENUINELY closed
// grammatical paradigm (English has ~13 modal auxiliaries, full stop) may
// be named with its giver; an OPEN lexical class (verbs, nouns) may
// never be hand-sampled — it is measured (POSPrior@1) or left undecided.
// AUXILIARY_VERBS/DEFINITE_DETERMINERS/INDEFINITE_DETERMINERS are REUSED
// from eoreader7/native/adapters/text/priors.js (giver lang/en), not
// re-typed. NEGATIVE_QUANTIFIERS below is the one new closed set this
// file adds — English negative existential quantifiers, a standard
// textbook-closed paradigm, disclosed as exactly that.
//
// SCOPE, DISCLOSED RATHER THAN SMOOTHED OVER: lang/en only (the frame
// table's phrases and ActPrior@1/MorphologyPrior@1 are English
// resources). Copula rule 1 (participle of another verb) is NOT built —
// UD's coarse VERB tag does not distinguish a participle from a finite
// verb without FEATS, which POSPrior@1 does not carry; this rule
// returns undecided rather than guess.
//
// AMENDED — the held-out factbook test (e2e-generalization-test-
// RESULTS.md) found this file had no branch at all for an ORDINARY verb
// ("resigned", "ran for", "known"), while ActPrior@1 (VerbNet, DR1's own
// reason for existing — 4,569 forms mapped to acts) sat unused. Now
// wired in as a direct dictionary lookup (never a Levin-class-NAME
// substring guess, which stays refused below), bridged through
// MorphologyPrior@1 (UniMorph) for inflected forms not directly in
// ActPrior — the exact lemma-bridge `checkAct` (eot-sidecar2.mjs) already
// proved, generalized from scoring to generating. Contested ActPrior
// entries are refused (R7), never resolved by picking a candidate.

import { AUXILIARY_VERBS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } from "../../khora/native/adapters/text/priors.js";
import { headOf, loadPosForms } from "./build-reading-priors.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LADDER_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export function loadActPrior() {
  return JSON.parse(fs.readFileSync(path.join(LADDER_ROOT, "derived-priors/act-priors/act-prior-en.json"), "utf8"));
}
export function loadMorphologyForms() {
  const p = path.join(LADDER_ROOT, "..", "eoreader7", "native", "priors", "morphology-eng.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")).forms : {};
}

const MODALS = new Set(["will", "shall", "should", "would", "could", "can", "may", "might", "must"]);
const BE_FORMS = new Set(["am", "is", "are", "was", "were", "be", "been", "being"]);
for (const w of MODALS) if (!AUXILIARY_VERBS.has(w)) throw new Error(`modal ${w} not in received AUXILIARY_VERBS`);
for (const w of BE_FORMS) if (!AUXILIARY_VERBS.has(w)) throw new Error(`be-form ${w} not in received AUXILIARY_VERBS`);

// A standard closed grammatical paradigm (English negative existential
// quantifiers) — NOT an open-class sample. Giver: English grammar's own
// closed quantifier paradigm, the same status DEFINITE_DETERMINERS
// already carries in the received register.
export const NEGATIVE_QUANTIFIERS = Object.freeze(["no one", "nobody", "nothing", "none", "no"]);

const tokenize = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, " ").split(/\s+/).filter(Boolean);
const leadsWith = (s, set) => {
  const low = String(s ?? "").toLowerCase().trim();
  for (const q of set) if (low === q || low.startsWith(q + " ")) return q;
  return null;
};

// RULE.md's sixth amendment, quoted as patterns rather than re-derived.
// Order matters: more specific frames are checked first. MEASURED
// correction: a first cut added "held guilty of" to the subjection
// pattern by analogy to "held in"/"subjected to" — not a phrase the
// published table actually names — and it fired on a real EVA·Pattern
// row (a judgment held against a holder, the "considered"/"deemed"
// family) that CON does not cover. Removed rather than patched: the
// lesson is not "add held-guilty-of to a different bucket" (that risks
// the same analogy-by-guess again) but "match only what the table
// itself states" — the judgment/EVA family has no published surface
// convention yet, so this stays a disclosed gap, not a guessed one.
const FRAME_TABLE = [
  { name: "right-holding", re: /\b(has|have|is entitled to|are entitled to) (the )?right( of| to)?\b|shall enjoy\b/, op: "SIG", grain: "Pattern" },
  { name: "endowment", re: /\bendowed with\b/, op: "CON", grain: "Pattern" },
  { name: "compulsion", re: /\bcompelled to\b/, op: "INS", grain: "Pattern" },
  // Measured correction: a bare "shall be made" alternative (added by
  // over-generalizing this frame's own "made a slave" example) fired on
  // "no distinction shall be made" — a light-verb construction for
  // "distinguish" (SEG), a different sense of "make" entirely. Narrowed
  // to what the table actually names; "X shall be made [NOUN]" without
  // a real object-noun anchor is not attempted.
  { name: "making-infliction", re: /\bmade a\b.*\bslave/, op: "INS", grain: "Pattern" },
  { name: "deprivation", re: /\bdeprived of\b/, op: "SEG", grain: "Pattern" },
  { name: "subjection", re: /\bsubjected to\b|\bheld in\b/, op: "CON", grain: "Pattern" },
  { name: "inclusion", re: /^includes\b/, op: "CON", grain: null },
  { name: "protection", re: /\bprotected by\b/, op: "CON", grain: "Pattern" },
  { name: "promote-frame", re: /\bshall (strive|promote)\b|\bsecuring\b/, op: "REC", grain: "Pattern" },
  { name: "the-pledge", re: /\bpledged themselves to\b/, op: "CON", grain: "Figure" },
  { name: "proclaims-as", re: /\bproclaim(s|ed)? as\b/, op: "DEF", grain: null },
  { name: "interpreted-as", re: /\binterpreted as\b/, op: "DEF", grain: "Ground" },
];

/**
 * Classify one row's phasepost from its own surface form alone — no
 * corpus history, no cross-language join. Returns {op, grain, because,
 * tier} or {undecided: true, because} when nothing in the ladder fires —
 * NEVER a guess in place of a genuine gap.
 */
export function classify(row, posForms, actPrior = null, morphologyForms = {}) {
  const relation = String(row.relation ?? "");

  // frame table (checked before the generic ladder — more specific wins)
  for (const f of FRAME_TABLE) {
    if (f.re.test(relation)) {
      return { op: f.op, grain: f.grain, because: `frame table: ${f.name} ("${relation}" matches)`, tier: "frame-table" };
    }
  }

  // copula ladder: relation reduces to a pure be/modal/negation chain
  const toks = tokenize(relation);
  const contentToks = toks.filter((t) => !AUXILIARY_VERBS.has(t) && t !== "not");
  const isPureCopula = toks.some((t) => BE_FORMS.has(t)) && contentToks.length === 0;

  // A4 — existential negative. MEASURED, not assumed: a first cut fired
  // on ANY negative-quantifier subject and scored 1/12 (0.083) against
  // real goldens — every miss was "No one shall be subjected to X",
  // which the rule itself already types as the subjection frame (CON),
  // not A4. Investigating the misses (not just the number) found the
  // real positive shape: Alice's own row ("nothing so very remarkable |
  // was | in that") pairs the negative-quantifier subject WITH a pure
  // copula relation — the quantifier alone proves nothing; the
  // intersection does. A negative-quantifier subject over an ORDINARY
  // content verb ("subjected to", "deprived of"...) is that verb's own
  // frame with a negative-quantifier subject and negative polarity
  // (R6), never NUL. This intersection is now the only test.
  if (isPureCopula) {
    const negSubj = row.subject && leadsWith(row.subject, NEGATIVE_QUANTIFIERS);
    if (negSubj) {
      return { op: "NUL", grain: null, because: `A4: existential-negative subject ("${negSubj}") over a pure copula — the absence is the act`, tier: "A4" };
    }
    const obj = String(row.object ?? "").trim();
    const objHead = obj.split(/\s+/)[0]?.toLowerCase().replace(/[^\p{L}]/gu, "");
    const def = leadsWith(obj, DEFINITE_DETERMINERS);
    const indef = leadsWith(obj, INDEFINITE_DETERMINERS);
    if (def) return { op: "SIG", grain: "Figure", because: "copula rule 3: definite predicate — unique role/identity", tier: "copula" };
    const objCounts = objHead ? posForms[objHead] : null;
    const objDominant = objCounts ? Object.entries(objCounts).sort((a, b) => b[1] - a[1])[0][0] : null;
    if (indef || (objDominant === "NOUN" && /s$/.test(objHead ?? ""))) {
      return { op: "SIG", grain: "Pattern", because: "copula rule 2: indefinite/bare-plural predicate — class membership", tier: "copula" };
    }
    // rule 4: disclosed gap, not fixed this pass. 3/3 real misses were
    // this branch (article-7.1.1, 26.1.2, 29.1.1.1 — all stored
    // SIG·Pattern, all guessed Figure): RULE.md's own text already
    // names the refinement ("a dispositional/habitual property... SIG
    // Pattern") this branch does not implement — telling "one quality
    // standing with one figure" apart from a normative property held
    // over a kind needs a subject-genericity test (is "everyone"/"all"/
    // a bare kind-noun the subject) that risks becoming exactly the
    // kind of guessed heuristic this file exists to avoid. Left
    // undecided-by-default would lose real signal (Figure IS the
    // right answer on other rows this same branch gets right), so it
    // stays a default rather than a refusal — but the miss rate is the
    // honest cost of that choice, not a claim of coverage.
    if (objDominant === "ADJ") return { op: "SIG", grain: "Figure", because: "copula rule 4: property-adjective predicate (dispositional/Pattern promotion not implemented — disclosed gap)", tier: "copula" };
    // rule 5: narrowed to a CLOSED semantic subset of the (closed,
    // grammatical) ADP class. Measured correction: "leads with ANY
    // preposition" over-fired on "of the greatest importance..." (a
    // degree/property predicate, not a place or time) — prepositions
    // ARE a closed grammatical class, but WHICH ones canonically
    // introduce a place or time is a semantic narrowing, disclosed as
    // exactly that rather than dressed up as a further measurement.
    const LOCATIVE_TEMPORAL_ADP = new Set(["in", "at", "on", "during", "within", "near", "before", "after", "through", "throughout"]);
    if (objDominant === "ADP" && LOCATIVE_TEMPORAL_ADP.has(objHead)) {
      return { op: "SIG", grain: "Ground", because: "copula rule 5: locative/temporal predicate (closed ADP subset, semantic narrowing disclosed)", tier: "copula" };
    }
    return { undecided: true, because: "pure copula chain, but the predicate's own head does not clear POS dominance for rules 2/4/5, and rule 1 (participle) needs FEATS this artifact does not carry" };
  }

  // VerbNet tier — the ordinary-verb gap the held-out factbook test found:
  // classify() had no branch at all for a ordinary transitive/intransitive
  // verb ("resigned", "ran for", "known"), even though ActPrior@1 (VerbNet,
  // 4,569 forms mapped to acts, DR1's own reason for existing) was sitting
  // unused three files away — `checkAct` (eot-sidecar2.mjs) already
  // consults it, but only to SCORE an already-decided cell, never to
  // PROPOSE one. This is that wiring, aimed at generation.
  //
  // Not the same move the A5/A6 disclosure above refuses: that objects to
  // guessing "is this verb a motion verb" from a Levin CLASS NAME
  // substring (a hand-list one level down). This is a direct dictionary
  // lookup on ActPrior's own already-computed `op` field — the DR1
  // translation from Levin semantics to the nine acts is done ONCE, at
  // build time, disclosed with its own giver; using it per-verb is no
  // different from using POSPrior's own counts.
  //
  // Contested entries are refused, not resolved by picking a candidate —
  // R7's own law (a disclosed alternate, never a silent coin-flip)
  // applied to an unranked candidate set. ActPrior carries no GRAIN (a
  // VerbNet class is about the verb's own type, not the clause's Ground/
  // Figure/Pattern scope), so a hit here mirrors A4's own shape: op
  // decided, grain left null and disclosed as undetermined — a real,
  // partial classification, not a refusal dressed as one.
  const genHead = actPrior && headOf(relation, posForms);
  if (genHead) {
    let entry = actPrior.forms[genHead];
    let via = genHead;
    if (!entry) {
      const lemmas = morphologyForms[genHead];
      if (lemmas?.length) { entry = actPrior.forms[lemmas[0]]; via = lemmas[0]; }
    }
    if (entry?.standing === "unanimous") {
      return { op: entry.op, grain: null, because: `VerbNet (ActPrior@1): "${genHead}"${via !== genHead ? ` → lemma "${via}" (UniMorph)` : ""} is unanimously ${entry.op} across its VerbNet classes (${entry.classes.join(", ")}) — grain undetermined (VerbNet types the verb, not the clause's scope)`, tier: "verbnet" };
    }
    if (entry?.standing === "contested") {
      return { undecided: true, because: `VerbNet (ActPrior@1): "${genHead}" is contested — candidates ${entry.candidates.map((c) => c.op).join("/")} — refused rather than picked (R7)` };
    }
  }

  return { undecided: true, because: "no frame-table phrase matched, the relation is not a pure copula chain, and its elected head is unattested (or contested) in ActPrior — A5/A6 were named absent as HAND rules; whether VerbNet's own translation table already realizes them for some verbs is an open, checked-not-assumed question (see the RESULTS doc)" };
}

// ---- scoring, guarded ----
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const GOLD = path.join(ROOT, "goldens", "reading");
  const posForms = loadPosForms();
  const actPrior = loadActPrior();
  const morphologyForms = loadMorphologyForms();
  const LANG = { udhr: "en", kant: "en", alice: "en", ripgrep: "en", "quran-2-37-en": "en",
    "lear-division": "en", "lear-disclaim": "en", "lear-france": "en", "tempest-abjure": "en" };

  let hit = 0, total = 0, undecided = 0;
  const byTier = {}; const misses = [];
  for (const f of fs.readdirSync(GOLD).filter((x) => x.endsWith(".golden.json"))) {
    const g = JSON.parse(fs.readFileSync(path.join(GOLD, f), "utf8"));
    if (LANG[g.specimen] !== "en") continue;
    for (const r of g.rows) {
      if (r.clause === "heading") continue;
      total++;
      const result = classify(r, posForms, actPrior, morphologyForms);
      if (result.undecided) { undecided++; continue; }
      byTier[result.tier] = (byTier[result.tier] ?? { hit: 0, total: 0 });
      byTier[result.tier].total++;
      const cellMatch = result.op === r.phasepost.op && (result.grain === null || result.grain === r.phasepost.grain);
      if (cellMatch) { hit++; byTier[result.tier].hit++; }
      else misses.push({ specimen: g.specimen, ground: r.ground, stored: `${r.phasepost.op}·${r.phasepost.grain}`, ladder: `${result.op}·${result.grain}`, tier: result.tier, because: result.because });
    }
  }
  const out = {
    schema: "MechanicalLadderScore@1",
    scope: "lang/en only",
    totalEnglishRows: total,
    decided: total - undecided,
    undecided,
    coverage: +((total - undecided) / total).toFixed(3),
    hitOfDecided: hit,
    accuracyOfDecided: +(hit / (total - undecided)).toFixed(3),
    accuracyOfAll: +(hit / total).toFixed(3),
    byTier: Object.fromEntries(Object.entries(byTier).map(([k, v]) => [k, { hit: v.hit, total: v.total, rate: +(v.hit / v.total).toFixed(3) }])),
    misses,
  };
  fs.writeFileSync(path.join(ROOT, "scripts", "mechanical-ladder-RESULTS.json"), JSON.stringify(out, null, 1));
  console.log(`mechanical ladder: ${total} English rows, ${out.coverage * 100}% decided, accuracy-of-decided ${out.accuracyOfDecided * 100}%, accuracy-of-all ${out.accuracyOfAll * 100}%`);
  console.log("by tier:", JSON.stringify(out.byTier));
}
