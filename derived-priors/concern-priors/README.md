# concern-priors

`ConcernField@1` — **the shadow**: what each speakable archon of the ethos
corpus gives a shit about, and how it dwells on it. One prior per archon,
computed mechanically from the **full, original text** of its canon (the
manifest's `source.path`), byte-addressed, deterministic, no model.

## What it is

A **typing of mattering** — the pathos layer of each voice. It tells us what
kinds of things count as what, for whom. It does **not** change how the
reasoning works: logos (the fold, the engine, the nulls) is untouched. The
house law: pathos never gates and never grades; it discloses whose stake the
claim is. The shadow's only use is to say **whose voice is live on a topic**
and what material that voice should be offered — the activation of the
relevant archons, never a re-weighting of any claim's own standing.

## The print

| layer | what | how |
|---|---|---|
| spread-dwellings | terms the canon RETURNS TO | spread across more blocks than its same-frequency peers |
| intensity-dwellings | terms the canon returns to INTENSELY | concentrated in fewer blocks than its peers |
| entities | the genuinely cased proper-noun candidates the canon holds as its own | cased in more occurrences than lowercase (sentence-initial casing alone never qualifies); no case in the script → named gap |
| addresses | the byte spans where the canon dwells | first occurrence span per block, up to 8 |

## The null (measured, never set)

The text's **own term population at the same frequency** is the null — the
house's standing shape ("the null is the caller's own distribution": elenchus
born mass, anchoring, pronouns). A term's neighborhood is the power-of-two
count bin; the floor is the **max over 39 seeded bootstrap draws from the bin
without the term itself** (leave-one-out) — the elenchus idiom, "the max over
reruns IS the false-positive floor." Resolution 1/40 = 0.025 < the standing
alpha 0.05. Determinism is by construction (seeded); a second, independent
seed arm re-runs the whole admission, the prior is the **intersection**, and
the drops are recorded as the dissent — never silent.

The permutation null was tried and **refused** (2026-10-01, measured): it
cannot see the text's own grammatical regularity, so it admitted
`die/nicht/ein` as dwellings of German. The population null sees the
regularity and forces a term to beat its own peers.

## What was found, disclosed

- **60 priors · 23 named gaps · whole cast 83 handles.** The shadow covers
  every archon of the ethos corpus: speakable archons get a prior;
  Shakespeare's source is missing at build time; the 22 silent archons
  (copyrighted_deferred / not_found) have no canon in the priors at all —
  named in `named-gaps.jsonl`, never shadowed from nothing (the house law:
  canon in the priors before an archon is cited; an archon with no verified
  words is named and refused, never ventriloquized).
- **3002 admitted terms**; the two-seed stability arm dropped 3444
  one-seed-only terms (the FDR dissent — a term must clear both arms).
- The top count-bins are **grammatical**: `der`, `sie`, `ein` genuinely
  concentrate more than their same-frequency peers. This is a *truthful*
  distributional fact, **not a mattering**. The print discloses the terrain;
  mattering is the consumer's judgment (the steersman).
- **Distinctiveness**: median pairwise Jaccard of admitted term sets is
  0.000, max 0.150 across 1768 different-source pairs — the fields are
  distinct. Same-source pairs (Huginn/Muninn, Ibn Khaldun/Khaldun — one
  canon, two voices) are exempted and disclosed.
- **Kind induction is a named gap**: the basin organ
  (`kernel/entity-kind-induction.js`) needs entity features this recipe does
  not fabricate; the control that closes the gap is recorded in each prior.

## Recipe (exact, reproducible)

`concern-field.mjs` — deterministic, no model. Rebuild:

```bash
node concern-field.mjs           # build every missing prior (incremental)
node concern-field.mjs --list    # the speakable cast + sources
node concern-field.test.mjs      # the gate (below)
```

## Falsifying control

The gate runs four controls over the real built artifacts:

1. **Determinism** — identical builds are byte-identical.
2. **Provenance** — every admitted term's byte span contains the term (the
   house law: nothing below is narrated that its own address cannot produce).
3. **Null-floor** — every admitted term's pValue is at the measured
   resolution (1/40) and below the standing alpha.
4. **Distinctiveness** — different-source pairs share fewer than half their
   terms (Jaccard < 0.5, a structural bound); same-source pairs exempted and
   disclosed.

A term in `terms` whose address does not contain it; a recipe rerun that is
not byte-identical; a same-source-independent pair at Jaccard >= 0.5; or a
second-seed arm that drops every admission — any of these breaks the print.

## Consumers

The steersman (Thea's sight, penelope organ) reads these priors as the
shadow: given a topic, it types the discourse move and activates the archons
whose concern fields the topic touches — the "for whom" of the turn.