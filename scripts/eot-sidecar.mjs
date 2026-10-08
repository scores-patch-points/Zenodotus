#!/usr/bin/env node
// eot-sidecar.mjs — a Talmudic reading, kept beside its own source.
//
// live_priors/POLICIES.md (LP1-LP5) is the law this answers; the user's own
// instruction (2026-08-29): "pre-read all our priors and have them be
// sidecar .eot files and use this process to improve reading. don't just
// stick bad files in there. we need a good start to their life." Three
// things that instruction names, each answered below rather than assumed:
//
//   SIDECAR, not a shared digested/ directory. `foo.txt` gets `foo.txt.eot
//   .json` beside it — LP2's own frame: "a reading of a source is a record
//   of an encounter with it by a named reader... anchored to a locus,
//   attributed to a reader, accumulating." A reading that lives somewhere
//   else is not anchored to its locus.
//
//   IMPROVE READING. Two real defects this pass's OWN measurement already
//   forced, both closed upstream before this file existed rather than
//   patched around here: `eoreader7/native/adapters/text/spans.js` grew a
//   real invertible `normaliseNewlines` (S26) so a span's address resolves
//   in the SOURCE FILE'S OWN raw coordinates — closing exactly the drift
//   LP3 measured (recorded offset 196, true raw offset 1165) — and
//   `hyperlexicon.js` grew `recipeId` (LP5) so a witness names WHAT READ a
//   source, not only that something did. Anything this sweep flags as an
//   anomaly (a script this reader cannot see, an extraction producing
//   nothing, a span that will not verify) is material for the next pass's
//   adversarial audit — this file's job is to surface those honestly, not
//   to paper over them.
//
//   A GOOD START TO THEIR LIFE, not bad files stuck in. The admission gate
//   below is real: a source whose script this reader cannot see at all gets
//   `gapped_script`, never a fabricated surface count; a source where
//   extraction produced edges but NONE of them verify against the source's
//   own raw bytes gets `gapped_self_verify` and NOTHING is admitted, ever,
//   from an unverified span (P5.2 is a gate here, not a report); a source
//   truly silent to this reader gets `empty`. Every one of those still gets
//   a sidecar — LP4's own rule, "a document with no reading is not a
//   document with nothing in it" — but nothing in it is asserted past what
//   actually verified.
//
// THIS SCRIPT REACHES INTO TWO SIBLING CHECKOUTS, same as eot-digest.mjs:
// `../the-fold` (hyperlexicon.js, hypergraph.js) and `../khora/native`
// (the real linguistic organs). `loadOrgans` is REUSED from eot-digest.mjs
// rather than re-imported a second way — one recipe, one place it is built.
//
// APPEND-ONLY, ACROSS RECIPE CHANGES, WITHOUT OVERWRITING. A second run
// against unchanged source bytes round-trips the existing sidecar's `log`
// (a plain, already-JSON-shaped task-log — `{entries, nextSeq, admits}`,
// nothing to reconstruct) straight into `hl.admit`, with a NEW witness
// string naming THIS run's recipe: `${relPath}@${recipeId}`. A re-sighted
// assertion is SUPERSEDEd with the new witness unioned in (hyperlexicon.js's
// own `hear`); a genuinely new one is PROPOSEd. Nothing is ever replaced.
// If the SOURCE bytes themselves changed (sha256 differs from what the
// sidecar last read), the old log's spans no longer have anything honest
// left to resolve against — so it is archived whole under `priorVersions`
// (append-only across source revisions too, never dropped) and a fresh log
// starts for the new bytes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadOrgans, LP_ROOT, admissionCoverage, propositionLedger } from "./eot-digest.mjs";
import { readingFor } from "./lib/script-words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Declared, not tuned against any golden — task #7's own job is measuring
// real throughput on a real sample before this number is revisited. Kept
// identical to eot-digest.mjs's own EXCERPT_CHARS for now so the two
// drivers agree on what "one reading" costs until that measurement says
// otherwise.
const EXCERPT_CHARS = 8000;

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// The OHCHR UDHR corpus's own fixed four-line header, found reading its
// own bytes rather than assumed from the filename: EVERY one of the 516
// files under 06-government-legal/un-udhr/ opens with the literal line
// "Universal Declaration of Human Rights", then "Language: <name> (<code>)",
// then "Adopted: UN General Assembly resolution 217 A (III), Paris, 10
// December 1948", then "Publisher: Office of the United Nations High
// Commissioner for Human Rights (OHCHR)", then one blank line — byte-
// identical across every language checked, only the Language line's own
// name/code varying. Left unstripped, this English-language block is
// exactly the "cased debris" surfaces.js's own header already warns a
// caseless script produces: on a real read of the Georgian translation,
// EVERY ONE of the 18 candidate surfaces extractSurfaces found ("Human
// Rights", "UN General Assembly", "Paris"...) came from this header —
// zero from the document's own 106 sentences of real Georgian prose — a
// small but real contamination present on every one of the 516 reads,
// the same class of defect P5.3 (stripContainer, Gutenberg's own licence
// text) already closed for a different container shape. Offset-carrying,
// matching stripContainer's own shape, not blankCatalogLines's length-
// preserving one: the header sits at the very start, so a caller that
// drops it outright (rather than blanking it to spaces) also stops
// spending excerptChars budget on four lines that are never the
// material. Anchored to the exact literal text, not a length or a line
// count, so it is a safe no-op on every file outside this one corpus —
// checked directly: no other digested source in this repo opens with
// this literal string.
const UDHR_HEADER_RE =
  /^Universal Declaration of Human Rights\nLanguage:[^\n]*\(([a-zA-Z0-9-]+)\)\nAdopted: UN General Assembly resolution 217 A \(III\), Paris, 10 December 1948\nPublisher: Office of the United Nations High Commissioner for Human Rights \(OHCHR\)\n\n?/;
