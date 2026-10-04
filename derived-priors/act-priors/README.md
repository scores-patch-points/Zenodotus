# act-priors

`ActPrior@1` (`act-prior-en.json`) is a RECEIVED lexicon, not a measurement
of any text in this corpus — unlike its sibling `fold-reading-priors/`,
which is explicitly "computed from the numbered source categories." This
one transforms an external resource (VerbNet 3, the NLTK data mirror,
verbnet3.zip) once, independent of any specific text here: every member
verb FORM mapped to which of the engine's nine acts (`NUL`/`SIG`/`INS`/
`SEG`/`CON`/`SYN`/`DEF`/`EVA`/`REC`) its VerbNet class's own semantics
perform. Built by `scripts/build-act-prior.mjs`; the mapping table and its
full disclosure (grain deliberately absent, ambiguity kept never
collapsed, the low-confidence readings named) live in that script's own
header.

Moved here from `the-fold` (2026-08-29) — a received lexicon is content,
not app logic, so it lives with the corpus. The consuming CODE
(`phasepost.js`, the 27-phasepost overlay) lives in `eoreader7`'s
`native/adapters/text/` instead: a repo split by kind, not by convenience.
