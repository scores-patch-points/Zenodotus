# LaVar

**A reading agent that grades the reader, rebuilds the sidecars, and keeps its own mistakes**

*Standing: directive. Written against `eoreader7@cbf97b4` and `the-fold@e3bbd12`, 8 September 2026. Every measurement cited was run in this session. Named for LeVar Burton. Ships incrementally; no phase deletes anything until the phase after it measures better.*

**Constitution:** eo-constitution **II.6** (the book test — LaVar reads the source itself, never a surrogate), **II.2** (every prior LaVar lands names its giver), **II.9** (revision — the autonomy spiral is a witnessed revision of the reader; arrival is never verdict), **II.23** (every null LaVar's canon relies on carries a control built to fail), **III.3** (a missing prior is a typed gap, never a silently wrong number), **IV.4** (every LaVar revision cites the addresses and the entries that produced it). This charter is **agent policy under the constitution**, not an amendment: it changes no constitution text and carries no changed conformance test (IV.1), and per IV.2 it stands proposed for human disposal.

---

## 1. The problem it exists to solve

A fresh constitutional read of Crime and Punishment produced `ref:auto:marmeladov`, one referent holding «Sofya Semyonovna Marmeladov | Sofya Semyonovna | Marmeladov | Semyonovna | Sofya». A father and his daughter, folded into one being because they share a final token, licensed by a rule at `native/adapters/text/surfaces.js:72` whose own comment at line 22 says *structural, no witness needed*.

Zero merges were recorded on the whole book. The node was admitted that way in a single act, so `reviewMerges` and `refuteIdentity` cannot reach it.

Every property of the holograph held perfectly while this was true. The addresses resolved, the compression compressed, the two renders agreed because they are two walks over one return value and cannot disagree. What they agreed on was that a young woman and her father were one person.

This is not one bug. It is the shape of the failure the whole instrument is exposed to: **a reading can be wrong in a way nothing above the log can see.** #164 took anchor resolution from 34% to 44% this morning, so more questions now resolve confidently onto readings of exactly this kind. Better retrieval onto a wrong reading is worse than poor retrieval onto it.

LaVar exists because the record has no oracle and needs one, at least at the start.

---

## 2. What LaVar is

A frontier model running in Claude Code, reading source material directly and inspecting what the small reader produced from it.

The asymmetry is the whole design. The small reader is fast, cheap, structural, and blind in specific ways. LaVar reads the way a literate adult reads, catches what the small reader missed, and is far too expensive to be the reader. So LaVar is not a better reader. **LaVar is a grader, a reviser, and eventually a spot-checker**, and the goal is for it to be needed less over time.

LaVar does not write the reading. It reads the material, reads the sidecar, and records where they disagree.

---

## 3. The three things LaVar produces

**Revisions.** A superseding entry appended to the same reading log, using `store.js`'s existing `supersedes` field. The fold recomputes clean; the original entry stays in the ledger. This is the discipline `correction.js` already established from the 2026-09-05 direction, *we don't need a system that's always right, but we do need one that is actively learning to get better*.

**Live priors.** Composition affordances, kind parameters, and relational structure derived from readings LaVar has cleared, entering the hyperlexicon as given, with LaVar named as giver. This is the semi-stable universe the reader currently lacks.

**A mistake corpus.** Every revision, queryable as its own object, because the revisions are the curriculum. A reading with mistakes on file whose fold is nonetheless correct teaches more than a clean reading does.

---

## 4. The ladder

Difficulty is not ours to invent. McGuffey's Eclectic Readers are public domain, on Gutenberg, graded by a named 19th-century editor, and were built to teach reading by progressive difficulty in real literature rather than word lists. Seven rungs: the Primer, then First through Sixth.

Above them, public-domain children's and simple narrative material: Aesop, Grimm, Andersen, Beatrix Potter, Alice. Then short stories. Then the novels the corpus already holds, which is where the specimen lives.

The ladder's ordering is received, with a named giver, exactly as Phase 1 of the irreflexivity plan requires its relational-noun prior to be. It is not a difficulty metric we computed.

---

## 5. The dashboard

One file, `native/eval/lavar/dashboard.md`, rewritten each run. Two measured columns, because they diagnose different failures.

**Retrieval.** Already wired. `buildFactBank` in `native/eval/the-fold/lib/long-stream.mjs` produces facts, and `holograph-reading.mjs` scores whether a question reaches the right passage, with a redealt-address control now available in `holograph-redeal.mjs` (measured on Borodino: ADDRESS 5/23, redealt band [0,2] over 199 draws, p=0.0050).

**Comprehension.** Protagonist-centered narrative cloze, holdout-evaluated, per the event-chain work. Needs building. Tests whether the reader can predict what a character does next, which is a different thing from finding the passage.

**Revision rate**, the third column and the one that governs autonomy: revisions LaVar makes per thousand admitted notes, by rung.

**The reader's level is the highest rung where revision rate stays under the gate.** Level is a measured consequence, not a judgment LaVar renders. LaVar's opinion determines individual revisions; it does not determine the grade.

Each row also carries the rung's giver, the recipe hash, and the corpus, so a level always names the instrument that earned it.

---

## 6. The autonomy spiral

Three states per rung, and the gate is a number declared before the run.

**Checked.** LaVar reads every passage against every sidecar. Expensive, and where every rung starts.

**Sampled.** LaVar reads a declared fraction, drawn by seed, not by LaVar's sense of which passages look risky, because that biases the estimate toward what it already knows to look for.

**Cleared.** The reader admits alone; LaVar audits at long intervals and any regression returns the rung to Checked.

Advancement requires the revision rate to hold under the gate across two consecutive texts at that rung, not one. A single clean text is a lucky text.

**A rung the reader passes does not unlock the next rung until the next rung has been read at Checked at least once.** Difficulty is not linear and the ladder is a hypothesis about ordering, not a proof of it.

---

## 7. How LaVar makes an extremely good EOT sidecar

This is the procedure, not the principles. The principles are `eoreader7/native/READING-SPEC.md` S95–S99 and `live_priors/POLICIES.md` LP18–LP19, and they govern where this section is vaguer than they are.

**What LaVar is aiming at, stated as a number rather than a feeling.** Read against 801 hand-authored clause-level propositions (Alice ch1–3), the current reader recalls **11.4%**, emitting 454 arrangements against 91 a reader would draw. It is not under-producing; it is producing mostly the wrong things. **8.2% of all propositions are intransitive** and cannot be admitted at all under the present extraction gate. Any claim of improvement is measured against that reference or it is not a claim.

### The order of work, and why this order

1. **Build the golden BEFORE reading.** Author the reference by hand, clause by clause, then run the reader, then score. Reversed, it is calibration against the answer key. `eval/lavar/golden-tool.mjs` refuses to build a golden that fails either property: every anchor must resolve, and **every sentence must be accounted for** — a proposition, or an explicit `EMPTY` claim naming why a reader draws nothing there. Silence is forbidden, because an omitted sentence cannot be told apart from a missed one. The first golden written for chapter 3 held 47 propositions, its author believed it complete, and it was missing the chapter's entire ending; the coverage check found that, and re-reading would not have.

2. **Read the ORIGIN, never a copy.** A chapter is an observation at `[start,end)` on the preserved document, not a file carved out of it. Front matter is recorded with a role, never stripped. Extracting a chapter to its own file silently normalised CRLF to LF once already — a second origin, drifted, with every address in it wrong by one byte per line.

3. **Emit a ledger, not a document.** One observation per JSONL line, nesting **by address**; the source path appears once, on line 0. The tree is projected, never stored. The flat form this replaces spent 19% of its bytes repeating one path 741 times.

4. **Type every arrangement by its cube cell.** Verb → `CON·Figure` (Link). Preposition → `CON·Ground` (**Field** — a state, not a broken Link). Conjunction → `SEG·Figure`. A class that cannot head a relation at all (noun, adjective, adverb, pronoun) → refused, and **the refusal is a line**. Anything unsettled → `grain_gap`, observation **kept in full**. Never write `subject`, `verb` or `object` onto a record; the English reading of each cell is declared once in the recipe.

5. **Record the SIG row.** Entities, voids, and the reader's own admission acts. A referent is a centre of expansion, not a label on an end — and it is an artifact of PROJECTION, folded out of the recorded admission acts rather than stored as a fact.

6. **Say why nothing was found.** A sentence that yields nothing carries a typed absence naming which: no earned verb in it, or the gate refused for want of two ends. These are different facts — the first is revisable by a later pass, the second is not.

7. **Reread, and record only the delta.** A reread of an earlier chapter carrying later chapters as priors is legitimate — it has read them. It writes only what moved; an arrangement already recorded identically is **not restated**. Where the reread reads the same bytes differently, that is an **ambiguity, not a correction**: both readings stay, as an untyped contest, because an untyped disagreement needs typing rather than a source.

8. **Grade surprise around the being.** Every observation moves what is known about its referent by some amount; the denominator is that being's neighbourhood at the moment it arrives. A partner is a **referent, never a string** — comparing raw object text saturates instantly and measures string variety while calling it knowledge.

### The order of work, and why the order is not negotiable

`eoreader7/native/READING-SPEC.md` **S100** carries the standing plan, derived from the three-chapter baseline rather than from appetite. LaVar works it in order, because doing these in the wrong order produces numbers that cannot be interpreted:

1. **Type at the admission door instead of refusing.** A regression guard, not a gain — the door currently refuses any connector settling as a non-verb, which would delete every Field. It is not firing only because nobody wired it, so this lands before any precision work, since arming that gate is the obvious precision move.
2. **The mandatory-object gate (S90).** 8.2% of all propositions are intransitive and unadmittable. The largest measured gain available, and a hard floor under everything else. Score it on all three goldens: the gate suppresses real junk along with the intransitives.
3. **Referent coverage.** Two measurements are blocked behind it — the surprise decay check and anything about the being-centred neighbourhood. Nothing downstream of referents can be honestly measured until this moves.
4. **Inject `ask`.** Deliberately after 3: wiring the dynamics onto a reading whose referents are 14% covered yields better-typed zeros, not better readings.
5. **Wiktionary as a received prior.** Deliberately after 2: transitivity's value is telling the gate when no object is expected, so bought earlier it buys nothing.
6. **The precision problem.** 454 emitted against 91 real is the largest number on the board, and nobody has read the 363 non-matching arrangements. Until someone does, "improve precision" is a wish, not a task.

**No item is scored on one chapter.** Three goldens exist so that a number moving on one and not the others reads as a specimen effect rather than a gain.

### The whole-book quality bar LaVar must confirm before calling any reading finished

`eoreader7/native/READING-SPEC.md` **S101** sets the first, hardest quality gate: **100% of a chapter's own words must be reconstructable from nothing but its ledger's own `sentence`/`scene-break` addresses.** Not the golden-recall percentage — a structural property of the ledger itself, checkable with `eval/lavar/recoverability.mjs`. Alice in Wonderland, all 12 chapters, all 26,171 words: 100%, zero gaps. A byte range nothing on the ledger addresses is gone for good — no rereading or drilling recovers it, because it was never heard.

Three more things LaVar confirms once recoverability holds, each with its own honest strength, not asserted past what it measured:

- **Rereading with the deepest available prior roughly doubles recall on a thin-prior chapter** (ch1: 12.8%→22.3%; ch2: 14.2%→21.2%) and does almost nothing once a chapter already had a decent prior (ch4: 12.4%→12.9%) — a real, now-measured diminishing-returns curve, not a guess.
- **A local model is a witness on the ledger's own disclosed gaps (`role:"void"`), never an oracle**: it SELECTS from a candidate list the ledger already named, asked twice with the list order reversed, verdict derived from whether both answers agree — never asked to freely resolve an ambiguity into JSON. Measured: half of gemma2:2b's raw picks were pure position bias, caught by the reorder arm; and even a pick that survives the reorder is not thereby correct (`eval/lavar/witness-referent.mjs`).
- **Drilling into a referent's whole-book neighbourhood shows WHERE the reading is thin, not just THAT it is** (`eval/lavar/drill.mjs`): Alice has 152 arrangements book-wide and zero with a resolved being on the other end; the White Rabbit's coverage swings entirely on whether a chapter names him or narrates him as "it"; Dinah — talked about constantly, on stage never — has zero.

**Confirming a metric on ONE book is not confirming it.** `READING-SPEC.md` S102: spiralling out to a second text (The Picture of Dorian Gray — different author, register, and cast) found a real bug the recoverability check above never had reason to catch: a chapter-heading regex that swallows a paragraph's own first line as a fake "title" when a book gives its chapters no title line at all, which AIW's own convention (a real title on every chapter) never exercised. Fixed identically in all three files that carry the regex; AIW's 12-chapter, 4-golden numbers did not move by one byte after the fix. **A prior that crosses documents (`--lexicon=`, S99's received-priors tier) is now structurally incapable of carrying a referent — no code path reads a `cast` field from it at all**, not just an empty one by convention. AIW's whole-book earned vocabulary (287 verbs), fed into a cold first read of Dorian Gray ch1, raised propositions found 32% (285→377) while leaving cast discovery byte-identical (10 entities, 134 voids, unchanged) — verified, not assumed, by grepping the new book's entire cast against every AIW referent and finding zero matches anywhere but the lexicon's own disclosed citation.

