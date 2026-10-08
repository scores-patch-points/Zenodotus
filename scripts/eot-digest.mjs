#!/usr/bin/env node
// eot-digest.mjs — read a sample of this corpus and commit what was read as
// an EOT event stream (the-fold's hyperlexicon.js, POLICIES.md P57 in the
// sibling `the-fold` repo: "the reality of the database should be the EOT
// event stream, the current state always projected"). What lands under
// `digested/` per source is not a summary — it is the append-only task-log
// hyperlexicon.js::admit() actually produced: every heard assertion with its
// witness and its byte-addressed span, every offered assertion this reader
// turned away, named why.
//
// THIS SCRIPT DOES NOT LIVE ALONE. It reaches into two sibling checkouts —
// `../the-fold` (hyperlexicon.js, hypergraph.js's makeRelationReader) and
// `../khora/native` (the actual linguistic organs: splitSentences,
// extractSurfaces, discoverReferents, discoverRelationVocab,
// extractRelations, kernel/task-log.js, kernel/cube.js). eoreader7's OWN
// root README states the law this follows: "The native implementation
// lives in native/kernel/. It has no implementation dependency on
// EOReader 6.1" — the historical `packages/engine` layout (reached only
// through a submodule pinned "solely for compatibility... while consumers
// migrate") is deliberately never imported here, by direction and by
// eoreader7's own `conformance/native-boundary.test.mjs`, which fails any
// `native/kernel/*.js` file whose raw text so much as names it.
//
// THE ORGAN RECIPE, AND WHAT IS DELIBERATELY LEFT OUT.
//   - determiners + negationWords: injected unconditionally, on every
//     source regardless of language. Both are lang/en closed classes
//     consumed INSIDE hypergraph.js's own endpoint-matching (P41/P43 in
//     the-fold's own POLICIES.md) — engine-layout-agnostic by
//     construction, since the filtering happens after edges arrive, not
//     inside whichever organ extracted them. Disclosed, not assumed: the
//     MEASURED incidents that motivated shipping them on (a shared "the"
//     binding an unstated claim; a post-verbal negation read as its
//     opposite) were observed against the historical engine, not
//     independently reproduced here against eoreader7 native's own
//     `relations.js` — which carries the identical `negationWords`
//     parameter and default (checked directly, not assumed), so the
//     mechanism this correctness argument depends on is present, even
//     though the specific incident was not re-run. On non-English
//     material both closed classes are inert (their tokens essentially
//     never occur) — confirmed per-source below, not assumed.
//   - posPriorFor (hypergraph.js's own VOCABULARY-level POS gate, feeding
//     relations.js::discoverRelationVocab's `posPrior` parameter) IS
//     INJECTED, when the local POSPrior@1 build is present. This is a
//     narrower, safer mechanism than it first looks like being the same
//     thing as `classifyConnector` below — measured on real material
//     before shipping (Shakespeare 90→22 edges, the Iliad 65→25, Alice
//     97→34; the excluded tokens on all three are exactly what a reader
//     would refuse by hand: of/the/by/with/in/that/this/how/what/either/
//     or; the survivors on Alice are was/started/had/think/fallen/got/
//     began/opened — real verbs, none lost). It gates the CANDIDATE SET a
//     verb is drawn from (a majority-vote-over-the-real-treebank
//     type-level fact, exactly the standing already held for
//     `determiners`/`negationWords` above), never a per-occurrence verdict
//     on an already-extracted edge — an unattested word is explicitly NOT
//     refused (`discoverRelationVocab`'s own docstring: "a witness cannot
//     refuse what it never saw"), only a word the treebank clearly says is
//     NOT a verb across its real attested uses is excluded from ever being
//     tried as one. See `loadOrgans`'s own comment at the load site for
//     why this is NOT the same decision as `classifyConnector`'s
//     disclosure-only posture, immediately below.
//   - classifyConnector (the-fold's grammar-lens.js, a Thrax verb-hood
//     lens) still runs DISCLOSURE-ONLY, on the edges that survive the
//     vocabulary gate above — P56's asymmetric rule (a settled part of
//     speech is refusable, never confirmable) governs a PER-EDGE verdict,
//     which this never computes; `mismatchedConnectors` only flags edges
//     whose verb landed in the vocabulary as an unattested "gap" (never
//     refused there) but still reads as non-dominant on a closer look —
//     surfaced for a later reasoning step to weigh, never baked into the
//     append-only log as a refusal.
//   - verbForms / createLemmatizer (UniMorph-backed recall widening) are
//     OMITTED. the-fold's own CLAUDE.md record: "whether the live app
//     should adopt it by default is a real, undecided question" — a
//     digest meant to be trusted stays on the conservative configuration
//     rather than the higher-recall, disclosed-lower-precision one.
//
// WHAT "EOT READING" MEANS HERE, CONCRETELY. Each source becomes ONE
// passage (its own excerpt, addressed `ref = slug`), read once by
// `hypergraph.js::makeRelationReader`, whose edges (subject/verb/object,
// byte-addressed spans into THAT excerpt) are handed to
// `hyperlexicon.js::admit()` against a FRESH log per source. The admitted
// log — real task-log.js PROPOSE/SUPERSEDE entries, cube cell attached via
// `cube.js::cellOf` — is the artifact. `foldHyperlexicon` (the current
// projection) rides alongside it for a human to read without replaying the
// log by hand.
//
// SELF-VERIFICATION, P5.2's OWN LAW APPLIED HERE: every emitted span is
// checked against the excerpt's own bytes (`excerpt.slice(start,end) ===
// span.text`) before anything is written, and the pass rate is reported —
// never assumed.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LP_ROOT = path.join(HERE, "..");
const FOLD_ROOT = path.join(LP_ROOT, "..", "the-fold");
const EOREADER7_ROOT = path.join(LP_ROOT, "..", "eoreader7");
// THE LINGUISTIC ORGANS live in khora/native (the perceiver — wordclass.js,
// relations.js, spans.js, …); eoreader7/native is a stub with no adapters/text
// at all, so pointing NATIVE there made EVERY organ import fail and the POS
// gate dead. THE PRIORS live in janus/priors — the one home the design names
// (khora/native/the-fold/priors-home.js: "every prior … lives at
// <workspace root>/janus/priors; khora READS them from there"). khora's own
// native/priors is now a symlink to that home, so both resolve identically.
const KHORA_ROOT = path.join(LP_ROOT, "..", "khora");
const NATIVE = path.join(KHORA_ROOT, "native");
const ORGANS = path.join(KHORA_ROOT, "native", "organs");
const PRIORS_DIR = path.join(LP_ROOT, "..", "janus", "priors");
const DIGEST_DIR = path.join(LP_ROOT, "digested");

