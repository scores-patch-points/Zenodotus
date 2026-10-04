# live_priors — standing policies

Standing decisions about **this corpus and the readings taken of it**, each
with the evidence that established it. Entries are numbered `LP<n>` — a
distinct prefix on purpose, so a cross-repo citation is never ambiguous
against the-fold's `P<n>` or eoreader7's `S<n>`.

The discipline is the one the sibling repos already hold: **amendments
append, they do not rewrite.** A later pass that changes a decision adds a
dated amendment under the entry it changes and leaves the original standing
as the record of what was decided and why. A number is never reused and an
entry is never deleted.

Where this file and a sibling disagree: eoreader7's `READING-SPEC.md`
governs how the engine's organs read; the-fold's `POLICIES.md` governs the
workbench that consumes them; this file governs **what a corpus owes a
reading, and what a reading owes a corpus.** On the mechanics of any organ
named here, the sibling wins.

---

## LP1 — The source is the Torah: immutable, native, and never replaced by a reading

This repository's own description is *"Living corpus of source texts."* The
source texts **are** the product. Everything else here — manifests, derived
priors, readings — is apparatus around them.

**The rule.** A source is kept in the format it was received in. No reading,
index, digest, or derived artifact may edit a source, normalise it in place,
re-encode it, reorder it, or stand in for it when a consumer asks for the
document. A source changes only when it is re-fetched or corrected **as a
source** — never to make a reading of it come out better.

**Why it is stated rather than assumed.** The pressure to violate it is real
and specific: readings are easier to take against normalised text. The digest
driver already normalises line endings, strips Gutenberg containers, and
drops catalogue boilerplate before reading — and every one of those is
correct **as a transform applied on the way to a reading**, and would be a
corpus-integrity failure if written back to the file. The corpus keeps the
CRLFs, the licence headers and the Archive.org favourites tags, because they
are what was received.