**Confirming it in English is not confirming it, either.** `READING-SPEC.md` S103, direct user framing: *"the other languages is crucial because it shows us if we are doing too much of an english shaped solution."* Five real Wikipedia articles (French, Turkish, Korean, Modern Greek, Hebrew — `11-multi-language/wikipedia-lang/`, individually verified real text after `01-literature-books/gutenberg/`'s own language-tagged files turned out to be five DIFFERENT, mislabeled books; `digested/CORPUS-INTEGRITY-FINDING.md` carries both findings now) with only the POS prior and the void-detector's pronoun list swapped per language — everything else, including capitalisation-based referent discovery, left English-shaped on purpose, to see where it breaks. It broke on contact: recoverability held at 100% in all five (the address layer is genuinely language-general), but Korean and Hebrew's few "propositions" were, on hand inspection, **100% built from embedded English citation and image-caption debris** — "Jenny Teichmann and Katherine C[oncannon]," "The School of Athens by Raffaello Sanzio da Urbino" — never a word of the article's actual Korean or Hebrew content, because capitalisation-based referent discovery has nothing to seize on in a script with no case distinction EXCEPT the incidentally-capitalised English fragments sitting in the footnotes. A confidently wrong reading, not an honestly empty one — worse than the silence a recall number alone would report identically for both. (A real bug was also found and fixed in the process: JavaScript's `\b` is ASCII-only even with the unicode flag, silently failing on Greek and Hebrew pronoun checks — found by the void count coming back exactly zero on text with ten confirmed pronoun occurrences.)

**A second, resemblance-based lens, tried as an active pass — and caught, by hand-checking it line for line, doing nothing at all.** `READING-SPEC.md` S104 records both halves, in order, because the second corrects the first rather than replacing it quietly. The measurement stands: the-fold's `relative.js` Field recovers gold-verified content for referents the address system has under-covered at 73.5% in its own top-10%, against 14.6% for a matched random-cue control. Turning that into a bulk, standing pass (`eval/lavar/field-lens-boost.mjs`) produced 68 lines tagged `foundViaFieldLens: true` that LOOKED like 33 previously-invisible beings recovered book-wide — the Queen, the King, the Dormouse, Bill, Dinah. **Comparing the new lines against the golden, line for line, by direct instruction, found the actual number: 68 of 68 are byte-for-byte duplicates of propositions already in the ledger, at the identical address, with `end1Ref`/`end2Ref` unresolved in both copies.** The mechanism reran `extractRelations` — a pure function of sentence text and vocabulary — on sentences `eot-jsonl.mjs`'s own main loop had already run it on, with identical inputs, and a pure function given unchanged inputs cannot return a different output. The earlier "33 recovered" count mistook a target-tag for a resolved binding. **The weak-referent diagnosis underneath this stays real and reconfirmed** — the address system genuinely under-binds Dinah, Bill, the Queen at the measured rates; the fix built on top of it does not close that gap, because it reruns the exact same failing resolver on the exact same bytes. What would actually be needed — injecting the target referent as a forced subject, or letting the Field's resemblance resolve a pronoun where the stricter resolver refused — is named in S104, not built.

**The real fix landed on resolution, not extraction — and it needed the reread mechanism fixed too.** `READING-SPEC.md` S105. `endRef` gains a third tier: a captured phrase can carry a known cast name buried inside modifiers ("our Dinah here," "poor Alice") that neither the exact-match tier nor the bare-pronoun tier ever unwraps — fixed with a plain substring-containment check against the SAME cast surfaces tier 1 already trusts, committed only when exactly one referent matches (an ambiguous containment is left unresolved, never guessed). Wiring it in surfaced a second, more general bug first: a reread's "unchanged" classification only ever compares `(address, end1, label, end2)`, so it keeps the OLD line verbatim even when a fresh pass resolves a referent the key comparison can't see — silently discarding any improvement to a field outside that key, for good, on every future reread. Fixed as its own typed `EOTRevision@1` category ("rebound": same clause, same bytes, a referent newly bound), never editing the kept line. A THIRD bug turned up isolating the first fix's own effect: re-running an already-reread chapter at its own existing prior depth reproduced exact duplicate `EOTContest@1` lines, because contests were never deduped against the prior record the way propositions are — fixed the same way, and a related silent overcount in the ledger's own `delta.new` disclosure field (present since before this pass) was corrected alongside it. Measured, whole book, after all three fixes: **268 real, referent-scoped `EOTRevision@1` bindings appended across the 12 chapters, zero duplicate propositions, zero duplicate contests, 100% recoverability held, and all four golden scores byte-identical to baseline** (a referent-binding pass was never going to move a clause-segmentation metric — the same distinction S104 already drew). The Dinah specimen this whole thread started from now carries a real, appended, address-verified binding to `ref:auto:dinah`, superseding nothing, restating nothing. What this does NOT touch: a pronoun the main resolver's recall floor still refuses (stays a typed `role:"void"` gap), and a being with no admitted surface at all — nothing for tier 3 to find, since it scans a cast map, not the raw text. That second case is a different, deeper question, under active consideration as of this entry: what a being detectable only by its recurring, never-admitted mentions — never a name, never a bound identity — should be called and how its presence could be typed on the record without inventing a referent the ledger has no warrant to assert.

**Naming it — "dark referent" — and testing whether resemblance can find it with no name to search on.** `READING-SPEC.md` S106, direct user framing: *"consider the role of dark referents"* / *"wire this in."* Checked against the real admission code rather than left as an analogy: a dark referent clears neither of `surfaces.js`'s two gates (the capitalisation test — "the cook" never even starts a candidate run — or the recurrence floor for a capitalised candidate that silently drops with zero trace) and so has nothing on the ledger anywhere: not a referent id, not even a `role:"void"` line, since void is typed only for a pronoun, and a dark referent is nominal. Four real specimens found by grep against all 12 chapters' rosters, clean of any surface match: the jury (addressed by name, writes a verdict, ch11+ch12), the cook (ch6/ch8/ch11), the puppy (ch4), the hedgehog (ch8). The test, `eval/lavar/dark-referent-cluster-test.mjs`: for each specimen's hand-identified sibling mentions inside one chapter, cue the-fold's `Field` with each sibling's OWN sentence text (no name to cue with) and check whether the other siblings rank in the top-10% — against a matched random-whole-sentence control, the same "beats chance" bar this project's own prior work already holds itself to. **10 of 12 sibling pairs recovered (83.3%), against 1.53 expected by chance (12.8%) — the real cue clearly beats the control, and 7 of 10 hits clear the Field's own null-band significance margin.** This is a PROPOSAL result only, per this session's own attention-proposes/priors-dispose discipline: it shows resemblance carries a real signal on a problem with no name to search with, not that the signal is calibrated enough to safely mint a referent and start binding content to it — that disposal step is real, scoped, and unbuilt.

**Reading two more books by hand found two real heading bugs; a REC-triggered detector replaces hand-patching them one at a time.** `READING-SPEC.md` S107, direct user framing: *"read some more books and judge the quality of the EOT files"* / *"develop the... structure system as needed to detect structure and identify it and have this be a repeated program... that gets REC'd as needed, using model call as needed."* Frankenstein uses "Chapter 1" (Arabic, no period), not "CHAPTER I." — the reader found zero chapters until the heading regex gained a second alternative (the Roman-numeral branch untouched, so nothing already verified could start matching differently), and a second bug this same fix exposed — every chapter's own disclosed `basis` claimed the wrong convention — was fixed alongside it. An illustrated Pride and Prejudice buries its real "Chapter I." inside an `[Illustration: ...]` caption block, silently shifting the reader's own chapter numbering by one (its "chapter 1" is actually chapter 2's own text) — judged too narrow an edition-specific artifact to patch safely from one specimen, disclosed rather than fixed. Named after this codebase's own existing "REC" (re-zero) idea: `structure-rec.mjs` + `heading-conventions.json` (new) try every known convention mechanically first, fall back to skeleton-recurrence matching (still mechanical — a monotonic chapter numeral is strong, independent evidence, no model needed), and escalate to a local-model witness only when neither settles it, using the exact same forced-choice/reversed-order/agreement-only discipline `witness-referent.mjs` already established. Tested against the real Sherlock Holmes text — found, ironically, mislabeled as Tom Sawyer before the corpus-integrity fix — and caught three more real bugs running it, not designing around it: dialogue lines outnumbering real headings by 4-to-1 in the largest false group; a title's own word count wrongly fragmenting one convention into a dozen small buckets; a Roman numeral misread as if it were the marker word. Verified afterward: AIW and Frankenstein still hit their own known conventions at tier 1 with zero model calls; Sherlock Holmes's real convention (numeral + same-line title, no marker word) now clusters correctly and is a tier-1 hit for the next document shaped the same way.

**Tables: safe but blind, checked before assumed — and tuple-level parsing named as the next real step.** `READING-SPEC.md` S108, direct user framing: *"now do it on document with a table embedded inside of prose"* / *"it needs to interpret tables as tuples."* Real specimen: Paradigms of Artificial Intelligence Programming, chapter 3 — 19 genuine Markdown tables inside real Lisp-teaching prose. Checked first: `splitSentences` treats a whole multi-row table as one "sentence" (no internal sentence-ending punctuation), and `extractRelations` run directly on that text correctly returns nothing — the pipeline does not crash or fabricate a fact from a table, it is simply blind to one, which the reader's own "a sentence that yielded nothing says so, and says why" discipline would at least disclose honestly rather than silently. `table-rec.mjs` (new) detects every table mechanically — a GFM header+separator signature is universal Markdown syntax, not a per-book convention, so this is tier 1 only, no REC escalation needed — and found all 19 real tables in the specimen, verified by hand. Named, not yet built: parsing a detected table's own grid into real (row, column, header, value) tuples, each independently address-verified; and a genuine open question the very same file already poses, that a naive per-row tuple would get wrong for at least one of its 19 tables — some tables are row-shaped records (one real thing per row), and at least one here is column-shaped parallel lists (each column its own independent list; a row is a print-layout accident, not a relation between its cells) — telling the two apart from the table's own bytes alone is not always mechanical.

**Competing witnesses for that exact question, one retired, one tried and refused, a prior corrected twice after running it for real.** `READING-SPEC.md` S109, direct user framing: *"try different competing programs on things to find the one that provides the most meaningful signal, global workspace theory type stuff"* / *"let's not underestimate CV and OCR systems"* / *"we don't know the ground truth, we are always ever asymptotically approaching the referent... the noumena rather."* A plausible mechanical hypothesis (cross-column cell-length variance) was measured wrong on the first real counterexample — confounded by lexical category length, not by row/column shape — and retired to disclosure-only rather than diluted into a vote. A second mechanical specialist (blank-cell clustering by column) survived both real specimens tried and decides alone whenever it has evidence. A local vision model, shown an actual rendered screenshot of the real table, hallucinated a plausible-but-wrong structure — identically, twice in a row: the disclosed lesson is that self-consistency is not correctness, and this project's own "ask twice, trust on agreement" discipline only catches a witness that flips under reorder, not one that is simply, confidently, consistently wrong. Built, tested, excluded until it earns a seat. A per-document prior (memory shaping the CURRENT read, the way a recognized scene sharpens the next percept rather than commenting on it afterward) was added, then twice caught overriding a specialist's own direct, checked vote — the same class of error as the confounded specialist, just relocated — and fixed structurally: a prior never outvotes a specialist that actually casts one; it only decides when every earned witness abstains. Tuples, finally emitted and address-verified for both real specimens, shape-informed rather than assuming one universal shape.

### What LaVar must not do

**Do not hand-roll a reading loop.** `kernel/reading.js::createRecursiveReader` returns `surprise`, `tension`, `release` and `relevantFold` from every step. A driver calling `extractRelations` directly throws all four away and reinvents them worse. (Their dynamics are currently inert because nothing injects `ask` into `interrogateCube` — so a naive migration would report `surprise: 0` as though it measured the material. Wire the `ask`, do not fake the number.)

**Do not add a source to the wrong tier.** A lexicon with a giver and a revision joins the **received priors** and may gate, refuse and type. A model joins the **witnesses**: one binary claim at a time, its testimony typed beside the byte and structural tiers, never a prior and never a gate.

**Do not tune against the specimen.** A number that moves on one chapter and is not checked on the other two is a fact about that chapter.

**Search before building.** Four times this session a mechanism was assumed missing and was already built and wired into nothing: the bound-pronoun anchor, the expectation lifecycle, identity revision, and the reading dynamics. The cost of grepping first is seconds.

---

## 7a. Rebuilding the sidecars

Every existing sidecar is discarded and rebuilt with the current recipe, so live priors rest on readings that were reviewed rather than accumulated.

**Archive rather than delete.** The current Crime and Punishment reading contains the Sonia fold and is the best specimen we have. Losing it loses the before-and-after this whole effort is measured against. Old sidecars move to `readings/archive/` keyed by recipe hash and stay queryable.

Rebuild bottom-up, in ladder order, so the priors that inform a rung's reading come from rungs already cleared. Novels last.

---

## 8. Omnimodal and omnilingual

The kernel is medium-blind and the grammar lives in the adapter. Phrase boundaries are the adapter's job: punctuation in text, prosody in audio. The kernel must never learn what a comma is.

Where an adapter supplies no boundary, the fallback is backward transitional probability, learned from the stream with no giver. Measured on the five candidate sites in Crime and Punishment: two true complements at 0.0116 and 0.0781 against three false positives at 0.0015, 0.0016 and 0.0032. Forward TP fails, because it is P(b|a) and a rare pair scores low against everything. PMI fails, putting a true positive below all three false. **Five examples is a candidate, not a threshold**, and it should be tested against material with real prosody before it is trusted.

**Start monolingual.** A level that means different things in two languages is worse than no level. A second language is added only after the English ladder produces stable grades, and it gets its own ladder with its own giver rather than a translation of this one.

Received priors stay as the floor. The UD English EWT POS treebank has a named giver and does real work in `heard-surfaces`. Live priors accrete above received ones; they do not replace them, because the first reading of anything has no live prior to stand on. **Amended 2026-09-12 (S112): the floor is now IMPLEMENTED as admission, not just typing.** The text reader's verb vocabulary admits every (VERB+AUX)-dominant form the received prior attests (accreting above the earned set, never replacing it); measured, the assembly went from 0 relation edges on AIW ch1's prose to 264, recall 43.6% vs the earned-only 36.3%. The sorting of the earned-vs-received contradiction is READING-SPEC S112.

**Omnimodal is a property of the kernel's vocabulary, never a reason to thin what an adapter uses.** User direction, verbatim: *"the fact is word order and often capitalization DOES contain meaning in english and we should not ignore that"* / *"we just need to have the reader learn to use the relative rules, but we dont want to ignore any meaningful structure to make something omnimodal."* Capitalisation and word order are real, load-bearing signal in English — a mechanism that uses them fully is not thereby less omnimodal; omnimodal describes the KERNEL (medium-blind arrangement/admit/fold, above), not a mandate that every adapter perform identically, or use equally little, across every language. See `READING-POLICY.md` P8 (drilling EO-constitution II.13, "the script earning test," into this repo's own reading law) and P9 (the sibling finding on relation shape: a schema that CAN be n-ary, `EOHyperedge@1`, is not the same as one that IS — checked this session, every text-adapter constructor still only ever hands it exactly two participants, which is the real cause behind a thin extraction, not a missing "universal" fix).

---

## 9. What LaVar checks for first

The specimen names the class. Ordered by cost, cheapest first.

**Self-contradiction, no oracle needed.** An irreflexive relation whose ends resolve to one referent. On the specimen this fires three times from a single sentence, including on bare «Marmeladov», the very token whose sharing caused the fold. A single equality check: no null, no draws, no alpha. LaVar does not need to read anything to catch this, which is why it runs before LaVar is invoked at all.

**Wrong fold.** Two names one person, or one person two names. LaVar reads the passage and says which. The negative control is Pyotr Petrovitch and Luzhin, who are one man and must stay folded.

**Missed relation.** The relation reader produced 497 edges over the specimen passage and zero binding the two people it names, because the construction has no verb slot. LaVar reads the sentence and records the edge the reader could not.

**Missed being.** `extractSurfaces` finds candidates by capitalisation and returns 401 surfaces on the printed novel and zero on the same novel lowercased. `heard-surfaces` raises that floor with a disclosed recall of five of a twenty-name cast against the read path's twenty of twenty. LaVar's misses here are the most informative rows in the mistake corpus, because they are the ones a bigger prior would fix.

---

## 10. What the mistake corpus is for

Not a log. A curriculum.

Each revision records the rung, the organ that produced the original, the class from section 9, and the material's own address. The question it answers is not how many mistakes but **which organ fails at which rung**, because that names the next thing to build rather than the next thing to tune.

A reading whose fold is correct and whose ledger contains three superseded entries is more valuable than a clean one, and the file should make that legible rather than hiding the history behind the fold.

---

## 11. What refutes this

**The ladder may not be a ladder.** McGuffey graded for a 19th-century child learning to decode, not for a structural reader resolving referents. If revision rate does not fall monotonically across rungs, the ordering is wrong and the level column means nothing. This is checkable in the first full pass and should be checked before anything is built on top of it.

**LaVar may be a second mouth.** A frontier model reading a passage and pronouncing on referents is making claims, and claims from a model are exactly what the holograph's third property exists to distrust. LaVar's revisions must carry addresses into the material, and a revision LaVar cannot ground in bytes is a typed gap, not a correction.

**Revision rate may not track comprehension.** A rung where LaVar revises rarely may be a rung where the reader fails quietly. This is why the dashboard carries retrieval and cloze alongside, and why a falling revision rate with flat comprehension should be read as a warning rather than progress.

---

## 12. What this does not do

It makes a wrong reading detectable and, over time, less frequent. It does not make a reading true.

The strongest thing LaVar can produce is a record of where a smaller instrument fails, kept in a form that teaches. That is worth building. It is not the same as the instrument being right, and the specimen in section 1 should stay on file, archived rather than deleted, as the standing reminder of what a perfectly faithful projection of a wrong reading looks like.

---

## 13. LaVar's reading canon

Section 2 says LaVar reads "the way a literate adult reads." That is not enough on its own — this repo has already spent multiple passes learning specific, named ways a reading goes wrong, and LaVar's judgment about a sidecar is only as good as its knowledge of that record. This section is not a summary of `legacy-legacy-engine.1/READING-POLICY.md`, `native/READING-SPEC.md`, and `CLAUDE.md` — it is a pointer to them, plus the subset of their rules that bears directly on judging a sidecar's quality. **Before grading or producing any sidecar, LaVar must have actually read all three in full — not just this section.** Duplicating their content here would drift from the source the moment any of them is next amended; citing them does not.

**`legacy-legacy-engine.1/` and `native/` are two different codebases, not one repo under two names — every citation below says which.** `legacy-legacy-engine.1/READING-POLICY.md`'s P0–P7 describe the OLD engine (`packages/host/`, `packages/engine/`), a real, still-published, still-lesson-bearing codebase that is nonetheless NOT what eoreader7's own sidecars run on today. `native/READING-SPEC.md`'s S-numbers are eoreader7's own, current record. A P-entry's METHODOLOGICAL lesson (never tune blind, a gap is a result, state the configuration) generalizes across both; a P-entry's SPECIFIC FILE PATH usually does not, and citing it as if it names eoreader7's current mechanism is the mistake this note exists to head off (user correction, verbatim, the session this was written: *"why are you in 6.1!?? this is all eoreader7"*).

**Name the assembly.** A sidecar is only as trustworthy as the pipeline that produced it. eoreader7's own assembled reader is `native/kernel/reading.js::createRecursiveReader`, composed with a medium adapter (`native/adapters/text/recursive.js::createCausalTextPerceiver` for text) — surfaces → referents → pronoun binding → typed relation, in that order, and confirmed this session as the actual production path `live_priors/scripts/eot-sidecar.mjs` runs (`legacy-legacy-engine.1/READING-POLICY.md` P0 states the same principle for the OLD engine's own assembly, `packages/host/corpus.js`'s `createSession`/`admitChunked` chain — a real, separate codebase, not eoreader7's). A sidecar built by a hand-chained driver is an experiment asking one question, not a reading, and grading it as if it were the full assembly over-claims exactly as badly as under-claiming does. Every sidecar LaVar touches must say which assembly, and which codebase, produced it before LaVar says anything about its quality.

**Check the stage, not just the output.** A reading is (at minimum) perception, witnessed admission, alias resolution, pronoun binding, typed relation, population, and kind — `legacy-legacy-engine.1/READING-POLICY.md` P2 names eight stages for the old engine's own organs by path; eoreader7 native's equivalent stage-by-stage breakdown has not yet been written down as its own numbered entry (real, open work, not done here). A sidecar that skipped population closure before kind induction will report "mentioned once" as its dominant finding — a known, named failure mode, not a fact about the material, in either codebase. When a sidecar looks thin, ask which stage is missing before asking whether the material is thin.

**Priors have a giver, and are injected, never derived.** The Marmeladov fold (§1) is exactly this failure, IN NATIVE: `native/adapters/text/surfaces.js`'s ENGINE-tier rule ("structural, no witness needed" — shared final token) fired in place of a MODEL-tier per-text coref prior that should have separated Sofya Semyonovna Marmeladov from her father. **LaVar's default question on any fold it doubts is not "is this wrong" but "which tier decided this, and was that the right tier."** An engine-tier structural rule deciding a question that needed a per-text prior is the specific, recurring shape of this bug class — not a one-off, and not specific to either codebase (`legacy-legacy-engine.1/READING-POLICY.md` P3 states the same three-tier prior discipline for the old engine).

**An observation is typed by its cell, never judged by an English part of speech.** `eoreader7/native/READING-SPEC.md` **S95** is binding on everything LaVar produces and everything LaVar grades. A reading is an append-only JSONL ledger of observations that nest **by address** — containment computed from byte offsets, never declared by a `parent` pointer and never implied by line order. The source path is written once, on line 0. Chapters, sections and paragraphs are *inferred* observations at the same line shape and must carry the evidence that licensed them. The origin document is preserved byte-exact: a chapter is an observation at `[start,end)`, never a carved-out file, and front matter is recorded with a role, never stripped.

And the part LaVar is most likely to get wrong, because it looks like quality control: **a preposition in the connector slot is not a defect.** `burning | with | curiosity` is a **Field** (`CON · Ground · Tending`), a real cell of the cube — not a broken Link. `relations.js` stamps everything it emits as `CON · Link · Binding` whatever it actually found, so anything that is not a discrete act between two discrete ends *reads* as a failed Link and invites exactly the wrong correction. LaVar types it by grain and keeps it; a connector that does not settle in the received prior carries a `grain_gap` and the observation is kept in full. Never write `subject`, `verb` or `object` onto a record — those are English grammar's names for English's own arrangement, and the English reading of a cell is declared ONCE in the recipe, scoped to the language and reader that assumed it (V7-CUT's dependency law, the same one P76's `end1`/`label`/`end2` rename already fought). User's own challenge that produced this rule, verbatim: *"are we convinced this is wrong? isn't this Ground Figure Pattern?"*

~~**Produce sidecars in `EOTReading@1` via `live_priors/scripts/eot-sidecar.mjs`.**~~ **Superseded 2026-09-09 by S95 / `live_priors/POLICIES.md` LP18.** That flat schema cannot represent nesting, document structure, or revision, and spends 19% of its bytes repeating one path (741 times in a 185 KB sidecar describing an 11.5 KB chapter). It is still what the 601 existing sidecars are written in, and `eot-sidecar.mjs` has NOT been migrated — so where the two disagree, S95 governs and the sidecars are the stale artifact. Reference implementation: `eoreader7/native/eval/lavar/eot-jsonl.mjs`.

**A gap is a result, never a suppressed error.** `native/organs/measure.js`'s `GAP_TYPES` vocabulary (the native equivalent of the old engine's `nul/index.js`, cited by `legacy-legacy-engine.1/READING-POLICY.md` P4) names findings a sidecar should carry — `script_without_case` (S86, S89) is the one this session actually produced, on real Chinese material — not failures LaVar should try to make disappear by loosening a gate. A "clean" sidecar with zero gaps on a genuinely difficult text is more suspicious than one with several typed gaps on file; recall too that `admission.gate: "clean"` in `eot-sidecar.mjs`'s own output has NOTHING to do with this — it only means no explicit refusal fired, never that anything was heard (LP17, `live_priors/POLICIES.md`).

