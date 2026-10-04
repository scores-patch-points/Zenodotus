# "As many languages as possible" — where the wall actually is

*Answers "yeah let's use verbnet, why not? I thought we were. what about
unimorph? can we do this for as many languages as possible?" (user,
2026-09-01). Re-runnable: `node scripts/lang-registry.mjs ar es zh sw`
(resolve-on-demand) and `node scripts/head-election-eval.mjs` (the
measurement). Companion to `scripts/eot-sidecar2-RESULTS.md`'s same-day
VerbNet-wiring section.*

## The answer, before the evidence

**No — and the reason is structural, not a coverage gap that more data
would close.**

The act-typing tier this pass just wired rests on **ActPrior@1, built
from VerbNet**. VerbNet is English-only *by construction*: Levin classes
are a theory of English verb alternations, not a universal inventory
anyone has ported. There is no Spanish VerbNet, no Arabic VerbNet. So
the capability that answers "what act does this verb perform" **cannot
be extended to another language by adding data** — it would need a
different theory of that language's verbs, built from scratch.

What *can* extend is the layer underneath it: POS priors, which elect
which token of a relation is the content head. That is genuinely
language-neutral, and it now covers Arabic, Spanish, and Chinese. But a
head-election layer **classifies nothing on its own** — it feeds a
ladder (the frame table, the copula rules) that is itself English-
specific, hand-adjudicated from English UDHR phrasing.

So, precisely:

| layer | English | ar / es / zh | sw |
|---|---|---|---|
| act typing (VerbNet) | **wired, measured** | impossible without a new per-language resource | impossible |
| lemma bridge (UniMorph) | **wired** | serves nothing without the above (see below) | no matching-register data |
| head election (POS prior) | wired | **built this pass** | no data upstream |
| construction ladder (frame table, copula rules) | hand-built | not attempted — needs a new frame table per language | not attempted |

## Why no morphology prior ships, for any language

A morphology prior does exactly one job here: bridge an inflected
surface form to a lemma so **ActPrior can be looked up** (this is what
made `known` → `know` → EVA work in the English tier). With no
non-English ActPrior, a non-English morphology prior is a bridge to a
destination that does not exist.

