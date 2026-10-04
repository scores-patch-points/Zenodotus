# PronunciationPrior@1 — results

Sound-first pronunciation dictionary for the six Rosetta languages (eng,
fra, spa, rus, arb, cmn_hans), wired as a standing derived prior + lookup
API. User direction, 2026-09-22: store the WAV of the sound, not a
transcription. Full design reasoning: `scripts/build-pronunciation-prior.mjs`
header. This file is the measurement record — every number below was
produced by the commands named, not asserted.

## What was decided

- **The WAV is the surface; IPA is a derived annotation.** The exact bytes
  of the sound are language-agnostic in a way no transcription system is
  (ARPAbet is English-shaped, IPA is a European projection). The prior's
  own law (lang-registry.mjs:9-10) is applied: the MANIFEST is committed
  (word → ipa + sha256 + voice + recipe); the WAV BYTES resolve on demand
  into a gitignored cache, synthesized deterministically from the
  manifest's own recipe and pinned by sha256.
- **One engine, disclosed.** espeak-ng (GPL-3.0) renders every Rosetta
  language with the same voice, so acoustic differences between languages
  are phonetic, not speaker noise — which also makes the audio the honest
  comparison substrate for the comparative layer.
- **The comparative is a separate layer** (the repo's own surface/meaning
  split applied to sound): `pronunciation-compare.mjs` projects each
  pronunciation into a shared articulatory-feature space and measures
  distance there. The WAV is the ground; comparison is a projection.

## Build

```
node scripts/build-pronunciation-prior.mjs eng fra spa rus arb cmn_hans
```

| lang | words | synthesized | refused | WAV bytes |
|---|---|---|---|---|
| eng | 504 | 504 | 0 | 17,945 KB |
| fra | 618 | 618 | 0 | 20,228 KB |
| spa | 564 | 564 | 0 | 21,117 KB |
| rus | 704 | 704 | 0 | 25,074 KB |
| arb | 715 | 715 | 0 | 28,958 KB |
| cmn_hans | 90 | 90 | 0 | 25,817 KB |

Word list = distinct surface forms of the six UDHR texts the Rosetta
actually reads (the corpus the prior exists to serve — LP10's "a prior
with no consumer is not coverage"). The 6-line OHCHR header is stripped
(verified byte-identical across all six); the native title line after it
is real material and kept. cmn_hans has no whitespace segmentation, so its
unit is the clause (disclosed per entry).

Reproduced live: `node scripts/pronunciation.mjs coverage` reports
`missing: 0` for all six with the cache built.

## Lookup API

`node scripts/pronunciation.mjs serve [--port=NNNN]` — dependency-free,
localhost-only, no-store, the fold's explore-server posture.

```
GET /pronunciation/eng/freedom            → audio/wav + x-er7-pron-ipa (base64),
                                           x-er7-pron-sha256, x-er7-pron-source
GET /pronunciation/eng/freedom/meta       → {ipa, sha256, bytes, source, unit, from}
GET /health                               → per-language coverage
GET /                                     → self-describing map
```

Typed refusals, never silence, never another language: `word_gap`
(a word absent from the manifest — e.g. "house" is genuinely not in the
UDHR), `unknown_language`, `not_cached` (without `allowSynthesis`),
`synthesis_drift` (a re-synthesis that no longer matches the manifest's
pinned sha256 is refused, not served).

## Comparative layer

`node scripts/pronunciation-compare.mjs matrix` — inventory distance over
the shared feature space:

```
              eng      fra      spa      rus      arb cmn_hans
eng          0.000    0.029    0.036    0.035    0.059    0.024
fra          0.029    0.000    0.040    0.028    0.053    0.018
spa          0.036    0.040    0.000    0.029    0.032    0.042
rus          0.035    0.028    0.029    0.000    0.048    0.029
arb          0.059    0.053    0.032    0.048    0.000    0.049
cmn_hans     0.024    0.018    0.042    0.029    0.049    0.000
```

Word distance reproduces the ground truth the whole point of the layer:
same-script cognates measure CLOSE, unrelated roots measure FAR.

```
eng/equal    [ˈiːkwəl]      vs spa/igual      [iɣwˈal]      → 0.1771
eng/dignity  [dˈɪɡnᵻɾi]     vs spa/dignidad   [dˌiɡniðˈad]   → 0.2494
eng/rights   [ɹˈaɪts]       vs rus/права      [prˈɑva]      → 0.7314
eng/rights   [ɹˈaɪts]       vs arb/حقوق       [ħqwq]        → 0.7286
```

`node scripts/pronunciation-compare.mjs articles 1` — the same UDHR
Article 1 (same meaning) across all six, phone-sequence distance in the
shared space, coverage 1/1 everywhere.

## Verification

`node --test scripts/pronunciation.test.mjs scripts/pronunciation-compare.test.mjs`
— 15 tests, all passing (8 + 7). No network, no synthesis: the tests read
the committed manifests and the built cache, and skip-with-say on a fresh
checkout exactly as multilingual-priors.test.mjs does. Existing registry
suite unaffected (multilingual-priors.test.mjs 10/10).

The manifest's 72 distinct base phones across all six languages all
resolve in the received feature table (0 unknown in every inventory), and
espeak-ng's own artifacts (cmn tone digits, `-` continuation, `(en)`/`(cmn)`
language-switch marks, the Russian soft-sign residue) are classified as
prosody, never phones — so the inventory never counts a non-phone as an
unknown phone.

## Known limits, disclosed

- **The comparative is a projection, never a verdict.** A distance of 0.17
  between equal/igual means "near-identical phones in the shared feature
  space" — it does not claim either word "is pronounced the same." The
  caller decides what counts as close.
- **One engine's rendering.** Every pronunciation is espeak-ng's; the
  manifest says so on every entry. This is the point for comparison and a
  limit for absolute claims about any one language's real sound.
- **Real human recordings are not vendored.** Wikimedia Commons serves real
  human audio (verified reachable), but per-word live hunting across six
  languages is fragile (unpredictable filenames, ~1s/search); the honest
  committed artifact is the deterministic synthesized manifest, and a human
  audio tier can resolve on top of it later with the same sha256+license
  discipline.
- **The word list is the UDHR corpus, deliberately.** A word absent from
  the Rosetta's own texts is a typed gap, never fabricated — a lookup of
  "house" says so. Broadening to a general word list is a real, separate,
  unbuilt decision (and would need a human-audio tier to stay honest).