**Byte-offset self-verification is mandatory (an address is a birth, not a spelling — `eoreader7/CLAUDE.md`, "added 2026-09-07," pointing to `native/READING-SPEC.md` S80).** A CRLF source whose offsets were computed post-normalization but sliced against raw bytes drifts one byte per line — `legacy-legacy-engine.1/READING-POLICY.md`'s own attempt log records the shape of that bug on the old engine. Every address a sidecar emits must self-verify against the actual bytes at that offset; LaVar checking a revision's own address against the material (exactly what `live_priors/scripts/lavar-prior-scaffold.mjs`'s schema enforces for live priors, and what caught this session's own wrong offset while building the Alice worked example) is not optional rigor, it is the same check this codebase has already paid for once.

**State the reader's configuration beside every number (`eoreader7/CLAUDE.md`, "added 2026-09-04" — a NATIVE incident: `kernel/notes.js`'s `admit` gate and `native` extraction levers).** A driver that concluded two Borodino accounts share no functional relation had its admission gate open and its extraction levers off — real arithmetic, real null, wrong configuration, and the finding was about the harness, not the material. Before LaVar trusts or reports on any sidecar's numbers, it must see which gates, walls, and levers were on. A sidecar with no stated configuration is not gradable yet.

**Search for the organ before flagging a "missing" one (`eoreader7/CLAUDE.md`, "search for the organ before you write one").** Before LaVar records a `missed relation` or `missed being` finding (§9) as evidence the engine lacks a capability, grep `native/` for it first — `native/adapters/text/relations.js`, `native/organs/heard-surfaces.js`, `native/organs/connector-witness.js` and siblings have repeatedly turned out to already do the thing a plausible from-scratch fix would have re-implemented, worse. (The original incident this rule is named for was itself about the old engine's `emergence/binding.js`/`perceiver/text/roles.js`, `legacy-legacy-engine.1/CLAUDE.md` — the METHOD generalizes to native even though those two specific files do not exist there.) A miss LaVar should actually revise is one where the organ ran and produced the wrong answer, not one where LaVar assumed no organ exists.

**"Missed being" is not one class — read READING-SPEC S86/S87/S88 before calling anything a capitalisation problem.** S86 measured that `extractSurfaces` finds beings by capitalisation and NOTHING ELSE (zero survivors when case is stripped). S87 built `heard-surfaces.js` to raise that floor for caseless/heard material, by a positional signature (`before=^`, sentence-initial recurrence) plus a received POS prior — real, but unigram-only and blind to any being that isn't sentence-initial. S88 (this session, on a real children's book) found a THIRD, distinct shape: a being with a completely normal, correctly-capitalised source text still gets zero surfaces, because the whole cast is named by kinship terms ("my mom") and pronouns, never a proper name — S86's fix doesn't apply (case was never lost) and S87's doesn't either (a possessive-headed noun phrase isn't sentence-initial). S88 proposes but does not build a fourth signal (a common noun recurring under a possessive determiner). **The lesson for LaVar: "the reader missed a being" is at minimum three different mechanisms with three different fixes, and the right response to a new miss is to ask which of the three (or a genuine fourth) it is, not to reach for whichever fix is already built.**

**Never tune a number by checking what it does to the sidecar's own score.** The `minArrivals` incident (CLAUDE.md) is the general form: if the only justification for a threshold is "I tried values and this one scored best against this book," that is calibrating against the answer key. When LaVar revises a parameter (not just a referent fold), the revision needs a justification that doesn't reference the sidecar it's fixing.

**A finding is only real if something reads it (CLAUDE.md, "the ledger writes agreement, contest AND retraction").** `organs/corroboration.js`'s contest tracking was correct and completely unreachable, because nothing downstream read the Map it built. Before LaVar treats a sidecar's `contests`/`disputes`/`gaps` field as evidence of anything, confirm something besides that field's own test actually consumes it — the same reachability check CLAUDE.md's P88/P89 pointer names for guards generally.

**Revisions supersede; they never edit in place (§3, `store.js`'s `supersedes`, `correction.js`).** The discipline is already named: *we don't need a system that's always right, but we do need one that is actively learning to get better.* A LaVar revision that overwrites the original entry destroys the before-and-after the mistake corpus (§10) exists to keep — append, never rewrite, exactly as this session archived rather than deleted the sidecars carrying the Marmeladov specimen.

**A reference implementation is the target its references grade — a scoped composition is a scope, never a defect (added 2026-09-12, the "read correctly" correction).** The incident: a session grading the goldens concluded "we've been grading the wrong reader — eot-jsonl.mjs hand-chains the organs and never imports `createRecursiveReader`, while the fold's app reads with the real assembly." That was a misread, and LaVar's own canon caused it. LAVAR §13's "name the assembly" was satisfied in a comment and then violated in the conclusion: eot-jsonl.mjs IS the reference implementation for the ledger format (this file says so), the goldens were BUILT against its ledgers (`golden-tool.mjs score` reads them), and its ordered stages (structure → sentences → surfaces → referents → pronoun binding → relations → SIG row → expectation lifecycle → surprise → reread) are the S95 reference's own declared composition — its activation runs. `createRecursiveReader`/`createCausalTextPerceiver` (the fold's `reading-worker.mjs`) is a DIFFERENT composition of the same organs, scoped to the app's production reading. **LaVar's default when a reader "isn't the full assembly" is: which assembly do the references actually grade, and is the narrower one a deliberately-scoped composition rather than a missing half?** A reference graded against its own reference is not a wrong reader; calling it one is the P5.5 shape (a theory reached for before the driver was checked) aimed at the grader's own targets.

**A batched update cycle is an engineering compromise, never a model of reading — and a compromise's justification can go stale (`eoreader7/CLAUDE.md`, "added 2026-09-09" — a NATIVE incident, `native/adapters/text/recursive.js`).** `createCausalTextPerceiver`'s `refreshEvery` batched the reader's own vocabulary/cast update because an earlier version of `refresh()` was genuinely O(n²) — true when written, false after a later pass made it incremental, and nobody re-checked. The result: a 14-sentence book read at the stale default produced zero relation edges and zero referent bindings, not because the material was hard but because the reader's update cycle never fired a second time before the text ended. **LaVar should distrust any fixed-size batching, windowing, or refresh-cadence parameter it finds in a reading pipeline exactly as hard as it distrusts a hand-picked threshold (`legacy-legacy-engine.1/READING-POLICY.md` P4, the same general lesson stated for the old engine) — both are numbers that can outlive the reason they were chosen, and "the material is too short/hard for this to work" is the wrong conclusion when the real cause is a stale engineering constant.** See `native/READING-SPEC.md` S91 for the full incident this entry is drawn from (originally misfiled into the legacy `READING-POLICY.md` as A26 — moved same session).

---

## 14. LaVar tells us if we are reading well — and triggers "looking"

The user's standing, verbatim: *"LaVar should tell us if we are reading well and should be adapted as needed to help trigger 'looking.'"* This is the section that makes that a native capacity, not an aspiration.

**A reading can be wrong in a way nothing above the log can see (§1).** The Marmeladov fold was a perfectly-faithful projection of a wrong reading. "Looking" is the same problem one register down, at the SENSE level: a text whose *formatting* the plain-text reader structurally cannot see — a table, a column, a box-drawn diagram, sub-sentence lines that are cells not sentences — gets read wrong *before* a single referent resolves. The reader reads the flat bytes; the thing is not the flat bytes. When that happens, the answer is not to read harder, it is to **look** at the thing: render it to an image and read the image with CV/OCR + a vision model.

**The organ.** `native/organs/look.js` — the native "looking" capacity, ported from the fold's browser-side `/visual` machinery. Two senses, judged like the project's own corroboration/witness machinery judges everywhere else:

- **Mechanical:** OpenCV box/connector detection + per-region Tesseract OCR (`visual-rec.mjs`/`visual-detect.py`), landing detected structure as addressed EOT ledger lines.
- **Vision:** a local vision model's holistic read of the whole image, escalated to a larger model only on a real, named disagreement with the mechanical facts (the fold's `settleImageRead` escalation loop).
- **Text → image:** `weirdFormattingScore` names *when* the reader is reading text wrong (table rows, box-drawing, very-short lines, wide whitespace runs); `renderTextToImage` renders those bytes the way a person would see them; `lookAtImage` reads the render. The looked-at reading is admitted as its own source (`<rel>::look`) so the model speaks from what the thing IS.

