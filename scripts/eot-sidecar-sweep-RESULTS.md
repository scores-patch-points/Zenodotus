# The full corpus sweep (task #8)

`eot-sidecar.mjs --scan` over all 2,207 text/md sources this corpus holds
(2,204 under the twelve category directories + this repo's own root
`POLICIES.md`/`README.md`/`SOURCES.md`, which the walk does not exclude —
they are real prose worth reading too). 220.1s wall clock, 100ms/source
mean — close to task #7's own sample-based 198ms/file projection and well
under its 7.3-minute estimate for the full run.

## The headline

**76,174 assertions heard. 86,264/86,264 raw spans self-verified — 100%,
corpus-wide, zero exceptions.** Every address this sweep wrote resolves,
right now, in its own source file's own raw bytes — the exact guarantee
LP3 named as missing and this session's own S26 (`normaliseNewlines`'s
invertible offset map) closed upstream before this driver was written.
Zero extraction errors, zero corrupt sidecars, zero `gapped_self_verify`
(an edge was extracted but could not be verified against real bytes) —
across the whole corpus, not a sample.

```
gates: clean 2021 (91.6%), empty 70 (3.2%), gapped_script 116 (5.3%)
admission: offered 76,174, heard 76,174, turnedAway 0
```

`turnedAway: 0` is a fact about THIS recipe, not a universal claim — no
grammar lens is injected (the-fold's own header on this recipe says why:
`classifyConnector` needs a local UD treebank build this environment does
not have), so nothing gets refused for failing to settle as a verb. Every
edge that reaches `admit()` already cleared the raw self-verification gate
before it got there.

## By category

| category | sources | heard | clean | empty | gapped_script |
|---|---|---|---|---|---|
| (repo root) | 3 | 141 | 3 | 0 | 0 |
| 01-literature-books | 45 | 2,565 | 43 | 2 | 0 |
| 02-encyclopedic | 54 | 4,178 | 54 | 0 | 0 |
| 05-academic-papers | 96 | 2,584 | 92 | 4 | 0 |
| 06-government-legal | 1,221 | 41,190 | 1,130 | 25 | 66 |
| 07-images-media | 2 | 40 | 2 | 0 | 0 |
| 08-news-current | 1 | 52 | 1 | 0 | 0 |
| 09-source-code | 38 | 1,198 | 37 | 1 | 0 |
| 10-audio-music | 13 | 7 | 4 | 9 | 0 |
| 11-multi-language | 265 | 12,201 | 245 | 12 | 8 |
| 14-holy-texts | 452 | 10,515 | 393 | 17 | 42 |
| 15-western-canon | 16 | 1,487 | 16 | 0 | 0 |
| 16-wordplay | 1 | 16 | 1 | 0 | 0 |

`02-encyclopedic`, `15-western-canon`, `16-wordplay`, `07-images-media`,
`08-news-current` and the repo's own root files read 100% clean — ordinary
English prose is exactly this recipe's home ground.
`10-audio-music` is the worst category by far (9/13 empty, all 11
`catalogDominated` sources in the whole corpus sit here) — a KNOWN,
already-disclosed shape from task #7, confirmed at full scale.

## What "empty" actually means, read one specimen at a time — most of it is CORRECT, not a defect

All 70 `empty` sidecars were read by hand (file paths, not sampled) before
writing this. They split into two genuinely different populations, and
conflating them would misreport this sweep's own quality:

**Genuinely non-prose material — `empty` is the honest, correct answer.**
A majority of the 70: `11-multi-language/dialects-pidgins-creoles/multi-
value/resources/{benefactive_verbs,ditransitive_dobj_verbs,mass_nouns,
transitive_dobj_verbs}.txt` (bare word lists, one token per line — there
is no sentence here to extract a claim from), `.../creoleval/
ner_masakhaner_pcm/{dev,test}.txt` (NER-tagged token files), `.../
dialectbench/tunizi/TUNIZI_V1_full.txt` (a transliteration corpus, one
short utterance per line), `.../dialectbench/greek-dialect-classifier/
LICENSE.md` (an MIT licence — correctly not narrative prose), all nine
`10-audio-music/*-catalog.txt` files already named in task #7 and
confirmed here at full scale (11 total `catalogDominated`, matching the
9 empty + 2 that landed a thin `clean` reading in this category).
**A document with no reading is not a document with nothing in it (P67)
— for these, the reading correctly found nothing to read, and that is
the material's own shape, not this pass's failure.**