/**
 * repoState(dir) — the exact git commit of a sibling repo whose code
 * directly ran to produce a reading, plus whether its working tree carried
 * uncommitted changes at the moment it ran.
 *
 * WHY THIS EXISTS, user-directed: "make sure all EOT have the exact state
 * of eoreader7 that encoded this AND the state of the priors repo to know
 * what contributed to the reading." recipeId (LP5) already hashes a PROSE
 * description of which organs ran ("priors.js DEFINITE_DETERMINERS...");
 * it says nothing about which COMMIT of those organs' own code was
 * checked out. This session's own history is the proof this matters: S25,
 * S26, S27, and the ATX-heading fix all landed in eoreader7's spans.js
 * within one sitting — a reading taken before any of them and a reading
 * taken after would carry an IDENTICAL prose recipe description while
 * producing different edges from the identical bytes. Recording the
 * commit closes that gap without needing to enumerate every function that
 * changed; the commit already names everything.
 *
 * Three repos are recorded, not two, because all three directly run code
 * that shapes a reading: eoreader7 (the linguistic organs), the-fold
 * (hypergraph.js's relation reader, hyperlexicon.js's admission door,
 * source.js's container/identity readers), and live_priors itself (this
 * driver's own excerpting, blanking, and front-matter logic — a
 * `git log` on eot-sidecar.mjs this same session shows it changing just
 * as often as the sibling engines did).
 *
 * `dirty: true` is disclosed rather than hidden: a reading taken against
 * uncommitted local edits has no commit a future reader could check out
 * to reproduce it — real during active development (this session's own
 * repeated push-while-sweeping pattern), and the honest thing is to say
 * so, not to silently record a commit that does not actually match what
 * ran.
 */
function repoState(dir) {
  try {
    const commit = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["-C", dir, "status", "--porcelain"], { encoding: "utf8" }).trim().length > 0;
    return { commit, dirty };
  } catch (err) {
    return { commit: null, dirty: null, error: String(err?.message ?? err) };
  }
}

// Declared, not tuned: enough for real referent recurrence and real clause
// structure without letting one giant novel dominate the batch's runtime.
// Every source is a named EXCERPT of its file at this size, addressed as
// such — never silently presented as the whole work.
const EXCERPT_CHARS = 8000;