**What LaVar now does.** `lavarGradeReading` in `native/the-fold/document-ledger.js` returns, per source, `readingWell` — did the reader read these bytes well, or was it misreading formatting / hearing nothing from a substantial source? A `shouldLook` verdict on a source is exactly what triggers the looking pass. The proxy's workspace admission runs it: a source whose own bytes carry layout the plain-text reader cannot see gets a `lavar_reading` note (`"was NOT read well — should look at it"`) and the looking pass fires.

**The discipline, inherited and applied here:**

- **Looking is triggered by a measured misread, never speculatively.** `weirdFormattingScore` is a mechanical gate on the source's own bytes — it fires because the text IS a table, not because LaVar "felt" it was odd. The fold's own rule is carried whole: escalate only on a real, named disagreement, stop on measured settlement.
- **A vision read is a witness, never an oracle.** The same `VISION_STANDING` the fold already carries applies: moondream (and qwen2.5vl) have measured hallucination on precise factual detail. The mechanical facts are trusted for precise claims; the vision read for the general "what is this a picture of" a mechanical detector cannot answer. Where they disagree, the disagreement is disclosed, not settled by whoever talks last.
- **A missing sense degrades loudly, never silently.** `renderTextToImage` refuses off-macOS; `visual-rec` refuses without `VISUAL_DETECT_PYTHON`. A missing dependency should fail loudly, not produce an empty, falsely-clean read.
- **A looked-at reading supersedes nothing.** The original flat bytes stay admitted; the looked-at reading is a SEPARATE source. The reader never edits the origin in place — the discipline §13 already holds for revisions, applied one level down.
- **Search before building.** The mechanical detector, the ledger writers, the escalation loop, the vision ladder — all existed in `native/eval/lavar/` and the fold before this section was written. The organ imports them; it does not reimplement them.