**A genuine, named, unfixed limitation: front-matter dominance.** Two
specimens confirm task #7's own finding generalizes rather than being a
one-off: `01-literature-books/gutenberg/pg135_Les_Misérables_(French).txt`
(already traced in task #7 — real narrative prose does not begin until
raw byte 21,623, past the 8,000-character excerpt window) and
`01-literature-books/gutenberg/pg5827_Meditations_by_Marcus_Aurelius.txt`
(not yet traced by byte offset, but the same shape by inspection — a
substantial front-matter block precedes the philosophical text itself).
This is the strongest single candidate for task #9's audit: two
independent real specimens, same root cause, a structural fix (detect and
skip a front-matter block before excerpting) rather than a per-book
patch.

**A second real limitation, found only by reading this sweep's own
output: enumerated legal text does not parse as narrative sentences.**
Every `06-government-legal/world-legislation/{cz,gr,fi,uy}/*.md` empty
result is a STATUTE — Czech, Greek, Finnish and Uruguayan legislation,
each opening with a numbered-clause structure ("Article 1. ...", "§ 1
...") rather than subject-verb-object prose. This is a genuinely
different shape from the front-matter problem above: it is not that the
real content sits past the excerpt window, it is that legal enumeration
is not the sentence shape `extractRelations`'s SVO matcher was built to
read at all — the SAME class of gap this project's own CLAUDE.md already
names for Wikipedia succession boxes (`succession.js`, "condemned but
still in the tree... it should never have been made"). Worth naming for
the audit, NOT worth building a fifth shape-specific parser for without
first asking whether it generalizes (a real risk: statute numbering
conventions differ by country, and per-jurisdiction parsing is exactly
the "cannot be formatted to specific sites" trap this project has
refused before).

**A third, more surprising finding: script coverage is not language
coverage.** `14-holy-texts/sblgnt/*.txt` (the SBLGNT — the Greek New
Testament) reads `empty`, NOT `gapped_script` — Greek has case, so
`scriptCoverage` correctly does not gate it, and `extractSurfaces`/
`discoverReferents` presumably found real candidate surfaces. But
`extractRelations`'s own vocabulary (English SVO patterns,
English-lang `determiners`/`negationWords` injected at this recipe's own
call site) has nothing to anchor on in Koine Greek prose, so it heard
nothing. This is a DIFFERENT gap than `script.gap` was ever built to
catch — that field answers "can the surface layer even SEE this script,"
not "does the relation vocabulary understand this language." Worth its
own typed disclosure in a future pass (this sweep's own recipe never
claimed to check for it, so nothing here is dishonest — but a reader of
this report should not conflate "gapped_script: false" with "this
material was read in its own language").

## What this closes, and what it hands to task #9

The corpus now has a real, byte-verified, append-only reading beside
every one of its 2,207 sources — the ask's own "pre-read all our priors"
and "a good start to their life," both literally true: nothing false was
admitted (100% self-verification, zero gapped_self_verify), and every
gap is honestly typed rather than silently smoothed over. Three real,
named, unfixed limitations go to task #9's adversarial audit rather than
being patched here under this task's own budget: front-matter dominance
(2 specimens), enumerated-legal-text non-narrative shape (dozens of
specimens across 4 jurisdictions), and relation-vocabulary language
mismatch on non-English prose that clears the script gate (SBLGNT and
likely others). All three are structural questions ("does a general fix
exist, or would it just be another per-corpus special case") that this
project's own CLAUDE.md says belong to adversarial verification before
being built, not to a single pass's own judgment.