**Already true, pinned here so it stays true.** `/api/priors/doc`
(the-fold's `explore-server.mjs:1354`) reads the file off disk and serves its
bytes. It consults no reading and no index. That is the correct shape and
LP4 makes it a rule rather than an accident.

**The corollary that has already cost something.** If a source is what was
received, then what a path *claims* about a source is not evidence about it.
All 20 of 20 files in `11-multi-language/gutenberg-non-en/` disagree with
their own filenames — wrong book, wrong author, often wrong language
(`digested/CORPUS-INTEGRITY-FINDING.md`). The organ that caught it,
`declaredIdentity`, works by reading the file's own declared header instead
of trusting its name. **A label is not a source, and the corpus is the
bytes.**

---

## LP2 — A reading is Talmud: commentary, anchored, attributed, append-only

A reading is not a summary of a source, a cache of it, or a substitute for
it. It is **a record of an encounter with it by a named reader** — and it
relates to the source the way commentary relates to a fixed text: it
accumulates, it never overwrites, and every layer can be traced to both a
locus in the source and the reader who produced it.

**What keeps commentary from becoming sprawl is not a size limit.** It is
two properties, and they are the two this corpus's readings must hold:

1. **Anchored** — every increment carries a span that verifies against real
   bytes. An increment that cannot produce a verifying address has nothing
   to attach to and does not land.
2. **Attributed** — every increment names the reader that produced it, so
   two readers disagreeing about the same locus both survive, distinguishable,
   the way Rashi and Tosafot sit on one page without collapsing into each
   other.

Two further properties follow from those:

3. **Append-only** — re-reading a source under a changed recipe appends;
   it never replaces. `hyperlexicon.js::hear` already implements exactly
   this: first sighting is `PROPOSE`, a later sighting of the same assertion
   is `SUPERSEDE`, and its own comment (line 128) states the invariant —
   *"Witnesses and spans UNION, never replace: a merge that overwrote them"*
   would lose precisely what makes the record worth keeping. Two readings
   agreeing become one note with two witnesses, not two notes.
4. **Defeasible** — a reading records what a reader heard, never a property
   of the source. A reading may be wrong about a source without the source
   changing at all.

**How much should a reading grow? It is not a size question.** The bound is
a gate, not a cap:

> An increment may land if and only if it (a) resolves against real bytes and
> (b) names the recipe that produced it. A pass that produces increments
> satisfying neither has begun commenting on the commentary, and has nothing
> to append.

Growth is therefore bounded by *the source's own extent × the number of
distinct recipes ever run against it*, and it is self-limiting in the way
that matters: **a recipe that hears nothing appends nothing.** The measured
case is already on record — `classical-music-catalog` yields zero edges
against 33 sentences, because its fifteen items each name a distinct artist
once and nothing recurs. That reading is one line long and correct.

**A refuted reading is conceded, never deleted.** The vocabulary exists:
`RETRACT` in the task log, and `concedeEvaluation`/REC for "this ground is
conceded." A bad pass goes on the record as refuted, in the same way the
Talmud preserves a rejected opinion rather than erasing it. The record of
having been wrong is part of what the record is for.

**Consequence, stated plainly:** the reading is not a cache. A cache is
regenerated when the code changes; a record is appended to. Today's digest
is *written* like a cache (`eot-digest.mjs:234` creates a fresh log per run;
`:356` overwrites the file) and *typed* like a record. That inconsistency is
real and unresolved — see LP5 for the prerequisite that must land first.

---

## LP3 — An address is only an address if it resolves in the source's own coordinates — and today's readings do not

**Measured, not argued.** Take the first span of the Gutenberg specimen in
`digested/`. Its address is `gutenberg-non-en/de-path/pg67098#196-256`:

| resolves against | result |
|---|---|
| the excerpt carried **inside the digest** | ✅ |
| the source file at the same offsets | ❌ |
| the source file corrected by the recorded `bodyOffset` | ❌ |

The span's true offset in the source file is **1165**; the address records
**196**. The recorded correction does not reconcile it —
`bodyOffset (952) + CRLF pairs before that point (42) = 994`, against an
actual drift of **969**.

**Why.** `excerptOf` applies three transforms before anything is addressed:
`stripContainer` (offset recorded), `stripCatalogBoilerplate` (recorded only
as a total character count, not as positions), and `normaliseNewlines`
(**length-changing and not recorded at all** — 3,654 CRLF pairs in this one
file). The composition is not invertible from what is written down.

**So the addresses live in a coordinate space that exists nowhere except
inside the reading itself.** Three consequences follow, and the second is the
one that matters:

1. The embedded `excerpt` is **load-bearing, not decorative.** Remove it to
   make the reading "pure commentary" and every address becomes
   unresolvable. The question of whether the Torah should live inside the
   Talmud is not currently a matter of taste.
2. **"The reading links through to the source" is aspirational, not true.**
   A reading that cannot point at the text it comments on is not commentary
   on that text; it is commentary on a private copy of a fragment of it.
   This is the same failure class as the CRLF bug that
   `spanSelfVerification` caught while this digest was built — two different
   strings, one set of offsets — one level up.
3. A reading whose addresses do not resolve in the source cannot be used to
   accelerate anything (LP4), because nothing it points at can be checked.

**The rule.** A reading must address the source's own coordinates. Two
honest ways to satisfy it, and the second is probably right:

- **Address the raw bytes.** Take the reading against the source as received
  and let the organs cope with container text and line endings. Simple, and
  it costs reading quality.
- **Name the derived text as a recension.** If a transform is applied, the
  transformed text is a *thing in its own right* — content-address it, give
  it an identity, record its derivation, and let the reading address **the
  recension**, while the recension names the source it derives from. That is
  precisely what a critical edition does, and it is honest in a way that an
  unrecorded normalisation is not: the commentary attaches to a named
  recension of the text, and the recension attaches to the text.

**Until one of those lands:** the excerpt stays embedded, and a reading must
not claim to point at the source file. Naming a limit is cheap; a reading
that silently misaddresses is the expensive kind of wrong.

---

## LP4 — What may and may not be hardcoded into the priors app

The question this entry settles: should readings be baked into the priors
app as data it depends on? **The answer is not binary, and the line that
matters is not "committed vs. computed" — it is `offered` vs. `substituted`
vs. `gated on`.**

### The case for, taken seriously

The priors app's own code already names this as the open problem.
`/api/priors/check`'s header (`explore-server.mjs:1408`) records the measured
cost against a corpus it puts at 2,047 documents and 183.4MB: listing is
~20ms warm and reading every byte ~1.1s, but *the sentence walk over the
whole corpus is ~9s per claim — not an interactive check.* So the check
consults only a mechanically ranked candidate slice, and the header says
outright what would fix it:

> A PROPER index would be [engine] host ingestion … at the engine's measured
> 8.4s per 3.3MB, admitting 183MB is a minutes-long one-time build **whose
> persistence and staleness story this server does not own** — named future
> work, not half-built here.

That blocker is **staleness**, and LP2 dissolves it. If readings are
append-only, anchored and attributed, a reading taken under an older recipe
is not stale — it is *older*, and it is still a true record of what that
reader heard. Nothing has to be invalidated when the organs change; a new
layer is added. **A Talmudic reading is the persistence story that a
regenerated index cannot have.**

### The case against, also measured

Of the fourteen sources read into `digested/`, **six carry little or
nothing**: `classical-music-catalog` 0 edges, Greek 1, Hebrew 2,
`grateful-dead-catalog` 2, Korean 3, Farsi 8. Three of those are worse than
empty — the "content" is English caption debris. The six Hebrew surfaces
were `School`, `Athens`, `Raffaello`, `Internet`: an image caption, never
the article.

Had those readings been hardcoded as what the app knows about those
documents, the app would have advertised *School, Athens, Raffaello,
Internet* as the subject of a Hebrew philosophy article — small, plausible,
and wholly false. That is the exact failure `scriptCoverage` (eoreader7 S24)
now types as a gap, and it is the reason a reading may never be the thing
the app trusts.

### The rules

**MAY** — a reading may be *offered* beside a source, typed as a reading,
with its recipe named. A reader who wants to know what an organ heard is
entitled to see it, labelled as a claim by that organ.

**MAY** — a reading may be used as an **index or accelerator**: to rank
candidates, to narrow a walk, to answer "which documents are worth opening."
Conditional on one thing — **any result reached through a reading is
re-verified against source bytes before it is asserted.** A reading may
decide where to look. It may never decide what is true.

**MAY NOT** — a reading may never be **served in place of source bytes.**
`/api/priors/doc` serves the file. A consumer asking for a document gets the
document.

**MAY NOT** — a reading may never **gate** what the corpus offers. Whether a
document is listed, toggleable, attachable or consultable must not depend on
whether a reading of it exists or on what that reading found.

> **A document with no reading is not a document with nothing in it.**

This is the-fold's own constitutional statement about checking organs
(*"a checking organ may say 'I have nothing to compare this against'
(withhold), or 'I compared it and it failed' (convict). It may never
manufacture the second out of the first"*), applied one level out: **absence
of a reading is a fact about the reader, never about the document.** The
Hebrew article is not empty. The reader is blind to it, and now says so.

**MUST** — a reading carries its recipe or it is unusable as evidence. See
LP5.

**MUST** — a reading's own gaps travel with it. A digest that reports
`edgesFound: 2` without the `script_mostly_without_case` gap beside it is a
number that lies by omission; the gap is not an annotation on the reading,
it is part of it.

### What this leaves open, deliberately

Whether to pre-digest the **whole** corpus rather than a sample is not
decided here, and should not be until LP3 and LP5 land — a 2,047-document
append-only reading store whose addresses do not resolve and whose passes
are not attributable would be a large artifact that cannot be checked, which
is worse than not having one. The order of work is: **coordinates, then
recipe identity, then scale.**

---

## LP5 — Recipe identity is the missing primitive, and the prerequisite for append-only

Today a reading is admitted with `admit(log, edges, { witness: spec.slug })`
— the witness names **what was read**, never **who read it**. Every digest
already carries an `organs` block naming which organs ran, which priors were
injected, and which were deliberately omitted. **That block is the recipe.**

**The rule.** Content-address the recipe and make the witness
`slug@recipe`. Then:

- two passes under different organs are distinguishable increments on one
  log rather than an unattributable pile;
- witness-unioning (LP2, already implemented) yields **cross-recipe
  corroboration for free** — "two independent recipes both heard this" is
  the strongest signal this apparatus can produce, and today it is discarded
  on every re-run;
- a reading can be read *as evidence about the organs*, not only about the
  source. That is not hypothetical: this digest's own first run found a real
  CRLF offset bug in its driver, and it found it because a reading had been
  committed and checked.

**Ordering, stated as a rule because getting it wrong is expensive:** do not
make the digest append-only until recipes are identified. Append-only
without attribution produces a log whose increments cannot be told apart —
strictly worse than today's honest overwrite, because it *looks* like an
accumulating record while being an unreadable one.

---

## LP6 — A recipe defect is not new material: append-only cannot self-correct one, and must not be asked to

LP2 states the standing law: a reading accumulates, a recipe that hears
nothing appends nothing, a refuted reading is conceded (REC), never
deleted. This entry names the one case that law does not, by itself,
cover: **when the RECIPE itself was wrong** — not a source revised, not a
new organ widening what is heard, but the same organs mis-admitting facts
they should never have admitted in the first place.

**What happened, concretely.** `eot-digest.mjs`'s recipe called
`hypergraph.js::makeRelationReader` without its own `posPriorFor`
accessor — an already-built, already-tested TYPE-level gate
(`relations.js::discoverRelationVocab`'s `posPrior` param: a candidate
verb is admitted only if VERB+AUX account for more than half its
attested uses in the real UD_English-EWT treebank; an unattested form is
never refused, only a form the treebank clearly says is NOT a verb). An
earlier pass here loaded the fixture only for `classifyConnector`
(the-fold's grammar-lens.js, correctly kept disclosure-only per P56's
own asymmetric rule — a settled part of speech is refusable, never
confirmable) and, in doing so, never separately considered this coarser,
safer mechanism — conflating two different gates and declining both.

Measured on real corpus files before this was found: **80-99% of
extracted "relation verbs" were prepositions, conjunctions, articles, or
pronouns** — `of`, `the`, `by`, `with`, `in`, `that`, `this`, `how`,
`what`, among others — because `discoverRelationVocab`'s own
slot-anchoring (the token immediately following a recurring surface) has
no notion of grammatical category on its own. Wiring `posPriorFor` closes
this at the source: on Shakespeare, the Iliad and Alice's Adventures in
Wonderland (three real Gutenberg excerpts), gated edges fell from
90/65/97 to 22/25/34 while every surviving verb on Alice
(`was, started, had, think, fallen, got, began, opened`) is genuine — see
`POS-VOCABULARY-GATE-VALIDATION.md` for the full 10-specimen diverse
validation this fix was checked against before the corpus was re-swept,
including two real, disclosed limits the gate does NOT close (non-English
text passes through entirely ungated; an uncommon ENGLISH noun absent
from the treebank's own ~16,654-word vocabulary passes through exactly
the same way a foreign word does — both are `posStanding: "gap"`, never
a refusal, by the gate's own conservative design).

**The problem this created for LP2's own append-only rule.** The corpus
had already been swept once (task #8, before this fix), and every one of
those readings is keyed by `witness = slug@recipe` where `recipe` did not
yet include the gate. Because the source bytes never changed,
`eot-sidecar.mjs`'s own reuse rule (`existing.source.sha256 === hash` →
reuse the existing log, only append) means an ORDINARY re-run under the
new, corrected recipe would have kept every stale false-verb admission
from the old recipe forever, merely ADDING the newly-gated facts beside
them — confirmed live: Alice's own sidecar, re-swept with the gate
wired in, still carried `"to"` as an admitted relation verb from the
prior sweep, even though the gate correctly excluded `"to"` from the
FRESH vocabulary computed on that same read (`verbShare` for `"to"` in
the real treebank: 0.0002).

**The rule, stated generally.** LP2's append-only discipline governs
what a reading learns about a STABLE source under a STABLE or WIDENING
recipe. It was never a promise that an admission made under a recipe
later found to mis-admit facts stays admitted forever — that would make
correctness debt permanent by construction. **A recipe correction is not
new material layered onto old material; it is a claim that the old
material's own admissions were wrong**, and the honest response is the
same one LP2 already names for a refuted reading: concession, not
silent accumulation.

**What shipped, since no per-edge REC-driving mechanism exists yet at
corpus scale (HL/void-loop tooling that could adjudicate 2,207 files'
worth of individual admissions is real, unbuilt future work — see the
27-cells reference in the-fold's own CLAUDE.md for where that capability
would live).** `readSidecar`/`processFile` gained an explicit, named
`fresh` option (CLI: `--fresh`) that skips reading the existing sidecar
entirely rather than reusing its log — a deliberate, disclosed,
one-time corpus-wide re-read, treating the WHOLE prior sweep as
conceded because the recipe itself was the defect, never the routine
mode. This is not a bulk deletion: each source's sidecar is regenerated
file-by-file, under its own real bytes, self-verified exactly as before
(P5.2 at the door, unchanged) — the file that lands is a genuinely fresh
reading, not a patched one.

**What this does NOT license.** `--fresh` is not a general-purpose reset
button. Reaching for it again requires the same standing this pass
met: a demonstrated recipe-level correctness defect (not merely a wider
recipe, which append-only already handles correctly), validated on a
deliberately diverse sample before the corpus-wide re-read, with the
validation itself committed as a record (this repo's own standing
practice — `eot-sidecar-sweep-RESULTS.md`, `eot-legal-text-anomaly-NOTE.md`,
and now `POS-VOCABULARY-GATE-VALIDATION.md` all exist for exactly this
reason: a reader should never have to trust a claim about corpus quality
without the evidence that produced it).

---

## LP7 — There is no reading from nowhere: the sidecars erased, and the bar any successor must clear

**Two user directions, one entry (2026-08-31).** First: "erase all our eot
sidecars since they don't align to this" — "this" being the proposition
bar stated the same day in `goldens/reading/RULE.md`'s fourth amendment:
a proposition is a difference that makes a difference, the TRIADIC
MINIMUM of assertions (a term, an operator, and the state or ground the
move lands against; fewer than three and nothing has moved). Second, the
forward half: "there is no reading from nowhere — any reading needs to
leverage declared priors and have things like surprise etc."

**What was erased, and why it failed the bar.** All 2,208 `*.eot.json`
sidecars, corpus-wide, in one commit. The specimen that decided it,
examined row by row the same day: `06-government-legal/un-udhr/
udhr-eng.txt.eot.json` read 73 sentences of the English UDHR and emitted
five edges — every one the auxiliary "have" glued to its neighbours,
every one stamped INS·Figure, two subjects ("compelled to", "women and")
not referring phrases at all, two edges sharing one byte span. Those
rows are extractor patterns, not propositions: no row names a
transformation landed against a ground, so under the triadic minimum the
sidecars asserted nothing — while LOOKING like readings, which is worse
than absence. LP4's own line — "a document with no reading is not a
document with nothing in it" — cuts both ways: an absent sidecar claims
nothing, where a wrong one claimed plenty.

The erasure is a `git rm`: history keeps every byte (the event stream is
the reality, the working tree the projection — store.js's frame, already
this repo's own R12), and the projection now honestly shows no reading
where none worth the name exists.

**What stays, condemned or cleared by name.** The generator
(`scripts/eot-sidecar.mjs`) and its tooling (eot-digest,
eot-coverage-summary, eot-sidecar-sample, the sweep RESULTS docs, and
`goldens/reading/MINED-PATTERNS.md`) remain in the tree as the record of
the generation that was tried — the-fold's succession.js precedent:
condemned, present, disclosed; it must not run again until the bar below
is met. The apparatus it built is NOT condemned: recipe identity (LP5),
S26 raw-coordinate spans, the typed admission gate all held (the specimen
self-verified 5/5 and turned nothing away) — what failed is what walked
through them. A gate can only refuse what its reader flags; the reader
had no ground to flag against.

**The law: no reading from nowhere.** A reading enters this corpus only
when all three hold:

1. **Its rows meet the proposition bar.** RULE.md's triadic minimum;
   `goldens/reading/` is the target grammar and the scorer.
2. **Its declared priors are its GROUND, not merely its filter.** The
   erased recipes NAMED priors with givers (determiners, negation, the
   POS vocabulary gate) but used them only to filter candidate verbs.
   Leveraging a prior means reading WITH the expectation the prior
   supplies — the reader can say what it expected before it says what it
   found. A recipe that names priors it does not expect with is
   provenance for a reading from nowhere.
3. **Difference is measured, not assumed: surprise runs.** A reader that
   cannot say what it expected cannot say what differed — and a
   proposition IS a difference. The organs exist and are named, not
   aspirational: eoreader7's `emergence/surprise.js` (Shannon novelty and
   Bayesian surprise, kept apart, provably identical only at full
   commitment), the tier-stack meters the-fold already wires
   (reflex.js/aperture.js — declared window, gamma, draws, seed, givers
   named). What a row's difference moved against belongs on the row.

**What this entry does not decide:** the successor reader's design —
whether the goldens seed its expectations, whether surprise gates
admission or only rides rows, what a prior-expectation concretely is at
corpus scale. Those are the next pass's to measure, not this entry's to
guess.

**Amended 2026-08-31, same day — surprise is hypergraph delta, never
n-gram frequency.** User direction, verbatim: "things are surprising to
the extent they change our hypergraph, not ngram frequency." This
sharpens clause 3 above from "surprise runs" to WHAT surprise is: the
ground a reading measures difference against is the accumulated
hypergraph — propositions, referents, cells, polarities, standings — and
an increment's surprise is the TYPED CHANGE it makes to that graph: a new
proposition founded, a witness added to a standing one (near-zero
surprise — LP2's union, two readings agreeing become one note), a cell or
polarity variant landed on an existing proposition, an expected
proposition found ABSENT, a language-unique proposition added, a
departure from the declared frame or act expectation. Token-frequency
novelty (FoldReadingPrior@1's Witten-Bell mixture, Shannon surprisal over
forms) is NOT this measure: it may still rank candidates — LP4's
accelerator posture, decide where to look, never what is true — but a
reading's surprise field carries graph deltas, each one typed and
witnessed, never a perplexity score. This closes the loop with RULE.md's
fourth amendment: a proposition is a difference that makes a difference
(admission asks "did anything land"); surprise is how much difference it
made (what the landing changed) — Bateson's own second clause, "the
difference that figure made to the NEXT ground," read as the definition
of the measurement. The kernel already carries the right vocabulary:
`expectations.js` (open/fulfilled/violated/reframed — EVA transitions,
REC on reframe) is the per-expectation form of the same law.

**Amended 2026-08-31 (second, same day) — priors are checkpoints, never
weights.** User direction, near-verbatim: build a universe of meaning
where as much as possible lives LIVE, not as permanent weights — but with
a bootstrap/checkpoint to start from. The rule: the reality is always the
event stream — the source bytes (LP1), the hand goldens with their
append-only revisions (R12), the readings' own appended logs (LP2) — and
every compiled prior (ReadingPriors@1, ActPrior@1, POSPrior@1) is a
PROJECTION of those live sources at a named moment: content-addressed,
carrying its regeneration path (build script + input shas + repo commit),
superseded by RECOMPILING from the live sources, never by editing the
artifact. No figure in a checkpoint is a permanent weight: a later ring's
readings extend the graph, the goldens revise by append, and the next
checkpoint is a fresh projection (v1, v2, … — versions of a projection,
not editions of a truth). A consumer that treats a checkpoint as truth
rather than as "where the live record stood when I started" has rebuilt
the cache LP2 forbids, one level up. store.js's own law, applied to
priors: the log is truth, projection is convenience — and a bootstrap is
just the first projection.

---

## LP8 — A sidecar is never done: layered readings, adversarial priors, and the fold

**User direction (2026-08-31, near-verbatim):** as we spiral out, assess
whether the sidecars contain what is meaningful about READING; hold alt
versions as ADVERSARIAL PRIORS, built on other genuinely decent
hypotheses about minimizing hypergraphical surprise; amend earlier
sidecars via APPENDS so their folds improve; **no sidecar ever needs to
be "done."**

**The shape.** A sidecar carries `layers`: an append-only ledger of
reading passes, each under a NAMED HYPOTHESIS with its own recipe —
layer 0 the favored reading, later layers adversarial priors: competing
expectation structures scored against the same rows. The `fold` is the
projection across layers (per-hypothesis surprise rates, the current
ranking) — recomputed on every append, never hand-edited. Appending a
layer is the only way a sidecar changes meaning; deleting or rewriting
one is forbidden (LP2's discipline, one level up). Because ring-0
sidecars are themselves projections of the live goldens (LP7's
checkpoint law), the append-only reality is the LAYER-RECIPE LEDGER in
the generator plus the goldens' own R12 revisions; the file is their
fold, regenerated deterministically — adding a hypothesis appends to the
ledger, never edits a prior entry.

**Adversarial priors are hypotheses about what minimizes hypergraph
surprise, ranked by MEASUREMENT, never by preference.** The first four,
measured the day this entry landed — each language's adjudicated cells
predicted from what the languages before it know (Goal 6's one-reader
caveat rides every figure):

| hypothesis | knows | ar | es | zh | sw |
|---|---|---|---|---|---|
| frame | the family modal cell alone | 49% | 48% | 49% | 50% |
| structural | (role x clause x polarity) -> modal, no lexicon, no join | 66% | 65% | 58% | 59% |
| cell-transfer | the Rosetta prop join: prior languages' cells | 93% | 99% | 90% | 92% |
| **grain-transfer** | the prop join, GRAIN only | **100%** | **100%** | **97%** | **100%** |

**The finding this bought immediately:** the GRAIN is the near-invariant
axis of translation; the OP carries the construction. On the 23
construction-splits — exactly where the op varies — grain survives
20/23, and each of the three grain-breaks has a documented adjudication
reason (family-unit-society: the rule-3 definiteness split;
education-directed; limitation-purpose). Consequence for every future
ring: an op-level variant is ordinary translation information; a GRAIN
break against the join is rare enough to be an alarm, in a way an op
variant never is.

**What this does not decide:** whether grain-transfer's win survives
independent adjudication (Goal 6); which hypotheses join the ledger next
(named candidate: the mechanical copula/A4/A5 ladder proper, which needs
predicate-shape fields the rows do not yet carry).

---

## LP9 — Metacognition on the spiral: testing before trusting, and where surprise actually lived

**User direction (2026-08-31), near-verbatim:** use what this project has
learned to spiral out and create sidecars for more files in this corpus;
exercise metacognition on the process itself, adjusting it and drawing
real lessons about reducing surprise; do it "as Friston possessed by
Vivekananda."

**The two teachers, named once, translated into this project's own
vocabulary rather than invoked as decoration.** Friston's active
inference: a generative model is not asserted, it is tested against
evidence before it is trusted with precision — a model given full
confidence before it has met data is exactly the failure LP7 diagnosed
in the erased sidecars, and the right response to a risky, informative
policy is to run it at the smallest reversible scale first, not to avoid
it or to commit to it blind. Vivekananda's practical Vedanta: work done
as its own end, without attachment to whether the fruit is flattering
(the mechanical ladder's first run scored 74.6%, with one tier at 8.3% —
published here exactly as measured, not quietly improved before anyone
saw the bad number); and the discipline this project had ALREADY
rediscovered on its own before either name was invoked — LP4's own
sentence, "a document with no reading is not a document with nothing in
it... the reader is blind to it, and now says so," is viveka (discrimination
between the veil one's own instrument casts and the thing itself) in
this project's native register. Both ideas earned their place by
predicting what actually happened in this pass, not by being asserted
over it.

**What was tested before anything was trusted.** Two checks, both run
BEFORE building anything, both answerable from records already on disk:

1. *Is the raw extractor ready for ring 2?* DERIVED-RULES.md already
   answers this (10 golden Kant rows, 4 pipeline edges, 1 genuine
   correspondence, 1 clean match) — re-run, not re-derived, to confirm
   nothing had changed. It had not. Conclusion held without spending a
   single token reproducing the failure LP7 exists to prevent: no raw
   mechanical extraction on new files this pass, named as the boundary
   ring 3 must clear first (DR4/DR5, in the-fold's own extractor, not
   fixable from this repo).
2. *Does a structural detector, built from general principles and never
   shown this specific file's answer, land where a hand adjudicator
   independently did?* `scripts/spiral-ring2-wikipedia.mjs` was run
   against `Immanuel_Kant.txt` FIRST, alone, before the other 48 files —
   its detected debris/prose boundary (567 bytes) landed within ONE BYTE
   of `kant.golden.json`'s own first row (568). Unplanned, and the
   strongest kind of validation this pass could ask for: a model tested
   against ground truth it was never fitted to.

**Where surprise actually lived: not where it was expected.**
`scripts/mechanical-ladder.mjs` (LP8's own named next candidate, built
this pass) implements the copula rules + A3/A4 + the frame table (RULE.md
sixth amendment) as a real classifier — every closed class either REUSED
from eoreader7's own received register (`AUXILIARY_VERBS`,
`DEFINITE_DETERMINERS`, `INDEFINITE_DETERMINERS` — imported, not
re-typed) or declared with its own giver as a genuinely closed
grammatical paradigm (negative existential quantifiers), never an
open-class sample. First run against the 173 English rows across all
committed goldens: 74.6% accuracy-of-decided, and its A4 tier scored
8.3% (1/12) — a prior asserted with far more confidence than it had
earned. READING THE MISSES rather than discarding the number (prediction
error is information, not noise) found the real fault: the rule fired on
"does the SUBJECT lead with a negative quantifier" alone, when the real
positive shape (Alice's own "nothing so very remarkable | was | in
that") needs the quantifier to pair WITH a bare copula/existential
predicate — "No one shall be subjected to X" is the ordinary subjection
frame with a negative-quantifier subject, never NUL. RULE.md's own
seventh amendment records the corrected rule. Two more faults were the
author's own, named as such rather than smoothed over: a "held guilty
of" pattern was added to the subjection frame by analogy, not because
the published table names it, and it fired on a real EVA-family row the
frame table has no coverage for yet; a bare "shall be made" swallowed
"no distinction shall be made" (SEG, the ordinary distinguishing act,
not INS). Both removed rather than patched into a different guess.
Corrected: 94.7% accuracy-of-decided, 32.9% coverage — a small, honest
instrument, not a sweeping one.

**The generalizable lesson, stated once:** a prior is worth holding
exactly to the degree it CAN be surprised — the mechanical ladder's
first cut minimized its own apparent surprise by matching broadly (three
guessed extensions, one over-eager rule), which is the same failure
shape as the erased sidecars at a smaller scale: confidence purchased by
not looking closely enough at what it actually covers. The fix, both
times, was the same move: read the misses, trace each one to its actual
cause, and either correct the rule with the evidence in hand or DISCLOSE
the limit rather than paper over it with a guess. Testing at the
smallest reversible scale (one file against its own golden, 173 rows
against a classifier before any new file was touched) is what makes that
move affordable — a wrong prior discovered on 173 already-graded rows
costs nothing; the same prior discovered after being asserted as a
reading of new material is LP7 all over again.

**What this pass adds to the spiral, concretely.** `02-encyclopedic/
wikipedia` (49 files, one already a hand golden) joins the corpus with
STRUCTURAL-ONLY sidecars — declared identity (this family's own
convention: the filename is the identity, disclosed as such, since no
in-file header exists the way OHCHR's does for `un-udhr`), a real
infobox/wikilink-glue debris detector (DR10's own named finding, now a
working organ rather than a filed observation), heading detection, and —
new this pass — an ONLINE structural posterior: each file's heading
count and debris fraction is compared against the family's own RUNNING
mean/spread (a plain Welford update, disclosed as exactly that, not a
validated test), then folded into the posterior for the next file. Three
real structural outliers surfaced this way (Cell_biology.txt, sparser
than the family's own norm; Industrial_Revolution.txt and Taoism.txt,
denser) — checked by hand against the actual files rather than trusted
blind, and confirmed real rather than detector error. Propositions stay
empty, corpus-wide, per the standing DR4/DR5 evidence above.

**What this does not license.** The mechanical ladder is scored against
existing ground truth only — it is not run on unread files as a reading,
and its `undecided` outcomes are real refusals, not a coverage figure to
chase upward by loosening the ladder's own walls. The Wikipedia sweep's
propositions stay empty until DR4/DR5 land in the-fold's own extractor;
that boundary is named, not worked around. The next ring this entry
licenses is MORE of the same discipline — more structural families, more
mechanical-ladder tiers scored against rows this corpus already has —
never a shortcut past the evidence that keeps saying content extraction
on unread material is not ready yet.

**Addendum, same pass — the discipline caught its own author mid-act.**
`git status` before staging (this repo's own standing practice, not a
special step for this pass) showed `Immanuel_Kant.txt.eot.json` as
MODIFIED rather than newly added — the tell that `spiral-ring2-
wikipedia.mjs`'s first run had silently overwritten the real ring-0
hand-adjudicated sidecar (10 propositions) with a zero-proposition
structural stub, because both generators write the identical
`<file>.eot.json` path with no coordination between them. This is LP2's
own law ("layers append, never overwrite") and LP8's own law ("a
sidecar is never done" — never a sidecar SILENTLY UNDONE) violated by
the very pass written to honor them, caught only because staging is
never trusted blind in this project. Fixed at the generator, not just
the file: ring 2 now checks for an existing `reader.kind ===
"hand-adjudication"` sidecar and skips rather than writes, named in the
script's own comment so the next generator sharing this corpus does not
repeat it. The corrected sweep: 48 structural sidecars (Kant excluded,
correctly, as ring 2's own log now states plainly: "a ring-0
hand-adjudicated sidecar already exists here"). Kept here rather than
quietly folded into a clean final number, because the honest account of
testing a process is not only what the process got right.

**Addendum, next day — the held-out test this entry's own claims were
waiting on.** User question, direct: "do you think these are good
priors?" — followed by the instruction to answer it with an e2e test on
a net-new corpus rather than an opinion. `scripts/e2e-generalization-
eval.mjs` + `scripts/e2e-generalization-test-RESULTS.md`: 13 hand-read
specimens from `06-government-legal/world-factbook` (a family with no
golden, no sidecar, no frame-table phrase drawn from it), scored live
against the currently-committed mechanical ladder. Coverage collapsed
from 32.9% in-family to 15%, as expected for a classifier tuned on
legal-declarative prose. **What was not assumed and had to be measured:
zero of the two decisions made on unseen material were wrong** — the
discipline (never guess; refuse and type the cause rather than decide
past the evidence) held under the one kind of pressure this whole
project had not yet put it under. Three genuinely new construction
classes surfaced this way, each with a nameable cause rather than a
vague miss: no branch exists for an ordinary transitive verb at all (the
ladder's real coverage is copula constructions plus a dozen phrases
lifted from one register); rule 3's definiteness test only recognizes an
article, so a bare proper-noun predicate ("Algiers" as capital) has no
path to SIG·Figure at all; and no rule anticipates a bare numeric or
date predicate ("998 km", "5 July 1962"), which turns out to be the
single most common predicate shape in a reference-fact register. One
already-disclosed gap (dispositional/Pattern-promotion) fired again,
exactly as documented — a confirmation, not a new find. The verdict,
stated precisely rather than as a rating: the measurement DISCIPLINE is
good and just proved itself outside the distribution it was built on;
the COVERAGE is narrow and was previously only argued, now measured.

## LP10 — A received lexicon is wired where it decides; a prior with no consumer is not coverage

User direction, verbatim: "yeah let's use verbnet, why not? I thought we
were. what about unimorph? can we do this for as many languages as
possible?" Two separate corrections, one entry.

**ActPrior@1 (VerbNet) existed since LP7's own seed pass but was only
ever consulted by the SCORING function** (`eot-sidecar2.mjs::checkAct`),
never the GENERATING one (`mechanical-ladder.mjs::classify`) — a
resource built to answer "what act does this verb perform" sat unused
at the one place that question is actually asked. Fixed: a new tier,
after the frame table/copula/A3/A4 tiers and before the final undecided
fallback, electing the relation's head the same measured way (`headOf`)
and looking it up directly in ActPrior, falling back through
MorphologyPrior@1 (UniMorph) to the head's lemma when the surface form
itself is absent. A `contested` entry is refused by name (R7's own
disclosed-alternate discipline), never resolved by picking. Measured
both in-family (32.9% → 34.7% coverage, all 173 hand-adjudicated English
rows, the new tier itself 3/3 correct) and held-out (the same untouched
`world-factbook` specimens LP9's addendum already scored: 15% → 23%,
0 wrong, one new decision honestly flagged as a debatable word-sense
call rather than a clean win). Full numbers:
`scripts/eot-sidecar2-RESULTS.md`, `scripts/e2e-generalization-test-
RESULTS.md`.

**"As many languages as possible" has a structural answer, not a
coverage answer, and finding it took building the wrong thing first.**
The act-typing tier rests on VerbNet, which is English-only BY
CONSTRUCTION — Levin classes are a theory of English verb alternations,
not a universal inventory. So this capability cannot be extended to
another language by adding data; it would need a different theory of
that language's verbs. What extends is the layer beneath it (POS priors
→ head election), built this pass for Arabic, Spanish, and Chinese — but
that layer classifies nothing alone, since the ladder above it (frame
table, copula rules) is hand-adjudicated English. Honest scorecard:
**capability extended to one language, substrate to three, wall named.**

**The lesson that cost the most, and the rule it earns.** A Spanish
morphology prior was built from real, verified `unimorph/spa` data
(873,811 forms, cross-checked against real UDHR inflections — `fueron`
→ `{ser, ir}`, ambiguity correctly preserved) and measured 24.5MB, ~34x
the largest artifact otherwise committed here. Effort then went into
COMPACTING it — while simultaneously writing a long disclosure
explaining why it matched neither an existing consumer nor the
established design (eoreader7's `morphology-eng.json` stores only the
irregular tail: 5,531 kept of 224,550 pairs). Both facts were visible
the whole time. A morphology prior does exactly one job in this project
— bridge a surface form to a lemma so ActPrior can be looked up — so
with no non-English ActPrior it is a bridge to a destination that does
not exist. Deleted rather than committed. **The rule: when the
disclosure explaining why an artifact does not fit runs longer than the
case for shipping it, the artifact is the thing to cut — and a prior
with no consumer is not coverage, however real its data.** Pinned as a
test so it is re-added only alongside a consumer.

**Two register refusals worth keeping.** Arabic and Swahili each HAVE a
real, live UniMorph repository — for the wrong register (Egyptian/Gulf
Arabic, not Modern Standard; Congo Swahili, not standard Kiswahili).
Substituting either fails silently rather than loudly, so both were
refused. Chinese has no UniMorph repo under any code — a principled
absence (little inflection for that schema to tabulate), not chased with
a sixth guess. And on the UD side, `UD_Chinese-GSD` answers HTTP 200 on
every file but is TRADITIONAL script where this project's golden is
Simplified — caught only by reading the actual bytes rather than
trusting the 200, and replaced with `UD_Chinese-GSDSimp`. Swahili has no
UD data at all: `UD_Swahili-OPUSGV` contains no `.conllu` file anywhere,
confirmed twice, despite its README claiming a v2.8 release.

**A real, live bug, caught before it shipped:** every prior-build
script accumulates per-form counts into a plain object via
`forms[form] ??= {}`. `"constructor"` is a genuine attested word in both
UD_Spanish-AnCora and UniMorph's Spanish paradigm table, and a plain
`{}` resolves that key through `Object.prototype` instead of creating a
fresh accumulator — silently losing that one word's counts with no
error anywhere, not merely a crash (the UniMorph script's stricter
`.add()` call happened to throw; the POS-prior script's `[upos] = ...`
shape would NOT have thrown, and did not throw when English's own build
was checked, because English's own vocabulary has no colliding word).
Fixed with `Object.create(null)` everywhere the pattern appears,
including the pre-existing, already-committed English script
(reconfirmed byte-identical after the fix — it was never actually
corrupted, the collision never occurred in that corpus). Pinned as
regression tests so it cannot silently regress.

**What this entry does not claim:** the three new POS priors are wired
into nothing — `headOf` is called only from the English ladder. They are
committed because they are small, in-norm, verified against real words
from this project's own hand goldens, and the honest substrate for
future non-English work; calling them "three more languages supported"
would be false. Building a construction ladder for Arabic, Spanish, or
Chinese is real, larger, unattempted work. Full account, every URL and
HTTP status checked: `scripts/multilingual-priors-RESULTS.md`.

### LP10, amended same day — resolve on demand; the lock makes live fetching safe; and the consumer arrived

User direction, verbatim: "can we leave the unimorph on its own site and
not bloat our priors doc?" then "why don't we do language detection and
then vendor from unimorph as needed live?" The entry above shipped with
the three non-English POS priors COMMITTED (~2.9MB) — LP10's own mistake
repeated at smaller scale, real data committed with no consumer as if
committing were the point. Reversed: `scripts/lang-registry.mjs` is now
the one implementation — a registry of what exists per language (every
row live-verified, every absence typed with what was checked), a
resolver (local cache → fetch on demand → typed refusal, NEVER a silent
fallback to another language), and a committed lockfile
(`derived-priors/pos-priors/resolved.lock.json`) pinning each resolve's
source sha256s so upstream drift is REPORTED, never silently absorbed
into a prior a results document already cited. `pos-prior-en.json` stays
committed — it has consumers. The rule, now mechanical rather than
re-decided per pass: **bytes are committed only where something reads
them; otherwise the recipe + the source address + its sha256 IS the
artifact.**

**And the English prior's second consumer arrived the same day, from the
other direction.** the-fold's hypergraph admission door had been
admitting 18-of-29 junk-labeled notes because its POS prior's mount
pointed at a gitignored dir in an uninitialized submodule — a gate whose
ground never shipped. the-fold's `/priors-data/` mounts now fall back to
THIS repo's committed `pos-prior-en.json` (read live, never copied; one
declared eng→en naming alias at the seam), and the measured effect is
the whole point of committing a prior with its giver and hashes: junk
admissions 18/32 → 0/19 with no other change. the-fold's POLICIES.md
P74 (renumbered from P72 on merge) carries that side; this repo is the Ground repo in that story —
which is precisely what "reproducible from the repo alone" was for.

## LP11 — A loosened key is judged on its marginal admits, never on aggregate coverage

Earned by measurement (`scripts/head-election-eval.mjs`, leave-one-out
over the real adjudicated goldens so expectations are never scored on the
rows that built them), stated as law because the same temptation recurs
wherever identity is keyed: retrieval, act expectations, the-fold's
hypergraph note identity.

**The measurement.** Non-English act expectations key on the whole
relation surface; with POS priors resolvable for ar/es/zh the obvious
move was to key on the elected head instead, so differently-spelled
relations sharing a head could match. Head keying LOSES everywhere,
including English: as a replacement it drops coverage and accuracy in
every language (en: 42.4%/92.5% surface → 20.8%/61.5% head); as the
DEPLOYED ladder (surface first, head only on a miss), its marginal
admits — the only rows where it speaks at all — ran **25.0% (ar), 55.6%
(es), never fired (zh), and 0/8 (en)**. Silence beat it. The whole
surface carries act-deciding information the head throws away ("shall be
subjected to" is not the act of "subjected"), which retroactively
validates `keyKind: "surface"` as the better keying rather than a
fallback.

**The law.** A loosened key's value is what it adds ON THE ROWS THE
STRICT KEY COULD NOT ANSWER, at what accuracy — never its aggregate
coverage, because on the marginal rows it is the only voice, and nothing
downstream can tell its answers from the reliable ones. A join that adds
coverage at coin-flip accuracy exactly where it is unchecked is worse
than silence. Applied the same day, in the other repo, to the other
half of the same handoff: the proposed hypergraph note-identity fold
(referent face + lemma, to make cross-source witnesses possible) was
measured BEFORE being built — 0 joins on the real material, and the
flagship motivating pair (`withdraws` ~ `retreated`) fails at the lemma:
that gap is synonymy, not morphology, and belongs to the semantic tier
(the-fold P32), not to a looser key. Full numbers:
`scripts/multilingual-priors-RESULTS.md`; the-fold's
`eval/results/admission-gate-RESULTS.md`.

**Generality:** universal (evidence: `scripts/head-election-eval.mjs` —
the same leave-one-out construction, same folds, only the keying varies,
measured across four languages and two scripts; the law's restatement in
the-fold was checked against different material and a different keying
mechanism the same day).

## What no entry here decides

## LP12 — War and Peace, read in three languages: the corpus's own filenames lied again, and the reader was blind to a whole alphabet

*(Renumbered from LP7 on merge — a concurrent PR landed its own LP7–LP11 first; the numbers moved, nothing about the policies themselves did.)*

The ask, directly: process the-fold's own flagship specimen — War and
Peace — in English, Russian, and a third language through the full EOT
reading process, and use the resultant `.eot.json` files to measure
whether reading is actually omnilingual. Two findings, in the order they
were found, each closed before moving to the next.

**LP1, again — this corpus's own `gutenberg-non-en/` could not be used.**
Checked directly rather than trusted: `en/pg2542_War_and_Peace.txt` is
Henrik Ibsen's *A Doll's House*, exactly as `digested/
CORPUS-INTEGRITY-FINDING.md` already recorded for all 20 of 20 files in
that directory. Real, verified sources were fetched fresh instead —
English from Project Gutenberg (`pg2600`, the Maude translation, the same
file the-fold's own `eval/crosslingual-eval.mjs` and
`eval/atmosphere-chunking-eval.mjs` already use), the Russian original and
a real French translation (Bienstock, 1903) both from Wikisource,
identity confirmed by reading the actual bytes — not a filename or a
search result's own metadata — the identical discipline `declaredIdentity`
already holds English Gutenberg files to. Landed at
`11-multi-language/war-and-peace/{en,ru,fr}/`, named honestly rather than
extending the tainted directory. French Wikisource's own chapter-level
transclusions (`Guerre et Paix (trad. Bienstock)/I/01` … `/I/07`) were
rendered directly rather than the whole six-volume container page — the
same reasoning LP3 already states about addressing a recension rather
than an unbounded transclusion, applied to fetching rather than to
citing.

**The first `eot-sidecar.mjs` run measured a real, sharp asymmetry.**
`en`: clean, 90 edges. `fr`: clean, 60 edges. `ru`: clean, but only **8
edges — every single one in French**, the novel's own embedded
aristocratic dialogue (real Tolstoy code-switching, not corruption), and
**zero from the surrounding Cyrillic narration**, despite the script gate
correctly reporting the excerpt fully cased and `extractSurfaces`
correctly finding ten real Cyrillic surfaces (including the full name
"Анна Павловна Шерер") when tested directly.

**Two plausible causes, both tested and both refuted before the real one
was found (P5.5's own discipline, applied here rather than re-derived).**
Russian's grammatical case declension fragmenting a name across sightings
— refuted: an artificially undeclined, exactly-repeated Cyrillic surface
still nominated zero candidate verbs. The novel's own French dialogue
statistically dominating a short excerpt — refuted: the same zero result
reproduces on pure Russian text with no French anywhere in it. The actual
cause was one line in eoreader7's `discoverRelationVocab`: JavaScript's
`\b` is ASCII-`\w`-only, with no Unicode mode even under `/u`, so a
surface written entirely in a non-Latin script can never be located by
name, at all, regardless of recurrence. Confirmed universal by direct
construction on two more unrelated scripts (Greek, Hebrew) before being
trusted. **Full diagnosis, the fix, and its own tests live in eoreader7 —
`native/READING-SPEC.md` S34 is the law for the mechanism; this entry is
the corpus-side record of what it was measured against and what changed.**

**Re-run after the fix, same three files, same append-only log — the
delta itself is the artifact, not just a before/after table.** Because
the source bytes were unchanged, the second `eot-sidecar.mjs` pass did not
overwrite anything: it read the existing hyperlexicon log and called
`hl.admit()` again under a new witness (the fixed code's own recipeId).
The original 8 French edges are still there, now `SUPERSEDE`d with a
second witness — two independent reads agreeing, LP2's own "one note, two
witnesses" working exactly as designed. Fifty-five new `PROPOSE` entries
landed alongside them, in real Cyrillic, real Russian: *"Анна Павловна
—кашляла→ несколько дней"* (coughed for several days), *"Князь Василий
—говорил→ всегда лениво"* (always spoke languidly), *"Анна Павловна
—назвала→ императрицу"* (named the empress) — genuine SVO triples read
from the novel's own narration, not the dialogue. `ru` moved from 8 edges
to **63** — no longer a rounding error beside `en`'s 90 and `fr`'s 60, the
same order of magnitude as both.

**What this does NOT yet establish, disclosed rather than implied.**
`grammarPrior: false` on all three sidecars — this checkout has no local
`POSPrior@1` build, so the vocabulary-quality gate (LP6: verb-share over a
real treebank, closing 80-99% false "verbs") is not loaded for ANY of the
three languages here, not only Russian. Reading the raw edges by hand
confirms this plainly: English's own 90 include spurious nominations
("if" —you→ …, "how do" —you→ …) at a rate visibly similar to Russian's
("садитесь" —и→ "рассказывайте", where "и" is the conjunction "and", not
a verb). **The fix closes REACHABILITY — a real edge can now be found at
all — never PRECISION**, and precision's own gate is itself English-only
by construction (UD_English-EWT). A Russian equivalent (Universal
Dependencies has a real Russian treebank, UD_Russian-SynTagRus among
others) is real, named, unbuilt future work, on the same footing LP6
already states for the English gate: a one-time vendoring pass, not
attempted here. So: **omnilingual at the script/reachability level, not
yet at the vocabulary-quality level** — a narrower, honestly bounded claim
than "reading is omnilingual" would otherwise suggest, and the correct
one to make until that gate exists for more than one language.

**Files.** `11-multi-language/war-and-peace/{en,ru,fr}/` (3 verified
sources, ~3.5MB total, `en` full text and `ru`/`fr` opening-chapter
excerpts sufficient to exceed `eot-sidecar.mjs`'s own 8000-char reading
window) plus their `.eot.json` sidecars (each carrying both the pre-fix
and post-fix admission as PROPOSE/SUPERSEDE entries on one log, per LP2).
No script in this repo changed — the fix lives entirely in eoreader7
(S34), reached the identical way every other cross-repo dependency here
already is, through `loadOrgans()`'s own sibling-checkout import.

**Amended 2026-08-30 — aligned by narrative content, a second recipe
defect closed, and the real, root cause of Russian's referent
fragmentation, run to ground.** User direction: *"get them all aligned,
use deltas to detect issues."* The three sources above cover different
character spans of the SAME opening scene — `en` is the full novel,
`ru`/`fr` are excerpts — so a raw comparison was never comparing the same
narrative content in the first place.

**Alignment is by content, not by chapter number — a real confound,
checked directly rather than assumed.** War and Peace's Part One Chapter
boundaries do not fall at the same narrative point across editions: close
reading found Maude's English Chapter III/IV boundary sitting roughly 72
lines LATER, in narrative terms, than the Russian and French Chapter
III/IV boundary. Comparing "Chapter I–III" by NUMBER across the three
files would silently compare unequal spans. `aligned/{en,ru,fr}/` instead
holds Part One, Chapters I–III, cut at the identical narrative sentence in
all three — Prince Vasíli's closing aside about the bear cub ("Educate
this bear for me!" / its Russian and French equivalents) — verified by
locating that exact sentence in each file before cutting, not by trusting
any edition's own chapter markers. `eot-sidecar.mjs` read each aligned
file at `excerptChars: 33000`, exceeding every file's own length
(31,577 / 28,260 / 32,390 chars — `truncated: false` on all three), so
the comparison below is genuinely over the same content in every
language, fully read, not truncated asymmetrically the way the original
run above (8000-char window) unavoidably was.

**A second recipe defect, found by the alignment itself.** Reading the
Russian aligned excerpt surfaced one spurious 3-token candidate name:
"Пьера Анна Павловна" — Prince Vasíli's aside about Pierre, a comma, then
the scene's real subject newly introduced. The comma sits glued directly
against "Пьера"'s own trailing edge with no space before "Анна", and
eoreader7's `accumulateSurfaceEvidence` read the two names either side of
it as one continuous capitalised run. Reproduced identically on
constructed English prose sharing only the punctuation shape before the
fix was trusted, confirming the defect general rather than
Cyrillic-specific. **Full diagnosis, the fix, and its own tests live in
eoreader7 — `native/READING-SPEC.md` S35 is the law for the mechanism;
this entry is the corpus-side record.**

This is a genuine recipe-level correctness defect (a false admission,
not new material) on the three aligned files specifically, so LP6's own
licence applies: `--fresh` was used to re-read exactly these three
sidecars — never corpus-wide, never routine — validated first by
eoreader7's own S35 test suite (12 cases in `rich-referents.test.js`,
including the comma specimen and a plain-whitespace regression control)
before being trusted against real material. Re-run, same `excerptChars`,
same organs, only the fix changed: `en` 351 → **382** edges, `fr` 407 →
**435** edges, both real gains from genuine dialogue-tag constructions
this file's own grep confirms are present in both languages ("Well,
Prince" / "Pierre, Anna Pavlovna"). `ru` stayed flat at **285** — checked
directly rather than assumed: the aligned Russian excerpt's own text
never contains a comma-glued capitalised pair inside its window (the
specimen above lives in the aside sentence, which this alignment cuts
before). **Disclosed, not silently left ambiguous:** the ORIGINAL,
already-committed `ru/voyna-i-mir_Tolstoy_wikisource.txt.eot.json` (the
8-then-63-edge reading this entry's own numbers above are built on) is
UNAFFECTED and was not re-read — its specimen ("Пьера, Анна Павловна",
found by direct search) sits at character offset 25,306, past that
file's own 8000-char `excerptChars` window entirely, so the recipe
defect never fired within what it actually read. Nothing in the numbers
above this amendment needs correcting.

**Finding: a raw surface count is not a valid cross-language comparison
metric on its own — checked, not merely suspected.** `extractSurfaces`
found 86 candidate surfaces in the aligned English excerpt, 87 in
Russian, 53 in French — English and Russian look alike, French looks like
an outlier. Direct grep resolves why, and it is orthography, not
narrative content: French systematically writes a title before a name in
LOWERCASE ("prince Vassili", "prince André"), while English and Russian
both capitalise it ("Prince Vasíli", "князь Василий"). Every one of this
instrument's surface candidates is found by capitalisation — L2's own
standing rule, "capitalisation is a differentiator, never the primary
signal" — so a language whose own writing convention does not capitalise
titles will structurally extract fewer candidate surfaces for the
identical set of real people, with nothing wrong in the reading. A raw
surface count is a fact about writing conventions before it is a fact
about content; referent counts, admitted below the surface layer, are the
closer (though still imperfect, see next finding) comparison.

**Finding: the real, root cause of Russian's referent fragmentation is
grammatical case, and it acts through TWO mechanisms sharing one cause —
checked by running the real pipeline organs directly, not assumed from
counts.** `discoverReferents`, run with its own DERIVED fences (no
override — the same way the real reading pipeline runs it) over each
aligned excerpt, admits Anna Pávlovna's own name as: **2 distinct
referents in English** (`Anna` + `Anna Pávlovna` correctly merge by
containment; `Annette` — her own French nickname, used in this novel's
own embedded French dialogue — stays separate, the ALREADY-DISCLOSED
descriptor-synonymy MODEL-tier gap this file's own header names, not a
defect); **2 in French** (identical shape: `Anna` + `Anna Pavlovna`
merge, `Annette` stays separate); **6 in Russian**, across eight admitted
surface forms spanning three grammatical cases (nominative `Анна
Павловна`/`Анна`/`Павловна`; dative `Анне Павловне`/`Анне`; genitive
`Анны Павловны`/`Анны`; plus `Annette`) — one person read as six.

The FIRST mechanism is direct: `namesCorefer` (eoreader7,
`adapters/text/surfaces.js`) matches two surfaces by exact-token
containment or a shared final token, over `diaNorm`'d text — folding
ONLY the five Latin-vowel diacritics, by the file's own disclosed scope.
It has no morphological layer. "Анна" (nominative) and "Анны" (genitive)
share zero tokens after normalisation — they are, token-for-token,
different strings — so containment never fires between a name's declined
forms and its dictionary form, and each case-form becomes its own
referent by default.

The SECOND mechanism is indirect, and was found only by computing the
actual fence values rather than trusting the earlier summary that
attributed the whole effect to mechanism one alone: `genericTokens`'s
partner-count fence is DERIVED from the excerpt's own token
co-occurrence spread (an IQR-style statistic, by design — see
`surfaces.js`'s own header on why a fixed number would be wrong). Because
declension explodes Anna Pávlovna's own name into six-plus distinct
2-token surfaces instead of English's or French's one, the Russian
partner-count pool is diluted with many partner-count-1 tokens (each
case-form's own two tokens pairing only with each other) — measured
directly: **fence = 1 in Russian** (17 distinct partner-bearing tokens,
Q1=1, Q3=1) versus **fence = 3 in English** (34 tokens, Q1=1, Q3=2) on
the identical scene. At fence 1, "анна" and "павловна"'s own genuine,
unambiguous partner-count of 2 (each other, plus "шерер" from her own
full name "Анна Павловна Шерер") EXCEEDS the fence and both are wrongly
read as generic — the ordinary co-occurrence of one person's own first
name, patronymic and surname, misread as breadth of reference the way a
real title or family name earns it. At fence 3 the identical partner
count of 2 does not exceed it, and English correctly reads "anna" as
individuating. **Declension is the cause of both:** it fragments a name's
surface forms directly, AND — by proliferating those fragments as
low-partner-count tokens — it tightens the very fence meant to catch
genuine ambiguity, until it catches the one pairing that was never
ambiguous at all.

**What this does NOT establish, disclosed rather than silently left
open.** No fix is proposed or attempted here. A morphological
(case-declension) folder for `namesCorefer` is real, scoped, unbuilt
future work, and it is NOT the same thing as the `createLemmatizer`
organ the-fold's `hypergraph.js` already carries (the-fold's own CLAUDE.md,
"MINE-1 gap" sections): that organ is UniMorph-backed, English-default,
and lemmatises VERBS for relation-edge matching in a completely
different module — nothing in either repository lemmatises or declines a
Russian PROPER NAME today, and building that (a real Russian
morphological resource, with its own giver, the same standard LP6
already holds the English POS-prior gate to) is unattempted here. This
finding narrows LP12's original bottom line one level further: reading
here is **omnilingual at the script/reachability level (S34) and at the
punctuation-boundary level (S35), not yet at the referent-identity level
for a morphologically rich language** — a third, honestly bounded clause,
alongside the original entry's vocabulary-quality caveat, rather than a
claim that referent identity is now solved for every language this
instrument can read.

**Files.** `11-multi-language/war-and-peace/aligned/{en,ru,fr}/` (3
content-aligned excerpts, Part One Chapters I–III, cut at the identical
narrative sentence) plus their `.eot.json` sidecars, generated `--fresh`
under LP6's licence against eoreader7's post-S35 commit. No script in
this repo changed for either fix; both live in eoreader7 (S34, S35),
reached through `loadOrgans()`'s own sibling-checkout import exactly as
before.

---

## LP13 — all 516 UN UDHR translations, read for blind spots rather than for one more universal-reading claim

*(Renumbered from LP8 on merge — a concurrent PR landed its own LP8–LP11 first; the numbers moved, nothing about the policies themselves did.)*

The ask, directly: apply the same process to every version of the UN
Declaration of Human Rights this corpus already holds — `06-government-
legal/un-udhr/`, 516 real OHCHR translations, pulled once and never
re-read since — and this time the target is not "does it read the same
everywhere," it is **where does it not, and why.** Two real, general
defects were found and fixed; the corpus's own 516 readings were
regenerated under both; the result is a census, not a single specimen.

**The corpus's own front matter was cased debris on every one of the 516
reads, unnoticed because it never happened to matter until a script had
nothing else.** Every file under this directory opens with the identical
four-line OHCHR header ("Universal Declaration of Human Rights" /
"Language: NAME (code)" / "Adopted: UN General Assembly resolution 217 A
(III), Paris, 10 December 1948" / "Publisher: Office of the United
Nations High Commissioner for Human Rights (OHCHR)"), byte-identical
across every language, only the Language line varying. Left unstripped,
this is exactly the "cased debris" surfaces.js's own header already
warns a caseless script produces (P5.3's Gutenberg-licence problem, a
different container): on the real Georgian translation, EVERY ONE of the
18 candidate surfaces `extractSurfaces` found ("Human Rights", "UN
General Assembly", "Paris"...) came from this four-line header, zero
from the document's own 106 sentences of real Georgian prose. `stripUdhrHeader`
(`scripts/eot-sidecar.mjs`, offset-carrying like `stripContainer`, not
length-preserving like `blankCatalogLines` — the header sits at the
start, so a caller that drops it also stops spending `excerptChars`
budget on four lines that are never the material) closes it, anchored to
the exact literal text so it is a safe no-op on every source outside
this one corpus.

**The corpus-wide sweep this stripping made possible surfaced a second,
larger, genuinely new defect — not in this repo's code, but in the
engine's own `scriptCoverage` gate.** Stripped of its own header debris,
the Georgian translation's real body still produced ZERO surfaces —
because Georgian's everyday alphabet, Mkhedruli, is Unicode
General_Category `Ll` (lowercase), so `scriptCoverage`'s existing test
(does this material have `Cased_Letter` letters at all) reported
`casedShare: 1.0, gap: null` — "fine" — while the mechanism this gate
exists to protect had structurally nothing to work with, because
ordinary published Georgian never uses the OTHER member of that case
pair (Mtavruli, a monumental/decorative variant) to mark anything. The
identical shape recurred on two more, completely unrelated specimens in
this exact corpus: a Cherokee translation using the syllabary's
traditional block (every character defaults `Lu`, the mirror-image
failure), and the Uyghur Latin-script translation (an ordinary romanised
Latin alphabet that simply is not capitalised in this transcription — no
exotic script involved at all). **Full diagnosis, the fix (a third,
parameter-free `scriptCoverage` gap — "zero distinct sentences carry a
non-sentence-initial capitalised token" — reusing `accumulateSurfaceEvidence`'s
own walk, never a second one), and its tests live in eoreader7 —
`native/READING-SPEC.md` S36 is the law for the mechanism; this entry is
the corpus-side census of what it was measured against.**

**The full census, before and after, both fixes together.** All 516
sidecars regenerated `--fresh` (LP6's licence: a genuine recipe defect —
false admissions from unread header debris, and a false "no gap" on
material the extraction mechanism cannot in fact read — never new
material layered on old; validated first against eoreader7's own 20 new
test cases across S35/S36 plus a dozen real specimens driven through the
live pipeline before the corpus-wide re-read, matching this entry's own
prior POS-gate sweep's practice of committing the validation as a
record).

| | before (stale, pre-S34/S35/S36, header unstripped) | after (current code, both fixes) |
|---|---|---|
| `clean` (real edges extracted) | 324 | **390** |
| `gapped_script` (honestly typed, script blind) | 66 — all `script_mostly_without_case` | **90** — 60 `script_without_case`, 24 `script_case_unused` (NEW), 6 `script_mostly_without_case` |
| `empty` (0 edges, no gap named) | 126 | **36** |

The `gapped_script` growth (66 → 90) is not the mechanism reading LESS —
it is the mechanism NAMING what it could never read in the first place,
honestly, instead of leaving it silent inside `empty`: `script_case_unused`'s
own 24 languages were ALL counted as unexplained `empty` results before this
pass. And the header fix sharpened the existing gap itself: with the
English debris gone, a genuinely, purely caseless script (Arabic, Hebrew,
Chinese, Thai, Hindi, Korean, Khmer...) now correctly reads `casedShare:
0` and lands the STRONGER `script_without_case` rather than the weaker
"mostly" variant that debris alone used to force it into — 60 languages
moved from a hedge to a precise statement.

**`script_case_unused`'s own 24 languages, read together, are not a
random list — checked directly, not merely counted.** Beyond Georgian,
Cherokee (uppercase) and Uyghur (Latin), the other 21 are overwhelmingly
languages whose current written form is a 20th-century orthography —
often missionary or post-colonial linguistic work giving a previously
unwritten language its first script — rather than an alphabet that
inherited a centuries-old European print convention: Zarma, Dendi, Fon,
Fulfulde, Kabiyé, Mbundu, Mòoré, Nyemba, Susu, Ditammari, Umbundu (West
and Central African); Waorani, Tsimané, Huastec, Mam, Pipil, Ambo-Pasco
Quechua, Záparo (Indigenous American); Central Atlas Tamazight and Adlam
Pular (a script and a language, respectively, whose modern written
standard is itself recent). Spot-checked rather than assumed for two of
these: Tamazight and Adlam Pular both render their document's own TITLE
in a genuine, deliberate all-caps run (correctly excluded by the
extractor's own pre-existing all-caps-typography filter, built for an
unrelated reason — a heading quoted mid-paragraph), while their real body
prose never again distinguishes case for a name — a real, additional
mechanism feeding the same outcome, disclosed rather than folded into a
single story for all 24. **The pattern is a fact about writing-system
history, not about any one script or language family, and it is worth
stating plainly: capitalisation-marks-a-name is a specific European
typographic convention that a language's own alphabet does not
automatically inherit just because that alphabet happens to be Latin —
and the languages this leaves silent are disproportionately smaller,
more recently written, and more likely to belong to communities already
under-served by NLP tooling generally.** This instrument's entire
proper-name layer — and everything built on it, referent identity and
relation extraction alike — depends on a convention roughly two dozen of
516 real UN-translated languages do not share, honestly named now
instead of reading as an unremarkable zero.

**The matched pairs already in this corpus are a natural experiment this
pass did not have to construct — same language, different script or
different era, read side by side.** Bosnian, Azerbaijani, Uzbek,
Turkmen and Serbian each exist here in BOTH Cyrillic and Latin
transliteration; every pair reads `clean` on both sides with closely
matched edge counts (Azerbaijani and Uzbek: EXACT matches, 51/51 and
19/19; the rest within a few edges either way) — real, direct evidence
that S34's fix reads a language's own structure consistently regardless
of which cased script carries it, the strongest confirmation this
project has produced yet that the fix is about the mechanism, never the
alphabet. Malay exists in both Arabic (Jawi) and Latin script: Jawi
correctly `gapped_script` (Arabic script is genuinely caseless), Latin
correctly `clean` — the SAME language legible in one script and honestly
refused in the other, exactly the outcome a script-level gate should
produce. Uyghur, uniquely, gaps in BOTH of its scripts here — Arabic for
the structural reason, Latin for the convention reason — two different
gap types landing on one language's two written forms. German (1901 vs
1996 spelling reform) and Romanian (1953 vs 1993 vs 2006 orthographic
standards) each show near-identical or IDENTICAL edge counts across their
historical variants — a within-language orthographic reform, unlike a
script change, does not perturb this reading at all.

**Disclosed, not chased further.** 36 sources still land `empty` after
both fixes; 14 of them report zero surfaces without triggering
`script_case_unused`, meaning SOME raw capitalised-run evidence exists
(clearing scriptCoverage's zero-threshold gate) but nothing survives
`surfacesFromEvidence`'s own downstream admission filters — a real,
different, narrower question than "can this script be seen at all," and
correctly landing in `empty` rather than `gapped_script` because it is a
distinct fact. One outlier is named rather than smoothed over: the
Chiltepec Chinantec translation reports 43 candidate surfaces and zero
edges — evidence the surface layer found real names while the relation
tier still extracted nothing usable from them, a vocabulary-level gap,
not a script-level one, and genuinely unexplored here. And this corpus's
own genre limits what a referent-identity audit (LP12's own Anna
Pavlovna-shaped finding) can even ask here: UDHR is thirty short
declarative articles with almost no recurring named people, so the kind
of within-document referent fragmentation War and Peace exposed simply
has little material to bite on in this corpus — a fact about the
material, not a clean bill of health for the mechanism.

**Files.** `scripts/eot-sidecar.mjs` (`stripUdhrHeader`, offset-carrying;
wired into `readSidecar` right after `stripContainer`; `attemptWindow`'s
`scriptCoverage`/`extractSurfaces` calls folded into one
`accumulateSurfaceEvidence` pass, fed to both). `scripts/eot-digest.mjs`
(the identical fold, for its own separate call site). All 516
`06-government-legal/un-udhr/*.txt.eot.json` sidecars regenerated
`--fresh`, source `.txt` files untouched (LP1). No script here changed
`scriptCoverage` itself — that fix is eoreader7's own (S36), reached the
same way every other cross-repo dependency here already is.

**Amended same day — the actual content of the 516 readings compared
against each other, not just their gates; three real, distinct causes
found behind one symptom, and a caution about the metric that would have
hidden the third.** User direction: *"learn lessons from the full
comparison of the UDHR."* UDHR is a genuinely rare corpus for this — 516
near-word-for-word translations of the SAME thirty articles — so a
length-normalised edge count (`edgesFound` per 1,000 body characters)
across the 390 `clean` languages was computed as the first cut at
"which languages, un-gated, still read worse than their peers." Median
2.29 edges/1k, but the tails needed reading, not just ranking, and
reading them found the metric itself confounded before either tail could
be trusted.

**The caution first, because it changes how to read everything else:
edge count is not a validated quality signal anywhere in this sweep,
English included.** The HIGH tail (Dangme, Twi, Bulu, Low Saxon, ...) was
checked by hand against its own raw edges rather than trusted from the
count — Twi's own top-frequency "verbs" are `no`, `ne`, `de`, `a`, `mu`,
ordinary Twi particles and postpositions, not predicates; English's OWN
62 edges in this exact run break down `and`: 30, `of`: 25, `as`: 4,
`have`: 2, `constantly`: 1 — 89% grammatical particles. This is not a
new defect: LP6's own POS-vocabulary gate exists precisely to close it,
and this whole 516-language sweep confirms it directly — `posPriorGate`
loaded in **0 of 516** sidecars, English included, because this checkout
carries no local `POSPrior@1` build. A high edge count in this corpus is
not evidence of richer extraction; absent the gate, it is more likely
evidence of MORE unfiltered particle noise, and the median offers no
safe harbour either — it was never measured against the gate any more
than the tails were.

**What IS a reliable comparison — because nothing downstream can inflate
it — is the SURFACE layer: how many real, recurring capitalised name
components a language's own translation of "United Nations" yields, read
directly rather than inferred from a count.** Read by hand across a
sample of the low-surface languages, three genuinely distinct mechanisms
were found behind the identical symptom (a near-empty surface list),
never conflated into one story:

1. **Statistical under-power, not absence of evidence.** Czech's own
   "spojených" (United) appears 4 times capitalised, 1 lowercase, in the
   whole document — real, strong evidence by eye — and
   `capitalisationIsSignificant` (surfaces.js's own binomial test) computes
   `pHat = 0.8` against a required bound of `0.868` at n=5: genuinely
   under-powered, not genuinely absent. The SAME mechanism this file's own
   War-and-Peace work already found sample-size-sensitive
   (`deriveMinPartners`'s IQR fence, disclosed and deliberately unfixed
   there) recurs here in its sibling test, and for the identical reason —
   UDHR's own short, thirty-article length gives every within-document
   frequency statistic in this file far less power than a book does.
2. **Morphological declension, confirmed on a SECOND, unrelated language
   family.** Finnish's own "Yhdistyneiden"/"Yhdistyneet" (genitive vs.
   nominative plural of United) split into two never-merging surfaces;
   North Saami's own "Ovttastuvvon Naššuvnnaid" splits into FIVE distinct
   spellings across its five real occurrences, no two identical. This is
   the-fold's own P72/LP12 Russian-declension finding (`namesCorefer` has
   no morphological layer), now independently reproduced on Uralic
   languages wholly unrelated to Russian's Slavic case system — the
   cross-family confirmation that finding's own disclosure named as
   real, unbuilt future work, not invented here.
3. **Genuine paucity of proper-noun material, not a defect.** Yoruba and
   Xhosa each yield exactly ONE raw candidate in their entire document —
   not a filtered-out true positive, a genuinely near-empty capitalised-run
   count. This is the material, not the mechanism: a thirty-article
   declaration whose own translation may render "United Nations" only
   once, or with wording that does not repeat verbatim, gives this
   organ almost nothing to find regardless of how well it works — the
   same limit this entry's own original text already named for
   referent-fragmentation analysis generally, now traced to its precise
   mechanism for two specific languages rather than asserted in general.

**No code changed for any of this pass's three mechanisms, and that is
the deliberate, disclosed decision, not an oversight.** (1) would need
`capitalisationIsSignificant`'s own fixed-alpha bound reconsidered
against corpus LENGTH, which this file's own standing rule already
forbids doing by tuning against one specimen's own score. (2) is
already-disclosed, already-scoped future work (a per-language
morphological folder), not something a "lessons learned" pass invents
on the spot. (3) is a fact about the material, and there is nothing to
fix. Building the POS-vocabulary gate for even one more language (this
pass's own caution above names exactly why that would matter most) is,
per LP6's own text, "a one-time vendoring pass" — real, scoped,
deliberately not attempted here either.

**One more thing noticed, not chased: two apparent duplicates.** The
corpus carries TWO separate files both self-identifying "Language:
Finnish (fi)" (`udhr-067.txt` and `udhr-fin.txt`) and two both
self-identifying "Language: [North] Saami (se)" (`udhr-059.txt` and
`udhr-sme.txt`) — real OHCHR-published files under this corpus's own
walk, not a fetch artifact of this repo's own scripts (unchanged from
before this pass). Named here because a future pass computing per-
language statistics naively by short ISO code, rather than by filename,
would silently double-count these two languages — this pass's own
analysis above used filenames throughout for exactly this reason.

---

## LP14 — the three blind spots LP13 diagnosed, closed: an exact statistical test, a declension-folding organ, and a live POS-vocabulary gate

*(Renumbered from LP9 on merge — a concurrent PR landed its own LP9–LP11 first; the numbers moved, nothing about the policies themselves did.)*

User direction, verbatim: *"fix the issues."* LP13 diagnosed three defects
by comparing the CONTENT of 516 real UDHR readings against each other
rather than stopping at gate-level statistics; this entry is their close.
Two live in eoreader7 (READING-SPEC.md S37/S38 carry the full account —
summarized and pointed at here, not restated); the third is this repo's
own wiring, fixed here.

**(1) `capitalisationIsSignificant`'s normal approximation — closed as
S37, eoreader7.** The triggering Czech specimen (cap=4/lower=1) never
actually flipped between the old approximation and an exact test (both
refuse it, p=0.1875) — the REAL defect, found by widening from one
specimen to an exhaustive sweep of the function's whole practical domain
(every `(cap, lower)` pair, n<=60), was a systematic bias: 24 pairs where
the old z-bound wrongly called a split "significant" and the exact
binomial tail correctly refuses it, zero pairs in the other direction.
Fixed with an exact one-sided binomial tail computed in log-space.
Nothing in this repo changed for this fix; it is entirely
`native/adapters/text/surfaces.js`.

**(2) Declension fragmenting a name's own case forms into strangers —
closed as S38, eoreader7, wired here.** LP13 found this on real material
(Russian's "Anna Pavlovna" and, separately, Finnish/[North] Saami
place-and-organisation names) and named it a real, general defect:
`namesCorefer`'s containment/shared-final-token check compares tokens as
exact strings, so a bare Russian surname's own case forms —
"Кутузов"/"Кутузова"/"Кутузову" — read as three unrelated referents.
`declension.js::createDeclensionFolder` (eoreader7, new) mines
suffix-transformation rules from UniMorph's real Russian noun paradigm
table and checks them PAIRWISE against two actually-observed surfaces
(never as a per-word canonical lemma — S38's own header explains why that
would be unsafe: the dominant Russian genitive-PLURAL pattern, "ов"->"",
would corrupt an already-nominative surname like "Кутузов" itself if
applied to a bare word in isolation). Verified against real fetched
Russian War and Peace: 38 correct merges (Anna, Pierre, Kutuzov, Vasily,
Andrei, Boris, Bolkonsky, Bonaparte, Napoleon, and more), zero false
merges, across a floor sweep from 10 to 200 kept rules.

**Wired here, into `loadOrgans`.** `namesCorefer(a, b, { sameStem })` and
`discoverReferents(surfaces, { sameStem })` both take the fold as an
optional organ; `eot-digest.mjs::loadOrgans` now builds it from
`native/priors/declension-rus.json` (Russian only — no other language has
a built prior yet, a disclosed absence, not a silent one) and exposes
`organs.sameStemFor(languageCode)`, consumed by both `digestOne` (keyed
off `spec.language`, already a per-document field there) and
`readSidecar` (keyed off the UDHR corpus's own header code — see (3)
below). **Honest residue, found while wiring, not glossed over:**
`readSidecar` has no language signal for a NON-UDHR document (the War and
Peace file this whole finding was measured against has no UDHR-style
header), so it falls through to English and applies neither the POS gate
nor the declension fold for that file today — `digestOne`, called with an
explicit `spec.language: "ru"`, is what actually exercises the fix
end-to-end against that file (verified directly: `organs.sameStem`
correctly reports "injected" and the POS gate correctly reports "active"
when called this way). A LP13-scale referent-count delta on that file
through `digestOne`'s own DEFAULT 8000-char excerpt window did not
materialize (`distinctReferents` held at 4 either way, on a 43,343-char
document) — checked, not assumed: the mechanism's own correctness is
proven directly (the 38-merge sweep above, and eoreader7's own
`declension.test.js` end-to-end `discoverReferents` case), and the null
result here is a real, disclosed finding about the EXCERPT WINDOW, not
about the fold — an 8000-char slice of a 43K-char book is not guaranteed
to contain both a name's nominative and declined forms together, and this
one apparently does not. Widening the excerpt window for narrative
material with recurring characters is real, unattempted, scoped future
work, not silently claimed done.

**(3) The POS-vocabulary gate — closed here.** LP13 found `loadOrgans`'s
own header comment describing a measured, working gate (Shakespeare
90→22 edges, the Iliad 65→25, Alice 97→34) that was true of some past
build, while the CODE imported `legacy-legacy-engine.1/scripts/corpus/
pos-eng.json` and `legacy-legacy-engine.1/packages/engine/perceiver/text/
wordclass.js` — both paths into a submodule confirmed empty in this
checkout — so the gate had been silently loading for NEITHER English nor
any of the other 515 languages, ever, in this environment. Fixed at the
source: `native/adapters/text/wordclass.js` is already self-contained (no
legacy import, confirmed directly) and exports exactly what
`makeGrammarLens` needs; `native/scripts/build-pos-prior.mjs` (new,
eoreader7, language-general — one script, zero per-language code) built
real `POSPrior@1` files for English (UD_English-EWT), Russian
(UD_Russian-GSD) and Finnish (UD_Finnish-TDT). `loadOrgans` now builds a
`posByLang` map from these three files and exposes `organs.
relationsForLang(languageCode)` / `organs.posGateFor(languageCode)`,
consumed the same way as `sameStemFor` above; the flat `relationsFor`/
`classifyConnector`/`posPrior`/`posPriorLoaded` fields stay for backward
compatibility, now pointing at real English data instead of a dead path.

**A pre-existing test that had been silently skipping now genuinely
passes, and is independent confirmation.**
`scripts/eot-sidecar.test.mjs`'s own "POS vocabulary gate" case has an
explicit `if (!organs.posPriorLoaded) return;` skip — before this fix,
`posPriorLoaded` was always `false`, so this test had never once actually
exercised its own assertions in this environment despite existing on
disk. It now runs for real and passes: on the real Alice in Wonderland
excerpt, candidates (22) genuinely narrow past kept verbs (8), and every
one of the 22 held-back tokens (`of`/`the`/`by`/`with`/`in`/`that`/...) is
a real, listed non-verb. On the real War and Peace Russian excerpt
(digestOne, `spec.language: "ru"`), `edgesFound` narrowed 63 -> 12 with
the gate active — the same class of effect, a second language, the
identical unmodified mechanism.

**A `Language:` header two-letter code, needed for real, found by
checking rather than assuming.** `stripUdhrHeader`'s own regex gained a
capture group for the header's trailing `(code)` — checked directly
against real files first: `udhr-rus.txt`'s own header reads "Language:
Russian (ru)" and `udhr-fin.txt` reads "Language: Finnish (fi)" — ISO
639-1, NOT the ISO 639-3 this corpus's own FILENAMES use
(`un-udhr/udhr-rus.txt`), a real mismatch between the two conventions
this corpus mixes, disclosed in the code's own comment rather than
assumed consistent. The initial capture class (`[a-zA-Z-]+`) silently
narrowed `stripUdhrHeader`'s own matching for two real files
(`udhr-deu_1901.txt`/`udhr-deu_1996.txt`, whose header carries a second
parenthetical — "Language: German, Standard (1901) (de-1901)" — with
DIGITS in the actual code) — caught by testing the new regex against all
516 real files before trusting it, not assumed safe from reading it;
fixed to `[a-zA-Z0-9-]+`, re-verified at 516/516 matched, zero regression.
A small `LANG_ALIAS` table (`en`/`ru`/`fi` -> the priors' own ISO 639-3
keys) bridges the two schemes — three entries, not a general ISO 639
table, honest about its own narrow scope.

**Measured, not assumed: the full 516-file UDHR corpus re-swept with
`--fresh`** (LP6's own licensed escape hatch — a recipe change that adds
a gate rather than removing one still needs `--fresh` for the *disclosure
fields* on already-clean files to update, even though this specific
recipe change could only narrow, never fabricate) in 20.5 seconds (388
clean, 90 gapped_script, 38 empty — the same shape LP13's own census
already found, this pass added a gate and a fold, not a new script-
coverage defect). `udhr-rus.txt`'s own recipe descriptor now reads
`language: "ru"`, `posPriorGate: "active — ...pos-rus.json..."`,
`sameStem: "...declension-rus.json..."`; `udhr-fin.txt` and `udhr-eng.txt`
correctly show `posPriorGate` active and `sameStem` correctly "omitted —
no declension prior for language..." (Finnish declension folding is real,
scoped, unbuilt future work, not silently claimed). Every other one of
the 513 remaining UDHR languages shows the identical honest "omitted" —
this pass built three languages' worth of received data, not 516, and
says so on every file rather than only in this document.

**Files.** `scripts/eot-sidecar.mjs` (`stripUdhrHeader`'s captured
`language`; `readSidecar`'s per-document `relationsFor`/`sameStem`/
`posGate` selection; the `recipe.descriptor` disclosure fields, now
dynamic rather than a hardcoded string). `scripts/eot-digest.mjs`
(`loadOrgans`'s `posByLang`/`declensionByLang` construction,
`relationsForLang`/`posGateFor`/`sameStemFor`/`normalizeLangCode`;
`digestOne`'s per-`spec.language` selection and dynamic `organs`
disclosure block). No new test file — this repo's own existing
`scripts/eot-sidecar.test.mjs` (2/2, one of them now genuinely exercised
for the first time) plus a live batch run of `eot-digest.mjs`'s own
14-source SAMPLE and a full, fresh 516-file UDHR re-sweep are this pass's
verification, matching this repo's own established posture for these
driver scripts (a re-runnable driver against real data, not a fixture
suite) — eoreader7's own `declension.test.js`/`pos-prior.test.js` (16
cases, S38) carry the mechanism-level regression coverage for the two
new organs themselves.

**Amended same day — hand-reading a real committed file found the EOT
log covers a small SLICE of a document, not the document.** User
question, verbatim, after being handed the English UDHR's real committed
`folded`/`log` content: *"How do we have five edges for 72 sentences??
It's supposed to convert the entire thing into eot."* Checked directly,
not assumed: `hyperlexicon.js::admit()` only ever receives what
`relationsFor` OFFERS it, and `relationsFor` only offers a sentence that
matched a recognisable subject-verb-object shape — a sentence with
nothing SVO-shaped in it is never turned away (that would show up in
`admission.turnedAway`, which reads 0), it is simply never REACHED.
Counted precisely on the two real files already read by hand: English's
5 log entries land on only **4 of 72 sentences (5.6%)** — one sentence
("...have in the Charter reaffirmed... and have determined...") produced
two coordinated-clause edges, which is why 5 entries and not 4; Russian's
2 entries land on **2 of 67 sentences (3.0%)**. The other ~95% of each
document was genuinely READ (chunked, byte-addressed, and — per LP13/LP14
above — 100% self-verified) by the reading layer, but carries no entry of
any kind in the append-only admission log.

**The reframe, and the decision.** This is not a bug LP14's own three
fixes introduced — `hyperlexicon.js`'s own header (P57, the-fold's
POLICIES.md) already states the design plainly: it is a log of HEARD
ASSERTIONS with byte-addressed spans, never a mirror of the source text.
What was missing was saying so this bluntly next to a real number: a
document is not "converted into EOT" in the sense of every sentence
becoming a queryable unit — it is FILTERED through relation extraction
first, and only the shard that survives that filter is ever addressed as
an admission-log entry. For a narrative specimen (War and Peace) that
shard is large enough to reason over usefully; for a legal-preamble
document built from long coordinate clauses (the UDHR) it is not.

Asked directly whether every sentence should get SOME log entry — a real
PROPOSE where a relation was found, a typed "no relation extracted" gap
otherwise — the user's own call: **leave it gapped for now**, so a later
pass can try to assign real structure to what is currently invisible,
rather than papering over the gap with a placeholder entry that would
still carry no actual content. Real, deferred, unstarted work — not
fixed here, and not silently left unstated either.

- **Whether the whole corpus should be read.** LP4 names the order of work
  and stops there.
- **How a recension is identified** (LP3's second option) — content hash of
  the transformed text is the obvious candidate and is not yet specified.
- **Whether readings live in this repo or beside it.** `digested/` is here
  today because the sample is small and reviewable. At corpus scale that is
  a real question about repository size and is not answered.
- **Anything about the fetch scripts.** The corpus-integrity finding
  (`digested/CORPUS-INTEGRITY-FINDING.md`) names a systemic problem in one
  subdirectory and explicitly does not diagnose or fix its cause.

## LP15 — an alias is declared by the material, never derived from a name

**Generality:** universal.

A reader eventually has to know that two surfaces name one thing.
eoreader7's `surfaces.js::namesCorefer` folds a name shortened by DROPPING
WORDS and, measured 2026-09-04, does not fold one shortened by INITIALS:

    namesCorefer("Regional Transit Authority", "Transit Authority") -> true
    namesCorefer("RTA", "Regional Transit Authority")                -> false

**The obvious patch is refused.** A rule that builds an initialism and
compares it is a rule that DERIVES a name, and a rule that derives a name
can invent one. Referent identity has never been safe to decide from the
shape of a string here (L2's capitalisation veto; the cube refused as a
content classifier; LP11's own rule that a loosened key is judged on its
marginal admits).

**What the material does instead.** Prose introduces its own short forms,
in a small number of recurring SHAPES, at addresses — "the Regional
Transit Authority (RTA)". That is a declaration, not an inference, and
reading it is the same act as reading any other claim.

`scripts/build-alias-prior.mjs` therefore MEASURES which shapes English
prose actually uses, over this corpus, and ships the counts:
`derived-priors/alias-priors/alias-declaration-en.json`
(`AliasDeclarationPrior@1`). Eight candidate shapes were tested over 900
files / 20.8MB of `02-encyclopedic`, `06-government-legal`,
`15-western-canon`, `05-academic-papers`. A shape FIRES when it matches and
is CONFIRMED when the form it introduced is then used at least `min_uses`
times in the same document — a gloss the document never uses again is an
aside, not a name.

| shape | fires | confirmed | rate |
|---|---|---|---|
| parenthetical `X (Y)` | 23,375 | 11,163 | 0.478 |
| also-known-as | 10 | 1 | 0.100 |
| known-as | 6 | 1 | 0.167 |
| or `X, or Y,` | 13 | 3 | 0.231 |
| abbreviated | 1 | 0 | 0.000 |
| formerly | 3 | 0 | 0.000 |
| short-for | 0 | 0 | — |
| d/b/a | 0 | 0 | — |

**One shape does essentially all the work, and the connective phrases a
person would think to list first are close to absent.** Hand-listing them
would have shipped seven rules that never fire beside the one that does,
with nothing to say which was which. The near-zeros stay in the file: a
consumer that widens its floor should see exactly what it is admitting.

**What a consumer owes it.** `eoreader7/native/organs/aliases.js` receives
this prior and holds no declaration vocabulary of its own. Both floors are
the CALLER's (`minConfirmRate`, `minFires`) — this prior measures, it does
not decide. The consuming organ walls every admitted gloss against the
material's own use of it and re-reads the declaring sentence's byte span
before shipping an alias (P5.2). An alias is evidence, and it is citable.

**An acronym needs no rule of its own.** It is one subtype of alias,
admitted on exactly the same evidence as a nickname, a short form or a case
caption. Nothing in the prior or its consumer knows what an acronym is.

**Limits, named.** English only — another language needs its own run over
its own material, not a translation of this file. The corpus skews
encyclopedic and governmental, which is where glossed abbreviations live;
the rate here is not a rate for prose in general. And `confirm_rate` is not
precision: a parenthetical whose words happen to recur is confirmed too, and
the wall against that belongs to the consumer.

## LP16 — a POS-vocabulary gate needs treebank-shaped attestation; a paradigm table cannot supply it, however large

**Generality:** universal (the mechanism reasoned about below — what a gate
can and cannot refuse, and why — not the specific five languages it was
measured against).

**What was asked.** An assessment of the-fold's current reading apparatus
against the sidecars in this repo (`priors.js`/`priors-toggles.js`, the
`digested/` EOT sample, `derived-priors/`), then whether they needed
realigning to leverage it. The assessment itself (the-fold's grounding
ladder, referent identity, knowledge-as-fragility, the holograph) is not
repeated here — this entry is the measurement that followed from "ok do
it," through to a real, shipped fix and one real, disclosed residual gap.

**Finding 1 — `eot-digest.mjs` was silently broken since 2026-09-02, and
nothing caught it.** The-fold finished its planned SVO field rename (P76:
`hypergraph.js`'s edges carry only `end1`/`label`/`end2` now, never
`subject`/`verb`/`object`) six days before this pass. `eot-digest.mjs`'s
`admitEdges` construction still read the old field names — all `undefined`
— so every arrangement across all 14 sample sources was refused
`incomplete` and `digested/`'s own README table had described a run that
no longer reproduces. Fixed at the two read sites (`admitEdges`,
`verifySpans`'s diagnostic label) with a fallback read
(`e.end1 ?? e.subject`), so a future rename in either direction degrades
rather than silently zeroing. Nothing catches this class of drift
automatically — these are re-runnable drivers, not covered by a committed
regression suite, matching this repo's own established posture for them;
LP7's own lesson applies a second time, in a new shape: a reading that
LOOKS like it ran (files written, no error) and admitted nothing is worse
than a reading that refuses to run at all.

**Finding 2 — once fixed, the corpus's own richer engine defaults produce
MORE noise on any ungated language, not less.** Read by eye, not trusted
from counts: Greek (no POS-vocabulary gate existed for it) went from 1
edge (itself junk — an English caption) to 59, almost all of them bare
function words as the connector — `—ο→` (the), `—και→` (and), `—είναι→`
(is) — sitting on clause-length subject/object spans. This is exactly
LP7's founding failure shape, recurring on a language nobody had built a
gate for, made LOUDER as `makeRelationReader`'s subject/clause matching
widened. English (which HAS a treebank gate) simultaneously got cleaner
on the identical engine change.

**A detour, kept rather than erased, because the reasoning is real even
though the resource was wrong for this job.** The first response to
Finding 2 was to build a witness-backed alternative gate —
`eoreader7/native/organs/connector-witness.js` (+
`connector-witness.test.mjs`) — asking a small local model (gemma2:2b)
whether a candidate connector functions as a clause's predicate, generate-
and-arm protocol (P32's own shape: an unchallenged yes is not a second
witness; a genuine no needs no arm at all), an exact binomial significance
computed rather than a hand-picked pass bar. Measured live, three
languages, real bytes: 13/17 correct, 16/17 settled, P(this good by
chance) = 0.0245 — real, if asymmetric (100% correct refusing all 8 real
negative specimens across English/Greek/Turkish; ~56% confirming real
positives, missing a clean single-word English verb and the flagship
Greek specimen both). **This was the wrong thing to build first.** This
repo's own already-measured precedent — "Closing more of the MINE-1 gap —
a received prior beats induction, tested" (the-fold CLAUDE.md) — had
already run the identical comparison (a witness/inference-shaped fix vs a
received lexicon) on a directly analogous problem and a received lexicon
won outright. That precedent was read and cited in this very pass's own
reasoning before `connector-witness.js` was written, not after — the
organ should never have been built before checking whether a receivable
resource already covered the need. It is kept in the tree, real and
tested, not deleted (this repo's own succession.js/`digested/`-erasure
precedent: condemned or superseded work stays present and disclosed,
never silently removed) — a real fallback for a language neither UniMorph
nor a UD treebank covers, should one ever come up, and not the production
mechanism here.

**A second wrong turn, caught before it shipped: UniMorph cannot gate a
closed class, no matter how large its files are.** The next instinct —
build `POSPrior@1` from UniMorph's inflectional paradigm tables instead of
a UD treebank, since UniMorph's per-language files are far larger (Turkish
alone: 570,420 rows, 31.6MB) than a treebank could ever be — is real and
was built (`native/scripts/build-pos-prior-from-unimorph.mjs`, a second
builder for the SAME `POSPrior@1` schema, mapping only bare UniMorph `V`/
`N`/`ADJ` to UD's `VERB`/`NOUN`/`ADJ` and dropping every non-finite
subtype — participle, converb, masdar — as a disclosed gap rather than a
guess). Built for all five ungated languages (Greek/Turkish/Hebrew/
Korean/Farsi), wired in, re-run — and it barely moved the Greek/Turkish
noise (Greek 59→53 edges; `και`/`της` still the two most common
connector labels). **Checked directly, not assumed:** `grep -P
"\t(και|της)\t" ell.tsv` on the real fetched UniMorph Greek file returns
nothing — UniMorph does not contain these words AT ALL, because they are
closed-class function words, and UniMorph is a resource of INFLECTIONAL
PARADIGMS: it enumerates a lemma's own forms, and a conjunction or article
does not inflect, so it was never going to be in a paradigm table in the
first place. `relations.js::discoverRelationVocab`'s own gate logic
(`native/adapters/text/relations.js:450`) makes this concrete:
`verbDominant = !attested ? (lexiconKnows !== false) : verbShare > 0.5` —
a word the prior has NEVER SEEN is admitted BY DEFAULT ("a witness cannot
refuse what it never saw," the file's own stated design, correct on its
own terms). UniMorph's structural silence on closed classes means every
one of them takes that default-admitted branch, regardless of file size.
A UD treebank does not have this gap, because a treebank annotates every
token of real running text, closed classes included — checked the same
way: the real UD_Greek-GDT train file attests `και` as CCONJ 1,098 times.
**The two resources answer different questions** (UniMorph: does this
surface form belong to SOME lemma's verb paradigm; a treebank: in real
sentences, how often is this exact word tagged a verb) and only the
second one is the question a connector-exclusion gate actually needs.

**What shipped.** Real UD treebank builds for all five languages, via
`native/scripts/build-pos-prior.mjs` — the EXISTING, unmodified script
already used for English/Russian/Finnish, needing zero new code because it
was already "language-general by construction": UD_Greek-GDT (1,662
sentences), UD_Turkish-IMST (3,435), UD_Hebrew-HTB (5,168),
UD_Korean-GSD (4,400), UD_Persian-PerDT (26,196) — train splits only, CC
BY-SA 4.0, provenance recorded in each `native/priors/pos-<iso3>.json`'s
own header exactly as the three existing ones already are.
`eot-digest.mjs`'s `LANG_ALIAS` and its hardcoded `["eng","rus","fin"]`
loop both grew the five new ISO 639-3 codes; the `posPriorGate`/
`classifyConnector` disclosure strings, which used to hardcode "giver
Universal Dependencies" unconditionally, now read the giver off each
prior's own `provenance.giver` — a real bug this pass's own earlier
UniMorph substitution would otherwise have shipped as a false
attribution.

**Measured, the full 14-source sample, before (2026-08-31, the committed
baseline — now unreproducible per Finding 1) and after this pass:**

| slug | before (edges heard) | after (edges heard) |
|---|---|---|
| wikipedia-lang/fr/philosophie | 84 | 82 |
| wikipedia-lang/tr/felsefe | 69 | **36**, gated |
| wikipedia-lang/el/socrates-related | 1 (junk) | **23**, gated, clean |
| wikipedia-lang/he/philosophy | 2 | 2 (script-blind, unaffected) |
| wikipedia-lang/ko/philosophy | 3 | 4 (script-blind, unaffected) |
| wikipedia-lang/fa/philosophy | 8 | 10 (script-blind, unaffected) |
| gutenberg-non-en/de-path/pg67098 | 61 | 32 |
| images-media/nasa-catalog | 22 | 4 |
| images-media/met-museum-catalog | 18 | 0 |
| audio-music/grateful-dead-catalog | 2 | 0 |
| audio-music/classical-music-catalog | 0 | 0 |
| source-code/rails-readme | 37 | 10 |
| source-code/flask-quickstart | 44 | 5 |
| source-code/flask-app-py-RAW | 16 | 0 |

The English-source drops (rails/flask/nasa) were read by eye, not assumed
from the count: what survives is genuinely clean (*"controller classes
—are→ derived from ActionController::Base"*, *"Ruby on Rails —is
released→ under the MIT License"*) — a real precision gain from whatever
moved upstream in the engine since 2026-08-31, unrelated to this pass's
own changes. Greek went from one junk edge to 23 real ones, spot-checked
in full: *"Ο Μπέρτραντ Ράσελ —θεώρησε→ πως η φιλοσοφία βρίσκεται μεταξύ
της Επιστήμης"* ("Bertrand Russell considered that philosophy lies
between Science..."), *"Επιστημολογία —ονομάζεται→ ο τομέας που
ασχολείται με τη φύση και το σκοπό της γνώσης"* ("Epistemology is called
the field concerned with the nature and purpose of knowledge") — one
residual junk row out of 23 (`φιλόσοφοιπροσωκρατικός`, a wiki-markup
concatenation artifact, a different and already-named class of defect).
Hebrew/Korean/Farsi are genuinely unaffected either way — their own
already-diagnosed `scriptCoverage` gap (caseless scripts starve the
SURFACE layer, upstream of the connector question this pass answers) is
untouched by anything here.

**Turkish is real, better, and NOT closed — disclosed rather than
rounded up to done.** 80→36 edges, meaningfully cleaner, but still
carrying real noise on inspection: `felsefesinde`/`felsefesinin`/
`felsefesini` (locative/genitive/accusative-possessive inflections of
"felsefe," philosophy — case-marked NOUN forms, not verbs), `savunucusu`
("proponent"), `rönesansı` ("its renaissance"), `filozoflar`
("philosophers") all still stand as connector labels. `yaşamış` ("lived")
and a few genuine participles are real. **The cause is the same gate
mechanism, at a different failure scale.** Turkish's inflectional paradigm
space is vast (agglutinative morphology; UniMorph's own Turkish VERB
paradigm alone is 570,420 rows) and UD_Turkish-IMST's train split — 3,435
sentences, 12,399 distinct forms — is real but comparatively thin against
that space: most of the specific case-marked noun inflections causing the
residual noise were simply never attested in this treebank sample either,
so `discoverRelationVocab`'s own "cannot refuse what it never saw" default
admits them, exactly as it admitted UniMorph's unseen function words —
coverage sparsity, not a wrong resource this time. **Named, not attempted
here:** a second Turkish UD treebank (BOUN/Kenet/Tourism all exist,
combinable for wider attestation) or a merged prior — UniMorph's own
Turkish NOUN paradigm table alongside the treebank's closed-class
coverage, each covering the other's gap — is the natural next lever,
unbuilt.

**The rule this pass earned, stated once so the next language does not
re-derive it by trial:** a POS-vocabulary gate's job is excluding
closed-class connectors, and that needs TREEBANK-SHAPED attestation (every
token of real running text, function words included) — a resource sized
by how much real text it annotates. A PARADIGM-shaped resource (UniMorph)
is sized by how many lemmas and inflectional slots it enumerates, and is
structurally silent on anything that does not inflect, however large its
files are. The two are not substitutes, and reaching for the bigger file
without checking what it actually contains is exactly the kind of
un-derived assumption this project's own standing rules already forbid —
checked here only because it was checked, not because the file size made
it plausible.

**Files.** `eoreader7`: `native/scripts/build-pos-prior-from-unimorph.mjs`
(new, kept — a real, working, disclosed-narrow builder, useful for a
future RECALL-widening pass even though it does not solve THIS problem);
`native/organs/connector-witness.js` + `connector-witness.test.mjs` (new,
kept, shelved — see above); `native/priors/pos-{ell,tur,heb,kor,fas}.json`
(UD-treebank-built, the shipped artifacts; gitignored local build outputs,
matching `pos-eng.json`/`pos-rus.json`/`pos-fin.json`'s own existing
convention — not committed here). `live_priors`: `scripts/eot-digest.mjs`
(the field-name fix; `LANG_ALIAS` and the POS-prior load loop widened to
eight languages; the giver-disclosure strings de-hardcoded); the 14
`digested/*.json` + `index.json` regenerated, reflecting this pass's own
fixes end to end, uncommitted pending review.

**Amended same day — French had the identical defect and was missed the
first time.** Asked plainly "how are the readings," French's own 82
propositions were read for the first time rather than trusted from an
unchanged-looking count: 80 of 82 were bare French function words (`de`,
`et`, `du`, `dans`, `à`, `comme`, `pour`, `ou`, `au`, `que`, `mais`) — the
identical failure Finding 2 named for Greek, just never caught, because
French's edge COUNT happened to look plausible both before and after this
pass's own fixes and was never opened. **The lesson this cost:** fixing
the languages whose numbers visibly moved is not the same as checking
every language actually in the sample — a count that does not change is
not evidence nothing is wrong with it. Fixed identically:
UD_French-GSD (14,450 sentences — this pass's largest treebank by
sentence count), `native/priors/pos-fra.json`, `LANG_ALIAS.fr = "fra"`.
82 junk edges → 4, of which 2 are real (*"Platon —écrit→ dans le Phèdre
... que"*, "Plato wrote in the Phaedrus... that"; *"un écho d'Héraclide du
Pont —révélerait→ que le premier penseur grec..."*) and 2 are a different,
already-named defect class (`qu'en`, an elided conjunction+preposition
the tokenizer split wrong; `sapiensêtres`, a wiki-markup word-concatenation
artifact — the same shape as Greek's own `φιλόσοφοιπροσωκρατικός`).
**Every language in the 14-source sample has now actually been read, not
assumed clean.**

**Amended same day — asked directly whether every UniMorph-backed learning
this project has already built was actually in use, not just the
POS-vocabulary gate this entry is about.** It was not, checked file by
file rather than assumed either way:

- **`the-fold/eval/fixtures/unimorph-eng-verb-forms.json`** (the
  `verbForms` recall-widening fixture, 103,318 forms, measured elsewhere
  at 319→737 edges on a 10-file sample) **was missing from the main
  the-fold checkout entirely** — real, valid data, but sitting only in two
  abandoned `.claude/worktrees/` directories. Recovered by copying it back.
  Left OFF in the actual recipe, deliberately — it is a recall lever, not
  a false-binding fix, and shipping it needs its own before/after
  measurement against this corpus's NOW-gated recipe, not a side effect
  of recovering the file.
- **`createLemmatizer`/`morphologyIndex`/`morphologyLanguage`** (sameAct
  verb-tense equivalence, "underwent"≈"undergoes," MINE-1-measured: bound
  531→536, zero contradictions) were disclosed OMITTED in this driver's
  own `UNION_OMITTED` table for a reason that was simply wrong: "no organ
  produces this shape on any engine path today," checked only against the
  frozen legacy provider. `native/adapters/text/morphology.js::
  createLemmatizer` is real and native, and `native/priors/
  morphology-eng.json` (142KB) is real, populated UniMorph-derived data —
  both already sitting in this checkout, found by reading their actual
  bytes rather than trusting the driver's own stale comment. **Wired now**
  (English only), verified to run clean across the full 14-source sample
  with zero change to any count — expected, and consistent with MINE-1's
  own finding that this organ is byte-identical when the material never
  exercises a tense mismatch within one extraction pass; its value is at
  claim-checking time, not extraction time, and this driver does not
  check claims.
- **`declensionByLang`'s Russian entry** was verified directly rather than
  assumed working, since no Russian source sits in this sample and it had
  therefore never actually run this session: `sameStem("Кутузов",
  "Кутузова")` → true (nominative/genitive fold, correct), `sameStem(
  "Наполеон", "Пьер")` → false (no false merge across different people,
  correct). One real, disclosed, narrower-than-hoped edge found the same
  way: `sameStem("Кутузов", "Кутузову")` (dative) → false — the mined
  rule set's own `min_count: 100` floor means only sufficiently-recurring
  suffix transformations are trusted; this is the measured scope LP14
  already reported (38 correct merges, zero false ones), not a new defect,
  and dative is simply outside what cleared that floor.

**The lesson this round cost, on top of Finding 2's own version of it:**
"the organ exists" and "the organ is actually reachable in THIS checkout,
with real data, and nothing upstream silently blocks it" are three
different claims, and this driver's own disclosure comments had let the
second two go stale without anyone re-checking them against the literal
files on disk. Read the bytes, not the comment describing them.

**Amended same day — 15 net-new documents, one SHARED log, asked whether
it is rich enough to holograph from.** `scripts/eot-shared-log-eval.mjs`
(new, re-runnable, this repo's own posture for these drivers): 15 real
documents outside the SAMPLE (5 Wikipedia articles — Mathematics,
Neuroscience, Renaissance, Mongol Empire, Thermodynamics; 3 1911
Britannica entries — Economics, Sociology, Law; 2 academic papers —
Ioannidis 2005, a d2l chapter; 2 Shakespeare plays — Julius Caesar, Romeo
and Juliet; one real Koine Greek Gospel excerpt; 2 source-code docs —
bitcoin, GHC), admitted into ONE hyperlexicon log across all 15 (unlike
`digestOne`, which opens a fresh log per source) so a real re-sighting
across documents has a chance to union, per LP2. All 15 read cleanly: 0
turned away, ~100% span self-verification throughout, 252 propositions,
106 distinct connector labels — genuinely diverse, not a handful of
copulas dominating everything (though "is"/"was" are still the two most
common, honestly, which is unsurprising for encyclopedic/narrative prose).
**Corroboration: 0 of 252 at ≥2 witnesses** — consistent with this
project's own already-measured ~2% wall (P83/P86, the-fold), and honestly
unsurprising here specifically: 15 topically unrelated documents have no
real reason to restate one proposition, and this run does not contradict
or move that wall, it just confirms it holds on a third, larger,
more-diverse specimen.

**One real defect found by running it, diagnosed precisely, and fixed
with a period-matched resource rather than papered over — user's own
correction, not a guess this pass reached for on its own.** The Greek NT
excerpt's top connector labels were `δὲ`/`ὁ`/`ἐν` — the SAME class of
closed-class junk Finding 2 fixed for Modern Greek. Checked directly: all
three ARE well-attested in `pos-ell.json`, just under their MODERN
monotonic spelling (`δε`/`ο`/`εν`, no accent) — the SBLGNT source carries
POLYTONIC diacritics (breathing marks, accents) modern Greek orthography
dropped in 1982. Folding the diacritic away was considered and refused:
Koine and Modern Greek differ in real vocabulary and grammar, not just
spelling, so a diacritic-fold would paper over the wrong thing (matching
different words by coincidence of shared root, not because they mean the
same thing). **The right fix, on direct user steer ("definitely possible
to get an ancient greek prior"): a real, period-matched treebank.**
`UD_Ancient_Greek-PROIEL` (15,016 sentences — its own corpus is
specifically built from the Greek New Testament and adjacent parallel
texts, the closest genre match this repo's `14-holy-texts/sblgnt-books/`
material has) attests `δὲ` 5,076 times as ADV, `ὁ` 2,914 times as DET,
`ἐν` 2,849 times as ADP — with the real diacritics, no folding needed.
Built via the same unmodified `build-pos-prior.mjs`, shipped as its own
language code **`grc`** (Ancient/Koine Greek), never merged into `ell`
(Modern Greek) via `LANG_ALIAS` — the two are deliberately kept as
separate gates for separate registers of one script, the identical
"do not paper over a real difference" posture LP16's own Turkish section
already holds.

**A second, smaller finding on the way, worth naming: this pass first
picked the wrong Greek NT specimen and caught it before trusting the
number.** `14-holy-texts/sblgnt/Matt.txt` reads 0 edges under the real
`grc` gate — not the gate being too strict; the file is a textual-critical
VARIANT APPARATUS ("1:5 Βόες … Βόες WH NA28 ] Βοὸς … Βοὸς Treg"), not
running prose, confirmed by reading 1,952 lines of it, not assumed from
one bad number. `14-holy-texts/sblgnt-books/61-Mt.txt` is the real running
text and reads 51 clean edges once substituted — dominated by `ἐγέννησεν`
("begat," 39× — Matthew 1's own genealogy chain, "Abraham begat Isaac,
Isaac begat Jacob...") and `ἰδὼν` ("having seen"). **The lesson: a
zero from a gate and a zero from a bad specimen look identical in the
aggregate count and are not the same fact — read the file before blaming
the mechanism.**

**One real, disclosed, NOT-fixed limit surfaced by the wider English
spread (5 encyclopedic genres this pass had not tried together
before):** `physicist`/`dynasty`/`khanate`/`mathematicsancient` (the last
a wiki-markup concatenation artifact, the already-named class) still ride
as connector labels on Mongol Empire and Thermodynamics — real English
nouns, in an encyclopedic/historical register `UD_English-EWT`'s own
16,654-form, web/blog-genre treebank apparently under-attests. This is
the SAME "cannot refuse what it never saw" mechanism as Turkish's own
residual noise (LP16, above) and Modern Greek's original failure — not a
small-language problem specifically, a treebank-coverage-sparsity problem
that can hit ANY language, English included, once the candidate text's
own vocabulary register drifts far enough from the treebank's. Named,
not attempted: a larger or genre-matched English treebank, or a merged
UniMorph+treebank prior (UniMorph's noun paradigms would very likely
attest "physicist"/"dynasty" as real nouns even where a modest treebank
never happened to).

**Asked directly whether 51 was actually good, and it is not, evenly.**
39 of 51 (76%) is one verb, `ἐγέννησεν` ("begat"), from Matthew 1:1-17's
genealogy — the easiest possible clause shape for a positional extractor,
repeated ~40 times. The excerpt's remaining ~21 verses (the birth
narrative, the Magi, the flight to Egypt, John the Baptist) are real,
eventful, verb-rich prose and produced only 12 edges across 11 distinct
verbs — with real, present verbs (`ἀποκριθεὶς` "having answered,"
`βαπτισθεὶς` "having been baptized," `πληρῶσαι` "to fulfill," `ἀφίησιν`
"permits") checked directly and confirmed ABSENT from the admitted set.
Aggregate density (51/38 sentences = 134%) hides this skew rather than
showing it — a sentence-count ratio is the wrong lens when one sentence
can carry three genealogy clauses and another carries a whole
participial quotation and yields zero. **Not a Greek-specific defect**:
this is the SAME clause-shape ceiling this project measured extensively
on English (READING-POLICY A17: NO_VERB 51.2%, SWALLOWED 39.1% — a
position-based extractor loses participial constructions, direct
quotations and non-adjacent subject-verb structure), now visibly the
identical story on real Koine narrative rather than assumed to transfer.
Not attempted here: closing it needs the slot-typing/clause-shape work
A17/A19 already named as real, scoped, unattempted future work for
English, extended to whatever Koine's own participial morphology needs on
top.

**The holograph question, answered honestly rather than faked.**
`eoreader7/native/eval/the-fold/holograph-compression.mjs` — the actual
runnable holograph driver — refuses (by design, S65) against this run's
own output: it consumes a *conversation run's* persisted constitutional-
reader log (`reading-log.js`'s referent/mention book, built by
`createRecursiveReader` over real asked questions) plus that run's own
ledger, not an arbitrary hyperlexicon propositions log. This pass's
15-document shared log is real, rich, and a genuinely different artifact
from a genuinely different reading pipeline — the two are related, not
interchangeable, and nothing here silently pretended otherwise by pointing
one driver at the other's output. **Answering "is the log rich enough to
holograph from" for real** would mean running these 15 documents (or a
real conversation over them) through the constitutional reader itself,
producing the shape `holograph-compression.mjs` actually reads — named as
the real next step, not attempted in this pass.

**Amended — the-fold's own reading state, not repeated here.** The
grounding-ladder assessment this pass answers a measurement question for
(referent identity, corroboration as disclosed fragility, contest typing,
the void/cut timelines, the holograph) is the-fold's and eoreader7's own
POLICIES.md/READING-SPEC.md, current through P171/S82 as of this pass —
see those for what "reading," at its current best, actually means; this
entry is only the corpus-side half of leveraging it.

## LP17 — A field rename in the shared organ silently zeroed every sidecar this script has built for a week; "gate: clean" does not mean "content admitted"

**What happened.** `scripts/eot-sidecar.mjs` built every sidecar's admitted propositions from `makeRelationReader`'s edges by reading `e.subject`/`e.verb`/`e.object`. The-fold's P76 (2026-09-02) renamed those fields to `e.end1`/`e.label`/`e.end2` (`arrangementOf`'s own shape) — a rename this script never picked up, so every edge it has read since has had `subject`, `verb`, and `object` all `undefined`, and every arrangement built from one failed `hl.admit`'s completeness check (`!end1 || !label || !end2`) as `incomplete`, 100% of the time, on every document. `scripts/eot-digest.mjs::digestOne` already carries the fix (`e.end1 ?? e.subject`, with its own comment dated at the discovery) — it was never ported to this sibling script.

**Why it went unnoticed.** `admission.gate` still reported `"clean"` — gate classification only tracks whether an explicit error/refusal fired (`gapped_script`, `gapped_self_verify`), never whether anything was actually admitted. A sidecar with `gate: "clean", heard: 0, folded: []` reads, from the summary line alone, exactly like a working reading of thin material. The only tell was `admission.heard` itself, which nothing printed or gated on.

**Found 2026-09-09**, LaVar (`eoreader7/LAVAR.md`) generating a first sidecar for `18-childrens-books/global-digital-library/en/273_I-Love-My-Mom.txt.eot.json`, user direction verbatim: *"wtf is this, there's no text read."* Confirmed by checking the last sidecar predating the regression: `pg11_Alice_s_Adventures_in_Wonderland.txt.eot.json`'s `lastRun` is `2026-09-01T20:04:32.966Z`, one day before P76 shipped — its real `subject`/`verb`/`object` log entries are genuine, from before the break.

**Fixed** at `scripts/eot-sidecar.mjs`'s two read sites (the admitted-edge builder and the mismatch-disclosure map), same fallback `eot-digest.mjs` already uses. Not yet re-run corpus-wide: **every one of the 601 existing `.eot.json` sidecars generated on or after 2026-09-02 should be treated as suspect** (`heard`/`folded` likely near-zero regardless of what `gate` says) until rebuilt with this fix. The corpus-wide rebuild itself (LAVAR.md §7) is a separate, larger, disclosed-in-advance operation — not performed inside this entry.

**The general lesson, worth carrying past this one bug:** a shared organ's field-shape rename needs the same "sweep every caller, not just the one you're looking at" discipline eoreader7's own CLAUDE.md already names for a rename inside one repo — the discipline does not stop at a repo boundary. `eot-digest.mjs` and `eot-sidecar.mjs` are siblings, in the same directory, importing the same upstream organ, and the fix landed in one and not the other for a full week. And a gate that reports "clean" needs a second field read beside it — `heard`/`admittedSpans`/`coverage` — before "clean" is trusted to mean anything happened.

---

## LP18 — An EOT reading is a JSONL ledger of observations that nest by address, typed by cube cell; the flat `.eot.json` schema is superseded (2026-09-09)

**The law lives at `eoreader7/native/READING-SPEC.md` S95.** This entry records what it means for THIS repo, whose 601 `.eot.json` sidecars are written in the superseded form.

**What changed, and why it is not cosmetic.** `scripts/eot-sidecar.mjs` writes one flat JSON object per source: an array of `folded` arrangements, each carrying `subject`/`verb`/`object` strings, each span carrying a full `ref` path plus an `at` string with that same path repeated inside it. Measured on Chapter 1 of Alice: **185,462 bytes of sidecar for an 11,552-byte chapter — 16x the text it reads — of which the source path alone accounts for 35,568 bytes across 741 repetitions, 19% of the file.** The user's own words on seeing it: *"look how much is redudnacne with the 'at' when you could have just scoped the JSON to be within a certain source."*

Three things that schema cannot represent at all, each of which is why the replacement is a different shape rather than a slimmer version of the same one:

1. **Nesting.** `curious child | was | very fond of pretending to be two people` is not one arrangement; the object carries another inside it. A flat triple discards it and reports the discard as a success. *"this is more than one proposition. and propositions can be nested, that's the whole point of the holograph."*
2. **Document structure.** Chapters, sections and paragraphs are not in the flat schema in any form. Chapter 1's two scene-break asterisk rows were filed as six `no_relation_extracted` gaps and charged against the reading's own coverage — structure discarded, then counted as failure.
3. **Revision.** A reading that learns something later cannot record it. The ledger appends a superseding line and keeps both; the flat form can only be overwritten.

**Grain, not error — the correction that matters most for this repo's own numbers.** An arrangement whose connector is a preposition (`burning | with | curiosity`) is a **Field** (`CON · Ground · Tending`), not a broken Link. Any prior sweep of these sidecars that treated preposition-connectored edges as extraction noise was mis-typing a grain difference as a defect. `reading.grammar.mismatched` in the existing schema — which lists edges whose connector settles as a non-verb — is **disclosure of a grain, not a list of errors**, and must not be read as a quality signal.

**Status, stated plainly rather than implied.** `eot-sidecar.mjs` has NOT been migrated. Until it is, this repo writes one format and the law describes another; where they disagree, S95 governs and the sidecars are the stale artifact. The reference implementation is `eoreader7/native/eval/lavar/eot-jsonl.mjs`. A corpus-wide rebuild is a separate, larger operation (LAVAR.md §7) and is not performed by this entry — and it now has a second reason to happen, on top of LP17's.

**One rule this repo must not break again, because address-nesting makes it load-bearing:** *"we need to do our best to preserve the exact origin doc."* Earlier the same session, four children's-book source files in `18-childrens-books/` were **edited in place** to strip front and back matter, and `pg11-alice-ch1.txt` was carved out of the full book as a separate file (and silently normalised from CRLF to LF in the process — a second origin, already drifted, every address in it off by one byte per line). Under S95 both moves are wrong: front matter is recorded with a role, never deleted; a chapter is an observation at `[start,end)` on the origin, never a file. Any ledger written against an edited source is a ledger about bytes that no longer exist.

---

## LP19 — What a good EOT sidecar is, now that we have measured what a bad one was (2026-09-09)

**The law lives at `eoreader7/native/READING-SPEC.md` S95–S99.** LP19 records what those mean for this repo, whose 601 `.eot.json` sidecars are all written in the superseded form.

### The measured state, so nothing here reads as preference

Read against 801 hand-authored clause-level propositions across three chapters of one book (Alice, ch1–3, `eoreader7/native/eval/lavar/goldens/`): **recall 11.4%, 454 arrangements emitted against 91 a reader would draw.** The reader is not under-producing; it is producing largely the wrong things. **8.2% of all propositions are intransitive** and cannot be admitted at all while the extractor demands both a subject and an object group (S90).

Every number this repo has published about reading quality predates that reference and was a measurement of the reader against itself.

### Six properties of a sidecar worth keeping

1. **A ledger, not a document.** Append-only JSONL, one observation per line. The log is the artifact; the tree is a projection of it. Storing the projection erases the reading that produced it.
2. **Nest by address.** Containment computed from byte offsets — no parent pointers, no order dependence. The flat form repeated its source path **741 times, 19% of a 185 KB file describing an 11.5 KB chapter.** The path is written once, on line 0.
3. **The origin is preserved byte-exact.** A chapter is an observation at `[start,end)`, never a carved-out file. Front matter is recorded with a role, never stripped — deleting it shifts every offset after it. This caught a chapter file silently normalised from the book's CRLF to LF: a second origin, already drifted, every address in it off by one byte per line.
4. **Structure is INFERRED and carries its basis.** A document has no markup; it has bytes and typographic conventions a reader interprets. Chapters, sections, paragraphs and sentences are the same line shape at different extents, each marked `inferred` with the evidence that licensed it, so each is contestable exactly like a proposition.
5. **Typed by cube cell, never by an English part of speech.** A preposition in the connector slot is a **Field** (`CON·Ground·Tending`), not a broken Link. Refusing it discards real structure and counts the discard as cleanliness. No line says `subject`, `verb` or `object`; the English reading of each cell is declared once, in the recipe, scoped to the language and reader that assumed it.
6. **Nothing is silent.** A sentence that yields nothing carries a typed absence naming why (no earned verb / the gate refused). A refusal is a line. A grain that does not settle is a `grain_gap` carried on the record, and the observation is kept in full.

### Reading again is how a sidecar improves, and it records only the delta

A reread legitimately knows later chapters because it has read them — that is rereading, not lookahead, and it is marked as a second pass. It writes **only what moved**: an arrangement already recorded identically is not restated. Where a reread reads the same bytes differently, that is an **ambiguity, not a correction** — both readings stay, emitted as an untyped contest, because `kernel/notes.js`'s own rule is that an untyped disagreement needs typing, not a source.

### Which tier a new source joins

**A lexicon (Wiktionary, UniMorph, a treebank) joins the received priors** — it has a giver, a revision, and a concession path, so it may gate, refuse and type. **A model joins the witnesses** — its testimony lands typed beside the byte and structural tiers, one binary question at a time, and it never becomes a prior and never gates. Confusing the two is the failure S99 exists to prevent.

### Status: this repo has not migrated

`scripts/eot-sidecar.mjs` still writes the flat `EOTReading@1` form and still gates its vocabulary rather than its arrangements. Until it moves, this repo writes one format and the law describes another; **where they disagree, S95–S99 govern and the sidecars are the stale artifact.** The reference implementation is `eoreader7/native/eval/lavar/eot-jsonl.mjs`. A corpus-wide rebuild now has three reasons outstanding (LP17's field rename, LP18's schema, and this entry's typing), and remains a separate, disclosed operation.

---

## LP20 — A romanized script is a language wearing Latin clothes: it is a typed gap, never a thin clean read (2026-09-13)

**Measured, not argued.** The same day the St. John's canon fetchers landed the Sanskrit originals — Upaniṣads, Bhagavadgītā, the full Mahābhārata, Vālmīki Rāmāyaṇa, the Ṛgveda — seven new-language sidecars were generated against them and their neighbours. Admission gates and coverage:

| source | script | gate | coverage | edges |
|---|---|---|---|---|
| Tacitus, *Annales* (Latin) | Latin | clean | 70.0% | 53 |
| Homer, *Iliad* (Ancient Greek) | Greek polytonic | clean | 68.8% | 51 |
| Sappho, poems (Ancient Greek) | Greek polytonic | clean | 16.0% | 17 |
| Kaṭha Upaniṣad (Sanskrit, IAST) | Latin + diacritics | **clean** | **1.7%** | 1 |
| Bhagavadgītā (Sanskrit, IAST) | Latin + diacritics | **clean** | **6.0%** | 3 |
| Bashō, *Oku no Hosomichi* (Japanese) | Kana/Kanji | gapped_script | 0.0% | 0 |
| al-Ghazālī (Arabic) | Arabic | gapped_script | 0.0% | 0 |

Japanese and Arabic are typed honestly — `gapped_script`, the reader cannot see the script, nothing is fabricated. Latin and Greek read meaningfully. **The failure sits in the middle row: the IAST Sanskrit is romanized, so its script is "cased" and the gate fires `clean` — while the reader has no Sanskrit organs, and the read is 1.7–6% of sentences.** It is the same lie LP17 already measured for a field rename, one layer deeper: there, `gate: clean` hid a silent zero because nothing printed `heard`; here, `gate: clean` hides a near-zero because the reader's script check is satisfied by an alphabet the language does not actually speak.

**Why the Latin alphabet is exactly the danger.** A genuinely foreign script is self-disclosing: `gapped_script` means nobody reads it as English and the summary says so. A romanized script is a language wearing Latin clothes — the reader's sentence splitter, surface extractor and POS gate all run on it and all return just enough of *something* (English-shaped tokens, mostly noise) that the admission path completes with `clean`. The reader is not merely silent about the empty read; the alphabet makes the emptiness invisible at the summary line, which is strictly worse than the honest gap.

**The rule.** A text whose script is cased but whose **language** has no reading organs is not a clean thin read; it is a typed gap. Concretely:

- The gate's `script` block must distinguish **script readable** from **language readable**. A Latin-script text in a language the reader has no organs for (Sanskrit IAST, and by the same logic any romanized Arabic, Persian, or Hindi) must be typed `romanized_gap` (or the language's own named gap), with the language named and the coverage reported as the near-zero it is — never passed to the `clean` bucket.
- A sidecar that reports `gate: clean` on a romanized-script source is mis-typed by construction, per LP17's own standing: a gate that reports "clean" needs `heard`/`coverage` read beside it, and here the gap must travel with the reading (LP4's `MUST`, the gap is part of the reading).
- The corpus's own fetchers already carry the signal the gate needs: `fetch-sanskrit-canon.mjs` writes `format: IAST transliteration` into every file's frontmatter. That is a declared fact about the source, and the sidecar generator should read it the way it reads `stripContainer`'s offsets — a typed gap cannot be honest if the typing source is ignored.

**What this does not decide.** Whether the fix is a real Sanskrit reading layer (relation + POS organs for IAST, the honest long-term answer) or a gate-level typing correction (the immediate honest one) is the next pass's to measure — the same ordering LP7 states: name the limit first, then build past it. And it does not license treating the near-empty sidecars as useful evidence about the Upaniṣads: LP4's rule holds — these documents are not empty; the reader is blind to their language and now says so.

---

## LP21 — The St. John's canon entered as original text: what the corpus owes a language it cannot yet read (2026-09-13)

This entry records the state of the corpus after the canon fetchers, and the debt LP20 names made concrete. The raw corpus itself is not policy; the policy is what the corpus now promises to do about languages it fetched but cannot read.

**What landed.** `14-holy-texts/upanishads/` (principal Upaniṣads, IAST), `14-holy-texts/bhagavad-gita/`, `11-multi-language/sanskrit-originals/` (Ṛgveda, all 18 parvas of the Mahābhārata, Rāmāyaṇa, Yoga Sūtras, Nyāya/Vaiśeṣika/Sāṃkhya Sūtras, Kālidāsa, Lotus Sūtra), `11-multi-language/greek-originals/` (Homer, Aeschylus, Sophocles, Euripides, Aristophanes, Herodotus, Thucydides, Plato, Aristotle, Sappho, Pindar, Epictetus, Plotinus), `11-multi-language/latin-originals/` (Tacitus, Livy, Augustine, Boethius, Anselm, Aquinas, Spinoza, Bacon, Copernicus, Newton), `11-multi-language/japanese-originals/` (Genji, Pillow Book, Tsurezuregusa, Hōjōki, Bashō), `11-multi-language/arabic-originals/` (al-Ghazālī, Ibn Rushd, Ibn Khaldūn).

**The debt.** For each of those languages the corpus now holds original bytes it cannot read with its current organs: IAST Sanskrit reads at 1.7–6% coverage behind a false `clean` gate (LP20), Japanese and Arabic are `gapped_script`. The debt is not discharged by the fetch having succeeded — a language fetched and gapped is a language still unread, and the LP20 typing is what keeps that honest.

**Known gaps, by source, disclosed rather than forced.** (a) *Heike Monogatari*: neither ja.wikisource nor Aozora carries the classical text — both edition pages on ja.wikisource are redlinks, Aozora has only modern renditions; recorded as unavailable rather than substituted. (b) *Classical Chinese*: ctext.org serves a Cloudflare Turnstile challenge to automated clients and its API is authentication-gated; the Analects, Dao De Jing, Zhuangzi, Mencius, Mozi, Xunzi, Han Feizi, Great Learning and Doctrine of the Mean remain absent — the source is named, the blocker is named, nothing silently substitutes a different text. (c) *Kena and Muṇḍaka Upaniṣads*: GRETIL does not carry them (restricted TITUS only); the ten principal Upaniṣads present are so labeled. (d) *Avicenna's al-Šifāʾ and al-Fārābī's corpus*: not on ar.wikisource in full.

**The promise.** A language fetched into this corpus with no reading organs is not an excuse to stop there; it is an itemized account of what the next reading pass must build. The gap inventory is itself a prior: the corpus now knows, per language, which texts it holds that it cannot yet read.
