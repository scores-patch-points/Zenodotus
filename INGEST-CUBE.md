# The ingest on the cube, level by level

Zenodotus is the corpus; the pharos is the model and its activation paths. This file places each act of turning the one into the other on the 27-cell cube, at each holon level where the act happens, and records what each falsifier found.

State read: khora `d7b6410`, pharos `776269b`, Zenodotus branch `ccr-40ad7623-3d1ajm`, hyperlexicon head `997d3665b8acc8bfd9db23ea649ed2e480cd165ffa59cf0ffd38dd6a50af40a3` (built here from the `v2` Wiktionary pack; no `v3`, no Spanish giver, no dates input). 2026-11-27.

## Terms

- **A cell types an act, never content** (`khora/native/docs/THE-27-CELLS.md` §1). Cell = operator × grain; operator = (mode, domain): NUL SIG INS Differentiate/Relate/Generate over Existence, SEG CON SYN over Structure, DEF EVA REC over Interpretation.
- **One act can use several cells, and the same cell recurs at every level.** Every level of a piece is a whole with its own nine operators and its own Ground, Figure and Pattern (`khora/native/organs/void-holarchy.js`). A stage is therefore not one cell: it is a set of acts, each at a level.
- **DMD is the difference that makes a difference** (Bateson): the Pattern grain, "the difference the being MADE" to the next ground (`khora/native/docs/THE-WHEEL.md`). At every level, what the pharos keeps is that level's Pattern: the difference a figure made. A figure that made no difference is not carried; it stays on the record by address.
- **Cell names below are generated**, not hand-tallied: each registry row of `khora/native/organs/capacities.js` (op, terrain) is resolved against `pharos/cells.json` to exactly one cell id; all 56 rows resolve, to 58 placements (two rows, `cast` and `parseGatedNames`, are SIG+INS), and every one of the 27 cells has at least one.

## The two holarchies

