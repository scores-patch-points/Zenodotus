# EOTReading@2 — the seed checkpoint and the first two rings, measured

*Re-runnable: `node scripts/build-pos-prior.mjs && node
scripts/build-reading-priors.mjs && node scripts/eot-sidecar2.mjs --ring0
--ring1-all`; conformance: `node --test
scripts/build-reading-priors.test.mjs` (15/15). Law: POLICIES.md LP7 and its
two same-day amendments (surprise is hypergraph delta; priors are
checkpoints, never weights). Grammar: goldens/reading/RULE.md R1-R12 +
the fourth amendment (the triadic minimum).*

## What was built

Three artifacts, each a **checkpoint** — a content-addressed projection of
live sources, regenerated never edited:

1. **`derived-priors/pos-priors/pos-prior-en.json`** (POSPrior@1) —
   UD_English-EWT (CC BY-SA 4.0) counted per surface form: 19,341 forms,
   254,820 tokens, 16,622 sentences, ambiguity preserved. Built here
   because the canonical the legacy engine.1 build is unreachable in this
   checkout (uninitialized submodule, output gitignored there); committed
   with giver and per-file shas, matching act-prior-en.json's precedent.
2. **`derived-priors/reading-priors/reading-priors-v1.json`**
   (ReadingPriors@1, 558KB) — the seed, compiled from the 18 hand goldens
   with the UDHR five as the core: 477 act-expectation keys (per-language
   relation surfaces + POS-elected English heads, every entry witnessed
   `specimen@ground`), per-specimen/per-family frames, the **Rosetta
   matrix** (107 props × 5 languages, full rows; 31 acts; 23
   construction-splits; 21 props absent in ≥1 language, precomputed),
   the surprise event vocabulary, the spiral ring declaration, and the
   firewalls (Goal 5 derived-never-adjudicated; Goal 6 one-reader caveat;
   self-evidence exclusion).
3. **18 `*.eot.json` sidecars** beside their sources — ring 0 (13
   hand-golden source files, 369/369 spans re-verified fresh against raw
   bytes) and a 5-edition ring-1 sample.

## No stop lists — head extraction is measurement

User direction mid-build: "I don't like stop lists, they're a hack." The
hand-typed aux/modal array was deleted the same hour. `headOf` now elects
an English relation's content head from treebank counts alone: among
tokens whose UD dominant class is VERB at the declared 0.5 floor, the
**maximal verb share** wins (earliest on ties). That one rule handles
aux-capable verbs without naming any: "have" is genuinely VERB-dominant
in EWT (963 VERB / 745 AUX — main-verb *have* is real English), but in
"have resulted in" it loses to "resulted" (1.0 vs 0.56) by measurement.
"shall"/"is"/"has" are AUX-dominant and never electable; "the" is DET;
"right" never reaches VERB; an unattested form is never elected (no
evidence, no election). Junk expectation keys (`en|the` existed under the
hand list) are now structurally impossible — pinned by test, not
filtered.

**Disclosed cost, not smoothed over:** EWT's ~19K-form vocabulary misses
real predicates — "compelled" and "endowed" are unattested, so
"is not to be compelled to have recourse" elects "have" (the best
attested verb present) and "are endowed with" elects nothing. Both
outcomes are typed (a lesser head, or `no-verb-head`), never guessed. The
fix ring is a larger treebank checkpoint or per-occurrence resolution
(eoreader7's roles.js — the instance-level organ wordclass.js's own
header already names), not a hand list.

## Ring 0 — the Rosetta graph, built sequentially

