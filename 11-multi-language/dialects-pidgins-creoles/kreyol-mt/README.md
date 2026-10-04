# Kreyòl-MT

Source: [JHU-CLSP/Kreyol-MT](https://github.com/JHU-CLSP/Kreyol-MT) — a project
of the JHU Center for Language and Speech Processing aggregating machine
translation bitext for ~40 Caribbean, African, and colonial creole languages
(Robinson et al. 2024, "Kreyòl-MT: Building Machine Translation for Latin
American, Caribbean, and Colonial African Creole Languages",
[arXiv:2405.05376](https://arxiv.org/abs/2405.05376)).

## What is actually in the GitHub repo vs. what this pocket stages

The `JHU-CLSP/Kreyol-MT` GitHub repository itself (cloned in full to verify —
`repo/` here carries its LICENSE and README verbatim) contains **no bitext
data files**. It is documentation, scripts, and model pointers: a
per-language, per-source `data-documentation/<lang>/bitexts/<pair>/raw/<source>/README.md`
tree naming every individual upstream source that feeds each language pair's
training data, each with its own declared `release` status (`public` /
`online` / `private`) and, where available, its own license line. The actual
bitext is distributed separately on
[HuggingFace (`jhu-clsp/kreyol-mt`)](https://huggingface.co/datasets/jhu-clsp/kreyol-mt).

## Why this pocket does NOT stage the HuggingFace parquet files directly

This is the load-bearing finding of the license check, so it is stated
plainly rather than glossed over:

1. The HuggingFace dataset's own `cardData` license field is `"other"` — not
   a recognized open license — and its own README says explicitly:
   *"Documentation of all our data, including license and release
   information for data from individual sources, is available at our GitHub
   repo"* — i.e. the aggregate dataset defers licensing entirely to the
   per-source documentation, rather than asserting one license for itself.
2. Reading that per-source documentation directly (`grep -rh "^release:"
   data-documentation/` across the cloned repo) shows **131 of 344 documented
   source entries are marked `release: "private"`** — most heavily "JHU
   Bible" (112 entries, by far the single largest documented source across
   the whole project) plus CreoleVal (17) and AfricaNLP-2023 (2). The
   project's own `scripts/count/count.py` treats only the literal value
   `"public"` as public-releasable, which means even the `"online"`
   (OPUS-sourced) tier is excluded from what the authors themselves count as
   their public data.
3. The publicly downloadable parquet files on HuggingFace do **not** carry
   per-row source attribution — the dataset card's own "coming soon" list
   names *"Metadata indicating which aligned sentences came from which
   sources"* as work not yet done. That means a downloaded parquet file for
   any language pair is an **unlabeled blend** of public, online, and
   private-marked sentences, with no way to separate them after the fact.

Given a dominant, explicitly `private`-flagged source blended into every
pair's data with no row-level way to exclude it, and the dataset's own
license field left as `"other"`, staging the raw parquet wholesale would
mean redistributing content the project's own documentation does not
clear for that — exactly the "unclear/contested" case this repo's staging
rules say to gate rather than guess on.

## What this pocket stages instead

Real, individually-licensed bitext fetched **directly from the specific
upstream sources** that Kreyol-MT's own per-source documentation names and
that carry a clean, checkable, redistributable license — the same sources
Kreyol-MT itself draws from, fetched at the point where the license is
actually stated:

- **`bitexts/djk-eng/`** — Ndyuka/Aukan (Suriname; listed in Kreyol-MT's
  African-diaspora Americas group) ↔ English, from
  [OPUS bible-uedin](https://opus.nlpl.eu/bible-uedin-v1.php) (the exact
  `bible_uedin` source Kreyol-MT documents for several of its languages,
  including `djk` itself). **15,743 aligned sentence pairs.** The package's
  own bundled `LICENSE` file states **CC0 1.0 Universal** verbatim —
  confirmed by reading the file fetched with the data, not assumed from the
  corpus name.
- **`bitexts/hat-eng/`, `bitexts/gcf-fra/`, `bitexts/tpi-eng/`,
  `bitexts/crs-fra/`** — Haitian Creole ↔ English (177 pairs), Guadeloupean
  Creole ↔ French (1,694 pairs), Tok Pisin ↔ English (90 pairs), and
  Seychellois Creole ↔ French (59 pairs), built from
  [Tatoeba's](https://tatoeba.org) own per-language sentence exports and
  translation-link exports (`https://downloads.tatoeba.org/exports/per_language/`),
  joined locally by sentence ID into aligned TSV pairs. Tatoeba's terms of
  use (`https://tatoeba.org/en/terms_of_use#section-6`) state its
  infrastructure uses **CC BY 2.0 FR** by default for text sentences
  (attribution required; individual sentences may carry a different
  compatible CC license, disclosed per-sentence on tatoeba.org itself).

These five language pairs were chosen to span the three regional groups
Kreyol-MT's own README organizes its target-language list into: African
diaspora Creoles of the Americas (Ndyuka `djk`, Haitian `hat`, Guadeloupean
`gcf`), Creoles of Africa/Indian Ocean (Seychellois `crs`), and other Creole
languages (Tok Pisin `tpi`, Pacific).

## What was deliberately NOT staged

- **The 112 `JHU-Bible`-sourced entries** (`release: "private"`) and the
  17 `CreoleVal` + 2 `AfricaNLP-2023` entries (also `private`) — gated, per
  the finding above. Not fetched, not staged.
- **FLORES-200** (`release: "public"` but licensed **CC-BY-NC-SA 4.0**,
  noncommercial) — out of scope for this pass; named here so a future pass
  doesn't assume "public" release status implies an unrestricted license.
- **CJCLDS** (Church of Jesus Christ of Latter-day Saints materials) — the
  HuggingFace dataset card itself says this data has been *removed* from
  the current public release pending its own separate LDC release; it was
  never available to fetch in the first place.
- **The other ~30+ Kreyol-MT target languages** not covered by OPUS
  bible-uedin or by a sizeable Tatoeba export — out of scope for this
  bounded pass. `hat`, `jam`, `pap`, `tpi`, `srn`, `mfe`, `gcf`, `crs`,
  `sag`, and `lou` are the only Kreyol-MT languages Tatoeba currently
  carries at all; of those, `gcf`, `hat`, `tpi`, and `crs` had usable
  sentence counts fetched here.
- **APICS-sourced material** — Kreyol-MT documents APICS (CC BY 4.0) as one
  of its bitext sources for several languages, but APICS is already staged
  in full as its own separate pocket at
  `11-multi-language/dialects-pidgins-creoles/apics/` in this repo — not
  duplicated here.

## Coverage

A small, bounded, honestly-partial slice: 5 of ~74 language-pair configs
Kreyol-MT tracks, drawn entirely from upstream sources independently
verified as openly licensed (CC0 / CC BY 2.0 FR), not from the blended
HuggingFace release. 18,163 real aligned sentence pairs total.
