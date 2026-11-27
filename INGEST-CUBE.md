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
| how far the stream moved from what was predicted | EVA·Ground (`atmosphere`), EVA·Figure (`volatility`) | not written (the read computes `surprise`, the gate drops it) |
| DMD here | a binding whose agreement the pronoun already gives carries 0 bits (F3): no difference, not to be carried | **carried**: every binding, 402 B each |

Identity and link are two acts: SIG·Figure decides who, CON·Figure is the link that records it. The gate writes the second only.

### Document

| act | cell (registry) | written |
|---|---|---|
| the document's edges composed into one network, deduped | SYN·Pattern (`graph`) | `karaka`, `part_of`, `identity` SYN·Pattern (one set per read) |
| a re-sighting inside the document folds into the same note | SYN·Figure (`hear`) | implicitly: one `being` per ref per read |
| a referent's places, as byte spans checked against the bytes | CON·Figure (`relations`: "every edge span-verified against real bytes") | `activation` CON·Figure |
| DMD here | a description that does not recur is a mention, not a referent: `weaveReferents` keeps a nominal only when `mentions > 1` | applied for nominals only; names are kept at one mention |

The kāraka edge is CON·Figure as one edge at the clause and SYN·Pattern as the document's composed network; the gate writes the second, deduped by head, role and argument per read. That is the document-level use, not a misfiling.

### Corpus

| act | cell (registry) | written |
|---|---|---|
| a document cut out of the corpus as an entity, addressed by hash | NUL·Figure (`clear`) | `source` NUL·Figure (ours; the mind pharos uses the same) |
| the same document as the ground its read stands on | INS·Ground (`preflight`: generating ground) | khora `text` INS·Ground carries the text itself; we do not write it (no restatement) |
| a being seen in a second document folds into the same note, witnesses unioned | SYN·Figure (`hear`) | **missing**: `being` addresses are `ref:auto:<name>` with document-free spans, so a second sighting cannot union witnesses |
| a claim's standing across independent witnesses | EVA·Pattern (`standing`), floor of 2 in CON·Pattern (`network`, `RECURRENCE_FLOOR = 2`) | **missing** |
| below the floor: on the record, out of the field | NUL·Figure (`clear`, refusal `below_recurrence_floor`) | **missing** |
| the night: day's deposits judged, the field projected | REC·Ground (`dream`, consolidation.js) | **missing** |
| DMD here | what recurs across documents is the corpus's difference to the reader | not computed |

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
| have I met this, and where (the shadow) | SIG·Figure (`recall`, relative.js) | **missing**: not wired to this pharos |
| activation: referents, their sentences, one hop out | CON·Figure and CON·Pattern (activation-retrieval.js) | machinery exists |
| DMD here | `dmdCut`: show one more sentence only if it changes the reach (`resolutions.js`) | machinery exists |
| the mouth reads the holograph at the address | penelope (Generate) | not wired |

## Memory tiers (resolution, not grain)

`khora/native/the-fold/field-of-record.js` and `relative.js` define three tiers by resolution: the holograph (full tokens and address: Zenodotus), the shadow (state and address, no words: the pharos), the echo (coarse state and address). The size knob is resolution. The tiers are orthogonal to the grains; an earlier version of this file said they coincide, which was unsupported.

## Falsifiers and what they found

All exploratory, English only, 7 documents (4 shards) unless stated; none is held out.

| id | level | claim | result |
|---|---|---|---|
| F1 | document | an activation span points at the being's own mention | 18,266 spans: 13,777 equal a recorded surface; 4,489 equal one after punctuation and whitespace are normalized; 0 other. Strict equality is the wrong check (the reader normalizes surfaces). One reader defect surfaced: a being "GUILTY Tried" spans a paragraph break |
| F2 | corpus | most referents do not recur across documents (DMD at the corpus level) | 3,182 refs, 271 in 2 or more documents: 91.5% singletons. Upper bound; 7 documents is too few. Prediction for 100+ documents: the share falls but stays a majority |
| F3 | clause | stored bindings carry far more than their information (DMD at the clause level) | 30,472 bindings: 402 B stored, about 3.7 B of entropy; agreement given pronoun 0.00 bits |
| F4 | corpus (janus) | the hyperlexicon's use addresses resolve | 5 words, 300 uses each: 1,500 of 1,500 |
| F5 | document | the whole document is read | no cap in `read-core.mjs`; only the `surprise` measure is capped (3,000 tokens) and it is not written |

## Corrections to the first version (commit `c42fccf8`)

- Cell ids written as "CON·Paradigm", "EVA·Paradigm", "REC·Atmosphere" and "SIG·Entity" mixed terrain names into cell ids; they are CON·Pattern, EVA·Pattern, REC·Ground and SIG·Figure.
- One cell per stage was the wrong shape: an act happens at a level, and a stage is several acts. The two "disagrees" verdicts (binding, kāraka) are withdrawn: each is a second, legitimate use (link beside identity; the document's composed network beside the clause's edge).
- The claim that memory tiers coincide with grains is withdrawn.

## Not yet run

- F2 at 100+ documents.
- Recall end to end: a cue activates a being, its spans are fetched, and the answer is checked against the stored binding.
- Whether existing `usage` entries need a CANDIDATE standing under the grain theorem.

## Operational finding

The container restarted twice while the shards ran (uptime 4 min, then 2 min), killing the shards and the door each time; only 7 documents were read. A long read needs a store or a job that survives restarts.