The five UDHR readings enter in the declared adjudication order (en → ar
→ es → zh → sw — a construction order, **not** a claim of independence;
Goal 6's caveat rides every figure here). Each sidecar carries the typed
hypergraph deltas its reading contributed:

| reading | corroborated | cell-variant | polarity-variant | absent | unique-so-far |
|---|---|---|---|---|---|
| en (founds) | — | — | — | — | 94 founded |
| ar | 81 | 7 | 1 | 5 | 4 |
| es | 92 | 2 | 0 | 4 | 1 |
| zh | 86 | 10 | 0 | 3 | 4 |
| sw | 87 | 9 | 0 | 7 | 4 |

Readings of the same findings the hand adjudication made, now as
measured graph events rather than prose:

- **The one polarity-variant is `udhr:marriage-consent`** (ar) — same
  cell, mirrored polarity: en "only with the free and full consent" (+)
  vs the Arabic لا…إلا restriction (−). The event carries both rows'
  `because` fields; it is a disclosed construction, not a contradiction.
  A polarity difference riding a cell change (the A4
  negative-existential family, e.g. `udhr:no-distinction-status`
  SEG·Pattern− → NUL·Pattern+) folds into its construction-split event —
  pinned by test.
- **Arabic's absences** include the famous one
  (`udhr:friendly-relations-essential` — the whereas-clause the
  translation genuinely lacks) plus four others
  (`elections-suffrage`, `entitled-realization`,
  `promote-understanding`, `further-un-activities`).
- **An `absent` is a prop-grain fact, not always a hole in the
  translation**: props were pivoted on English verb-spans (R9), so a
  language that folds a predication into another prop's row lands
  absent-here + unique-there. The zh/sw pairing shows it clearly: zh is
  unique on `no-distinction-kind`/`rights-violated`/
  `no-attacks-honour`/`order-realizes-rights` where sw reads those absent
  and is unique on four of its own (`declaration-standard`,
  `nations-make-known`, `dignity-equal`, `rights-set-forth`).
- zh carries the largest cell-variant count (10) — the making-vs-holding
  construction splits the adjudication already recorded.

## Ring 0 — act expectations (non-self + received VerbNet only)

English (the only language the received tiers cover):
**14 act-agreement, 7 act-departure, 31 no-expectation, 42 no-verb-head**
across 94 propositions. All seven departures are readable tensions, not
noise:

| ground | key (tier) | expected | adjudicated |
|---|---|---|---|
| preamble.2.2.1 | enjoy (verbnet) | EVA | SIG |
| preamble.3.1.2 | have (golden) | DEF NUL SEG SIG | INS |
| article-2.2.1 | made (golden) | INS SYN SIG | SEG |
| article-11.2.1.1 | constitute (verbnet) | CON INS | SIG |
| article-21.3.2.2 | held (verbnet) | CON SIG EVA | INS |
| article-25.2.2 | enjoy (verbnet) | EVA | SIG |
| article-26.2.2 | promote (verbnet) | SYN | REC |

`enjoy` (×2) is the known enjoy-frame precedent — the adjudication reads
right-holding (SIG), VerbNet reads experiencing (EVA). `promote` →
REC·Pattern is the promote-frame ruling (ROSETTA-GOALS Goal 1's own
re-typed group). These are the type-level prior meeting the adjudication
frames — the disagreement is the measurement working, and none of it
gates anything. Non-English rows are almost all `no-expectation` (ar
97/97, es 96, zh 102, sw 107): the received tiers are English-only, and
the Goal-5 per-language lexicon (already seeded — the rosetta's surface
keys ARE it) is the named path.

## Ring 1 — five diverse editions, structural claims only

`derived: true` on every one; zero propositions offered; the prop
expectations land as typed `no_lexicon` gaps (LP4: absence of a reading
is a fact about the reader).

| edition | language | articles found | missing | note |
|---|---|---|---|---|
| udhr-fra | French | 29/30 | [1] | "Article premier" — unnumbered first article, disclosed not repaired |
| udhr-rus | Russian | 30/30 | — | Cyrillic headings, ASCII digits |
| udhr-jpn | Japanese | 21/30 | [1–9] | 第一条…第九条 use kanji numerals — outside the received decimal blocks; a disclosed DETECTION gap, not a file defect |
| udhr-007 | Sãotomense | 30/30 | — | "Artigo 1º" |
| udhr-hin | Hindi | 30/30 | — | Devanagari text, ASCII article digits |

Digit detection covers the received Unicode decimal blocks (ASCII,
Arabic-Indic, Extended Arabic-Indic, Devanagari, Bengali — tables closed
by their giver, which is what distinguishes them from the stop list this
pass removed); a mixed-block run refuses as noise. Kanji numerals are a
named absence, not silently special-cased — per-language heading
conventions are the trap succession.js is condemned for.

## What this pass does NOT claim

- **No independence.** One reader adjudicated all five languages with the
  others in view; every agreement figure above measures that reader's
  consistency until Goal 6's blind adjudication runs.
- **No corpus sweep.** 511 UDHR editions remain unread; this 5-edition
  sample IS the LP6-style diverse validation the sweep requires first.
- **No sequential surprise organs yet.** Ring-0 surprise is graph deltas
  against the languages before it — the right measure at this grain; the
  tier-stack/expectation organs (eoreader7 expectations.js,
  emergence/surprise.js) join when readings start arriving
  increment-by-increment rather than golden-at-a-time.
- **Nothing here is a weight.** Every artifact is a checkpoint of the
  live record (LP7 second amendment); the goldens and the sidecars' own
  logs stay the reality, and the next checkpoint is a recompile.

---

## The ring-1 sweep (2026-08-31, same day — the spiral's first full ring)

User direction: "spiral out to the rest of the UDHR editions." The
5-edition sample above was the LP6-style validation; the sweep followed:
**511 editions read structurally** (516 minus the five ring-0 golden
sources), every sidecar `derived: true`, zero propositions offered,
`no_lexicon` gaps typed. Machine summary: `scripts/eot-ring1-sweep.json`.

Before the sweep, one more hand list died: the digit detector's five
hand-picked Unicode blocks (the stop-list hack one level down — a sample
of a closed set standing in for the whole). Detection now covers ANY
Unicode Nd block mechanically, the zero found by the Standard's own
contiguity guarantee (ten contiguous ascending digits); Thai ๑๕, Burmese
၁၀, Devanagari २९ parse with zero configuration; a mixed-block run
refuses as noise; ideographic numerals (一二三) are not Nd and stay a
disclosed refusal — a per-language conversion table is the succession.js
trap.

**Distribution (articles detected per edition):**

| found | editions |
|---|---|
| 30/30 | 395 |
| 29/30 | 26 |
| 1–28 | 15 |
| 0/30 | 75 |

Identity confirmed (the file's own first line) on 511/511.

**Outlier classes, typed from the bytes, not guessed:**

- **29/30, missing [1] (20 editions)** — the Article-premier class: an
  unnumbered first article ("Article premier", Bamanankan, Hausa, Corsican,
  Malagasy…). Disclosed, never repaired.
- **29/30, missing a mid article (6 editions)** — singleton anomalies.
  The Maldivian specimen is a genuine SOURCE defect: article 10's heading
  literally reads "1 ވަނަ މާއްދާ" — the zero is missing in the file
  (LP1: disclosed, never repaired). Swati's article 28 heading
  ("INTFO YEMASHUMI LAMABILI NESIPHOHLONGO (28)", 43 chars) exceeds the
  declared 40-char heading guard — a detection limit, typed as such.
- **Partial detections (15 editions)** — mixed causes, spot-checked:
  Chuvash genuinely STOPS at article 19 (the translation is partial — a
  real corpus fact the sweep surfaced, not a detector failure); Jamaican
  Creole's headings ("Aatikl 23 (Di paat we diil wid wok)") mostly exceed
  the guard, so only 3 short ones land.
- **0/30 (75 editions)** — three sub-classes: ideographic-numeral
  editions (the CJK dialect family — 第一条 throughout);
  genuinely unnumbered editions (Achuar-Shiwiar: native prose headings,
  no numbers anywhere); and long-heading editions where every numbered
  line exceeds the guard.

The guard (≤40 chars, exactly one digit run, ≥1 letter) is a declared
structural threshold, kept rather than tuned per edition — chasing the
Swati/Jamaican heading formats one convention at a time is the
succession.js trap. What closes those honestly is the lexicon ring, not
a wider regex.

## Adversarial priors — which hypothesis minimizes hypergraph surprise (LP8)

User direction, near-verbatim: hold alt versions of the sidecars as
adversarial priors, built on other genuinely decent hypotheses about
minimizing hypergraphical surprise; amend earlier sidecars via appends;
no sidecar is ever done. Every sidecar now carries `layers` (an
append-only ledger of readings — layer 0 the favored reading, layers 1+
adversarial priors from `scripts/reading-hypotheses.mjs`) and a `fold`
(the projection across layers, recomputed on every append).

Four hypotheses shipped, each predicting a language's adjudicated cells
from what the languages BEFORE it know — scored, never preferred:

| hypothesis | knows | ar | es | zh | sw |
|---|---|---|---|---|---|
| frame | family modal cell alone | 49% | 48% | 49% | 50% |
| structural | (role × clause × polarity) → modal, no lexicon, no join | 66% | 65% | 58% | 59% |
| cell-transfer | the Rosetta prop join (prior languages' cells) | 93% | 99% | 90% | 92% |
| **grain-transfer** | the prop join, grain only | **100%** | **100%** | **97%** | **100%** |

**The finding: the GRAIN is the near-invariant axis of translation; the
OP carries the construction.** On the 23 construction-splits — exactly
where the op varies — grain survives 20/23, and each of the three breaks
has a documented adjudication reason (`family-unit-society`: the rule-3
definiteness split; `education-directed`; `limitation-purpose`; all
three involve zh or sw grain choices the goldens' own `because` fields
argue). Standing consequence, now printed in every rosetta sidecar's
fold: an op-level variant against the join is ordinary translation
information; a grain break is rare enough to read as an alarm.

Honest limits: the founding reading (en) is unscored — a hypothesis that
predicts from priors cannot be measured against the reading that founds
them; and every rate above is one reader's consistency until Goal 6's
blind adjudication runs. The ledger appends: the named next candidate is
the mechanical copula/A4/A5 ladder proper, which needs predicate-shape
fields the rows do not yet carry.

## Goal 6 ran (2026-08-31, same day): the op carries convention, the grain is the invariant

The blind panel (five context-isolated readers, one language each, blind
to the other languages and the stored rows — full method, verbatim
verdicts and caveats in `goldens/reading/goal6/GOAL6-RESULTS.md`)
answered the Rosetta falsification condition in two parts: **cell-level
kappa 0.310, BELOW the declared 0.4 floor — not certified; grain-level
kappa 0.525 — clears.** 82 of 96 panel-vs-stored disagreements keep the
grain, and the dominant divergence is one frame convention (right-holding:
stored SIG·Pattern, read EVA·Pattern by the en and es readers
consistently). This is the adversarial-prior ladder's own conclusion
reached by an independent instrument: grain-transfer won that ladder at
97–100%; blind adjudication now certifies (at proxy) the same axis and
refuses the other. Each rosetta sidecar carries the panel as an appended
`blind-adjudication` layer — LP8's ledger doing what it was built for the
same day it landed. The named repair (codify the frame precedents into
RULE.md Part II, re-run with fresh readers) is in the Goal 6 results doc.

## Metacognitive pass, 2026-08-31: the mechanical ladder and ring 2's calibrated start

Full narrative, the Friston/Vivekananda framing, and the generalizable
lesson are in POLICIES.md LP9. The numbers:

**Mechanical ladder** (`scripts/mechanical-ladder.mjs`, LP8's own named
next candidate — copula rules + A3/A4 + the published frame table,
scored against all 173 English rows across every committed golden):
first cut 74.6% accuracy-of-decided (A4 tier 8.3%, 1/12 — a
negative-quantifier SUBJECT alone, wrongly sufficient); corrected after
reading the actual misses (RULE.md's seventh amendment: A4 needs the
quantifier paired with a bare copula/existential predicate, never an
ordinary content verb) to **94.7% accuracy-of-decided, 32.9% coverage,
7/7 own tests**. Two further corrections were the author's own invented
extensions beyond the published table ("held guilty of", a bare "shall
be made"), removed rather than repatched.

**Ring 2, calibrated before swept:** `02-encyclopedic/wikipedia` (49
files). The structural detector (infobox/glue-debris boundary + heading
detection) was run against `Immanuel_Kant.txt` alone first — its debris
boundary (567 bytes) landed within one byte of `kant.golden.json`'s own
first row (568), an unplanned validation against real ground truth. The
sweep then ran with an online (Welford) posterior over heading count and
debris fraction, flagging three real structural outliers (Cell_biology
sparser than the family norm; Industrial_Revolution and Taoism denser),
hand-confirmed rather than trusted blind. Propositions stay empty
corpus-wide — DR4/DR5 (the-fold's own extractor) are still the named
prerequisite for any content reading here, re-confirmed from standing
evidence rather than re-run.

## VerbNet wired into generation, not just scoring (2026-09-01)

ActPrior@1 existed since ring 0 but was only ever consulted by
`eot-sidecar2.mjs`'s own `checkAct` — a SCORING function, checking a
row someone else already classified against VerbNet's expectation.
`mechanical-ladder.mjs::classify` — the function that actually DECIDES a
row's op — never looked at it, so a resource built specifically to
answer "what act does this verb perform" sat unused at the one place
that question is actually asked. User direction, verbatim: "yeah let's
use verbnet, why not? I thought we were. what about unimorph?"

**The tier.** Inserted after the frame-table/copula/A3/A4 tiers (all of
which stay first — a hand-adjudicated phrase or a grammatical
construction outranks a lexical lookup) and before the final undecided
fallback: elect the relation's head the same measured way (`headOf`,
POS-dominance, no list), look it up directly in ActPrior's `forms` dict;
if absent, fall back through MorphologyPrior@1 (UniMorph, `../eoreader7/
native/priors/morphology-eng.json`) to the form's lemma and retry. A
`unanimous` entry decides the op (grain stays `null` — VerbNet types the
verb's class, never the clause's scope, so grain is honestly left to
whatever the next tier down would have said, which today is nothing).
A `contested` entry is refused by name (R7's own disclosed-alternate
discipline — a candidate SET is never picked from), not resolved by
guessing. This is a direct dictionary lookup, not the Levin-class-
name-substring guess R5/R6 already refused elsewhere in this project —
disclosed as the distinction in the module's own header.

**Measured, both directions.** In-family (all 173 English rows across
every committed golden, real hand-adjudicated ground truth):
coverage 32.9% → **34.7%** (57 → 60 decided), VerbNet tier itself
**3/3 = 100%** accuracy, the 3 remaining copula misses are the
pre-existing, already-disclosed dispositional/Pattern-promotion gap
(unrelated to this change — confirmed by diff, not assumed). Held-out
(`06-government-legal/world-factbook`, Algeria — untouched by any
golden or frame-table phrase): 2/13 (15%) → **3/13 (23%)**; the new
decision is `"Algeria has known many empires and dynasties"` → EVA via
VerbNet's `comprehend-87.2` class through the UniMorph bridge
(known→know) — a genuinely debatable WSD call, disclosed rather than
claimed clean: "know" here reads experientially ("has lived through"),
not "comprehend"'s core cognitive sense, though EVA's own
witness/perceive family (RULE.md's frame table) arguably still covers
"having witnessed history" — recorded as a real judgment call, not a
confirmed hit, since this held-out set carries no adjudicated ground
truth to check against (by the eval script's own design).

**11 tests** (`mechanical-ladder.test.mjs`, 7 → 11): unanimous entries
decide with `tier: "verbnet"` and the lemma-bridge noted in `because`
when UniMorph fired; contested entries refuse; the tier is off by
default (omitting `actPrior` never fires it — no silent behavior
change for any existing caller); the tier never fires inside a pure
copula chain. Full suite 31/31.

Full account of the multilingual extension this same direction asked
for ("can we do this for as many languages as possible?"):
`scripts/multilingual-priors-RESULTS.md`.