// The header's own trailing "(code)" is ISO 639-1 for most files (checked
// directly: udhr-rus.txt's own Language line reads "Russian (ru)",
// udhr-fin.txt reads "Finnish (fi)") even though this corpus's own
// FILENAMES are ISO 639-3 (un-udhr/udhr-rus.txt) — a real, disclosed
// mismatch between the two naming conventions this corpus mixes, not a
// typo. Some variant lines carry a SECOND parenthetical before the code
// ("Language: German, Standard (1901) (de-1901)") — `[a-zA-Z0-9-]+`
// (digits included; a bare `[a-zA-Z-]+` silently stopped matching BOTH
// German variant files' own header, checked against all 516 files before
// and after this widening, zero regressions either way) plus the regex's
// own greedy-then-backtrack order means the LAST parenthesized group on
// the line is what gets captured, which is always the code. `language` is
// that raw code, lowercased, exactly as the header states it — mapping it
// to anything (a POS/declension prior's own 3-letter key) is the
// CALLER's job, never guessed here.
function stripUdhrHeader(text) {
  const s = String(text ?? "");
  const m = s.match(UDHR_HEADER_RE);
  if (!m) return { text: s, offset: 0, language: null };
  return { text: s.slice(m[0].length), offset: m[0].length, language: m[1].toLowerCase() };
}

// A length-PRESERVING version of eot-digest.mjs's stripCatalogBoilerplate.
// That function's own replacement text is a different length than the line
// it replaces, which is fine for a driver that reads a fresh excerpt every
// time and never needs the offset to survive — it is NOT fine here, where
// every downstream span must resolve back to this exact file's own raw
// bytes. Blanking to the SAME length keeps every later offset — this
// function's own output, `normaliseNewlines`'s toRaw, an extracted span —
// pointing at the true byte position in the real file, at the cost of
// leaving the blanked region as spaces rather than a human-readable note
// (which the disclosed `catalogBlankedChars` count exists to give back).
// Safe and a no-op on any file with no `collection:` line, which is every
// file outside the small audio/image catalogue slice of this corpus.
function blankCatalogLines(text) {
  let blanked = 0;
  const out = text.replace(/^collection:.*$/gm, (line) => {
    blanked += line.length;
    return " ".repeat(line.length);
  });
  return { text: out, blankedChars: blanked };
}

function verifyExcerptSpan(excerpt, s) {
  return excerpt.slice(s.start, s.end) === s.text;
}

// P5.2 applied at the one tier that matters for a sidecar: the address this
// file ships has to resolve in the SOURCE'S OWN raw bytes, not merely in
// the excerpt this run happened to build. `toRaw` (S26) composes the
// container-strip offset with the newline-normalisation map; reapplying the
// SAME normalisation to the raw slice (rather than bare string equality) is
// spans-normalise.test.js's own lesson — a span straddling an embedded CRLF
// legitimately still carries \r\n in the raw file.
//
// A SECOND transformation happens downstream of this check, worth naming
// so a future reader re-verifying a PERSISTED span does not repeat the
// confusion investigating this once cost: `hyperlexicon.js::admit`'s own
// span mapping collapses internal whitespace (`text.replace(/\s+/g, "
// ").trim()`) — because `pushSentence` (eoreader7 native's spans.js) only
// `.trim()`s a sentence's own text and never reflows an embedded line
// wrap, a long sentence crossing a raw line break (e.g. Les Misérables'
// own "...as\r\nMademoiselle...") still carries that literal newline
// through hypergraph.js's own extraction, all the way to THIS check —
// which is exactly right, since `s.text` here and `reslice` below are
// BOTH pre-collapse and directly comparable. Only the text hl.admit()
// later PERSISTS has already had that newline collapsed to a space —
// checked once by hand and confirmed CORRECT (not a bug: the collapse is
// deterministic and applied identically on both sides at admission time,
// so equal pre-collapse strings stay equal after it), but a reader
// diffing a committed sidecar's OWN stored text against a bare raw slice
// must collapse whitespace on the raw side first, or a real, byte-correct
// address will look like a mismatch that never happened.
function verifyRawSpan(raw, bodyOffset, toRaw, s) {
  const rawStart = bodyOffset + toRaw(s.start);
  const rawEnd = bodyOffset + toRaw(s.end);
  const { normaliseNewlines } = globalThis.__eotSidecarSpans;
  const reslice = normaliseNewlines(raw.slice(rawStart, rawEnd)).text;
  return { ok: reslice === s.text, rawStart, rawEnd };
}

/**
 * Read one source, accumulate its sidecar. Pure with respect to the
 * filesystem in one direction only (reads `absPath` and any existing
 * sidecar; the caller decides whether to write the result) so this is
 * callable from a throughput-measuring driver without committing to disk.
 */