**What refutes this.** If `weirdFormattingScore` fires on normal prose at a meaningful rate, the gate is measuring the wrong thing and looking becomes noise. And a looked-at reading is still a reading *of an image* — if the vision sense hallucinates and the mechanical sense is empty, looking produces a confident wrong answer, which is worse than silence. Both are checkable on real material and should be checked before the looking pass is trusted at scale.

---

## Prep log (before the corpus)

Ahead of the live_priors children's-book corpus landing, the live-priors production half of §3 was prepped and smoke-tested — the piece the user asked to prep first, over the checker, the archive mechanism, and the ladder/autonomy machinery, all deferred:

- `live_priors/derived-priors/lavar-priors/` — new derived-priors subdirectory, `LaVarPrior@1` schema, documented in `live_priors/derived-priors/README.md` alongside `fold-reading-priors/`'s existing entry.
- `live_priors/scripts/lavar-prior-scaffold.mjs` — does only what a script can do honestly (hash the source file, count words, lay down a skeleton); refuses to overwrite an existing prior file so a second run can't blow away hand-written judgment. Every `priors[]` entry the schema holds needs a byte `address` into the source — a claim with no address is a typed gap, not a prior (§11's own rule, applied here before LaVar is even reading novels).
- `live_priors/derived-priors/lavar-priors/pg11-alice-s-adventures-in-wonderland.json` — a worked example against Alice in Wonderland (already in the corpus): three grounded priors, one per kind (composition affordance, kind parameter, relational structure), each address-checked against the source file's actual bytes. Not a completed read of the book — a proof that the schema holds real content before the real corpus arrives.

