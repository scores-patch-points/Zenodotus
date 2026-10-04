# propernoun-priors

`ProperNounPrior@1` is a RECEIVED lexicon, not a measurement of any text in
this corpus. Each file transforms an external resource (a Universal
Dependencies treebank's PROPN forms) once: every distinct proper-noun
surface folded to its LEMMA with the case-forms the treebank marks, multi-
lemma (homographic) forms preserved unresolved, adjectives never entering by
construction. Each file declares its own `language`, its `provenance`
(source treebank, licence, giver), and the exact declared parameters that
produced it — the discipline LP1/LP5 holds the source corpus to.

Built by `scripts/build-propernoun-prior.mjs`, which reads the treebank's
UPOS=PROPN tag rather than hand-typing a list.

Moved here from `eoreader7/native/priors/` (2026-08-30) — a received lexicon
is content, not engine logic, so it lives with the corpus. The consuming,
language-agnostic engine MECHANISM (`propernoun-fold.js::makeProperNounFold`)
stays in `eoreader7`'s `native/adapters/text/`: a repo split by kind, not by
convenience. The battery that uses the Russian register (`the-fold`'s
`eval/mhc-battery.mjs`) reads it from here; eoreader7's own
`rich-referents.test.js` reads it from here too.
