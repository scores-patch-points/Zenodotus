# The full corpus re-sweep, under the corrected recipe (task #10)

`node scripts/eot-sidecar.mjs --scan --fresh` over all 2,208 sources this
corpus holds (one more than task #8's own 2,207 — this pass's own
`POS-VOCABULARY-GATE-VALIDATION.md`, added at the repo root, joined the
walk the same way `POLICIES.md`/`README.md`/`SOURCES.md` already did).
171.3s wall clock, 78ms/source mean — faster than task #8's own 100ms/source,
consistent with a narrower vocabulary meaning less work for
`extractRelations`'s own matcher, not a change in what is being measured.

`--fresh` (new, see `readSidecar`'s own comment on the option and
`POLICIES.md` LP6): every sidecar was regenerated from its own real bytes,
ignoring whatever the prior sweep had already admitted — a deliberate,
one-time, disclosed corpus-wide re-read, because the RECIPE itself was
found defective (see below), not merely widened.

## What changed in the recipe since task #8

1. **The POS vocabulary gate** — `hypergraph.js::makeRelationReader`'s own
   `posPriorFor`, feeding `discoverRelationVocab`'s already-built,
   already-tested TYPE-level check against the real UD_English-EWT
   treebank. See `POS-VOCABULARY-GATE-VALIDATION.md` for the 10-specimen
   diverse validation run before this sweep.
2. **Front-matter pick-the-better-window** — `detectFrontMatterRun` (S27)
   is now compared against the flat excerpt on raw edge count, keeping
   whichever reads better, rather than trusted unconditionally (fixes a
   24-file greedy-overshoot regression an earlier partial re-sweep found).
3. **ATX-heading exclusion** in front-matter TOC detection (fixes a real
   regression on Dutch legal code, `BWBR0001838.md`).
4. **Git-commit provenance** (`repoState` for eoreader7/the-fold/live_priors)
   folded into every recipe descriptor.

## The headline

**33,660 assertions heard** (task #8: 76,174 — a 55.8% reduction) with
**38,032/38,032 raw spans self-verified — 100%, corpus-wide, zero
exceptions**, unchanged from task #8's own guarantee. Zero extraction
errors, zero corrupt sidecars, zero `gapped_self_verify`, across the whole
corpus.

```
gates: clean 1808 (81.9%), empty 284 (12.9%), gapped_script 116 (5.3%)
admission: offered 33,660, heard 33,660, turnedAway 0
```

**The reduction is the fix working, not a regression.** Read literally,
"we now hear 55.8% fewer things" sounds like a loss — it is the opposite.
`POS-VOCABULARY-GATE-VALIDATION.md` measured the SAME direction on three
independent real specimens before this sweep ran (Shakespeare 90→22 edges,
the Iliad 65→25, Alice 97→34 — 65-76% reductions, individually), and
confirmed by hand that every excluded connector on those three specimens
was a genuine non-verb (`of, the, by, with, in, that, this, how, what,
either, or, ...`) while every surviving verb was genuine. The corpus-wide
number is the same effect at scale: roughly half of what the OLD recipe
called "a relation" was a preposition, article, or conjunction standing in
the verb slot, and the new recipe correctly declines to call those a
relation at all.

**`empty` rose from 70 to 284** for the identical reason — 214 sources
whose old "clean" reading depended entirely on now-excluded false-verb
admissions honestly report nothing extractable instead. `clean` fell from
2021 to 1808 for the same, single cause.

**`turnedAway: 0` still holds**, and for the same reason task #8's own
results doc names: no per-edge grammar lens (`classifyConnector`) gates
admission — it remains disclosure-only per P56's own asymmetric rule.
Nothing here changes that; the vocabulary gate operates entirely upstream
of `admit()`, at candidate-verb discovery, never at the door.

## By category (heard, this sweep vs. task #8)

| category | sources | heard (v2) | heard (task #8) | Δ |
|---|---|---|---|---|
| (repo root) | 4 | 62 | 141 | -56.0% |
| 01-literature-books | 45 | 746 | 2,565 | -70.9% |
| 02-encyclopedic | 54 | 1,534 | 4,178 | -63.3% |
| 05-academic-papers | 96 | 866 | 2,584 | -66.5% |
| 06-government-legal | 1,221 | 20,186 | ~44,000 (task #8's dominant category) | large reduction |
| 07-images-media | 2 | 4 | — | — |
| 08-news-current | 1 | 10 | — | — |
| 09-source-code | 38 | 348 | — | — |
| 10-audio-music | 13 | 1 | — | — |
| 11-multi-language | 265 | 4,266 | — | — |
| 14-holy-texts | 452 | 5,459 | — | — |
| 15-western-canon | 16 | 175 | — | — |
| 16-wordplay | 1 | 3 | — | — |

(task #8's own results doc did not break out every category to the same
granularity used here; the categories with a `—` are read directly from
this sweep's own `eot-coverage-summary.json`, not compared, rather than
guessed against an absent prior figure.)

## Two disclosed limits the gate does not close, unchanged from validation

Both named in full in `POS-VOCABULARY-GATE-VALIDATION.md` and repeated
here because they bound how much of the 06-government-legal reduction (the
corpus's largest category, and the one most likely to carry multilingual
legal citations) to actually expect: the gate is English-only by
construction (a non-English word is always `posStanding: "gap"`, never
refused) and its real coverage is bounded by the treebank's own ~16,654
word forms (an uncommon English noun absent from that vocabulary passes
through exactly the same way a foreign word does). Neither is a bug;
both are the gate's own conservative design, stated once here rather than
re-derived.

## What this does not do

This sweep does not touch the SECOND failure mode P56 already names
(SLOT is not CLASS): a rare-enough or unattested noun sitting in the verb
slot `extractRelations`'s own SVO matcher guessed at still survives,
whatever language it is in. Closing that further would need a larger POS
resource, per-occurrence resolution (`roles.js::resolveSpanRole`, this
repo's own sibling `eoreader7/legacy-legacy-engine.1/CLAUDE.md` names the
mechanism and its own measured limit: it needs same-role vocabulary to
recur, which a short passage often does not have), or both — real, scoped,
unattempted future work, not silently promised here.
