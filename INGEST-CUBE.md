# The ingest, stage by stage, on the cube

Zenodotus is the corpus; the pharos is the model and its activation paths. This file matches each stage of making the one from the other to a cell of the 27-cell cube (`khora/native/docs/THE-27-CELLS.md`, the registry `khora/native/organs/capacities.js`; pharos `cells.json`), and records what each stage's falsifier found. A cell types an ACT, never content; the registry rows below are quoted, the mapping to our stages is this file's own reading and is marked where it disagrees with what we write.

State read: khora `d7b6410`, pharos `776269b`, Zenodotus branch `ccr-40ad7623-3d1ajm`, hyperlexicon head `997d3665b8acc8bfd9db23ea649ed2e480cd165ffa59cf0ffd38dd6a50af40a3` (built from the `v2` Wiktionary pack, no `v3`, no Spanish giver, no dates input). 2026-11-27.

## The three memory tiers the codebase already defines (`the-fold/field-of-record.js`, `relative.js`)

| tier | holds | here |
|---|---|---|
| holograph | the full tokens and the address; the only tier the mouth reads | Zenodotus itself, never restated |
| shadow | state and address, no words: "a lien on content" | what the pharos holds: sources, beings, activation spans |
| echo | a coarse state and the address: "something like this was said here" | what falls out of the field but stays on the record |

The size knob is resolution. The pharos holds shadows, not holographs.

## Stages

| # | stage | the act | cell (registry name) | written today | match |
|---|---|---|---|---|---|
| 0 | the corpus | the ground a figure is read against | Ground grain; no write | Zenodotus bytes | n/a |
| 1 | provenance | cut a document out as an entity, addressed by hash | NUL·Figure (`clear`, `grain`) | `source` NUL·Figure | yes |
| 2 | perceive | birth of a being from a read | INS·Figure (`cast`, SIG+INS, Entity) | `being` INS·Figure | yes |
| 3 | identify | a pronoun resolves to a referent | SIG·Figure (`cast`: "referent identity: names resolve to WHO") | `binding` CON·Figure | **disagrees**: by the registry's prose, a pronoun-to-referent link is identity (SIG), and CON·Figure `relations` is the subject-verb-object edge |
| 4 | relate | a subject-verb-object edge, span-verified | CON·Figure (`relations`) | `karaka` SYN·Pattern | **disagrees**: SYN·Pattern is `graph` (relations chained to neighbours) |
| 5 | predict | the given: dictionary senses, priors | DEF·Figure (`priors`), DEF·Pattern (`declare`) | `definition` DEF·Figure | yes |
| 6 | compare | how far the reading moved from what was predicted | EVA·Ground (`atmosphere`, the startle meter), EVA·Paradigm (`consequence`) | nothing: the gate drops the surprise measure | **missing** |
| 7 | encode | carry only the residual | shadow tier | everything per pronoun (402 B per binding) | **violates** |
| 8 | index | a referent's places, as byte spans checked against the bytes | CON·Figure (`relations`: "every edge span-verified against real bytes") | `activation` CON·Figure | yes |
| 9 | consolidate | a re-sighting folds into the same note, witnesses and spans unioned; stands at 2 independent sources | SYN·Figure (`hear`), EVA·Paradigm (`standing`), CON·Paradigm floor of 2 (`network`) | nothing | **missing** |
| 10 | forget | a singleton stays on the record, out of the field | NUL·Figure `clear`: refusal `below_recurrence_floor` | nothing | **missing** |
| 11 | re-ground | a moved ground is rebuilt, never streamed | REC·Ground (`regime`), REC·Atmosphere (`dream`) | the head and versions are in each entry's basis | partial |
| 12 | recall | "have I met this, and where"; then fetch the holograph | SIG·Entity (`recall`, `relative.js`) | the machinery exists, not wired to this pharos | **missing** |

The two `disagrees` rows are not changed here: they are in khora's gate, and which typing is right is the owner's call.

## Falsifiers and what they found

All on 7 documents (4 shards), exploratory, English only; none is a held-out result.

| id | claim | test | result |
|---|---|---|---|
| F1 | an activation span points at the being's own mention (cube P56: every edge span-verified against bytes) | read the bytes at each (start, length) in Zenodotus and compare with the surfaces the gate recorded for that being | 18,266 spans: 13,777 equal as recorded (75.4%); 4,489 equal after punctuation and whitespace are normalized; 0 other. The addresses hold. Strict string equality is the wrong check: the reader normalizes surfaces ("Mr. Job Daone." against "Mr Job Daone"). One reader defect surfaced: a being "GUILTY Tried" spans a paragraph break |
| F2 | most of what a read admits does not recur, so the field should hold only what clears the floor of 2 | refs appearing in at least 2 of the 7 documents | 3,182 refs, 271 in 2 or more (8.5%): singleton share 91.5%. An upper bound on the singleton share; 7 documents is too few. Prediction to test at 100+ documents: the share falls but stays a majority |
| F3 | the stored bindings carry far more than their information | empirical entropy of 30,472 bindings (pronoun, agreement, referent) against stored size | 402 B stored, about 3.7 B of entropy; agreement given pronoun is 0.00 bits. Ratio about 108 |
| F4 | the hyperlexicon's use addresses resolve (English) | 5 words, 300 uses each, bytes read from Zenodotus | 1,500 of 1,500 |
| F5 | the whole read is taken, never a slice | `readCharacters` against the work's length; the last sentence's end | no cap in `read-core.mjs`; the `surprise` measure alone is capped at 3,000 tokens and is not written |

## Not yet run

- Recurrence at scale (F2) and the singleton share in the larger sample.
- The grain theorem (`declare`, DEF·Pattern): a corpus can refute a Pattern-grain claim but never earn one. A usage profile (roles, company) is built from the corpus alone; by that theorem it should be marked CANDIDATE, not GIVEN.
- Recall (stage 12): activate a being from a cue, fetch its spans, and check that the answer matches the stored binding.
- Which of stages 3 and 4 the cube really means; a decision for the owner.

## Operational finding

The container restarted twice while the shards ran (uptime 4 min, then 2 min), killing the shards and the door each time; only 7 documents were read in total. A long read needs either a store that survives restarts or a job that survives them.
