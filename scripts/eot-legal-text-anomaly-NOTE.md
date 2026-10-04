# Legal-text anomaly (task #9's audit) — disclosure only, no code change

`eot-sidecar.mjs` read a batch of `06-government-legal/world-legislation/
{cz,gr,fi,uy}/*.md` files as `empty` in the full sweep. Investigated by
task #9's adversarial audit (one investigator, two independent skeptics);
this is the write-up of what they found, kept as a note rather than code
because the honest conclusion is that no general fix exists here — and a
plausible-sounding one was checked and refuted before being written down.

## What was checked, and what falsified the first hypothesis

The investigator's hypothesis — legal statutes open with enumerated-clause
structure that defeats the SVO matcher — was checked against the real
files and mostly falsified: CZ, FI and UY all contain genuine narrative
sentences in their own language (Czech, Finnish, Uruguayan Spanish) within
the excerpt window. Only Greece's opening ("Having regard to...", a
recital list of participial clauses with no finite verb) is genuinely
enumerated-clause-shaped.

Both skeptics independently ran the control the investigator's own report
never tried: sweeping EVERY other file in the same four language
directories, plus (skeptic 2) a dozen further non-English languages
entirely, using the identical English-only recipe (`determiners`/
`negationWords` = English `lang/en`; `verbForms`/`createLemmatizer` =
null). Result: **16-19 of 20 files per language extract edges normally**
(40-70/file average) with zero language-specific vocabulary anywhere in
the pipeline. `discoverRelationVocab` is confirmed language-agnostic by
design — it anchors on capitalized-surface adjacency and a Zipf function-
word filter, never a closed class — so "no vocabulary for this language"
is not the general cause.

**Verdict for CZ/FI/UY: NOT a general defect.** The four flagged files are
ordinary low-surface/referent-density outliers within their own language's
corpus — the SAME capitalized-surface-anchoring sparsity limitation this
project already documents elsewhere (MINE-1, HL) — not a new language gap.
`empty` is correct.

## Greece is a real, separate, still-unexplained anomaly

19/20 sampled Greek files return zero edges **despite** clean script
coverage and high surface counts (up to 145 surfaces/file, more than
CZ/FI ever have) — ruling out both the script-gating explanation and the
sparsity explanation the CZ/FI/UY finding above rests on. Neither skeptic
identified the actual mechanism. Candidate hypothesis, untested: Greek
legal citation punctuation displaces the token immediately after a
capitalized surface (the exact slot `discoverRelationVocab` reads to
nominate a candidate verb) with a citation marker or bracket instead.

**This is filed as an open question, not closed here.** Root cause is
unknown; it requires direct inspection of `extractRelations`'s connector-
adjacency behavior on real Greek legal prose before any fix — or even any
honest disclosure text — can be written. Writing a plausible-sounding
disclosure without that inspection was checked by the audit's own
synthesis and explicitly rejected: it would have mislabeled a genuinely
different failure under the same explanation as the CZ/FI/UY finding.

## Disposition

No code change. `contentWithoutRelations` (added this pass for the
SBLGNT/Greek-New-Testament finding) already surfaces, mechanically, for
every one of these files: real surfaces/referents were found, zero
relations extracted — the reader can already tell "empty because nothing
was here" apart from "empty despite real content," which is most of what
a disclosure would have said anyway. The Greek-specific mechanism stays
open, named here so a future pass does not have to re-run this audit from
scratch to rediscover that CZ/FI/UY are fine and Greek alone is not.