This was found the expensive way, and it is worth recording. A Spanish
morphology prior WAS built from real, verified `unimorph/spa` data —
873,811 forms, 1,196,224 rows, cross-checked against real UDHR
inflections (`derechos`→`derecho`; `fueron`→`{ser, ir}`, ambiguity
correctly preserved). It measured **24.5MB compact — roughly 34x the
largest artifact otherwise committed in this repo**. Two things then
became clear at once: it matched no consumer, and it matched no
established design either (eoreader7's `morphology-eng.json` stores only
the **irregular tail** — 5,531 kept of 224,550 raw pairs, 216,011
dropped as rule-recoverable, "regular inflections are recovered by
stemsOf at read time" per its own provenance). It was deleted rather
than committed. **The tell was the documentation**: when the disclosure
explaining why an artifact does not match its own design runs longer
than the artifact's justification, the artifact is the thing to cut.

Recorded so a future pass does not rebuild it as busywork: re-add a
non-English morphology prior **only alongside a real consumer**, and if
so, in the irregular-tail shape — which additionally needs a per-language
regular-inflection rule that does not exist in this checkout for ANY
language (the script that built the English one is not in either repo;
its provenance points at a different session's now-gone scratchpad).
Pinned as a test.

## What was verified, live, per resource

`api.github.com` is scoped to four unrelated repos in this session and
returns *"GitHub access to this repository is not enabled"* for anything
else — **not a real 404**, and no signal about whether a repo exists.
All verification below is direct `raw.githubusercontent.com` fetch (the
same channel `build-pos-prior.mjs` already used) plus the orgs' own
public search pages where a repo name had to be found rather than
guessed.

**Universal Dependencies — 3 of 4 real:**

| lang | repo | splits | result |
|---|---|---|---|
| Arabic (arb) | `UD_Arabic-PADT` | 200/200/200 | **built** — 24,904 forms |
| Spanish (spa) | `UD_Spanish-AnCora` | 200/200/200 | **built** — 38,718 forms |
| Chinese | `UD_Chinese-GSD` | 200/200/200 | **rejected — wrong script** |
| Chinese (cmn_hans) | `UD_Chinese-GSDSimp` | 200/200/200 | **built** — 20,147 forms |
| Swahili (swh) | `UD_Swahili-OPUSGV` | no `.conllu` anywhere | **gap** |

*The Chinese script catch.* `UD_Chinese-GSD` answers 200 on every file —
by "does it exist" alone it was the obvious pick. Reading the actual
bytes first found **Traditional** characters (`看似簡單`, `決擇`) while
this project's own golden is `udhr-cmn_hans` — **Simplified**. That prior
would have silently matched almost nothing, with no error anywhere to
catch it. `UD_Chinese-GSDSimp` is UD's own Simplified conversion.

*The Swahili gap.* `UD_Swahili-UCB` was a guess and does not exist —
refused rather than retried under variant spellings. The org's own search
found the real entry, `UD_Swahili-OPUSGV`; its root listing and its
`/tree/master` listing agree independently: `CONTRIBUTING.md`,
`LICENSE.txt`, `README.md`, **no data file**, despite its README claiming
`"Data available since: UD v2.8"`. An upstream defect, typed into the
manifest, never a placeholder file.

**UniMorph — investigated, nothing shipped** (per the section above; the
findings stand on their own as a map of what exists):

| lang | found | register match? |
|---|---|---|
| Spanish | `unimorph/spa` — real | yes |
| Arabic | `arb` 404; `arz` (Egyptian), `afb` (Gulf) real | **no** — UDHR is Modern Standard |
| Chinese | none, under any code; org search "chinese" → zero | — (principled: little inflection to tabulate) |
| Swahili | `swa`/`swh` 404; `swc` (Congo Swahili) real | **no** — UDHR is standard Kiswahili |

Arabic and Swahili are the interesting refusals: a real, live resource
exists in each case, for the wrong register. Substituting Egyptian
Arabic's paradigms for Modern Standard, or Congo Swahili's for standard
Kiswahili, fails **silently** rather than loudly — refused on the same
grounds this project refuses a dialect-blind name match elsewhere.

## A real bug, caught before it shipped

Every prior-build script accumulates counts via `forms[form] ??= {}`.
`"constructor"` is a genuine attested word in both UD_Spanish-AnCora and
UniMorph's Spanish table — and against a plain `{}` that key resolves
through `Object.prototype` to the `Object` function instead of creating a
fresh accumulator. The stricter `.add()` path threw; **the POS-prior
path would NOT have thrown** — it would have silently assigned onto the
global `Object` and lost that word's counts. Checked both ways: English
EWT has no colliding token (so the already-committed `pos-prior-en.json`
was never corrupted — reconfirmed byte-identical after the fix), while
`pos-prior-es.json` was genuinely one distinct form short (38,717 vs. the
correct 38,718) before the catch. Fixed with `Object.create(null)`
everywhere the pattern appears, including preventively in the
pre-existing English script. Pinned as a regression test.

## Amended same day — resolve on demand, don't vendor ahead of need

User direction, verbatim: "can we leave the unimorph on its own site and
not bloat our priors doc?" then "why don't we do language detection and
then vendor from unimorph as needed live?" The first cut of this pass had
committed all three non-English POS priors (~2.9MB) — which was LP10's
own mistake repeated at smaller scale: real data, no consumer, committed
as if committing were the point. Replaced by **`scripts/
lang-registry.mjs`**: one registry of what exists per language (every row
live-verified, every absence typed with what was checked), one resolver
(local cache → fetch on demand → typed refusal, NEVER a silent fallback
to another language — reading Arabic with English priors and not
noticing is exactly the failure the registry exists to make impossible),
and one committed lockfile (`derived-priors/pos-priors/
resolved.lock.json`) pinning each resolve's source sha256s so upstream
drift is REPORTED, never silently absorbed into a prior some results doc
already cited. `pos-prior-en.json` stays committed — it has a real
consumer (`loadPosForms`, every run). The rule, now mechanical instead of
re-decided per pass: **bytes are committed only where something reads
them; otherwise the recipe + the source address + its sha256 IS the
artifact.**

## Measured before wiring: head election does NOT extend the act lexicon

The obvious next move — "we have non-English POS priors now, so wire
`headOf` for ar/es/zh and key the Rosetta act expectations by elected
head instead of exact surface" — was measured before being built
(`scripts/head-election-eval.mjs`, leave-one-out over the real
adjudicated goldens, so the expectations are never scored on the rows
that built them). It loses, everywhere, including English:

| lang | surface: cov / acc | head alone: cov / acc | head as fallback (deployed shape): fired / acc |
|---|---|---|---|
| ar | 28.1% / **100%** | 14.8% / 57.9% | 8 of 92 misses / **25.0%** |
| es | 32.3% / **100%** | 33.9% / 90.7% | 9 of 86 misses / 55.6% |
| zh | 34.6% / 82.6% | 17.3% / 82.6% | 0 of 87 misses / — |
| en | 42.4% / 92.5% | 20.8% / 61.5% | 8 of 72 misses / **0.0%** |

The marginal arm is the decisive one, because the deployed mechanism
(`eot-sidecar2.mjs`) tries surface first and head only on a miss: in
English, the head fallback fired 8 times on rows surface could not
answer and was wrong **8 of 8**. Silence beat it. The whole relation
surface carries act-deciding information the head throws away ("shall be
subjected to" is not the act of "subjected"), which retroactively
validates `keyKind: "surface"` as the better keying, not a fallback.

**The standing caution this measurement earns** (it governs the
hypergraph note-identity work in the-fold, where the same temptation
appears as "fold identities so cross-source witnesses can match"):
**a loosened key is judged on its MARGINAL admits — the cases the strict
key could not answer — never on aggregate coverage.** A join that adds
coverage at coin-flip accuracy on exactly the rows where it is the only
voice is worse than silence, because nothing downstream can tell its
answers from the reliable ones.

## Files

`scripts/lang-registry.mjs` (registry + resolver + lock; the CONLL-U
parse lives here once — `build-pos-prior-multi.mjs`, an earlier
duplicate, was deleted). `derived-priors/pos-priors/resolved.lock.json`
(committed). `scripts/head-election-eval.mjs` (the measurement).
`scripts/multilingual-priors.test.mjs` (10 cases — registry typing, the
never-fallback rule, the vendoring rule, lock pinning, honest skips on a
fresh checkout, the Object.create(null) source pin, the
no-morphology-without-a-consumer pin). `scripts/build-pos-prior.mjs`
gained the same `Object.create(null)` fix, output reconfirmed unchanged.

## What this does not claim

No non-English prior gained a consumer in this repo — and the one
candidate consumer proposed for them (head-keyed act expectations) was
measured and refused, which is the honest opposite of coverage theater:
**capability extended to one language (English, via VerbNet); the
substrate for three more resolvable on demand, sha-pinned; the wall named
precisely; and the first proposed bridge over the wall measured and
found to make things worse.** Where the non-English priors DID find a
real consumer the same day — the-fold's hypergraph admission gate, which
needed exactly this repo's `pos-prior-en.json` as its shipped ground —
is the-fold's own story: see its POLICIES.md P74 (renumbered from P72 on merge).