// DEFAULTS FLIPPED TRUE 2026-09-01, by measurement, not preference. With
// both off, 49.2% of a real book's edge SUBJECTS were not nominals at all
// ("belief may", "late and", "which") and only 33.1% read as plausible NPs;
// with both on, plausible 53.1%, determiner fragments halved (16.5%→8.7%),
// and the corpus yielded MORE edges (6,503→7,050), the whole debris table in
// the-fold's kind-induction/hyperlexicon findings. The organs were built and
// tested in eoreader7 (expandSubjectNP, its auxiliary wall, DR4/DR5) and no
// production caller had ever enabled them — the compiled-but-unwired shape
// III.5 now legislates against. `false` remains one opt away for a caller
// reproducing the old reading; the RECIPE DESCRIPTOR carries both flags, so
// readings under different settings can never share an identity (P68).
async function loadOrgans({ phrasalPredicates = true, nounPhraseSubjects = true } = {}) {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const surfaces = await import(path.join(NATIVE, "adapters/text/surfaces.js"));
  const relations = await import(path.join(NATIVE, "adapters/text/relations.js"));
  const material = await import(path.join(NATIVE, "adapters/text/material.js"));
  const priors = await import(path.join(NATIVE, "adapters/text/priors.js"));
  const taskLog = await import(path.join(NATIVE, "kernel/task-log.js"));
  const cube = await import(path.join(NATIVE, "kernel/cube.js"));
  // The activation tier (eo-constitution Article III.4, 2026-09-01): the
  // one occurrence-level organ makeRelationReader accepts and this file had
  // never imported at all, let alone passed.
  const pron = await import(path.join(NATIVE, "adapters/text/pronouns.js"));
  const { makeRelationReader } = await import(path.join(ORGANS, "hypergraph.js"));
  // A 2026-09-08 rename to organs/notes-text.js / makeNotesText (this
  // file's own prior comment) did not stick — checked live 2026-09-09:
  // the-fold/hyperlexicon.js re-exports eoreader7/native/organs/
  // hyperlexicon.js, whose export is (still/again) `makeHyperlexicon`.
  // The stale alias below called an undefined function on every run.
  const { makeHyperlexicon } = await import(path.join(ORGANS, "hyperlexicon.js"));
  const { makeReferentIndex } = await import(path.join(ORGANS, "cast.js"));
  const { stripContainer, declaredIdentity } = await import(path.join(ORGANS, "source.js"));
  const { makeGrammarLens, mismatchedConnectors } = await import(path.join(ORGANS, "grammar-lens.js"));

  // Loaded OPTIONALLY — a missing local POSPrior@1 build degrades this
  // driver to exactly its prior behaviour (posPriorFor / classifyConnector
  // both null), never a hard failure, since a fresh checkout of this repo
  // has no reason to have run that local build yet (one curl, one node
  // invocation, matching eoreader7's own build-pos-prior.mjs usage
  // comment).
  //
  // TWO DIFFERENT GATES, ONE FIXTURE — DO NOT CONFLATE THEM AGAIN. An
  // earlier pass here reasoned about only one of them (`classifyConnector`,
  // hyperlexicon.js::admit's per-EDGE verb-hood check) and correctly
  // declined it on P56's own asymmetric rule: a settled part of speech is
  // refusable, never confirmable, and admission is exactly the place a
  // wrong per-occurrence refusal would be hardest to walk back. That
  // reasoning still holds for `classifyConnector`/`mismatchedConnectors`
  // below — disclosure only, no refusal, unchanged.
  //
  // It does NOT extend to `posPriorFor`, wired into `makeRelationReader`
  // just below — a genuinely different, coarser mechanism the same
  // reasoning does not cover. `relations.js::discoverRelationVocab`'s own
  // `posPrior` parameter gates the CANDIDATE VOCABULARY a verb is drawn
  // from, by a TYPE-level majority vote over the real UD treebank
  // (`verbShare > 0.5` — hardcoded, not a tuned knob, and unattested forms
  // are explicitly NOT refused: "a witness cannot refuse what it never
  // saw"). This is structurally the SAME class of gate `determiners`/
  // `negationWords` above already are — closing a vocabulary-level false
  // admission, never convicting one already-extracted edge — and P43's own
  // distinguishing test names exactly why it belongs here: "does the prior
  // close a false binding, or does it widen what the reader hears?" A
  // preposition or article wrongly treated as a verb is a false binding
  // closed, not a recall-widening move (that class — verbForms/
  // createLemmatizer — stays omitted below, unchanged).
  //
  // Measured before shipping, on real material, not assumed: gating
  // dropped garbage connectors (of/the/by/with/in/that/this/how/what/
  // either/or, among others) from three real Gutenberg excerpts —
  // Shakespeare 90→22 edges, the Iliad 65→25, Alice 97→34 — while every
  // surviving verb on Alice (was/started/had/think/fallen/got/began/
  // opened) is a genuine one; `candidates` (the full nominated set, gated
  // or not) is unchanged, so nothing about what was NOMINATED moved, only
  // what was ADMITTED to the vocabulary extraction actually draws from.
  // POS priors, PER LANGUAGE: native/priors/pos-<iso3>.json, each built by
  // eoreader7's own native/scripts/build-pos-prior.mjs from a real UD
  // treebank (see that file's own header — one script, zero per-language
  // code, English/Russian/Finnish today). The path used to name the empty
  // `legacy-legacy-engine.1` submodule, so this gate has never actually loaded
  // for any of this corpus's languages, English included — the elaborate
  // measured numbers in this function's own header comment (Shakespeare
  // 90→22, the Iliad 65→25, Alice 97→34) describe a real prior run, but
  // against a build this checkout never had a live path to. Fixed at the
  // source: `wordclass.js` (native/adapters/text/wordclass.js) is already
  // self-contained — no legacy import, confirmed directly — and exports
  // exactly the four symbols `makeGrammarLens` needs.
  //
  // `LANG_ALIAS`/`normalizeLangCode` bridge the two code schemes this
  // corpus itself mixes: this file's own SAMPLE array declares ISO 639-1
  // (`language: "fr"`), and the UDHR corpus's own header code is ALSO
  // mostly ISO 639-1 (eot-sidecar.mjs's own UDHR_HEADER_RE comment: "ru",
  // "fi", checked directly against real files) — against the priors'
  // own ISO 639-3 filenames (matching UniMorph's/UD's per-language repo
  // naming, `pos-eng.json`/`pos-rus.json`/`pos-fin.json`). An alias table
  // of exactly the three languages this pass built data for, not a
  // general ISO 639 mapping — every other code passes through unchanged
  // and simply finds no entry below, which is the honest, disclosed
  // default for the other ~513 UDHR languages and every other document
  // this corpus holds.
  // el/tr/he/ko/fa added 2026-09-08: POSPrior@1 built from UniMorph
  // (build-pos-prior-from-unimorph.mjs) rather than a UD treebank — see
  // that script's own header for why (UniMorph's paradigm tables are not
  // bounded by one treebank's own finite sentence sample, which matters
  // most for exactly the languages a small treebank would otherwise leave
  // this gate absent for) and for the declared, narrow POS mapping (bare
  // V/N/ADJ only; every non-finite subtype — participle, converb, masdar —
  // is dropped, disclosed per-language in each prior's own provenance).
  // General ISO 639-1 → 639-3 map for every language this corpus holds (plus
  // the ones already in the old three-entry alias). The prior files are named
  // by ISO 639-3 (pos-spa.json, pos-cmn.json, …); corpus filenames and the
  // UDHR header use mostly ISO 639-1. Resolution NEVER falls back to another
  // language — an unmapped code simply finds no entry and is a typed gap.
  const LANG_ALIAS = {
    en: "eng", es: "spa", pt: "por", zh: "cmn", ar: "arb", he: "heb", fa: "fas",
    ja: "jpn", sa: "san", la: "lat", el: "ell", ru: "rus", fi: "fin", tr: "tur",
    ko: "kor", fr: "fra", de: "deu", it: "ita", ca: "cat", gl: "glg", af: "afr",
    nl: "nld", sv: "swe", da: "dan", no: "nob", pl: "pol", cs: "ces", sk: "slk",
    sl: "slv", hu: "hun", ro: "ron", bg: "bul", uk: "ukr", sr: "srp", hr: "hrv",
    lt: "lit", lv: "lav", et: "est", hi: "hin", ta: "tam", te: "tel", ur: "urd",
    mr: "mar", gu: "guj", bn: "ben", ne: "nep", si: "sin", vi: "vie", id: "ind",
    ms: "msa", th: "tha", sw: "swa", eo: "epo", tl: "tgl", eu: "eus", hy: "hye",
    ka: "kat", mt: "mlt", cy: "cym", ga: "gle", mt2: "mlt", uz: "uzn", az: "azj",
    kk: "kaz", ky: "kir", tg: "tgk", ps: "pbu", ku: "kmr", am: "amh", so: "som",
    yo: "yor", ig: "ibo", ha: "hau", zu: "zul", xh: "xho", st: "sot", tn: "tsn",
    sn: "sna", ny: "nya", rw: "kin", lg: "lug", wo: "wol", ff: "fuv", mg: "mlg",
  };
  const normalizeLangCode = (code) => {
    const c = String(code ?? "").toLowerCase();
    return LANG_ALIAS[c] ?? c;
  };
  const GRAMMAR_MIN_SHARE = 0.5;
  const posByLang = {};
  try {
    const wordclass = await import(path.join(NATIVE, "adapters/text/wordclass.js"));
    // "grc" (Ancient/Koine Greek, UD_Ancient_Greek-PROIEL — its own corpus
    // includes the Greek New Testament, the closest genre match to this
    // repo's 14-holy-texts/sblgnt/ material) is deliberately its OWN
    // language code, never folded into "ell" (Modern Greek) via LANG_ALIAS
    // — found necessary by measurement, not assumed: Koine's own bare
    // particles (δὲ/ὁ/ἐν, real and well-attested here, 2,849–9,237
    // occurrences each) carry polytonic diacritics modern orthography
    // dropped in 1982, so a modern-Greek prior lookup misses them
    // entirely — not a coverage gap folding diacritics would paper over
    // correctly, a real different register/vocabulary a period-matched
    // treebank actually answers.
    // Enumerate EVERY pos-<iso3>.json in the janus priors home — not a
    // hardcoded few. A language with no prior file stays a typed gap
    // (posGateFor returns null), never a guess and never a fallback.
    const posFiles = fs.existsSync(PRIORS_DIR)
      ? fs.readdirSync(PRIORS_DIR).filter(f => /^pos-[a-z0-9_]+\.json$/.test(f))
      : [];
    for (const file of posFiles) {
      const lang = file.replace(/^pos-/, "").replace(/\.json$/, "");
      try {
        const posPrior = JSON.parse(fs.readFileSync(path.join(PRIORS_DIR, file), "utf8"));
        posByLang[lang] = {
          posPrior,
          classifyConnector: makeGrammarLens({
            classifyWord: wordclass.classifyWord,
            dominantClass: wordclass.dominantClass,
            posPrior,
            posPriorMeta: wordclass.POS_PRIOR_META,
            thraxMeta: wordclass.THRAX_META,
          }),
        };
      } catch {
        // no build for this language — a disclosed absence via posGateFor
        // below, never a guess; every language not in the loop above is
        // the same disclosed absence, by construction.
      }
    }
  } catch {
    // adapters/text/wordclass.js unreachable — every language degrades to
    // no gate, disclosed the same way as a single missing prior file.
  }
  // Backward-compatible flat defaults: any caller reading `classifyConnector`/
  // `posPrior`/`posPriorLoaded` off the returned organs bundle directly
  // (unchanged names, unchanged meaning) gets English — the language this
  // function's own header comment's measured numbers were about — now
  // actually loaded rather than silently dead.
  const posPriorLoaded = !!posByLang.eng;
  const classifyConnector = posByLang.eng?.classifyConnector ?? null;
  const posPrior = posByLang.eng?.posPrior ?? null;

  // Declension folding (the-fold/eoreader7 S38): namesCorefer's own
  // containment/shared-final-token check compares tokens as exact strings,
  // which fragments a highly-inflected language's own names across their
  // case forms (Russian: "Кутузов"/"Кутузова"/"Кутузову" read as three
  // strangers). `sameStemFor(lang)` is the SAME per-language-map shape as
  // `posGateFor` below, deliberately — one received-prior lookup pattern,
  // not two. Only Russian has a built prior today; every other language
  // returns `null` and `discoverReferents` runs exactly as it always has.
  const declensionByLang = {};
  try {
    const declension = await import(path.join(NATIVE, "adapters/text/declension.js"));
    for (const lang of ["rus"]) {
      try {
        const prior = JSON.parse(fs.readFileSync(path.join(PRIORS_DIR, `declension-${lang}.json`), "utf8"));
        declensionByLang[lang] = declension.createDeclensionFolder(prior).sameStem;
      } catch {
        // no declension prior for this language yet — disclosed via sameStemFor
      }
    }
  } catch {
    // adapters/text/declension.js unreachable — every language degrades to
    // exact-token comparison, the pre-existing behaviour.
  }
  const sameStemFor = (code) => declensionByLang[normalizeLangCode(code)] ?? null;

  // sameAct — verb-tense/lemma equivalence ("underwent"≈"undergoes"), the
  // MINE-1-measured small safe win (bound 531→536, zero contradictions).
  // This pass's own earlier disclosure ("no organ produces this shape on
  // any engine path today") was checking only the frozen legacy provider;
  // `native/adapters/text/morphology.js::createLemmatizer` is a REAL,
  // native, already-tested organ, and `native/priors/morphology-eng.json`
  // (142KB, real UniMorph-derived forms + irregular table, giver recorded
  // in its own provenance) is real, populated data already sitting in this
  // checkout — found only by checking the file's actual bytes rather than
  // trusting a stale disclosure written before the native port landed.
  // English only, per that prior's own language field; every other
  // language degrades to exact-string verb matching, unchanged.
  const morphologyByLang = {};
  try {
    const morphology = await import(path.join(NATIVE, "adapters/text/morphology.js"));
    for (const lang of ["eng"]) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(PRIORS_DIR, `morphology-${lang}.json`), "utf8"));
        const prior = morphology.morphologyFromPrior(raw);
        morphologyByLang[lang] = { createLemmatizer: morphology.createLemmatizer, morphologyIndex: prior.forms, morphologyLanguage: prior.language };
      } catch {
        // no morphology prior for this language yet — disclosed via morphologyFor
      }
    }
  } catch {
    // adapters/text/morphology.js unreachable — every language degrades to
    // exact-string verb comparison, the pre-existing behaviour.
  }
  const morphologyFor = (code) => morphologyByLang[normalizeLangCode(code)] ?? null;

  const determiners = new Set([...priors.DEFINITE_DETERMINERS, ...priors.INDEFINITE_DETERMINERS]);
  // Factored out so a per-language relationsFor is the SAME construction
  // as the flat default below, never a second implementation that could
  // drift from it (this repo's own postmortems — P22/P24/P25 in the-fold's
  // CLAUDE.md — are exactly this drift class, caught here before it could
  // recur a fourth time).
  const buildRelationsFor = (langPosPrior, langMorphology = null) => makeRelationReader({
    ...(langMorphology ?? {}),
    splitSentences: spans.splitSentences,
    extractSurfaces: surfaces.extractSurfaces,
    discoverReferents: surfaces.discoverReferents,
    namesCorefer: surfaces.namesCorefer,
    diaNorm: surfaces.diaNorm,
    discoverRelationVocab: relations.discoverRelationVocab,
    extractRelations: relations.extractRelations,
    tokenize: material.tokenize,
    determiners,
    negationWords: priors.NEGATION_WORDS,
    // See the WHY DISCLOSE-ONLY / WHY GATE comment above this function —
    // a type-level majority-vote vocabulary gate, not a per-edge verdict.
    // `posPriorFor` is a zero-arg accessor (app.js's own lazy-prior
    // pattern) so a caller that never loaded a POSPrior@1 fixture pays
    // nothing; `posPrior === null` here degrades makeRelationReader to
    // byte-identical prior behaviour (checked at hypergraph.js's own
    // `organs.posPriorFor ? organs.posPriorFor() : null`).
    posPriorFor: langPosPrior ? () => langPosPrior : null,
    // Both default false, threaded straight from this function's own
    // caller-declared `opts` — see this file's own header for what they are
    // (DR4/DR5, live_priors/goldens/reading/DERIVED-RULES.md) and hypergraph.js's
    // own `makeRelationReader` header for the backward-compatibility contract
    // (native relations.js's own AUXILIARY_VERBS/DEFINITE_DETERMINERS/etc.
    // defaults apply — nothing further injected here). The corpus-wide sweep
    // (this file's own `main`, below) omits both, so every already-digested
    // sidecar's shape is untouched; `diff-golden.mjs` opts in explicitly to
    // measure DR4/DR5 against the hand-rolled goldens.
    phrasalPredicates,
    nounPhraseSubjects,
    // THE ACTIVATION TIER, WIRED (eo-constitution Article III.4, 2026-09-01).
    // A cross-repo survey found this call site passing eleven of the
    // twenty-five organs hypergraph.js::makeRelationReader accepts, with no
    // record anywhere that the rest had been omitted — every 2026-08-29
    // corpus sweep ran purely type-level (surfaces, POS-gated vocabulary,
    // slot-position relations), with the one occurrence-level organ
    // (`resolvePronouns` — kernel/activation.js's one-hop recall through
    // kernel/contest.js's co-presence veto) never once reaching it.
    // `resolvePronouns`/`thirdPersonSingular` are wired now — measured
    // effect, real and honestly small at this window: 0 additional edges
    // across a 10-file, 8000-char sample (Aristotle, Dante, Byzantine
    // Empire, Christianity, Buddhism, Cold War, Confucianism, Drama,
    // Hamlet, UK 2008 c.27 — every file identical edge count with the
    // organ on or off). Its value is NOT raw yield; `resolvePronouns`'s own
    // `regime` block (framesWithPronouns/framesCoPresent/framesAdjudicated)
    // is real, disclosed evidence about how often co-presence vetoes a
    // candidate binding, and nothing before this pass captured it anywhere
    // — that block should ride the sidecar once `eot-sidecar.mjs` is
    // extended to keep it (named, not done in this pass).
    resolvePronouns: pron.resolvePronouns,
    thirdPersonSingular: priors.THIRD_PERSON_SINGULAR,
  });
  const relationsFor = buildRelationsFor(posByLang.eng?.posPrior ?? null, morphologyByLang.eng ?? null); // backward-compatible flat default: English
  const relationsForLangCache = new Map();
  const relationsForLang = (code) => {
    const lang = normalizeLangCode(code);
    if (!relationsForLangCache.has(lang)) relationsForLangCache.set(lang, buildRelationsFor(posByLang[lang]?.posPrior ?? null, morphologyByLang[lang] ?? null));
    return relationsForLangCache.get(lang);
  };
  const posGateFor = (code) => {
    const lang = normalizeLangCode(code);
    const entry = posByLang[lang];
    return { loaded: !!entry, classifyConnector: entry?.classifyConnector ?? null, posPrior: entry?.posPrior ?? null };
  };

  // UNION_OMITTED — eo-constitution/conformance/composition.test.mjs reads
  // this literal object directly off this file's own source text (parsed,
  // never executed by the audit) and fails if any organ
  // hypergraph.js::makeRelationReader accepts is neither passed above nor
  // named here with a real reason. A bare list of names is refused by that
  // test; every entry below carries why.
  const UNION_OMITTED = {
    // A REAL BUG, found wiring this pass, not a design choice: `blankFurniture`
    // (the-fold's `source.js::blankLabelRows`) is byte-length-preserving but
    // NOT sentence-COUNT-preserving on real material — measured on the same
    // Aristotle excerpt, it blanks 40 sentences down to 36 by erasing
    // terminal punctuation inside label-cell lines that `splitSentences`
    // was using as boundaries. hypergraph.js's own span-pairing check
    // (`readSentences.length === originalSentences.length`) then refuses
    // EVERY triple's address on the affected passage — confirmed live:
    // wiring `blankFurniture` alone turned 37 addressed edges into 37
    // edges with `spans: []`, silently unadmittable at hyperlexicon.js's
    // own UNADDRESSED door. Leaving it out is the safe choice until
    // `blankLabelRows` is made sentence-count-preserving or the pairing
    // check gains a fallback; the bug itself is filed as
    // eo-constitution/claims/blank-furniture-sentence-drift.claim.json.
    blankFurniture: "real bug, 2026-09-01: blankLabelRows changes splitSentences' sentence count on real material, which silently zeroes every edge's span under makeRelationReader's own count-pairing check — see claims/blank-furniture-sentence-drift.claim.json",
    // Widens what the reader HEARS rather than closing a false binding
    // (the-fold P43's own distinguishing test) — a real, measured, LARGE
    // effect (319 -> 737 edges across the same 10-file sample, matching
    // this project's own MINE-1 finding), and a genuinely separate
    // decision from wiring the activation tier: whether the corpus should
    // read with a widened English-only lexical prior is not answered by
    // "the organ exists and works." Left to a deliberate follow-up pass,
    // not bundled silently into "turn activation on." Its fixture
    // (the-fold/eval/fixtures/unimorph-eng-verb-forms.json) had gone
    // missing from this checkout entirely (recovered 2026-09-08 from an
    // abandoned worktree, LP16) — still withheld pending its own
    // before/after measurement on this corpus's now-gated recipe, not
    // wired as a side effect of that recovery.
    verbForms: "available (the-fold/eval/fixtures/unimorph-eng-verb-forms.json, 103,318 forms) and measured (319->737 edges on the 10-file sample) but withheld from THIS pass — widens recall rather than closing a false binding, and shipping it needs its own decision, not a side effect of wiring activation",
    // createLemmatizer/morphologyIndex/morphologyLanguage are WIRED as of
    // 2026-09-08 (LP16 amendment) — this repo's own earlier disclosure
    // here ("no organ produces this shape") was checking only the frozen
    // legacy provider; native/adapters/text/morphology.js::createLemmatizer
    // is real and native/priors/morphology-eng.json is real, populated
    // UniMorph-derived data (both found by reading the actual bytes, not
    // trusted from an earlier pass's own stale note). English only —
    // every other language degrades to exact-string verb matching,
    // unchanged.
    classifyConnector: "grammar-lens.js's disclosure-only lens (P56), already loaded above for classifyConnector's OTHER call site in this file; not the same organ makeRelationReader accepts under this name and not re-wired here without checking that distinction first",
    minShare: "the classifyConnector threshold; moot while classifyConnector is unset above",
    extractLeadingSurfaces: "no organ under this name exists on the native adapters/text/surfaces.js path as of this pass — checked, absent",
    casePrior: "Latin case-marking prior (the-fold P77) — this composition calls makeRelationReader, the English positional reader, never makeCaseMarkedRelationReader; not applicable to an English-majority sweep, named rather than silently absent",
    extractCaseMarkedRelation: "same reason as casePrior — this composition calls the English positional reader",
  };
  // taskLog.js exports GRAIN_RANK directly (native/kernel/task-log.js,
  // eoreader7 S23) — hyperlexicon.js reads it to name the Figure grain
  // without hardcoding the string. cellOf lives on cube.js in the native
  // layout (task-log.js's own historical operators.js companion has no
  // native counterpart; cube.js is where cellOf actually lives here).
  const hl = makeHyperlexicon({ ...taskLog, cellOf: cube.cellOf });
  // Computed ONCE per process, not per source — the three repos' commits
  // are invariant across a whole batch/sweep, and re-shelling to git for
  // every one of 2,207 files would be pure waste for a fact that cannot
  // change mid-run.
  const repoStates = {
    eoreader7: repoState(EOREADER7_ROOT),
    theFold: repoState(FOLD_ROOT),
    livePriors: repoState(LP_ROOT),
  };
  // makeHyperlexicon and makeReferentIndex are exposed as CONSTRUCTORS, not
  // only `hl` (a single fixed instance without noteIdentity, built above for
  // the corpus-wide sweep's own recipe-identity use). eo-constitution
  // Article III.4's own referent-identity wiring (2026-09-01) needs a FRESH
  // hyperlexicon per file, closed over THAT file's own referent index —
  // coreference is passage-scoped and must never be shared across
  // documents (cast.js's own referent index is built fresh per call for
  // exactly this reason). eot-sidecar.mjs builds the per-file instance;
  // this function only hands over the parts.
  return {
    spans, surfaces, relations, material, priors, taskLog, cube,
    // The flags AS RUN, exposed so a descriptor derives them from this
    // bag instead of restating a literal that could drift (III.5's own
    // "prose never claims wiring" applied to a recipe field).
    nounPhraseSubjects, phrasalPredicates,
    relationsFor, relationsForLang, posGateFor, sameStemFor, morphologyFor, normalizeLangCode,
    hl, makeHyperlexicon, makeReferentIndex,
    stripContainer, declaredIdentity, repoStates,
    classifyConnector, mismatchedConnectors, posPriorLoaded, GRAMMAR_MIN_SHARE,
  };
}

