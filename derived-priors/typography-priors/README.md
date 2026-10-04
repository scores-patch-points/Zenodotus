# typography-priors — Tschichold's bench

The typographic rules eoreader7's setting organ (`eoreader7/native/organs/tschichold.js`,
handle **Tschichold**, DEF·Atmosphere beside Alhazen's `frame.js`) reads bytes with:
how a text was *set* — its wraps, the editor's lineation, speaker labels, sigla,
page furniture, columns, a doubled fetch — read before any word is, so that what an
edition did is never mistaken for what its author said.

## The loop these files hold the result of

1. **Look** — the CV parent sees an original once: a page rendered the way a person
   sees it (`the-fold/pdf-read.js renderPdfPage`), read by Tesseract in TSV mode
   (every word with its box) and, where available, OpenCV boxes and connectors
   (`organs/look.js detectVisualStructure`). `organs/tschichold-look.js lookAtPdf`
   turns the look into layout facts measured against the page itself: columns
   (a gutter the words respect), lines set apart at the edges, centred lines,
   aligned tables (a per-pair binomial placement null at 1/T), figure scatter,
   a thin text layer.
2. **Rule** — each fact is tested against the same page's bytes. A fact the bytes
   reproduce becomes a candidate byte rule (a primitive over bytes plus a table of
   its closed vocabulary); a fact they do not is kept as a typed gap: the look is
   still needed there.
3. **Falsify** — every rule is run on similar-but-not-identical material: another
   work from the same source, the same work from another source, and a near-miss
   where it must not fire. `standing`: HELD, NARROWED (with the scope it holds in),
   REFUTED, NOT_GROUNDED, SEED (measured on extractions, not yet re-grounded).
4. **Read** — `readSetting(text)` runs the bench in two passes (the edition's
   artifacts removed first, then the author's conventions read on the cleaned
   copy), holds every rule with a null to p ≤ 1/T over the T rules run, and
   declares the setting through `frame.js declareFrame` — two readings set
   differently meet the `cross_frame` wall instead of comparing silently.

**The user's rule for this bench: learn from ORIGINALS, never trust prior
extractions.** A `.txt` in this corpus, a `.cv.md` sidecar, a `.structure.json`
are readings made by earlier fetch/convert steps; several are wrong (flattened
GRETIL editions, a doubled Wikisource fetch, page UI rendered as text). Rules are
learned from the source-served bytes and fresh looks; the extractions are what an
`extraction-artifact` rule is *about*, never what a `source-convention` rule is
learned *from*.

## Files

| file | schema | what |
|---|---|---|
| `tschichold-looks-v1.json` | `TypographyLooks@1` | a curated, taxonomically complete map of the omnimodal things to look at — 7 carriers partitioned by the signal's own dimensions (symbols, plane, sound, plane-in-time, timed symbols, space, container), 50 families, 203 leaves; each family names how the CV parent looks at it (`look`), which bytes the learned rule then reads (`bytes`), the ground/figure/pattern questions to answer, and exemplars verified on disk (95, all present at build) or where to acquire one |
| `tschichold-bench-v1.json` | `TypographyBench@1` | the rules: `id`, `primitive` + `params` (the closed vocabulary as a table, never a regex alternation), `action`, `family` (source-convention / extraction-artifact / script-convention / cv-distilled), `covers` (looks family ids) + `grain`, `evidence`, `falsification` rows, `standing`, `learnedFrom` (original URL, look, or convention document), `giver` |

## Competency

`competency(looks, bench)` (organs/tschichold.js) reports, per looks family, the
rules covering it and how they stood: **taught** (a rule HELD or NARROWED on
originals), **learning** (rules, none held yet), **untaught** (a typed gap — the
exemplar to look at first). Separately, **runnable**: a held rule the organ can
execute (its primitive is in `PRIMITIVES`), so similar bytes are read with no look
at all. The swarm's rules carry reference detectors as source text; they teach a
family but run only once ported to a primitive and a table. Competency is measured
off the bench, never asserted.

A rule's `covers` are read off its own words (name, scope, statement) against a
table of each family's vocabulary, matched at word starts — a coarse lexical
assignment, not a judgment of the rule. At compile (2026-09-28): 50 families,
22 taught, 2 learning, 26 untaught; 9 runnable (C1.02, C1.04, C1.05, C1.06, C1.09,
C1.16, C2.01, C2.02, C7.02).

## Givers and standing

The looks taxonomy is **curated** (a received map of what exists, not a
measurement) — giver `eoreader7:organs/tschichold.js`, 2026-09-28. Each bench
rule names its own giver: the original it was learned from (URL + sha256), the
look (document + page + tool), or the convention document (e.g. W3C clreq,
Unicode UAX #29) — and the falsification rows that decide its standing.