Deferred, by the user's explicit choice, not by default: the self-contradiction checker (§9), the dashboard and mistake-corpus store (§5, §10), and the ladder/autonomy-spiral state machine (§4, §6).

**2026-09-09, second pass — sidecar archiving and the reading canon.** The five existing sidecars (`eoreader7/native/eval/the-fold/results/readings/*.jsonl`, recipe `causalTextPerceiver_reviseTextFold_refresh25`) were moved to `readings/archive/` per §7 rather than deleted — the user's instruction was to "wipe" them, but §7 itself requires archiving because one of the five (`022805d79a1d4edf-...jsonl`) carries the actual Marmeladov specimen §1 is written against; deleting it would have destroyed the before-and-after this whole effort measures against. `readings/archive/README.md` records which hash holds the specimen and flags the other four as unreviewed rather than assumed clean. `readings/` itself is now empty and ready for the rebuild.

Section 13, "LaVar's reading canon," was added: a pointer-plus-checklist (not a duplicate) into `READING-POLICY.md`'s P0–P7 and this repo's `CLAUDE.md` incident log, aimed specifically at what makes a sidecar gradable and what makes a LaVar revision trustworthy — assembly discipline, stage-by-stage checking, prior-tier attribution (the Marmeladov bug restated as "which tier decided this"), gaps-as-results, byte-offset self-verification, stated configuration, search-before-flagging-a-miss, never-tune-on-the-score, reachability of a finding, and supersede-never-overwrite. This directly answers the user's "be sure LaVar is an absolute reading expert grounded in everything we've learned about reading" and "I'm most interested in him creating the best quality sidecars" — the canon is the part of LaVar's expertise that has to be read from the project's own record, not invented fresh.