// ── catalog boilerplate ─────────────────────────────────────────────────
//
// Measured on grateful-dead-catalog.txt: the `collection:` field is 98.5%
// of the file's bytes, and it is Archive.org favourites-list membership
// ("fav-088milo", "fav-1jasoncutter"...) — bookkeeping about which users
// starred an item, never a description of it. Admitting it as material
// would flood every reading with junk proper-noun-shaped tokens, the same
// class of mistake P5.3 (Gutenberg's licence text) already names for this
// repo's sibling. This is a NEW, local, disclosed decision — not a general
// reading law — kept here rather than in a shared organ because it answers
// a structural fact about Archive.org's own catalogue export, nothing
// about text in general.
function stripCatalogBoilerplate(text) {
  let dropped = 0;
  const out = text.replace(/^collection:.*$/gm, (line) => {
    dropped += line.length;
    const tags = line.slice("collection:".length).split(",").length;
    return `collection: [stripped — ${tags} archive.org favourites-list tags, bookkeeping not description]`;
  });
  return { text: out, droppedChars: dropped };
}

// ── per-source excerpting, disclosed ────────────────────────────────────
// Found by this driver's OWN span self-verification, not assumed: on a
// Gutenberg file with Windows line endings (pg67098, 3,654 CRLF pairs),
// 0/59 emitted spans matched the excerpt's own bytes; on a catalog with a
// handful of CRLFs (met-museum, 9 of them), 14/26 matched — every span
// AFTER the first CRLF drifted by one character per CRLF consumed so far.
// The cause: `spans.js::splitSentences` normalises `\r\n`/`\r` to `\n`
// internally before computing its own offsets, so its offsets are into the
// NORMALISED string — while this driver was self-verifying against the
// RAW excerpt, one character longer per CRLF. The fix is not a patch on
// the comparison; it is making the string this driver hands to the reader
// and the string it checks against THE SAME STRING; normalise once, here,
// before either happens.
const normaliseNewlines = (text) => text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

