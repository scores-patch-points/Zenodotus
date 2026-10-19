# Plan: tight proposition spans in the five gold editions, so an aligner can be scored

Goal: for eng, spa, arb, cmn_hans, swh, give every hand-adjudicated proposition a byte span for each of its slots (subject, relation, object) inside its paragraph. Then any aligner for the other 510 editions can be scored against it, and the leave-k-out test can be extended from paragraph structure to wording.

## What the probe found (the plan depends on it)

No fresh hand annotation is needed for most of it. Every gold proposition already carries its own surface strings:

- `udhr-*.txt.hand.eot.jsonl` rows have `end1` (subject), `label` (relation), `end2` (object), as text copied from that edition. The golden.json files (`janus/priors/udhr-{arb,cmn_hans,spa,swh}.golden.json` and `udhr.golden.json` for English) also carry `subject`/`relation`/`object`, a paragraph-wide `span`, and a short `anchor` phrase.
- Searching those strings inside the row's paragraph (whitespace-insensitive, exact) locates **93-95% of slots uniquely** in all five editions (`probe-spans.mjs`):

| edition | slots | unique | repeated in paragraph | not found |
|---|---|---|---|---|
| eng | 282 | 262 (93%) | 15 | 5 |
| spa | 286 | 267 (93%) | 9 | 10 |
| arb | 286 | 273 (95%) | 9 | 4 |
| cmn_hans | 298 | 276 (93%) | 21 | 1 |
| swh | 319 | 298 (93%) | 20 | 1 |

- The unfound ones are mostly annotation, not text: an implied copula marked like `[es] esencial`, or a verb phrase the annotator split (`have reaffirmed`). Those are expected to have no surface span.
- Subject < relation < object order holds in 71-81 of ~76-86 fully located rows for eng/spa/cmn/swh but only 52/80 for Arabic. Order is a property of the language, so it must be recorded, not assumed.

## Steps

