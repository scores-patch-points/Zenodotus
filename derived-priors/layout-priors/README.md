# layout-priors

**LayoutPrior@1** — for one app family (quake-list, launch-list, …), the
row layout that recurs across independently harvested comp pages, with
complete provenance per comp and a DMD-bounded gate verdict — never a
hardcoded N.

## Discipline

- Each file states schema, giver, recipe, the gate module + params +
  labels (so anyone re-runs the verdict), the row spec with its standing,
  per-comp provenance (URL, fetch date, bytes, sha256, witness label,
  verbatim evidence with byte offsets), and an append-only `history`.
- Raw comp bytes are hashed at fetch; files live in experiment scratch
  (non-permanent) — the hash + excerpt is the permanent evidence, in the
  facing-page discipline (address · offset · snip).
- Image-looks are a standing NAMED GAP until a local vision model +
  screenshot path exists: harvests are HTML-side only, and every file says
  so. A future image pass appends to `history`, never rewrites it.
- The gate (`ConsensusGate@1`): modes have frequency (recurrence) and
  growth (vanishing check); the Hoeffding bound moves with n; verdicts
  CALLABLE / MORE (+ how many more, or higher-agreement-needed) /
  DISSOLVED / EXHAUSTED. No fixed comp count anywhere.

## Falsifying controls

- A file whose gate labels cannot reproduce its verdict from the stored
  evidence is void.
- A unanimous CALLABLE (K=1) falls to a single rival witness: one
  counter-example re-opens it (copycat risk is disclosed, not checked).
- A family whose apps stop matching its row spec gets a new history entry
  demoting it — priors are append-only, never silently edited.