function excerptOf(fullText, { gutenberg = false, catalog = false, stripContainerFn }) {
  let text = fullText;
  let bodyOffset = 0;
  let catalogDropped = 0;
  if (gutenberg) {
    const { text: body, offset } = stripContainerFn(fullText);
    text = body;
    bodyOffset = offset;
  }
  if (catalog) {
    const { text: stripped, droppedChars } = stripCatalogBoilerplate(text);
    text = stripped;
    catalogDropped = droppedChars;
  }
  text = normaliseNewlines(text);
  const excerpt = text.slice(0, EXCERPT_CHARS);
  return {
    excerpt,
    bodyOffset,
    catalogDropped,
    fullChars: fullText.length,
    bodyChars: text.length,
    excerptChars: excerpt.length,
    truncated: text.length > EXCERPT_CHARS,
  };
}

// ── self-verification (P5.2) ────────────────────────────────────────────
/**
 * How much of a document's own sentence structure the admission log
 * actually covers — LP10's own named distinction: `gate: "clean"` answers
 * "did anything FALSE get in," this answers "how much of the document
 * ever got a CHANCE to get in at all." Counted as distinct admitted
 * byte-spans against total sentences, never assumed 1:1 with "sentences
 * worth reading" — a low number names a real, disclosed shortfall in
 * RELATION EXTRACTION coverage, not a verdict on the material itself.
 * `edges` may carry either raw `{start,end}` spans (pre-admission) or
 * addressed `{at}` spans (post-admission) — both are accepted so this one
 * function serves either call site rather than two copies keyed to two
 * different span shapes. MUST be `folded` (or `admitEdges`/`heard`-shaped
 * pre-admission edges), never bare `hl.admit()`'s own `heard` return value:
 * `heard` entries are `{id, subject, verb, object}` ONLY — no `spans` field
 * at all (hyperlexicon.js's `admit()` pushes exactly that shape) — so
 * calling this with `heard` silently reads zero spans on every edge and
 * reports 0% coverage regardless of what was actually admitted. Caught
 * live: both call sites did exactly this on their first real run.
 */