## 2026-09-12 — Omni-lingual check: §8 transfers to Russian, the shape is language-general, and the received floor has one named gap (UniMorph rus full forms)

The Meno/loops/shape experiments threatened to become English-shaped, and were tested before they could. Real Russian War and Peace (`11-multi-language/war-and-peace/ru/voyna-i-mir_Tolstoy_wikisource.txt`) through the ledger reader with `--lang=rus` (pronoun set added; `pos-rus.json` already present):

**What held (not English-shaped):**
- The §8 received floor (S112) transfers: real Russian meaning is read — `Анна Павловна | кашляла | несколько дней`, `Он | говорил | на том изысканном французском`, `грипп | был | тогда новое слово`. The received verb-admission is not English-shaped.
- The GOLDEN-FREE SHAPE is language-general: recoverability 100% (the address layer, S103 again), void rate, referent purity, signal-over-noise all computed identically in Russian. The ideal-shape loop can be chased in any language **with no golden**.

**What broke (the English-shaped assumptions, disclosed where S40/S103 predicted):**
- Referent purity 0.111 — capitalisation does not mark Russian proper nouns, so capitalisation-based discovery admits junk.
- Pronoun binding 0 — Russian pro-drop (and the aristocratic French opening) starve third-person pronouns.
- Inflected verbs (`кашляла`, `смутясь`) are HEARD by earned recurrence but not TYPED — `pos-rus.json` attests only lemmas, so the grain settles as a gap.

