# case-priors

`LatinCasePrior@1` (`case-marking-lat.json`) is a RECEIVED measurement, not
a reading of any text in this corpus — like its sibling `act-priors/`, and
unlike `fold-reading-priors/` (which is explicitly "computed from the
numbered source categories"). It transforms an external resource — the
Universal Dependencies `UD_Latin-Perseus` treebank (Perseus Digital
Library texts: Cicero, Ovid, the same classical register already held in
`15-western-canon/` and `01-literature-books/` here — CC BY-NC-SA 2.5,
non-commercial, share-alike, stated plainly) — once, independent of any
specific text here: for every nominal token (NOUN/PROPN/ADJ/PRON/NUM)
carrying a Case feature across 1,334 training sentences, the word-final
two-character ending tallied against its Case|Number reading, the WHOLE
ranked distribution kept per ending rather than collapsed to a single
guess. A form the training sentences never attested, or whose top reading
does not clear the consuming organ's own declared confidence floor, is a
typed gap in that organ — never a guess dressed as a case here.

Built by `eoreader7/native/scripts/build-latin-case-prior.mjs` against
`eoreader7/native/eval/fixtures/ud-latin-perseus/la_perseus-ud-train.conllu`
(the raw treebank itself, held-out test split included, stays vendored in
`eoreader7` as an eval fixture — this file is the one-time TRANSFORM of it,
not the source). The full disclosure of what is measured, what is held
out, and what is deliberately NOT modeled (verb-personal-ending morphology
is received rather than mined from this same treebank — see the consuming
organ's own header for why the mined attempt under-covered) lives in that
script's header and in `eoreader7/native/READING-SPEC.md` S33.

Moved here from `eoreader7` (2026-08-30) — a received lexicon is content,
not app logic, so it lives with the corpus, matching `act-priors/`'s own
precedent exactly ("a repo split by kind, not by convenience"). The
consuming CODE (`extractCaseMarkedRelation`/`defaultLatinCasePrior`,
eoreader7's `native/adapters/text/relations-case-marked.js`) stays in
eoreader7 and loads this file via the same cross-repo relative path
`native/tests/phasepost.test.mjs` already established for `act-priors/`
(`../../../ethos/derived-priors/...`, counted from the loading
module's own directory). the-fold's own `hypergraph.js::
makeCaseMarkedRelationReader` (POLICIES.md P73) consumes the organ, never
this file directly.

## Sanskrit (`case-marking-san.json`, 2026-09-18)

`SanskritCasePrior@1` is the same ladder over Vedic Sanskrit: the one-master
builder (`eoreader7/native/scripts/build-latin-case-prior.mjs`) run with
`--lang=san --strip=none` against `UD_Sanskrit-Vedic` TRAIN (21,477
sentences, 87,149 nominals, 22,763 verbs; CC BY-SA 4.0). Two generalizations
were required, both proven no-ops for the shipped Latin/Greek artifacts:

- `--strip=none`: IAST diacritics are phonemic (NFD-strip collapses ā→a,
  ś→s, ṛ→r — measured 10/10 probes destroyed). The Vedic train carries zero
  combining marks (all non-ASCII is phonemic IAST), so nothing is lost.
- finite = `VerbForm=Fin` OR bare Mood+Person with no VerbForm: Vedic never
  annotates VerbForm on finites (22,763/22,763); Latin/Greek always do
  (0 bare in both), so the disjunct changes nothing shipped.

Consuming seam: `eoreader7/native/eval/lavar/sanskrit.mjs`; competence:
`sanskrit-competence.test.mjs` (Vedic TEST gated, UFAL Classical reported).