1. **Freeze the inputs.** Record sha256 of the 5 hand jsonl files and the 5 golden.json files in a manifest. Nothing under `Zenodotus/` or `janus/priors/` is edited; the new gold is a sidecar `gold/udhr-<code>.spans.jsonl` that points at the existing observation by `id`/`prop` and is append-only (supersede by pointer, as the hyperlexicon record does).
2. **Derive spans mechanically.** For each row, find end1/label/end2 inside the row's `at` paragraph. Outcomes, decided by fixed rules and not by thresholds:
   - `unique`: one occurrence.
   - `disambiguated`: several occurrences, resolved by (a) the golden `anchor` phrase location, then (b) the slot nearest its sibling slots, then (c) the `ground` tree (a child clause must sit inside its parent's span).
   - `ambiguous`: still more than one candidate after (a)-(c). Goes to the residue list, no guess.
   - `implicit`: no surface in the text (copula marker, `[es]`-style notation). Recorded as having no span, which is a legitimate gold value.
   - `missing`: a surface that should exist but is not found. Goes to the residue list.
3. **Residue.** Roughly 20-40 slots per edition (~5-13% by the table above, including implicit ones). I propose a span for each with a one-line reason; **you confirm or correct**, because for arb, cmn_hans and swh I am the weakest reader and the gold's value is that a human adjudicated it. Entries are filed with `handAdjudicated: true` and who decided.
4. **Validate the gold itself before trusting it.** (a) every span lies inside its paragraph; (b) children lie inside parents along the `ground` path; (c) the three slots of a row do not overlap; (d) the `ground` tree shape for a shared `prop` id is the same across the five languages (117 props are carried by all five; a mismatch is a finding about the gold); (e) re-deriving gives identical output (determinism); (f) the 31 heading rows are kept as whole-line spans.
5. **Score harness (`score-aligner.mjs`).** An aligner is a function `(edition text, paragraph referent, list of prop ids) -> predicted slot spans`. Scored per language, per slot, and per sentence by: exact-boundary match, byte-overlap IoU, and whether predicted order matches gold order. Baselines first so numbers mean something:
   - B0, whole paragraph for every slot (the floor).
   - B1, punctuation clauses assigned in order (the probe's cue; r = 0.25-0.59 against proposition counts).
   - B2, English-pivot proportional position. This one is a pivot and is labelled as such; it is a comparison, not a candidate for the core.
   - B3, the stack's own readers: eoreader7 plus the per-language `derived-priors` (pos, pronoun, etc.).
6. **Leak guard.** The `propositions` in the per-edition `*.txt.eot.json` sidecars of these five editions ARE the hand readings (they carry `prop` ids). An aligner under test must not read those five sidecars or the golden/hand files; only the raw text and priors. The harness enforces this by running the aligner in a context where those paths are refused, and the test fails if they are opened. What the other 510 sidecars contain in `propositions` has not been checked and must be checked before using them as B3 input.
7. **Extend convergence to wording (only if an aligner clears the baselines).** Mint proposition referents from the 117 shared ids, add edition membership at span level for the editions the aligner covers, and rerun leave-k-out with the same pre-registration discipline: claim and control fixed before the run. If no aligner clears B0 and B1 by a margin fixed in advance, the finding is that wording cannot be aligned mechanically yet, and it is filed as such.

## Lessons from reading all 95 non-unique slots by hand (eng, spa, arb, cmn_hans, swh)

Run `node probe-residue.mjs` (writes `residue.json`) and `node probe-lessons.mjs`. What the residue is made of, and what it changes in the plan:

1. **A relation is not a contiguous string.** English "have reaffirmed" is "have in the Charter reaffirmed"; "is entitled to" is "is entitled in full equality to"; "shall be imposed" is "shall a heavier penalty be imposed"; Spanish "tiene derecho al" is "tiene derecho, en todas partes, al"; Arabic "تهدف إلى" has its subject between the verb and the preposition. So a relation slot must be a **set of ranges** (ordered tokens with gaps and punctuation ignored), not one range. This is the largest group of "not found". Change: step 2 matches relation labels as an ordered subsequence inside the clause, and the gold stores a list of ranges.
2. **Repeats are common function words, and order does not fix them.** "All", "is", "shall be", "人人", "教育", "Elimu", "ana haki ya" recur across sentences of the same paragraph. I tried a monotone-order rule (each row takes the first occurrence at or after the previous row's): it agrees with the golden `anchor` on only 7/11 (eng), 5/7 (spa), 7/8 (arb), **6/17 (cmn_hans)**, 11/18 (swh). The `ground` ordinal (26.1.3) is a clause ordinal, not a sentence ordinal: two rows that share a coordinated subject sit in the same sentence (Article 7.1.1 and 7.1.2). Change: the golden `anchor` phrase is the primary disambiguator (it leaves exactly one candidate for 11/15, 7/9, 8/9, 17/21, 18/20 repeats); order is only a fallback and is reported as unreliable.
3. **Many rows share one occurrence.** "coordinated predicate shares 'All'" appears in the notes for English, Spanish, Chinese, Swahili. Two propositions can point at the same subject span, so the gold must allow many-to-one and must not demand unique occurrences per row.
4. **`resolved` subjects are not surfaces of that clause.** `subjectBasis` is `resolved` for 22-34 rows per edition. In all but 1-2 per edition the string is found by search, but in the rows I read (the ones with a `resolutionNote`) it is the **antecedent's** occurrence, not the clause's own (a pronoun, an ellipsis, a relative); I did not read all 22-34 per edition, so the share is unverified. Spanish "están dotados" carries its subject from the main clause; Arabic "ذلك" points to the object of another row; Swahili "usifanye" resolves to "kila mtu", which is not in the paragraph at all. Change: a resolved slot is stored as a **link to another slot's span** (`spanRef`), never as a fresh span of its own. Deriving it by string search would be a silent mislabel (it looks unique and is wrong).
5. **A slot can live outside its row's paragraph.** "The General Assembly" (and Spanish, Arabic equivalents) is in the one-line block *before* the "Proclaims…" block; the gold's own note says so. Change: the search window is the row's block plus its neighbours when the note says so; otherwise the row's block.
6. **The gold writes elided words in brackets.** `[es] esencial` marks a dropped copula; no surface exists. Change: bracketed tags classify the slot `implicit` and are never searched.
7. **Morphology breaks exact matching in some scripts.** Arabic "الرجل والمرأة" is written "للرجل والمرأة" (ل + ال contracts); Spanish "a el" is "al"; Chinese has no spaces, so short surfaces ("有", "平等", "侵害") also match inside longer words (hits 2-3). Change: a script-aware normalizer (contractions) and, for Chinese, word-boundary checks from the anchor; these remain the hardest residue and go to hand adjudication.
8. **The "Now, therefore / The General Assembly / Proclaims…" run is one sentence typeset as three blocks.** That is why the preamble has no majority paragraph structure across editions (step 4's finding). The preamble's paragraph boundaries are typographic. Lesson for the referent model: the preamble's real unit is the recital (sentence), not the block.

Counts that follow from this: the true residue, after anchor disambiguation, implicit tags and resolved links, is small and concentrated in (1) discontinuous relations and (7) morphology; subjects missing from the text are only 1-2 per edition.

## Cost and risk

- Steps 1, 2, 4, 5 are mechanical and small. Step 3 is the only human-in-the-loop work and is bounded by the residue list.
- Risk: the gold has 5 editions in 5 families, so it cannot say whether an aligner generalizes to the other 510 (scripts without spaces, agglutinative or polysynthetic languages). A pass here is evidence for those five, not for all.
- Risk: derived spans only exist where the annotator copied a surface string. Propositions whose slots are implied have no span, so recall at the clause grain is capped by the gold, not by the aligner.

## Decisions for you

1. Will you adjudicate the residue spans, or should I propose them and treat them as provisional?
2. Is B2 (English pivot) acceptable as a labelled comparison baseline, given the core must not privilege English?
3. Which "stack's readers" should B3 use: the existing mechanical reader in eoreader7 as it stands, or a new aligner built on the `derived-priors`?

## Result (run once, thresholds fixed beforehand in `score-aligner.mjs`)

Derived gold: 1,471 non-empty slots across five editions, the 20 residue slots were adjudicated (`gold/residue.json` is what was asked, `gold/residue-proposals.json` the answers, each slot in the spans files says who decided and with what confidence; item 20 is low). Link slots (resolved subjects) are excluded from scoring. Mean IoU of each aligner's predicted extent with the gold proposition extent (`score-report.json`):

| edition | props | B0 whole paragraph | B1 punctuation, in order | B2 English pivot | B3a stack's clauses, in order | B3o same, oracle pick |
|---|---|---|---|---|---|---|
| eng | 94 | 0.557 | 0.531 | n/a | n/a | n/a |
| spa | 96 | 0.524 | 0.511 | 0.772 | 0.254 | 0.352 |
| arb | 97 | 0.487 | 0.651 | 0.656 | 0 | 0 |
| cmn_hans | 102 | 0.433 | 0.471 | 0.649 | 0 | 0 |
| swh | 107 | 0.446 | 0.556 | 0.679 | n/a | n/a |

- **No non-pivot aligner clears the bar** (mean >= 0.50 and >= 0.10 above both B0 and B1). The stack's mechanical reader emits 200 clause propositions for Spanish but only 3 (header metadata) for Arabic and Chinese, so for those it has nothing to align; in Spanish even an oracle that picks its best clause (0.352) is below the whole-paragraph baseline.
- The English pivot (B2) clears in spa, cmn_hans and swh, not in arb (0.656 vs B1 0.651). It is a pivot, so it is not a candidate for the core; it only shows that relative position in the paragraph carries a lot of the signal.
- B0 is high (0.43-0.56) because many propositions cover most of a short paragraph. The extent metric is coarse; it cannot reward fine boundaries and it flatters whole-paragraph guesses.
- **Consequence, per the plan:** the leave-k-out test is NOT extended to wording. The finding is that wording cannot be aligned mechanically with what the stack has today, and for Arabic and Chinese the stack's reader needs clause-level output before any aligner can be built on it.

## Update: the priors were there, the readers were not using them

I had said clause-level output for Arabic and Chinese "would have to exist first". The ingredients do exist in `janus/priors` (khora/native/priors is a symlink to it): `pos-arb`, `pos-cmn-hans`, `pos-spa`, `pos-swh` (POSPrior@1), `role-config-arb`, `role-config-cmn-hans`, `role-config-spa` (RoleConfig@1), `frame-*`, `proclitics-arb`, `params-*`, and the closed classes in `khora/native/adapters/text/relation-priors-i18n.js` (auxiliaries, subject pronouns, determiners, clause openers, negation words for spa/arb/cmn). What I found by reading the code:

- The `.eot.jsonl` readings I scored come from `eoreader7/native/eval/lavar/eot-jsonl.mjs`, whose own header calls its non-English runs "a deliberate stress test ... not a claim of adapted support": same positional reader, only the POS prior and pronoun set swapped.
- The sidecar driver (`Zenodotus/scripts/eot-digest.mjs`) builds the reader with `relations.js` directly and never uses the language dispatch (`relationExtractorsFor`) or the RoleConfig priors. `relationPriorOptionsFor` in `relation-priors-i18n.js` has **no caller anywhere**; its header says "nothing here is wired in by default".
- The sidecars say the POS prior was "omitted — not in this environment". With the current checkout `posGateFor` loads the prior for arb, cmn, spa, swh and eng, so those sidecars predate it.

Wiring them in myself (`probe-priors-reader.mjs`, `probe-priors-positional.mjs`, whole UDHR text, no gold read):

| language | reader with i18n closed classes | positional reader per sentence (RoleConfig + POS + proclitics) |
|---|---|---|
| eng (default, for reference) | 11 edges | n/a |
| spa | 8 edges (was 4) | 1 relation / 99 sentences |
| arb | 0 edges | 2 relations / 103 sentences |
| cmn_hans | 0 edges | 0 relations / 100 sentences |

So wiring the priors helps Spanish and does nothing for Arabic and Chinese. What blocks them is downstream of the priors: referent discovery in `makeRelationReader` is capitalisation-based (no case in either script), and the positional reader refuses almost every sentence as ambiguous. The scoring result above stands; what changes is the diagnosis. The next move is a reader for caseless scripts built on these priors, not more priors. Neither has been built.
