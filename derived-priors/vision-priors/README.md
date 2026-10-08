# vision-priors

`VisionPrior@1` — **where the no-model optics reader's priors live.** This family
is a *pointer index*, following derived-priors' posture that a prior is a pointer,
never a copy: the corpus does not hold the reader, it cites it.

The reader is **Alhazen** (`scores-patch-points/Alhazen`, a pure-JS,
dependency-free, no-model vision + document reader: binarize, value formats,
form-field/grid reading, image→HTML layout, a multi-eye swarm, 2D layer
extraction, monocular/stereo depth, 4D video trails/tracks, occlusion permanence,
merge/split lineage, online-learned background/salience, and a no-lexicon sign
reader). Its priors are the small taxonomies the code declares — the eye
registry, the observation schemas, the value-format table, the scene kinds, the
layer roles — plus four *learned* structures (the rule ledger, the pheromone
board, the online background/salience learner, and the sign vocabulary).

## What this file is (and is not)

- **Is:** a list of pointers (path + `sha256` + repo + pin) to the reader's source,
  its byte-identical vendored copy, the nested-document reader, the 4D video
  harness and the live widget; the extracted eye/schema/taxonomy names; and the
  corpora the reader was measured on.
- **Is not:** a copy of the reader, and **not** an accuracy claim. Its `standing`
  is `CANDIDATE`. The pointer to `alhazen-vendored` also carries the commit the
  holodeck pin recorded.

## Discipline

Every pointer's `sha256` must match its source. The falsifying control (in the
file): a pointer whose hash no longer matches its source — the reader moved and
this index went stale — or an `eyes`/`schemas` name in this file that the source
no longer declares, breaks the index. The taxonomies are **extracted from the
source by regex**, never hand-retyped, so they cannot drift silently.

## Rebuild

```bash
node scripts/build-alhazen-vision-prior.mjs
# -> derived-priors/vision-priors/alhazen-vision-prior-v1.json
```

Re-run after any change to the reader; the `sha256` pins and the extracted
`eyes`/`schemas` update together. A consumer that wants the reader's own learned
priors collects them from the ledger/pheromone surfaces the reader exposes, not
from here (this family points at them by schema name only).

## Giver

`opencode`, 2026-10-08 (Alhazen build session).