function admissionCoverage(sentenceCount, edges) {
  const spans = new Set();
  for (const e of edges ?? []) {
    for (const s of e.spans ?? []) {
      if (s?.at) spans.add(s.at);
      else if (Number.isFinite(s?.start) && Number.isFinite(s?.end)) spans.add(`${s.start}-${s.end}`);
    }
  }
  return {
    sentenceCount,
    admittedSpans: spans.size,
    coverage: sentenceCount > 0 ? spans.size / sentenceCount : null,
  };
}

const SPAN_AT_RE = /#(\d+)-(\d+)$/;

/**
 * LP10's own rule, mechanically enforced: a line per PROPOSITION, never
 * per document. Every sentence gets exactly one entry here — a real
 * proposition (naming the admitted claim(s) it produced, by address) or a
 * typed gap ("read, nothing extractable") — so a sentence can never again
 * be silently invisible the way LP9's own "how do we have five edges for
 * 72 sentences" finding caught. This is DELIBERATELY NOT folded into
 * hyperlexicon.js's own `log`/`folded` (the-fold's append-only assertion
 * log, admit()'s own door) — a gap is not an assertion, and admit()'s own
 * typing has no business absorbing "nothing was said here." It is a
 * separate, additive ledger a reader joins against the log by sentence
 * order/address, built entirely from this driver's own already-available
 * sentence structure and `folded` (or `heard`) — no change to the-fold's
 * module.
 *
 * `sentenceSpans` is `{order, start, end}` per sentence — CALLER-COMPUTED,
 * on purpose: a coordinate-space bug lived here once (this driver's own
 * `sentences[].offset` is excerpt-local; `readSidecar` separately
 * translates admitted edges to RAW-FILE coordinates before `hl.admit()`
 * ever sees them, so the two sides silently disagreed — 0.0% coverage,
 * every sentence a false gap, on a document that actually had 5 real
 * admitted edges). Deriving `start`/`end` in here from a bare `.offset`
 * assumed one coordinate space for every caller; there are two (see
 * `digestOne` — excerpt-local, edges untranslated — vs `readSidecar` —
 * raw-file, edges translated for on-disk self-verification), and only the
 * caller knows which one its own `edges` argument is actually in. `edges`
 * is `folded` (or any array of admitted entries) whose `spans` carry the
 * addressed `{at: "ref#start-end", ...}` shape the persisted log itself
 * uses — the SAME shape `admissionCoverage` above also reads, intentionally
 * not re-derived a second way. `ref` is this document's own address prefix
 * (`spec.slug` / `relPath`, matching every edge's own `ref` field) so a
 * gap's own `at` resolves in the SAME coordinate space as a real
 * proposition's, not a bare offset nothing else in the file uses.
 */
// `scriptBySentence` (optional): `surfaces.js::scriptCoverageBySentence`'s
// own per-sentence output, same order as `sentenceSpans` — see
// native/READING-SPEC.md S92. Zipped onto this SAME per-sentence ledger
// rather than returned as a parallel array: this ledger is already "one
// entry per sentence, always" (LP10), so a document mixing scripts (English
// + Mandarin) gets ITS OWN per-sentence language tag on the exact entry a
// reader would otherwise ask "why is this sentence a gap" about — a caseless
// (Han) sentence's `no_relation_extracted` gap and its `script.dominant:
// "caseless"` tag are the same fact, read from two different fields on one
// row, rather than two documents a caller has to join by hand.
function propositionLedger(sentenceSpans, edges, ref, scriptBySentence) {
  const bySentence = sentenceSpans.map((s) => ({
    order: s.order,
    start: s.start,
    end: s.end,
    propositions: [],
  }));
  for (const e of edges ?? []) {
    for (const s of e.spans ?? []) {
      const m = typeof s?.at === "string" ? s.at.match(SPAN_AT_RE) : null;
      if (!m) continue;
      const [, startStr, endStr] = m;
      const start = Number(startStr), end = Number(endStr);
      // Contained-within, not merely overlapping: extraction is per-
      // sentence (S38's own header names the cross-boundary garbage a
      // looser rule once produced), so a real admitted span should sit
      // fully inside exactly one sentence's own byte range.
      const hit = bySentence.find((sent) => start >= sent.start && end <= sent.end);
      if (hit) hit.propositions.push({ at: s.at, subject: e.subject, verb: e.verb, object: e.object });
    }
  }
  const scriptByOrder = new Map((scriptBySentence ?? []).map((sc) => [sc.order, sc]));
  return bySentence.map((sent) => {
    const sc = scriptByOrder.get(sent.order);
    return {
      order: sent.order,
      at: `${ref}#${sent.start}-${sent.end}`,
      ref,
      kind: sent.propositions.length ? "proposition" : "gap",
      propositions: sent.propositions.length ? sent.propositions : undefined,
      reason: sent.propositions.length ? undefined : "no_relation_extracted",
      script: sc ? { dominant: sc.dominant, casedShare: sc.casedShare } : undefined,
    };
  });
}

function verifySpans(excerpt, edges) {
  let checked = 0, ok = 0;
  const bad = [];
  for (const e of edges) {
    for (const s of e.spans ?? []) {
      checked += 1;
      if (excerpt.slice(s.start, s.end) === s.text) ok += 1;
      else bad.push({ edge: `${e.end1 ?? e.subject} —${e.label ?? e.verb}→ ${e.end2 ?? e.object}`, span: s });
    }
  }
  return { checked, ok, bad };
}