async function readSidecar(organs, absPath, { excerptChars = EXCERPT_CHARS, fresh = false } = {}) {
  const {
    spans, surfaces, relationsForLang, sameStemFor, posGateFor, normalizeLangCode,
    hl, stripContainer, declaredIdentity, repoStates,
    classifyConnector, mismatchedConnectors, posPriorLoaded, GRAMMAR_MIN_SHARE,
    makeHyperlexicon, makeReferentIndex, taskLog, cube,
  } = organs;
  globalThis.__eotSidecarSpans = spans; // verifyRawSpan's own closure, avoiding a second import path

  const relPath = path.relative(LP_ROOT, absPath).split(path.sep).join("/");
  const raw = fs.readFileSync(absPath, "utf8");
  const hash = sha256(raw);

  const sidecarPath = `${absPath}.eot.json`;
  // `fresh: true` — a deliberate, disclosed corpus-wide re-read, never a
  // silent one. LP2's own append-only design ("a recipe that hears nothing
  // appends nothing... a refuted reading is CONCEDED, never deleted") means
  // an ordinary re-run of --scan on UNCHANGED source bytes reuses the
  // existing log and only APPENDS — so a recipe change that REMOVES false
  // admissions (the POS vocabulary gate, this same pass) can only ever grow
  // the corpus's own contamination, never correct it, without this escape
  // hatch. Confirmed live before this was added: Alice's Adventures in
  // Wonderland's sidecar, swept once before the gate existed, still carried
  // "to" as an admitted relation verb after a second --scan pass with the
  // gate wired in — the gate ran correctly on THIS read (verified: `to`
  // never entered the fresh vocabulary), but the STALE pre-gate admission
  // from the earlier sweep survived because append-only NEVER revisits an
  // already-admitted fact absent an explicit REC. `fresh` treats the whole
  // corpus's prior sweep as the thing being conceded — an honest, one-time,
  // disclosed reset when the RECIPE itself was the defect, not a routine
  // mode this driver reaches for.
  let existing = null;
  if (!fresh && fs.existsSync(sidecarPath)) {
    try { existing = JSON.parse(fs.readFileSync(sidecarPath, "utf8")); }
    catch (err) { existing = { corrupt: true, error: String(err?.message ?? err) }; }
  }

  const { text: gutenbergStripped, offset: gutenbergOffset } = stripContainer(raw);
  const { text: rawBody, offset: udhrOffset, language: udhrLanguage } = stripUdhrHeader(gutenbergStripped);
  const containerOffset = gutenbergOffset + udhrOffset;

  // Per-document language selection (S38): only the UDHR corpus's own
  // fixed header names a document's language here — everything else this
  // walker reads (Gutenberg novels, Wikipedia, legislation) has no such
  // signal available to this function, and falls through to English
  // exactly as the pre-existing single-language behaviour did. That is a
  // real, disclosed scope boundary, not an oversight: `posGate`/`sameStem`
  // below report which language's prior (if any) actually applied.
  const lang = udhrLanguage ?? "en";
  const relationsFor = relationsForLang(lang);
  const sameStem = sameStemFor(lang);
  const posGate = posGateFor(lang);

  /**
   * One candidate reading window — everything from blanking through
   * self-verification, for a GIVEN starting point inside the stripped
   * body. Factored out so a front-matter skip can be tried and, crucially,
   * COMPARED against the flat prefix rather than trusted unconditionally.
   */
  function attemptWindow(candidateBody, candidateOffset) {
    const { text: blanked, blankedChars } = blankCatalogLines(candidateBody);
    const excerptWindow = blanked.slice(0, excerptChars);
    // blankCatalogLines pads a whole "collection:..." line to SPACES, so a
    // blanked line's own signature within the excerpt is simply a line made
    // ENTIRELY of one-or-more space characters — a shape ordinary prose
    // does not produce (a blank prose paragraph break is a zero-length
    // line, "\n\n", never a line full of literal spaces).
    const excerptBlankedChars = [...excerptWindow.matchAll(/^ +$/gm)].reduce((n, m) => n + m[0].length, 0);
    const { text: excerpt, toRaw } = spans.normaliseNewlines(excerptWindow);
    const truncated = blanked.length > excerptChars;
    const catalogDominated = excerptWindow.length > 0 && excerptBlankedChars / excerptWindow.length > 0.5;

    const sentences = spans.splitSentences(excerpt);
    // Raw-file-coordinate twin of `sentences`, computed HERE because this is
    // the one place `candidateOffset`/`toRaw` are both in scope — the SAME
    // bodyOffset+toRaw(...) transform verifyRawSpan already applies to
    // admitted-edge spans below, applied to sentence boundaries too, so the
    // two sides `propositionLedger` compares are addressed identically.
    // Bug this closes: `sentences[].offset` is excerpt-local while every
    // edge this driver admits is translated to raw-file bytes before
    // hl.admit() ever sees it (P5.2 self-verification against the real
    // file), so comparing them unconverted read 0.0% coverage and every
    // sentence a false gap on a document that actually had 5 real edges.
    const sentenceSpans = sentences.map((s) => ({
      order: s.order,
      start: candidateOffset + toRaw(s.offset),
      end: candidateOffset + toRaw(s.offset + s.text.length),
    }));
    // Folded ONCE, fed to both: scriptCoverage's third gap boundary needs
    // the exact same capitalised-run walk extractSurfaces performs to ask
    // its own question, and extractSurfaces itself is already split into
    // this accumulate/project shape for precisely this reason (surfaces.js's
    // own header). Two separate calls would walk every sentence twice.
    const evidence = surfaces.accumulateSurfaceEvidence(sentences, surfaces.createSurfaceEvidence());
    const script = surfaces.scriptCoverage(sentences, { evidence });
    // S92: the SAME per-character cased/caseless test as `script` above,
    // computed per sentence instead of folded across the whole window —
    // what a document mixing scripts (English + Mandarin) needs, since
    // `script` alone would just average the two into one "mostly cased"
    // share and hide which sentences are Han at all.
    const scriptBySentence = surfaces.scriptCoverageBySentence(sentences);
    const surfaceEvidence = surfaces.surfacesFromEvidence(evidence);
    const { events } = surfaces.discoverReferents(surfaceEvidence, { sameStem });
    const referentIds = new Set(events.map((e) => e.referent_id));

    const passage = { ref: relPath, text: excerpt };
    let report;
    try { report = relationsFor([passage], { pool: [passage] }); }
    catch (err) { report = { edges: [], examined: 0, error: String(err?.message ?? err) }; }

    const rawEdges = report.edges ?? [];
    let excerptChecked = 0, excerptOk = 0, rawChecked = 0, rawOk = 0;
    const badSpans = [];
    const admitEdges = [];
    for (const e of rawEdges) {
      const verifiedSpans = [];
      for (const s of e.spans ?? []) {
        excerptChecked += 1;
        const excerptGood = verifyExcerptSpan(excerpt, s);
        if (excerptGood) excerptOk += 1;
        rawChecked += 1;
        const { ok: rawGood, rawStart, rawEnd } = verifyRawSpan(raw, candidateOffset, toRaw, s);
        if (rawGood) {
          rawOk += 1;
          verifiedSpans.push({ ref: relPath, start: rawStart, end: rawEnd, text: s.text });
        } else {
          badSpans.push({ edge: `${e.end1 ?? e.subject} —${e.label ?? e.verb}→ ${e.end2 ?? e.object}`, excerptSpan: s, excerptGood, rawGood: false });
        }
      }
      // the-fold P76 (2026-09-02) renamed makeRelationReader's edge fields
      // subject/verb/object -> end1/label/end2 (arrangementOf); this line
      // read the old names straight off the new edges and silently built
      // {subject: undefined, verb: undefined, object: undefined} on every
      // edge, every document, ever since — 100% "incomplete" at admission,
      // masked by `admission.gate` still reporting "clean" because nothing
      // here raised an error. eot-digest.mjs's own digestOne already carries
      // this exact fallback (see its comment there, dated at the fix); it
      // was never ported to this sibling script. Found 2026-09-09 because
      // "I Love My Mom"'s sidecar came back with 0 heard, 0 log entries, 0
      // folded propositions, and the user asked "wtf is this, there's no
      // text read" — correctly, since there wasn't.
      if (verifiedSpans.length) admitEdges.push({ subject: e.end1 ?? e.subject, verb: e.label ?? e.verb, object: e.end2 ?? e.object, spans: verifiedSpans });
    }

    // DISCLOSURE ONLY — see loadOrgans's own comment for why this never
    // gates admission. Computed over the raw (pre-self-verification)
    // edges: a connector's grammatical standing is a fact about the
    // TEXT, independent of whether its span happened to survive the
    // separate byte-address check above.
    const grammar = posGate.classifyConnector
      ? { checked: rawEdges.length, minShare: GRAMMAR_MIN_SHARE, mismatched: mismatchedConnectors(rawEdges, posGate.classifyConnector, { minShare: GRAMMAR_MIN_SHARE }).map((m) => ({ subject: m.edge.end1 ?? m.edge.subject, verb: m.edge.label ?? m.edge.verb, object: m.edge.end2 ?? m.edge.object, thraxClass: m.classification.thraxClass })) }
      : null;

    return {
      bodyOffset: candidateOffset, body: candidateBody, blankedChars, excerpt, truncated, catalogDominated, grammar,
      sentences, sentenceSpans, script, scriptBySentence, surfaceEvidence, events, referentIds, report, rawEdges,
      excerptChecked, excerptOk, rawChecked, rawOk, badSpans, admitEdges,
    };
  }

  // A table of contents (or other short-unterminated-line front matter) can
  // outrun a flat excerpt window entirely — task #9's own adversarial audit,
  // the specimen it was built and verified against is a Gutenberg-mirrored
  // Les Misérables whose TOC runs to ~char 21,600, past this driver's own
  // 8000-char window, extracting zero edges from a book that has hundreds.
  const frontMatter = spans.detectFrontMatterRun(rawBody);

  const flatAttempt = attemptWindow(rawBody, containerOffset);
  let attempt = flatAttempt;
  let frontMatterUsed = false;
  if (frontMatter.detected) {
    // Detecting a TOC-shaped run is not the same as knowing the skip
    // HELPS — found live, not assumed: several corpus specimens (APiCS
    // survey chapters especially) already read cleanly from a flat prefix
    // BECAUSE their real prose starts early enough, and the front-matter
    // scanner can still find a LATER, coincidentally-qualifying run
    // deeper in the document (an examples list, a references section)
    // and jump there — landing on a region with FEWER real edges than the
    // window it left behind. Never trust the skip unconditionally: run
    // both candidates and keep whichever one actually reads better. A
    // skip is used only when it does not cost edges relative to the flat
    // prefix — ties keep the skip, since a real TOC WAS found and skipping
    // past it is the more correct choice when the two are otherwise equal.
    const skippedAttempt = attemptWindow(rawBody.slice(frontMatter.skipTo), containerOffset + frontMatter.skipTo);
    if (skippedAttempt.rawEdges.length >= flatAttempt.rawEdges.length) {
      attempt = skippedAttempt;
      frontMatterUsed = true;
    }
  }

  const {
    bodyOffset, body, blankedChars, excerpt, truncated, catalogDominated, grammar,
    sentences, sentenceSpans, script, scriptBySentence, surfaceEvidence, events, referentIds, report, rawEdges,
    excerptChecked, excerptOk, rawChecked, rawOk, badSpans, admitEdges,
  } = attempt;

  const identity = declaredIdentity(relPath, raw);

  // Script gate FIRST, before admission is even attempted — a caseless
  // script means every candidate surface this pass found is unreliable by
  // construction (surfaces.js's own scriptCoverage, S24), so nothing from
  // it should be OFFERED, not merely turned away one edge at a time.
  let gate;
  let effectiveAdmitEdges = admitEdges;
  let scriptPrior = null;
  if (script.gap) {
    gate = "gapped_script";
    effectiveAdmitEdges = [];
    // The per-script remedy the constitution names (II.13): a language's own
    // prior supplies the tokenisation — NOT a generic substitute, but the
    // token inventory a human-annotated UD treebank (or UniMorph) actually
    // produced, with that treebank as the giver. If a POSPrior exists for this
    // file's declared language, segment+tag by its own vocabulary and READ,
    // recording coverage, rather than only reporting the gap.
    const code = organs.normalizeLangCode?.(identity?.language || (raw.match(/^language:\s*([^\n]+)/m) || [])[1]?.trim() || "") || "";
    const prior = organs.posGateFor?.(code)?.posPrior ?? null;
    if (prior) {
      const sr = readingFor(body, prior);
      if (sr.total >= 20 && sr.coverage >= 0.25) {
        gate = "script_prior";
        scriptPrior = { script: sr.script, tokens: sr.total, matched: Math.round(sr.matched), coverage: +sr.coverage.toFixed(4), giver: sr.giver };
      }
    }
  } else if (rawEdges.length === 0) {
    gate = "empty";
  } else if (admitEdges.length === 0) {
    gate = "gapped_self_verify";
  } else {
    gate = "clean";
  }

  const recipe = {
    engine: "eoreader7/native (adapters/text, kernel/task-log.js, kernel/cube.js)",
    determiners: "priors.js DEFINITE_DETERMINERS + INDEFINITE_DETERMINERS (giver lang/en, the-fold P41)",
    negationWords: "priors.js NEGATION_WORDS (giver lang/en, the-fold P43)",
    language: lang,
    posPriorGate: posGate.loaded
      ? `hypergraph.js::makeRelationReader posPriorFor -> relations.js::discoverRelationVocab's own posPrior param (giver Universal Dependencies, native/priors/pos-${normalizeLangCode(lang)}.json, CC BY-SA 4.0) — TYPE-level vocabulary gate: verbShare > 0.5 across attested uses admits, an unattested form is NOT refused, ACTIVE at vocabulary discovery (before extractRelations runs)`
      : `omitted — no POSPrior@1 build for language "${lang}" (normalized "${normalizeLangCode(lang)}") in this environment`,
    classifyConnector: posGate.loaded
      ? `wordclass.js dominantClass (giver Universal Dependencies, CC BY-SA 4.0) — minShare ${GRAMMAR_MIN_SHARE}, per-EDGE DISCLOSURE ONLY, never gates admission (see posPriorGate above for the vocabulary-level gate, which is a different mechanism and IS active)`
      : null,
    // eo-constitution Article III.4 (18th amendment, 2026-09-01): the
    // recipe descriptor is what recipeId hashes, so a field silently
    // absent here makes two genuinely different recipes hash IDENTICALLY
    // — exactly the failure this pass found and closed. resolvePronouns
    // went from unimported to wired in this same pass; it MUST appear
    // here or every reading taken before and after would be
    // indistinguishable by recipe id, which is LP5's whole reason to
    // exist.
    resolvePronouns: "eoreader7/native adapters/text/pronouns.js resolvePronouns — kernel/activation.js one-hop recall through kernel/contest.js co-presence veto (minActivation/minMargin at PRONOUN_MIN_ACTIVATION/PRONOUN_MIN_MARGIN, hypergraph.js's own declared floor, unvalidated against a golden — see hypergraph.js header)",
    thirdPersonSingular: "priors.js THIRD_PERSON_SINGULAR (giver lang/en)",
    // Flipped true 2026-09-01 (loadOrgans' own measured defaults — see its
    // header for the debris table). In the descriptor for LP5's reason:
    // a reading with full-NP subjects and one with bare-anchor subjects
    // are different readings and must never share a recipe id.
    nounPhraseSubjects: organs.nounPhraseSubjects,
    phrasalPredicates: organs.phrasalPredicates,
    verbForms: null,
    createLemmatizer: null,
    // Every organ makeRelationReader accepts that this recipe does NOT
    // pass, named with a real reason — the exact object
    // eo-constitution/conformance/composition.test.mjs parses out of
    // eot-digest.mjs to verify the composition is honest about its own
    // omissions. Carried into every sidecar too, not only the source
    // file, so a reader of ONE reading (not the recipe file) can see
    // what this pass chose not to hear without cross-referencing a
    // second repository.
    unionOmitted: {
      blankFurniture: "real bug, 2026-09-01 — see eo-constitution/claims/blank-furniture-sentence-drift.claim.json",
      verbForms: "available and measured (319->737 edges on a 10-file sample) but withheld — widens recall rather than closing a false binding, a separate decision from wiring activation",
      createLemmatizer: "available but not yet paired with a lemma index verified against this corpus's own vocabulary",
      morphologyIndex: "no organ produces this shape on any engine path today",
      morphologyLanguage: "unused while morphologyIndex is unset",
      classifyConnector: "loaded above for a DIFFERENT call site (disclosure-only, P56); not re-wired here as makeRelationReader's own accepted organ under this name without checking that distinction first",
      minShare: "moot while classifyConnector is unset above",
      extractLeadingSurfaces: "no organ under this name exists on the native adapters/text/surfaces.js path as of this pass",
      casePrior: "Latin case-marking prior — this reader is makeRelationReader, the English positional reader, not makeCaseMarkedRelationReader",
      extractCaseMarkedRelation: "same reason as casePrior",
    },
    sameStem: sameStem
      ? `declension-${normalizeLangCode(lang)}.json (giver UniMorph, CC BY-SA 3.0) — widens namesCorefer past exact-token comparison, pairwise only (see eoreader7 native/adapters/text/declension.js's own header for why)`
      : `omitted — no declension prior for language "${lang}" (normalized "${normalizeLangCode(lang)}") in this environment`,
    excerptChars,
    // The exact commit of every repo whose code ran to produce this
    // reading — folded into the descriptor itself (not just disclosed
    // alongside it) so recipeId's own hash changes the moment any of
    // them do. A prose description of "which organs ran" (the fields
    // above) stays identical across a code change that alters what those
    // organs actually DO — this session's own S26/S27/ATX-heading-fix
    // sequence in eoreader7 proves it: three different behaviors, one
    // unchanged prose recipe, until this field is added.
    provenance: repoStates,
  };
  const recipeIdValue = await hl.recipeId(recipe);
  const witness = `${relPath}@${recipeIdValue}`;

  // ── append-only across runs, honest across source revisions ───────────
  let log;
  let priorVersions = existing?.priorVersions ?? [];
  if (existing && !existing.corrupt && existing.source?.sha256 === hash) {
    log = existing.log; // plain {entries, nextSeq, admits} — round-trips as-is
  } else if (existing && !existing.corrupt && existing.source?.sha256 !== hash) {
    // The bytes underneath this reading changed. The old log's spans no
    // longer have anything honest to resolve against, so it is archived
    // whole (append-only across revisions, never dropped) and a fresh log
    // starts for the new bytes.
    priorVersions = [...priorVersions, {
      source: existing.source, recipe: existing.recipe, lastRun: existing.lastRun,
      log: existing.log, supersededAt: new Date().toISOString(),
    }];
    log = hl.createHyperlexicon();
  } else {
    log = hl.createHyperlexicon();
  }

  // eo-constitution Article III.4 (18th amendment) — the user's own
  // direct question, 2026-09-01: "should the jsonl be about tokens or
  // about the system's revisable thoughts about the referents of the
  // tokens?" Answer, built here rather than only argued: BOTH, kept as
  // two distinct grains, never collapsed. The SPAN (`at`, below) is the
  // token — a byte range, cheap to recover any time, immutable. What is
  // worth an append-only ledger is the REVISABLE CLAIM about what a
  // subject/object string NAMES — hyperlexicon.js's own `noteIdentity`
  // socket, undwired since it was written (its own header: "the
  // production organ... is the named next wiring, not built here").
  //
  // Built from `events` — this SAME window's own `discoverReferents`
  // output, already computed above for the reading's own report, never
  // re-run — through cast.js's `resolve`/`represent` (the SAME organ
  // hypergraph.js uses internally for endpoint resolution, so identity
  // here cannot drift from what the reader itself already trusted).
  // AMBIGUOUS RESOLUTION REFUSES rather than guesses (P38: "an ambiguous
  // bare form is a typed gap with candidates, never a third being") — a
  // subject/object that resolves to zero or more-than-one referent falls
  // back to its own normalised surface, exactly hyperlexicon.js's
  // documented default-path behaviour when no organ is injected at all.
  // A common-noun subject ("the council") never resolves and always
  // takes this fallback — this identity organ folds NAMES, not every
  // noun phrase.
  //
  // SCOPED TO THIS FILE, REBUILT EVERY CALL: coreference is passage-
  // scoped (cast.js's own referent index is built fresh per call for
  // exactly this reason — carrying it across documents would fold two
  // different Aristotles into one). A shared, corpus-wide `hl` (as
  // eot-digest.mjs's own loadOrgans still builds, for its recipe-id use
  // only) would either compute nothing usable here or, worse, leak
  // identity across files; a per-file `hl` avoids both.
  const referentIndex = makeReferentIndex(organs)([{ ref: relPath, text: excerpt }]);
  const foldSurface = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const noteIdentity = (subject, verb, object) => {
    const canon = (s) => {
      const ids = referentIndex.resolve(String(s ?? ""));
      if (ids.size === 1) {
        const face = referentIndex.represent([...ids][0]);
        if (face) return foldSurface(face);
      }
      return foldSurface(s);
    };
    return { subject: canon(subject), verb: foldSurface(verb), object: canon(object) };
  };
  const hlForFile = makeHyperlexicon({ ...taskLog, cellOf: cube.cellOf, noteIdentity });

  const { log: nextLog, heard, turnedAway } = hlForFile.admit(log, effectiveAdmitEdges, { witness });
  log = nextLog;
  const folded = hlForFile.foldHyperlexicon(log);

  const sidecar = {
    schema: "EOTReading@1",
    source: { path: relPath, sha256: hash, bytes: raw.length, declaredIdentity: identity },
    recipe: { id: recipeIdValue, descriptor: recipe },
    excerpting: {
      fullChars: raw.length, bodyOffset, bodyChars: body.length,
      // `detected` and `used` are disclosed SEPARATELY on purpose: a front-
      // matter run can be genuinely detected and still correctly declined
      // (frontMatterUsed: false) when the flat prefix already reads at
      // least as well — collapsing the two into one boolean would hide
      // exactly the comparison that decided this reading.
      frontMatter: frontMatter.detected ? { detected: true, skipTo: frontMatter.skipTo, runLength: frontMatter.runLength, used: frontMatterUsed } : { detected: false },
      catalogBlankedChars: blankedChars || undefined,
      catalogDominated: catalogDominated || undefined,
      excerptChars: excerpt.length, truncated,
    },
    script: {
      casedLetters: script.casedLetters, caselessLetters: script.caselessLetters, casedShare: script.casedShare, gap: script.gap,
      // S92: per-sentence cased/caseless dominance — see surfaces.js
      // ::scriptCoverageBySentence's own header for scope (script
      // detection, not language identification) and READING-SPEC.md S92
      // for the mixed-script fixture this is checked against. `null`
      // casedShare/`dominant` means that one sentence had no letters at
      // all — never coerced into a bucket it was never evidence for.
      bySentence: scriptBySentence.map((sc) => ({ order: sc.order, dominant: sc.dominant, casedShare: sc.casedShare })),
    },
    reading: {
      sentences: sentences.length,
      surfaces: Array.isArray(surfaceEvidence) ? surfaceEvidence.length : null,
      referentEvents: events.length,
      distinctReferents: referentIds.size,
      examined: report.examined ?? null,
      edgesFound: rawEdges.length,
      extractionError: report.error ?? null,
      // hypergraph.js::relationsFor's own vocabulary.candidates (task #9's
      // adversarial audit, the SBLGNT — Greek New Testament critical-
      // apparatus format — specimen): how many tokens discoverRelationVocab
      // NOMINATED as candidate verbs, before any recurrence floor OR the
      // POS gate. Under a run with posPriorGate loaded (see recipe
      // .descriptor.posPriorGate), `candidates` counts every token that
      // followed a recurring surface REGARDLESS of POS — `vocabulary.verbs`
      // is now the narrower, POS-gated survivor count, so the two GENUINELY
      // DIVERGE (measured: Alice's Adventures in Wonderland, 8000-char
      // excerpt, candidates=24 / verbs=9 with the gate on) — this was
      // previously claimed to always be equal under MIN_SURFACES_PER_VERB=1;
      // that claim held only while no posPrior was passed to
      // discoverRelationVocab, which is no longer this recipe's
      // configuration. Without a loaded POSPrior@1 fixture (posPriorLoaded
      // false), the old equality still holds — degrading byte-identically
      // to prior behaviour. Surfaced for transparency either way; the
      // actual distinguishing signal for "nothing to hear" vs. "heard
      // something, none of it cleared a floor" for THIS pipeline is
      // `contentWithoutRelations` below.
      vocabulary: report.vocabulary ?? null,
      // The genuine disclosure task #9 was chasing: real linguistic content
      // (a surface or a referent) was found, but the relation tier heard
      // nothing — an apparatus/table/record-block shape, not silence. This
      // is what tells a reader "SBLGNT-shaped" apart from "this document is
      // actually empty," using fields already computed above rather than a
      // new mechanism.
      contentWithoutRelations: (events.length > 0 || (Array.isArray(surfaceEvidence) && surfaceEvidence.length > 0)) && rawEdges.length === 0,
      // Real POS evidence (Universal Dependencies UD_English-EWT via
      // wordclass.js's dominantClass), DISCLOSURE ONLY — never used to
      // refuse an edge at admission (P56's own asymmetric rule: a part of
      // speech is a candidate set, never a per-occurrence verdict; settled
      // means refusable, never confirmable, and this driver never asks it
      // to refuse anything). `null` when the local treebank fixture was
      // never built (a real, disclosed absence — see recipe.descriptor
      // .classifyConnector); every entry in `mismatched` names an edge
      // whose connector settles, at a bare majority, as something OTHER
      // than a verb — evidence for a LATER reasoning step to weigh, not a
      // conviction against anything already heard.
      grammar,
    },
    spanSelfVerification: {
      excerptChecked, excerptOk,
      rawChecked, rawOk,
      rawPassRate: rawChecked ? rawOk / rawChecked : null,
      bad: badSpans.slice(0, 5),
    },
    admission: {
      gate,
      offered: effectiveAdmitEdges.length,
      heard: heard.length,
      turnedAway: turnedAway.length,
      turnedAwayReasons: turnedAway.reduce((acc, t) => { acc[t.reason] = (acc[t.reason] ?? 0) + 1; return acc; }, {}),
      suppressedByScriptGap: script.gap ? admitEdges.length : 0,
      // A prior-driven token read for a caseless script the capitalisation
      // organ cannot see (script-words.mjs). Present only when gate ===
      // "script_prior"; the giver is the language's own UD treebank.
      ...(scriptPrior ? { scriptPrior } : {}),
      // LP10: `gate` answers "did anything false get in" — this answers
      // the separate question "how much of the document got a chance to
      // get in at all," always computed, never left implicit in a raw
      // edge count next to a sentence count nobody compared it to.
      ...admissionCoverage(sentences.length, folded),
    },
    log,
    folded,
    // LP10: one entry per sentence, always — a real proposition or a typed
    // gap, never a silent absence. See propositionLedger's own header.
    propositions: propositionLedger(sentenceSpans, folded, relPath, scriptBySentence),
    lastRun: { recipeId: recipeIdValue, at: new Date().toISOString() },
    ...(priorVersions.length ? { priorVersions } : {}),
  };

  return { sidecar, sidecarPath };
}