**The nexus** (the map's L0–L3). The stages belong to the body that owns their mode:

| body | level, mode | its acts in the ingest |
|---|---|---|
| Zenodotus | L2 satellite | the corpus: the holograph, never restated |
| khora | L1, Differentiate | perceive, cut, admit, measure: the read and the gate's entries |
| janus | L1, Relate | relate words across the corpus: the hyperlexicon door, company, word evidence |
| penelope | L1, Generate | the record and the mouth: recall turned into speech |
| pharos | L1, the medium | the log every body writes to and reads from |

Boundary question, not resolved here: `scripts/read-corpus.mjs` lives in Zenodotus but drives khora's door. Zenodotus "doesn't include the reading machinery"; the script reads nothing itself and calls the canonical door, as `build-corpus-lexicon.mjs` already did, but whether it belongs in khora is the owner's call.

**The void holarchy of the material.** clause → sentence → document → corpus → the reader's priors. The table gives each level's three grains for this ingest.

| level | Ground (what it is read against) | Figure (one difference) | Pattern = DMD (the difference it made) |
|---|---|---|---|
| clause / sentence | the grammar and the priors | a mention, a binding, an edge | what the priors did not predict |
| document | the document as the text the read stands on | the document's read: its beings and edges | what recurs inside the document |
| corpus | the corpus | one document's contribution | what recurs across documents (2 or more) |
| the reader | the priors before | the compiled corpus model | the change in what the next read primes from |

## Acts, by level, with their cells

Registry names in parentheses. "Written" is what the code writes today.

### Clause and sentence (inside one read)

| act | cell (registry) | written |
|---|---|---|
| cut a sentence or clause | SEG·Figure (`patch` is the cut primitive) | khora `text-cuts` SEG·Figure (pharos-reading.mjs, not called by us) |
| a mention is born as a being | INS·Figure (`cast`, its INS half) | `being` INS·Figure |
| a name or pronoun resolves to WHO | SIG·Figure (`cast`, its SIG half; `parseGatedNames`) | not written as its own entry |
| the resolved link, mention to being | CON·Figure (`relations` is the link cell) | `binding` CON·Figure |
| one kāraka or subject-verb-object edge | CON·Figure (`relations`, `positionalSlots`) | not written per edge |
| a being's class from its pro-forms | DEF·Figure (`priors`, `what`) | `gender`, `proform` DEF·Figure |
| how far the stream moved from what was predicted | EVA·Ground (`atmosphere`), EVA·Figure (`volatility`) | `surprise` EVA·Ground, one per document, numbers only (read-corpus.mjs); the reader caps it at its own 3,000 tokens and the basis says so |
| DMD here | a binding whose agreement the pronoun already gives carries 0 bits (F3): no difference, not to be carried | **carried**: every binding, 402 B each |

Identity and link are two acts: SIG·Figure decides who, CON·Figure is the link that records it. The gate writes the second only.

### Document

| act | cell (registry) | written |
|---|---|---|
| the document's edges composed into one network, deduped | SYN·Pattern (`graph`) | `karaka`, `part_of`, `identity` SYN·Pattern (one set per read) |
| a re-sighting inside the document folds into the same note | SYN·Figure (`hear`) | implicitly: one `being` per ref per read |
| a referent's places, as byte spans checked against the bytes | CON·Figure (`relations`: "every edge span-verified against real bytes") | `activation` CON·Figure, ONE entry per document: each being's ref and byte spans, no surface string, basis once |
| the day: the door hears the read's own edges | INS·Figure (first sighting, `kernel/notes.js`) | `deposit` INS·Figure, one per document: each admitted note as sha256[0:16] of its noteId and its byte spans; no text |
| DMD here | a description that does not recur is a mention, not a referent: `weaveReferents` keeps a nominal only when `mentions > 1` | applied for nominals only; names are kept at one mention |

The kāraka edge is CON·Figure as one edge at the clause and SYN·Pattern as the document's composed network; the gate writes the second, deduped by head, role and argument per read. That is the document-level use, not a misfiling.

### Corpus

| act | cell (registry) | written |
|---|---|---|
| a document cut out of the corpus as an entity, addressed by hash | NUL·Figure (`clear`) | `source` NUL·Figure (ours; the mind pharos uses the same) |
| the same document as the ground its read stands on | INS·Ground (`preflight`: generating ground) | khora `text` INS·Ground carries the text itself; we do not write it (no restatement) |
| a being or note seen in a second document folds into the same note, witnesses unioned | SYN·Figure (`hear`) | `standing-being`, `standing-note` SYN·Figure (consolidate-corpus.mjs), witnesses and sources only, `of` the night |
| a claim's standing across independent witnesses | EVA·Pattern (`standing`), floor of 2 in CON·Pattern (`network`, `RECURRENCE_FLOOR = 2`) | the floor applied by khora's own `projectField` (floor 2, window null); sources counted with `sourceOfWitness` |
| below the floor: on the record, out of the field | NUL·Figure (`clear`, refusal `below_recurrence_floor`) | `echo` NUL·Figure, one per night: the counts, the refusal, the night's basis once; each echoed item stays in its document's deposit or index |
| the night: day's deposits judged, the field projected | REC·Ground (`dream`, consolidation.js) | consolidate-corpus.mjs runs the projection only; the elenchus (a witness judging a single-witness note) is not run |
| DMD here | what recurs across documents is the corpus's difference to the reader | computed per night (F2) |

`source` has three precedents: NUL·Figure (the mind pharos, this ingest), INS·Figure (khora identity scripts, a source as a born being), INS·Ground (khora `text`). They are different acts at different levels, not one act filed three ways.

### The reader (priors)

| act | cell (registry) | written |
|---|---|---|
| the given half: dictionary senses | DEF·Figure (`priors`) | `definition` DEF·Figure (ingest-dictionary.mjs) |
| a usage profile (roles, company) learned from the corpus alone | DEF·Pattern (`declare`: a corpus can refute a Pattern-grain claim, never earn one: REFUTED or CANDIDATE, never GIVEN) | `usage` DEF·Figure, standing unmarked: **to be checked** |
| sedimented readings compiled into one carried ground: pointers with givers, typed gaps, never copies; compiling never promotes a standing | SYN·Ground (`compile`) | the hyperlexicon door is the closest built thing; not compiled from the read entries |
| the ground re-zeroed when the priors move | REC·Ground (`regime`) | partial: the hyperlexicon head and the door are in each entry's basis |
| DMD here | the change in what the next read primes from | not measured |

### Recall (a chat turn)

| act | cell (registry) | written |
|---|---|---|
| have I met this, and where (the shadow) | SIG·Figure (`recall`, relative.js) | recall-corpus.mjs: the cue read by the same door, its beings looked up in the index and the field |
| activation: referents, their sentences, one hop out | CON·Figure and CON·Pattern (activation-retrieval.js) | machinery exists |
| DMD here | `dmdCut`: show one more sentence only if it changes the reach (`resolutions.js`) | machinery exists |
| the mouth reads the holograph at the address | penelope (Generate) | recall-corpus.mjs opens the bytes and the line at each address; turning them into speech (penelope) is not wired |

## Memory tiers (resolution, not grain)

`khora/native/the-fold/field-of-record.js` and `relative.js` define three tiers by resolution: the holograph (full tokens and address: Zenodotus), the shadow (state and address, no words: the pharos), the echo (coarse state and address). The size knob is resolution. The tiers are orthogonal to the grains; an earlier version of this file said they coincide, which was unsupported.

## Falsifiers and what they found

All exploratory, English only; F1 to F5 on 7 mixed documents, F1b to F10 on 32 Old Bailey documents (`20-first-person-voices/old-bailey`, under 30 KB each); none is held out.

| id | level | claim | result |
|---|---|---|---|
| F1 | document | an activation span points at the being's own mention | 18,266 spans: 13,777 equal a recorded surface; 4,489 equal one after punctuation and whitespace are normalized; 0 other. Strict equality is the wrong check (the reader normalizes surfaces). One reader defect surfaced: a being "GUILTY Tried" spans a paragraph break |
| F2 | corpus | most referents do not recur across documents (DMD at the corpus level) | 3,182 refs, 271 in 2 or more documents: 91.5% singletons. Upper bound; 7 documents is too few. Prediction for 100+ documents: the share falls but stays a majority |
| F3 | clause | stored bindings carry far more than their information (DMD at the clause level) | 30,472 bindings: 402 B stored, about 3.7 B of entropy; agreement given pronoun 0.00 bits |
| F4 | corpus (janus) | the hyperlexicon's use addresses resolve | 5 words, 300 uses each: 1,500 of 1,500 |
| F5 | document | the whole document is read | no cap in `read-core.mjs`; only the `surprise` measure is capped (3,000 tokens) and it is not written |
| F1b | document | as F1, on the Old Bailey run (32 whole documents, 528K characters), with the falsifier script | 16,949 spans: 100% open onto a surface the reader recorded for that being; 85.4% equal its birth name. The 14.6% are aliases, some conflations: the being "Carter Lane London" holds every bare "London" of its document; "Murdering Robert Reeks Yeoman" carries a capitalized verb |
| F2b | corpus | as F2, Old Bailey, 32 documents, after the night | beings 4,949: 1,117 stand (22.6%), singleton share 77.4% (91.5% at 7 mixed documents); notes 10,098: 239 stand (2.4%). One homogeneous collection, so recurrence is likely higher than in a random sample |
| F6 | document | the compact index (one entry per document) changes nothing the night decides | two day runs, the old per-being shape and the compact one: identical field (239 notes, 1,117 beings, same totals); the index file 1,377,071 to 241,327 bytes per shard |
| F7 | document | the day is reproducible, so an echoed note can be re-opened by re-reading | two independent reads of the same 32 documents: 32 of 32 deposits byte-identical |
| F8 | recall | a cue's beings are found and their addresses open onto them | a 255-character cue admitted 7 beings; all 7 met, 6 standing (2 to 21 documents); every opened address read its being's bytes (e.g. `old-bailey-16811017.txt#12260+7` "Newgate") |
| F9 | recall | a short cue can be recalled | refuted: the canonical door reads nothing under 200 characters (`read-core.mjs` `minCharacters = 200`, not passed by `readToWeft`); a short cue is answered with the reader's gap, never a string search |
| F9b | recall | as F9, after the fix | `readDocument` already took a caller's `minCharacters`; recall-corpus.mjs now declares it (default 1: a cue is read whole whatever its length). khora `636a605` makes `readToWeft` take it too (the two doors equal; `native/tests/min-characters-door.test.mjs` fails on the old door). A 49-character cue, "Who was sent to Newgate, and who died at Tyburn?", admitted both beings and opened their addresses |
| F10 | document | the reader admits beings by a name signal | on 17th-century English the capitalized common nouns stand as beings across documents: Felony (23), Tryal (22), Indictment (22), Court (21), Death (20); "john" stands in 19 documents as one ref |

## Corrections to the first version (commit `c42fccf8`)

- Cell ids written as "CON·Paradigm", "EVA·Paradigm", "REC·Atmosphere" and "SIG·Entity" mixed terrain names into cell ids; they are CON·Pattern, EVA·Pattern, REC·Ground and SIG·Figure.
- One cell per stage was the wrong shape: an act happens at a level, and a stage is several acts. The two "disagrees" verdicts (binding, kāraka) are withdrawn: each is a second, legitimate use (link beside identity; the document's composed network beside the clause's edge).
- The claim that memory tiers coincide with grains is withdrawn.

## Size, measured on the Old Bailey run

Per 8 documents (about 130K characters): the gate's own `khora.phb` (being, binding, gender) 1.16 MB, 83% of the model directory; the compact index and deposits 0.24 MB; the night's field for all 32 documents 0.63 MB. The remaining weight is the gate's clause-level write (a binding per pronoun, agreement the pronoun already gives); shrinking it is a change to khora's gate, not made here.

## Fixed in khora (local commits on `ccr-40ad7623-3d1ajm`, not pushed)

| problem | fix | measured |
|---|---|---|
| the two front doors differed on `minCharacters` | `readToWeft` passes a caller's declared floor through; default 200 unchanged | new test fails on the old door, passes on the new; gate: the same 7 pre-existing failures |
| the gate wrote a read entry by entry (`weave()` builds the whole log's view per entry) | one `weaveMany` per read; kinds checked by `missingKinds`; a repeat within a read, or an address-global repeat across reads, written once | 8 Old Bailey documents into one log: the same 6,120 distinct entries as the old gate; 87.3 s to 15.2 s; 10% fewer bytes |
| binding addresses `bind:<offset>` repeated across documents (heads at one address mixed documents) | `bind:<sha16 of the text>:<offset>`, as `weaveReferents` addresses; being addresses stay `ref:auto:<name>` (penelope's referent graph keys on them, by design) | no consumer reads the binding address (searched khora, janus, penelope, the-fold, holodeck) |
| "DMD" named two things | DMD is only Bateson's; the Koopman decomposition is `kernel/koopman.js` (`koopmanModes`, `createStreamingKoopman`); penelope's one import follows | khora gate: the same 7 pre-existing failures |

## Still blocked

- **Capitalized common nouns admitted as beings (F10), and part-name absorption (F1b).** Both are changes to how the reader admits and merges beings, and khora ships a reading change only measured against gold. The gold (UD English GUM, pinned in `eval/reading-baseline/BASELINE.json`) is not in this checkout, and its download was refused here. Measurement needs that file (or LitBank / CorefUD dev) on the machine.
- **The night's elenchus.** khora's `dream` runs `corroborateLedger`, whose witness is an injected `ask` and whose passage selection matches surface words (`TEXT_CONTENT_WORD`, `indexOf`). With no LLM in the loop and no reasoning on surface strings, it is not run; the night applies the projection only. A typed gap, not a silent omission.

## Not yet run

- F2 at 100+ documents, and on a random sample rather than one collection.
- The elenchus at night (a witness judging each single-witness note), which `dream` runs and the projection alone does not.
- Whether existing `usage` entries need a CANDIDATE standing under the grain theorem.

## Operational finding

The container restarted twice while the shards ran (uptime 4 min, then 2 min), killing the shards and the door each time; only 7 documents were read. A long read needs a store or a job that survives restarts.