async function digestOne(organs, spec) {
  const { relationsForLang, sameStemFor, posGateFor, morphologyFor, hl, spans, surfaces, stripContainer, GRAMMAR_MIN_SHARE } = organs;
  const relationsFor = relationsForLang(spec.language);
  const sameStem = sameStemFor(spec.language);
  const posGate = posGateFor(spec.language);
  const morphology = morphologyFor(spec.language);
  const rawPath = path.join(LP_ROOT, spec.path);
  const raw = fs.readFileSync(rawPath, "utf8");
  const { excerpt, bodyOffset, catalogDropped, fullChars, bodyChars, excerptChars, truncated } =
    excerptOf(raw, { gutenberg: spec.kind === "text-gutenberg", catalog: spec.kind === "catalog", stripContainerFn: stripContainer });

  const identity = spec.kind === "text-gutenberg" ? organs.declaredIdentity(spec.slug, raw) : null;

  const sentences = spans.splitSentences(excerpt);
  // digestOne's own admitEdges (below) carry `e.spans` UNTRANSLATED straight
  // off `report.edges` — no bodyOffset/toRaw crossing, unlike readSidecar's
  // deliberate raw-file translation for on-disk self-verification — so this
  // driver's sentence spans and its admitted-edge spans are ALREADY in the
  // same excerpt-local coordinate space; propositionLedger just needs them
  // handed over as `{order, start, end}` rather than `{order, offset, text}`.
  const sentenceSpans = sentences.map((s) => ({ order: s.order, start: s.offset, end: s.offset + s.text.length }));
  // Whether the surface layer can see this material's script AT ALL, asked
  // BEFORE its counts are read — eoreader7 native surfaces.js::scriptCoverage
  // (S24). Every candidate-surface filter in that organ reads capitalisation,
  // so on a caseless script the count it returns is about whatever cased
  // debris sits in the file, never about the material's own language. This
  // digest's first run reported exactly such counts for Hebrew, Korean and
  // Farsi with nothing marking them; the gap is now carried per source.
  // Folded once, fed to both — scriptCoverage's third gap boundary (S36)
  // needs the same capitalised-run walk extractSurfaces performs; see
  // eot-sidecar.mjs's identical fold for the fuller account.
  const evidence = surfaces.accumulateSurfaceEvidence(sentences, surfaces.createSurfaceEvidence());
  const script = surfaces.scriptCoverage(sentences, { evidence });
  // S92 — see eot-sidecar.mjs's identical fold for the fuller account.
  const scriptBySentence = surfaces.scriptCoverageBySentence(sentences);
  const surfaceEvidence = surfaces.surfacesFromEvidence(evidence);
  const { events } = surfaces.discoverReferents(surfaceEvidence, { sameStem });
  const referentIds = new Set(events.map((e) => e.referent_id));

  const passage = { ref: spec.slug, text: excerpt };
  let report;
  try {
    report = relationsFor([passage], { pool: [passage] });
  } catch (err) {
    report = { edges: [], examined: 0, error: String(err?.message ?? err) };
  }

  const spanCheck = verifySpans(excerpt, report.edges ?? []);

  // the-fold P76 finished the SVO wipe (2026-09-02): makeRelationReader's
  // edges now carry ONLY end1/label/end2 (arrangementOf), never
  // subject/verb/object. hl.admit()'s own public face still speaks
  // subject/verb/object (native/organs/hyperlexicon.js's deliberate
  // byte-compatible API), so the read side has to translate here — this
  // repo's own edges were silently 100% "incomplete" until this line named
  // the field it should have been reading.
  const admitEdges = (report.edges ?? []).map((e) => ({
    subject: e.end1 ?? e.subject, verb: e.label ?? e.verb, object: e.end2 ?? e.object, spans: e.spans, because: null,
  }));
  let log = hl.createHyperlexicon();
  const { log: nextLog, heard, turnedAway } = hl.admit(log, admitEdges, { witness: spec.slug });
  log = nextLog;
  const folded = hl.foldHyperlexicon(log);

  return {
    schema: "EOTDigest@1",
    source: {
      slug: spec.slug,
      kind: spec.kind,
      path: spec.path,
      language: spec.language,
      note: spec.note,
      declaredIdentity: identity,
    },
    excerpting: {
      fullChars, bodyChars, bodyOffset, excerptChars, truncated,
      catalogBoilerplateCharsDropped: catalogDropped || undefined,
    },
    organs: {
      engine: "eoreader7/native (adapters/text, kernel/task-log.js, kernel/cube.js)",
      determiners: "injected — priors.js DEFINITE_DETERMINERS + INDEFINITE_DETERMINERS (giver lang/en, P41)",
      negationWords: "injected — priors.js NEGATION_WORDS (giver lang/en, P43)",
      // The giver read off the prior's OWN provenance rather than assumed —
      // eng/rus/fin are UD treebank builds, ell/tur/heb/kor/fas are
      // UniMorph paradigm-table builds (build-pos-prior-from-unimorph.mjs);
      // hardcoding "Universal Dependencies" here would misattribute the
      // five newer ones the moment they were wired in.
      posPriorGate: posGate.loaded
        ? `active — native/priors/pos-${organs.normalizeLangCode(spec.language)}.json (giver: ${posGate.posPrior?.provenance?.giver ?? "unknown"}) gates relations.js::discoverRelationVocab's candidate verb vocabulary`
        : `omitted — no POSPrior@1 build for language "${spec.language}" (normalized "${organs.normalizeLangCode(spec.language)}") in this environment`,
      classifyConnector: posGate.loaded
        ? `wordclass.js dominantClass (giver: ${posGate.posPrior?.provenance?.giver ?? "unknown"}) — minShare ${GRAMMAR_MIN_SHARE}, per-EDGE DISCLOSURE ONLY, never gates admission (see posPriorGate above for the vocabulary-level gate, which is a different mechanism and IS active)`
        : "omitted — no POSPrior@1 build for this language in this environment",
      verbForms: "omitted — opt-in only, undecided default per the-fold CLAUDE.md",
      createLemmatizer: morphology
        ? `active — native/priors/morphology-${organs.normalizeLangCode(spec.language)}.json (giver UniMorph), widens verb equality to sameAct (e.g. "underwent"≈"undergoes") — MINE-1 measured: bound 531→536, zero contradictions`
        : `omitted — no MorphologyPrior@1 build for language "${spec.language}" in this environment`,
      sameStem: sameStem
        ? `injected — declension-${organs.normalizeLangCode(spec.language)}.json (giver UniMorph, CC BY-SA 3.0), widens namesCorefer past exact-token comparison`
        : `omitted — no declension prior for language "${spec.language}" in this environment`,
    },
    // What fraction of this material's own writing the surface layer could
    // see, and the typed gap when the answer is "little or none". Sits ABOVE
    // `reading` deliberately: a surface count read without this is the exact
    // silent failure it exists to close.
    script: {
      casedLetters: script.casedLetters,
      caselessLetters: script.caselessLetters,
      casedShare: script.casedShare,
      gap: script.gap,
      // S92 — see eot-sidecar.mjs's identical field for the fuller account.
      bySentence: scriptBySentence.map((sc) => ({ order: sc.order, dominant: sc.dominant, casedShare: sc.casedShare })),
    },
    reading: {
      sentences: sentences.length,
      surfaces: surfaceEvidence?.length ?? (Array.isArray(surfaceEvidence) ? surfaceEvidence.length : undefined),
      referentEvents: events.length,
      distinctReferents: referentIds.size,
      examined: report.examined ?? null,
      edgesFound: (report.edges ?? []).length,
      extractionError: report.error ?? null,
    },
    spanSelfVerification: {
      checked: spanCheck.checked,
      ok: spanCheck.ok,
      passRate: spanCheck.checked ? spanCheck.ok / spanCheck.checked : null,
      bad: spanCheck.bad.slice(0, 5),
    },
    admission: {
      heard: heard.length,
      turnedAway: turnedAway.length,
      turnedAwayReasons: turnedAway.reduce((acc, t) => { acc[t.reason] = (acc[t.reason] ?? 0) + 1; return acc; }, {}),
      // LP10: "gate clean" and "nothing false got in" are not "most of the
      // document got in" — this is the second, separate question, always
      // computed, never left for a human to hand-derive from raw counts.
      ...admissionCoverage(sentences.length, folded),
    },
    log,
    folded,
    // LP10: one entry per sentence, always — a real proposition or a typed
    // gap, never a silent absence. See propositionLedger's own header.
    propositions: propositionLedger(sentenceSpans, folded, spec.slug, scriptBySentence),
    excerpt,
  };
}

export { loadOrgans, digestOne, excerptOf, stripCatalogBoilerplate, verifySpans, admissionCoverage, propositionLedger, EXCERPT_CHARS, LP_ROOT, DIGEST_DIR, repoState };

