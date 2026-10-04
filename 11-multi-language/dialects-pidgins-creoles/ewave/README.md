# eWAVE — The Electronic World Atlas of Varieties of English

Source: Kortmann, Bernd & Lunkenheimer, Kerstin & Ehret, Katharina (eds.)
2020. *The Electronic World Atlas of Varieties of English.* Leipzig: Max
Planck Institute for Evolutionary Anthropology. https://ewave-atlas.org/

CLDF release: https://github.com/cldf-datasets/ewave (cloned in full;
Zenodo DOIs 10.5281/zenodo.3712132 and, for v3.0, 10.5281/zenodo.17433568).

License: **CC BY 3.0** (Attribution 3.0 Unported) — verified directly in
the repository's own `LICENSE` file (the full Creative Commons Attribution
3.0 Unported legal code), and independently confirmed by matching
statements in `README.md` ("This dataset is licensed under a CC-BY-3.0
license"), `metadata.json` (`"license": "CC-BY-3.0"`), and `.zenodo.json`
(`"license": {"id": "CC-BY-3.0"}`). All four sources agree; see
`cldf/LICENSE` in this directory for the verbatim text.

## What eWAVE is

eWAVE rates 235 morphosyntactic features (grouped into 12 categories —
pronouns, noun phrase, tense & aspect, modal verbs, verb morphology,
negation, agreement, relativization, complementation, adverbial
subordination, adverbs & prepositions, discourse & word order) across 77
varieties of English, on a six-point scale (A = pervasive/obligatory, B =
attested but not pervasive, C = extremely rare, D = attested absence, X =
not applicable to the variety's structure, ? = no information). Of the 77
varieties, 26 are typed by the atlas itself as English-based Pidgins (P,
7 varieties) or English-based Creoles (Cr, 19 varieties); the rest are
traditional L1 dialects (L1t), high-contact L1 varieties (L1c, which is
also where eWAVE places its three African American Vernacular English
entries), and indigenized L2 varieties.

## What's staged here, and why

Per this pocket's own instructions, staging prioritizes the pidgin/
creole/AAVE theme of this batch while keeping the general feature catalog
available as a structural reference:

- **`cldf/`** — the complete CLDF core release, copied verbatim: all 77
  varieties' metadata (`languages.csv`), all 235 features
  (`parameters.csv`), every rating code and its meaning (`codes.csv`),
  the full variety × feature rating matrix (`values.csv`, 18,095 ratings
  = 77 × 235), every recorded illustrative example sentence
  (`examples.csv`), contributor list, category/type/region lookup
  tables, the bibliography (`sources.bib`), the atlas's own introductory
  essays (`introduction.md`, `home.md`), and the license text. This is
  staged in full — not filtered to a subset of varieties — because the
  complete structured release is itself small (about 1.1MB of CSV/text)
  and is the natural bounded unit for a reference dataset of this kind;
  filtering it would have discarded the comparative context (how a
  creole's feature profile sits against L1/L2 varieties) that is the
  actual point of an atlas.
- **`feature-catalog.txt`** — a single readable rendering of all 235
  features, organized by the atlas's own 12 categories, with each
  feature's name, illustrative gloss (where the atlas gives one) and its
  cross-variety attestation/pervasiveness statistics. This is the
  "general feature catalog... useful as a structural reference" the
  pocket instructions ask for, in prose form rather than raw CSV.
- **`varieties/`** — one rendered document per pidgin/creole/AAVE
  variety (29 documents: all 19 Creoles, all 7 Pidgins, and the 3
  AAVE-named High-contact L1 varieties — Urban, Rural, and Earlier
  African American Vernacular English). Each document combines the
  variety's own eWAVE metadata (type, region, Glottocode, chapter
  contributor), the atlas's own prose description of the variety, every
  illustrative example sentence eWAVE records for it (real attested
  sentences in the variety itself, e.g. Nigerian Pidgin, Tok Pisin,
  Jamaican Creole), and its full 235-feature rating profile. Every one
  of the 29 clears this repo's 600-word floor without padding (2,100–
  4,540 words each; see `manifests/ewave-manifest.json` for exact
  counts).

Not staged: `map.svg` (a 1.7MB image, out of scope for a text-priors
repo), `ewave-1.0.zip` (a legacy bundled archive, redundant with the
canonical `cldf/` tables already staged), and `WAVEquestionnaire.pdf`
(the contributor questionnaire form — methodological/procedural, not
corpus content).

## Coverage

This is the complete current eWAVE CLDF dataset (all 77 varieties, all
235 features, the full rating matrix and all recorded examples) — not a
sample of the structured data. The *rendered, curated* per-variety prose
documents in `varieties/` cover the 29 pidgin/creole/AAVE varieties
specifically, per this batch's theme; the other 48 varieties' full data
(description, ratings, examples) is present in `cldf/` but was not
additionally rendered into its own prose document per variety.
