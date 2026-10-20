# udhr-core

> **Where this lives (2026-10-19).** `Zenodotus/scripts/udhr-core`. It expects its siblings next to Zenodotus (`khora`, `janus`, `penelope`, as in the workspace layout) and reads the UDHR corpus from `Zenodotus/06-government-legal/un-udhr`. Nothing generated is committed here except the frozen edition set (`manifest.json`), the pre-registered results (`*.json`), the gold spans (`gold/`) and the append-only epoch record (`epochs.json`). The 23 MB event log (`udhr-core.eot.json`), the lookup caches and the scratch logs are rebuilt or fetched on demand (`node all.mjs`, about two minutes); the published mind log is `mind.eot` in [mnemosyne](https://github.com/scores-patch-points/mnemosyne), not here.

The Universal Declaration of Human Rights as the core of the universe: 516 editions read co-equal, a structure of nameless referents shared by them, and a charter root bound to that structure. Everything here is a fold of one Provenance@2 log (`udhr-core.eot.json`).

    node all.mjs      # rebuild from the corpus, prints the mind
    node dmd-ledger.mjs   # measure the window (feeds the log)
    node build-mind.mjs        # write mind.eot (paragraph structure)
    node build-mind-props.mjs  # append the proposition reading to it
    node build-mind-beings.mjs # append the beings-recurrence reading (233 editions; ~2 min)
    node eotm-cli.mjs mind.eot verify
    node --test       # 49 tests

## What it holds

| file | step | what |
|---|---|---|
| `segment.mjs`, `build.mjs` | 1-3 | frozen edition set (`manifest.json`, root over `(file, sha256)`), segmentation by the source's own layout (481), numbered headings (20), structural DP (14), 1 gap (`udhr-chv`, truncated); source/read/arrange events |
| `referents.mjs` | 4 | 82 nameless referents: whole Declaration, preamble, 30 articles, 50 paragraphs. Id is structural; editions are members. Paragraph structure is the **mode** over editions (matches English on all 30 articles). The preamble has no majority structure and gets no paragraph referents |
| `relations.mjs` | 5 | 6 **stated** relations (verbatim byte anchors; all point at the whole, the text cites no article by number) and 10 interpretive **candidates** (no anchor, license nothing) |
| `charter.mjs` | 7-8 | charter root `18aa32ed…` = hash of the referent structure and stated relations only, so it does not move when editions are removed. Same shape as khora's `UDHRCharter@1`; 34 protect/prohibit rows bound to it; `licenseStanding` accepts only rows bound to this root |
| `variants.mjs` | 6 | 68 typed variants (attested, singular, artifact-suspect, unsettled, omission) hanging off the referents |
| `convergence.mjs`, `run-convergence.mjs` | 9 | leave-k-out test, claim and control fixed before the run. Held: 500/500 draws of 16 editions reproduce the article structure. Filed on the log and as an earned epoch in `epochs.json` |
| `mind.mjs` | 11 | the log folded at a cursor: what stands, what is withheld, what is refuted, variants, the convergence verdict |
| `dmd-ledger.mjs`, `build-mind.mjs`, `eotm.mjs`, `surprise.mjs` | DMD | the system's mind is ONE binary log, `mind.eot` (735 bytes, 7 records, hash-chained, append-only). A record is appended only when reading an edition changes the conclusion (the charter root), and carries the Bayesian surprise of that edition (KL of a Dirichlet posterior against its prior, in bits) and the surprise absorbed since the last record without changing anything. Window measured with khora's `dmdWindow` over 200 seeded orders (stable window median 4, p95 16, max 32); no single edition is pivotal. Read it: `node eotm-cli.mjs mind.eot` |
| `build-mind-props.mjs` | DMD | second conclusion in the same log: the propositions the Declaration makes (five hand-adjudicated readings, majority rule): 4 DMDN records, 128 of 138 propositions stand. Five witnesses, so hand-adjudicated evidence, not a mechanical convergence |
| `read-beings.mjs`, `build-mind-beings.mjs` | DMD | third conclusion: which units of the Declaration the languages themselves bind together, read with the stack's ear and heard-nominals tier (no capitals) in every edition that has a POS prior. 233 editions (209 language codes) of 515 are readable; 245 have no prior and 4 lack all 31 units, 33 yield no beings. The conclusion is the set of **mutual nearest-neighbour unit pairs** by shared beings: 9 pairs (0-26, 3-6, 4-5, 7-12, 8-10, 14-29, 15-17, 23-25, 28-30), against a shuffled-label null of at most 6 over 200 draws (mean 2.2). The pre-registered claim holds, narrowly. It is NOT a majority structure (no unit's modal neighbour is carried by half the editions; mean share 0.235 vs null 0.063) and it needs the whole set: the stable window is 233 of 233 under every order, the pair set still changes at edition 177, no single edition is pivotal. 35 DMDN records |
| `lookup.mjs`, `revise.mjs` | as-needs | outside evidence (Wiktionary now, Wikidata later) is consulted ONLY for a being the POS prior has never seen; `settle` is a pure cache-backed function and ingestion never waits on the network. When an answer re-reads an edition, `applyEvidence` appends a `REVISE` record (plus a fresh GROUND) only if the conclusion moved; otherwise the log is byte-identical. Needs on the real data: 77 of 233 editions raise any, median 0, p90 24, max 188, 1,870 distinct words in all (UD-treebank priors raise 1,998 of the 2,022 needs, English-projected ones 3). The pilot five need about 35 lookups. No live lookups have been run beyond 25 cached Wikidata ones |
| `hyperlexicon-link.mjs`, `build-mind-hyperlexicon.mjs` | link | the hyperlexicon linked at ingestion: stated relations are `given` rows bound to the charter root (license under it, not under the Article-3 stub), the 10 interpretive readings and every beings pair are `candidate` rows with the voting editions as witnesses; a change to the table is a record in the `udhr-core/hyperlexicon` domain. Over the 170 independent editions: 34 records, 25 rows at the end (6 given, 19 candidate), none of the 9 beings pairs coincides with an interpretive candidate. Run on a scratch copy (`_scratch.eot`); not in the published log |
| `derive-gold.mjs`, `score-aligner.mjs`, `gold/` | wording probe | tight spans for the 5 hand-adjudicated editions, the 20 residue slots adjudicated, a pre-registered aligner scoring with a leak guard. Result: no mechanical aligner clears the bar; wording is **not** covered |

Read `PROBE-CLAUSE-ALIGNMENT.md` and `PLAN-GOLD-SPANS.md` for the wording findings.

## What it does not claim

- Convergence is shown at the paragraph-structure grain only. What the editions *say* is not aligned.
- Statedness of each relation is read in English; other editions witness it through alignment of the stating paragraph.
- Language stem is the only independence proxy; translation ancestry is not recoverable from the sidecars.
- khora's `defaultGround()` (Article 3 only) is untouched. `charter.mjs` builds the full charter beside it; swapping it in is a separate decision. Stated relations are carried on the charter but not bound as hyperlexicon affordances: khora has no composition semantics for them yet.
- `build.mjs` rewrites the log; `run-convergence.mjs` (called by `all.mjs`) refiles the convergence event, and the epoch on `epochs.json` is append-only.