// ── the sample manifest ─────────────────────────────────────────────────
//
// A DECLARED sample, not a claim of coverage. Chosen to spread across the
// three requested axes (language/script, audio, image, code) and to be
// SMALL enough that every entry is individually reviewable rather than a
// wall of files nobody will read.
//
// TEXT — languages/scripts. All six read from `wikipedia-lang`, verified
// by direct inspection to actually be in-language content before being
// selected (unlike `gutenberg-non-en`, below). Two are cased Latin
// (fr, tr — real diacritics, real case), one is cased non-Latin (el —
// Greek has case), three are UNCASED scripts (he, ko, fa) chosen
// specifically to test whether `surfaces.js`'s CAP_TOKEN/LOWER_TOKEN gate
// — `\p{Lu}`/`\p{Ll}`, checked directly in eoreader7 native's own source —
// can fire at all where a script has no case distinction.
//
// ONE Gutenberg specimen is kept from `11-multi-language/gutenberg-non-en`
// DESPITE a corpus-integrity finding that makes the rest of that directory
// unusable for "across languages" (see digested/README.md): every one of
// its 20 files' real Project-Gutenberg-declared Title disagrees with its
// path — `pg67098_Die_Verwandlung__Kafka_.txt` is Winnie-the-Pooh; `pg8800
// _De_Rerum_Natura__Lucretius_.txt` is Cary's English Divine Comedy;
// `it/..._Dorian_Gray.txt` is genuinely Dorian Gray but in English, not
// Italian; `la/..._Metamorphoses__Ovid__Latin_.txt` is Kafka's
// Metamorphosis in English, not Ovid's Latin. The one kept here is chosen
// PRECISELY because `declaredIdentity` catches it — reading the file's own
// header rather than trusting its path — which is the point this whole
// pass is making about labels versus bytes, demonstrated rather than
// merely stated.
export const SAMPLE = [
  { slug: "wikipedia-lang/fr/philosophie", kind: "text", path: "11-multi-language/wikipedia-lang/fr/Philosophie.txt", language: "fr", note: "French Wikipedia, Philosophy — Latin script, cased, real diacritics" },
  { slug: "wikipedia-lang/tr/felsefe", kind: "text", path: "11-multi-language/wikipedia-lang/tr/Felsefe.txt", language: "tr", note: "Turkish Wikipedia, Philosophy (felsefe) — Latin script, cased, agglutinative morphology" },
  { slug: "wikipedia-lang/el/socrates-related", kind: "text", path: "11-multi-language/wikipedia-lang/el/_________.txt", language: "el", note: "Greek Wikipedia article (filename lost to non-ASCII stripping upstream; opens on Socrates/epistemology) — Greek script, HAS case" },
  { slug: "wikipedia-lang/he/philosophy", kind: "text", path: "11-multi-language/wikipedia-lang/he/_________.txt", language: "he", note: "Hebrew Wikipedia, Philosophy (based on opening text) — Hebrew script, NO case distinction" },
  { slug: "wikipedia-lang/ko/philosophy", kind: "text", path: "11-multi-language/wikipedia-lang/ko/__.txt", language: "ko", note: "Korean Wikipedia, Philosophy (opens 昒62學/哲學) — Hangul, NO case distinction" },
  { slug: "wikipedia-lang/fa/philosophy", kind: "text", path: "11-multi-language/wikipedia-lang/fa/_____.txt", language: "fa", note: "Farsi Wikipedia, Philosophy (based on opening text) — Arabic script, NO case distinction" },
  // 2026-10-08: the gutenberg-non-en specimen (pg67098, whose path claimed Kafka but whose bytes were Winnie-the-Pooh) was repaired and then REMOVED as a wrong-fetch artifact — see manifests/gutenberg-non-en-fix.json. The demonstration now lives there, not in a kept file.

  { slug: "images-media/nasa-catalog", kind: "catalog", path: "07-images-media/nasa-catalog.txt", language: "en", note: "NASA Image and Video Library — consolidated catalogue, collection: field is not present in this catalogue's own schema" },
  { slug: "images-media/met-museum-catalog", kind: "catalog", path: "07-images-media/met-museum-catalog.txt", language: "en", note: "The Met Open Access Collection — consolidated catalogue" },
  { slug: "audio-music/grateful-dead-catalog", kind: "catalog", path: "10-audio-music/grateful-dead-catalog.txt", language: "en", note: "Internet Archive grateful dead collection — 98.5% of this file's own bytes are the collection: field (Archive.org favourites-list tags), stripped before reading" },
  { slug: "audio-music/classical-music-catalog", kind: "catalog", path: "10-audio-music/classical-music-catalog.txt", language: "en", note: "Internet Archive classical music collection — smaller than grateful-dead's, same schema" },

  { slug: "source-code/rails-readme", kind: "text", path: "09-source-code/rails_rails/README.md", language: "en", note: "rails/rails README.md — real prose about the project, markdown syntax unstripped" },
  { slug: "source-code/flask-quickstart", kind: "text", path: "09-source-code/pallets_flask/docs_quickstart.rst.txt", language: "en", note: "pallets/flask docs/quickstart.rst — real prose documentation, reStructuredText syntax unstripped" },
  { slug: "source-code/flask-app-py-RAW", kind: "text", path: "09-source-code/pallets_flask/src_flask_app.py", language: "en", note: "NEGATIVE CONTROL: raw Python source, not prose. Kept to disclose the boundary honestly — these organs read English sentence structure, not code syntax; whatever edges land here are riding the file's own docstrings and comments, not the code." },
];

// ── batch runner ─────────────────────────────────────────────────────────
async function runBatch() {
  fs.mkdirSync(DIGEST_DIR, { recursive: true });
  const organs = await loadOrgans();
  const index = [];
  for (const spec of SAMPLE) {
    const out = await digestOne(organs, spec);
    const outPath = path.join(DIGEST_DIR, `${spec.slug.replace(/\//g, "__")}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
    const rel = path.relative(LP_ROOT, outPath);
    index.push({
      slug: spec.slug, kind: spec.kind, language: spec.language, path: rel,
      sentences: out.reading.sentences, referents: out.reading.distinctReferents,
      edgesFound: out.reading.edgesFound, heard: out.admission.heard,
      turnedAway: out.admission.turnedAway,
      spanSelfVerifyRate: out.spanSelfVerification.passRate,
      admissionCoverage: out.admission.coverage,
      casedShare: out.script.casedShare,
      scriptGap: out.script.gap?.reason ?? null,
    });
    const gapNote = out.script.gap
      ? `  [${out.script.gap.reason}: only ${(out.script.casedShare * 100).toFixed(1)}% of letters carry case]`
      : "";
    const coveragePct = out.admission.coverage == null ? "n/a" : `${(out.admission.coverage * 100).toFixed(1)}%`;
    console.log(`${spec.slug}: ${out.reading.sentences} sentences, ${out.reading.distinctReferents} referents, ${out.reading.edgesFound} edges found, ${out.admission.heard} heard (${coveragePct} of sentences), spans ${out.spanSelfVerification.ok}/${out.spanSelfVerification.checked}${gapNote} -> ${outPath}`);
  }
  fs.writeFileSync(path.join(DIGEST_DIR, "index.json"), JSON.stringify({ schema: "EOTDigestIndex@1", generatedAt: new Date().toISOString(), sources: index }, null, 1));
  console.log(`\nwrote ${index.length} digests + index.json to ${DIGEST_DIR}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runBatch();
}