async function processFile(organs, absPath, { write = true, excerptChars, fresh = false } = {}) {
  const { sidecar, sidecarPath } = await readSidecar(organs, absPath, { excerptChars, fresh });
  if (write) fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 1));
  return sidecar;
}

function shouldSkip(relPath) {
  // Machinery this corpus's own toggle-walk already excludes (P19's
  // priors-toggles.js) — mirrored here rather than re-derived, because a
  // sidecar has no business existing beside the corpus's own scripts,
  // manifests, or its own record of prior readings.
  const first = relPath.split("/")[0];
  if (["scripts", "manifests", "digested", "derived-priors", "goldens", "src", ".git", "node_modules"].includes(first)) return true;
  if (relPath.endsWith(".eot.json")) return true;
  return false;
}

function walkCorpus(root = LP_ROOT) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (shouldSkip(rel)) continue;
      if (entry.isDirectory()) { stack.push(abs); continue; }
      if (/\.(txt|md)$/i.test(entry.name)) out.push(abs);
    }
  }
  return out.sort();
}

export { readSidecar, processFile, walkCorpus, blankCatalogLines, stripUdhrHeader, sha256, EXCERPT_CHARS };

// ── CLI ─────────────────────────────────────────────────────────────────
// `node eot-sidecar.mjs <path> [<path> ...]`  — one or more specific files
// `node eot-sidecar.mjs --scan`               — every text/md file in the corpus
// `--fresh` (with either form) — see readSidecar's own comment on `fresh`:
// ignores an existing sidecar's log entirely rather than appending to it.
// A deliberate, disclosed corpus-wide re-read, for when the RECIPE itself
// was the defect (a false-admission bug fixed, not new material to layer
// on top of) — never the routine mode.
// `--excerpt-chars=N` — override EXCERPT_CHARS for this run only. The flat
// 8000-char budget exists to keep a corpus-wide `--scan` cheap on
// novel-length sources, not as a correctness gate — a deliberately short
// specimen (a single extracted chapter, a fable) built specifically to be
// read in full is exactly the case this override is for. Left off, nothing
// about the default behavior changes.
if (import.meta.url === `file://${process.argv[1]}`) {
  const rawArgs = process.argv.slice(2);
  const excerptFlag = rawArgs.find((a) => a.startsWith("--excerpt-chars="));
  const excerptChars = excerptFlag ? Number(excerptFlag.slice("--excerpt-chars=".length)) : undefined;
  const args = rawArgs.filter((a) => a !== "--fresh" && !a.startsWith("--excerpt-chars="));
  const fresh = rawArgs.includes("--fresh");
  const organs = await loadOrgans();
  let targets;
  if (args[0] === "--scan") {
    targets = walkCorpus();
    console.log(`scanning ${targets.length} files under ${LP_ROOT}${fresh ? " (--fresh: ignoring existing sidecars)" : ""}`);
  } else if (args.length) {
    targets = args.map((a) => path.resolve(a));
  } else {
    console.log("usage: node eot-sidecar.mjs <path> [<path> ...] | --scan [--fresh] [--excerpt-chars=N]");
    process.exit(1);
  }
  let clean = 0, gappedScript = 0, gappedSelfVerify = 0, empty = 0, scriptPriorN = 0;
  const cleanCoverages = []; // LP10: coverage among CLEAN-gated sources specifically — "clean" alone was the false signal
  const scriptPriorCoverages = [];
  const started = Date.now();
  for (const abs of targets) {
    const t0 = Date.now();
    const out = await processFile(organs, abs, { fresh, excerptChars });
    const ms = Date.now() - t0;
    const rel = path.relative(LP_ROOT, abs);
    if (out.admission.gate === "clean") { clean += 1; if (out.admission.coverage != null) cleanCoverages.push(out.admission.coverage); }
    else if (out.admission.gate === "script_prior") { scriptPriorN += 1; if (out.admission.scriptPrior?.coverage != null) scriptPriorCoverages.push(out.admission.scriptPrior.coverage); }
    else if (out.admission.gate === "gapped_script") gappedScript += 1;
    else if (out.admission.gate === "gapped_self_verify") gappedSelfVerify += 1;
    else empty += 1;
    const coveragePct = out.admission.coverage == null ? "n/a" : `${(out.admission.coverage * 100).toFixed(1)}%`;
    const sp = out.admission.scriptPrior ? `, script-prior ${(out.admission.scriptPrior.coverage * 100).toFixed(1)}% of ${out.admission.scriptPrior.tokens} tokens (${out.admission.scriptPrior.script})` : "";
    console.log(`${rel}: ${out.admission.gate} — ${out.reading.edgesFound} edges, ${out.admission.heard} heard (${coveragePct} of sentences)${sp}, raw-spans ${out.spanSelfVerification.rawOk}/${out.spanSelfVerification.rawChecked} — ${ms}ms`);
  }
  const total = Date.now() - started;
  // LP10: reported as a distribution over what was actually measured, never
  // a pass/fail cut invented against this one run — "clean" already means
  // nothing false got in; this line is the separate, honest answer to how
  // MUCH of each clean-gated document that actually reached.
  let coverageNote = "";
  if (cleanCoverages.length) {
    const sorted = [...cleanCoverages].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    coverageNote = ` — admission coverage among clean sources: mean ${(mean * 100).toFixed(1)}%, median ${(median * 100).toFixed(1)}%, min ${(sorted[0] * 100).toFixed(1)}%, max ${(sorted[sorted.length - 1] * 100).toFixed(1)}%`;
  }
  console.log(`\n${targets.length} sources in ${(total / 1000).toFixed(1)}s (${(total / targets.length).toFixed(0)}ms/source avg) — clean ${clean}, script_prior ${scriptPriorN}, gapped_script ${gappedScript}, gapped_self_verify ${gappedSelfVerify}, empty ${empty}${coverageNote}${scriptPriorCoverages.length ? ` — prior-driven token coverage (caseless scripts): mean ${(scriptPriorCoverages.reduce((a, b) => a + b, 0) / scriptPriorCoverages.length * 100).toFixed(1)}%` : ""}`);
}