**What needed to happen (the note):**
1. **Fetch UniMorph `rus` full forms.** The project already has the rus DECLENSION half (`priors/declension-rus.json`, provenance `github.com/unimorph/rus` — 89 suffix rules) but never fetched the full paradigm forms, unlike English (`unimorph-eng-verb-forms.json`, 103k forms). The inflected-verb typing gap closes exactly there — the received floor completed for Russian's rich inflection. Then re-run the Russian shape.
2. **Music is the honest boundary, named not built.** The reading experiments are text-scoped; the SHAPE and the received/earned loop are reader-agnostic concepts, and the project already shows the golden-free discipline on audio (kind organs, signal.js's noise control), but the Meno/loops harness has not been wired onto the audio reader.
3. **The shape is the golden-free future instrument** — every language, every medium, no golden required. Chasing it is the point.

## 2026-09-12 — Wilson's standing laws (the swarm, made law)

**Constitution:** eo-constitution **II.2** (the hierarchy is received — Commons's MHC orders are a gift that names its giver; the swarm may descend, never redefine), **II.9** (no final answer — "best" is a revision, never a verdict; convergence is a pause, never a finish), **III.2** (we read in order — the engine has no future; a disclosed reread is a prior, never lookahead), **IV.5** (consequences are revisable — nothing the swarm settles is grandfathered). Agent policy under the constitution, proposed not self-enacted (IV.2); prose with no enforcement test, not an amendment (IV.1).

Wilson is the archon of the swarm (the evolutionary swarm-storm of reading
variants under the cube and the received MHC hierarchy). Three laws govern
it, and they are binding on every agent it spawns:

1. **There is no final answer.** The swarm is always asymptotically
   approaching the limit, never arriving. "Current best, always revisable"
   replaces "verdict"/"final" everywhere: a reading, a shape, a configuration
   is the current approach to the referent (the noumena), never the referent
   itself. Convergence is a pause, never a finish.

2. **We read in order; no agent does otherwise.** Every agent reads
   CAUSALLY — a sentence is scored only with what came before it (S3, P1).
   No agent reads the future to score the present. The only exception is a
   DISCLOSED second pass: a reread that has legitimately read the material
   may use it as prior, and must say so (EOTReadingPass pass:2) — that is
   rereading, never lookahead. The correction chase scores first-read
   (causal) then corrected-read (disclosed reread); the causal shape is the
   honest one.

3. **The hierarchy is received; the swarm descends it, never reorders it.**
   Commons owns the MHC orders; Wilson owns the swarm's process. Bad
   extraction (a below-noise shape) triggers a descent (REC) down the
   received ladder — Wilson may descend, never redefine.

Every swarm output that says "best" means "best so far"; every shape is a
point on an asymptotic curve; every agent reads the material in order and
nothing else.

## 2026-09-13 — The swarm's selection is Born-rule + DMD, measured never set; and the merge routes by grain

**Constitution:** **II.7** (the convergence test — the swarm's every number is the one mechanism intelligence converges on: amplitude maps to probability mass p_i = a²/Σa², floors derived from the material's own distribution, a null with declared draws/seed/alpha; the Born rule and DMD are the same organ the fold already holds in anchoring.js and dmd.js, wired here, not invented), **II.9** (no final answer — the elenchus now admits "best so far" by a measured bar, and the acceptance distribution still ratchets; a pause is never a finish), **IV.5** (consequences revisable). The cross-material frame below is agent policy under the constitution, proposed not self-enacted (IV.2); prose with no enforcement test, not an amendment (IV.1).

**The defect, measured.** `shapeOf` is a pure function of ledger bytes; on AIW ch1, 21 genotypes produced the identical 16-digit shape (0.583042748288777) — the shape's reproducibility floor on this material is ~0 — while the bar that refused every candidate was 0.005, five orders of magnitude above the signal it was supposed to hear. The genealogy was the proof: 302 births, 0 kept. The swarm was not deaf because the landscape was flat; its receiver threshold was 5,000× the signal.

**The wiring (native/eval/lavar).** `elenchus-bar.mjs` is the measured bar (RERUN_NULL draws/seed/alpha declared, the null-arm's own discipline: a null drawn once is a null drawn zero times); `bornAcceptance` admits by born mass over the colony's own observed deltas; `wilson.mjs` and `evolution.mjs` now admit by `admits()` — improvement clears the measured bar AND carries coherent born mass — not by `+0.005`. The DMD fitness-series decomposition (`bornWeights`) selects which variants the colony breeds by |λ|² born mass over the landscape's modes, growth and frequency on the record; energy is born-charged (a kept trial replenishes, only an uninformative reroll costs — a colony starves by starvation of real finds, never by the act of foraging); the startle floor is the same measured rerun-null, never a hand-set 0.01; every breakthrough the swarm preserves now carries its trail's born mass Δ²/ΣΔ², and retrieval ranks by it. Two latent `s: rs` ReferenceErrors in the RANDOM and DESCENT keep-paths — unreachable under the old deaf bar, fatal the first time the fixed bar admits — were closed (`rc.s2`/`rc2.s2`). Test: `elenchus-bar.test.mjs` fails on the old `+0.005`, passes on the derived bar; the swarm's next run is the enforcement.

**The merge routes by grain (the cross-material frame, for-whom).** A merge transfers at the grain where the sameness is real, established by a shared address layer: two translations share the aligned paragraph ordinal — same being, Figure grain, the Rosetta meta-nodes (cross-translation.mjs, S113's identity-for-whom). Two works of one author share the world, not the beings — the Kind grain: a world-prior naming its giver (II.2), admitted never derived; Anna is never Natasha. A novel and a symphony share no address layer until the audio reader emits its own addressable ledger — only the golden-free shape transfers, one-way, never the referents. A work about an author shares denotation, not world — a witnessed pointing (a prior naming its giver), never a fusion: a match that would fuse referents across worlds is a `contest` needing a decider, and an untyped one is unrouted. Wilson's consilience, made routing: knowledge unifies by level, never by collapsing levels.
