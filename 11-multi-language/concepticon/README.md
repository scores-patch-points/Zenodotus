# Concepticon — cross-linguistic concept backbone

Fetched by `scripts/fetch-concepticon.mjs` from
[concepticon/concepticon-data](https://github.com/concepticon/concepticon-data),
master branch. **License: CC BY 4.0**, verified directly from the repo's own
`.zenodo.json` and `metadata.json` at fetch time (see `manifests/concepticon-manifest.json`).

## What this is

Concepticon is not text in any one language. It is a shared concept-ID space:
4,165 concept sets (`concepticon.tsv`), each with an English gloss used only
as the ID's mnemonic label, a semantic field, a short definition, and an
ontological category (Person/Thing, Action/Process, Property, ...).

~160 independently collected fieldwork concept lists — Swadesh lists, naming
tests, elicitation lists, spanning many languages — each map their own items
onto these shared IDs (`conceptlists.tsv` catalogs the lists themselves:
which languages, which citation). That mapping is what makes "the concept
BRAVE" comparable across lists collected in different languages, without
picking any one language's word as the reference point. `conceptrelations.tsv`
adds typed relations (broader/narrower, part-whole) between concept sets.

## What is NOT here

The ~160 underlying concept lists themselves (the actual per-language word
forms) are not vendored in this pull — only the backbone that links them.
Concepticon's own repo does not bundle them either; they live in separate
Lexibank/CLDF datasets, each with its own license, and pulling them is a
separate, larger piece of work with per-list triage, matching the pattern
already run for WikiConv/NCTE and the Parallel Bible Corpus. This pull adds
the ID space itself, since that is small, uniformly licensed, and useful on
its own as a concept catalog independent of any single language's literature.

## Files

| File | Rows | Content |
|---|---|---|
| `concepticon.tsv` | 4,165 | Concept sets: ID, GLOSS, SEMANTICFIELD, DEFINITION, ONTOLOGICAL_CATEGORY |
| `conceptlists.tsv` | ~160 | Source concept list metadata (languages, citation) |
| `conceptrelations.tsv` | — | Typed relations between concept sets |
