# pronoun-priors

`PronounPrior@1` is a RECEIVED lexicon, not a measurement of any text in
this corpus — unlike its sibling `fold-reading-priors/`, which is explicitly
"computed from the numbered source categories." Each file here transforms an
external resource (a Universal Dependencies worth of third-person personal
pronoun FEATS) once, independent of any specific text here: every distinct
pronoun FORM with the gender/number ambiguity the treebank itself marks
preserved (never collapsed). Each file declares its own `language`, its
`provenance` (source treebank, licence, giver), and the exact declared
parameters that produced it — the same discipline the source corpus holds
itself to (LP1/LP5).

Built by `scripts/build-pronoun-prior.mjs`, which reads the treebank's own
FEATS column (UPOS=PRON AND Person=3) rather than hand-typing a list; the
filter keys on the two features every personal third-person pronoun in every
treebank carries, and tallies `PronType=Prs` only as a recorded signal — the
Russian treebank marks Person=3 without ever writing PronType=Prs, so a
derivation hinging on that convention alone would silently return an empty
class.

Moved here from `eoreader7/native/priors/` (2026-08-30) — a received lexicon
is content, not engine logic, so it lives with the corpus. The consuming,
language-agnostic engine MECHANISM (`pronouns.js::normalizePronounClass` /
`resolvePronouns`) stays in `eoreader7`'s `native/adapters/text/`: a repo
split by kind, not by convenience. The battery that uses the Russian register
(`the-fold`'s `eval/mhc-battery.mjs`) reads it from here.
