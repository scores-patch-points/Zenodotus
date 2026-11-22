# the mind — a discrete pharos

A pharos instance capturing the reading / reasoning / inducing / eliminating /
generating capacities, grounded in Zenodotus and the priors, at the state of
2026-11-22. It is the starting place: boot from here, and it merges into main by
union (pharos merge is grow-only, one file per writer, dedup by id).

## What is woven (25 entries)

- **frame** — `mind`
- **kinds** — `source` (NUL·Figure), `corpus` (NUL·Pattern), `prior` (SIG·Ground),
  `capacity` (INS·Figure), `finding` (REC·Pattern)
- **corpus / sources** — Zenodotus (the living corpus), the hyperlexicon
  (Wiktionary senses + relations), the janus parsers (80 parsers / 79 tokenizers)
- **capacities** — read (janus/khora → EOT cells, kārakas, tree), reason
  (reasoning-core constraint solver; mechanical cell-distance; predictive
  DEF/EVA/REC), induce (kāraka/codec-cell kind induction), eliminate (DMD/apoha),
  generate (linearize meaning→text), search (state-space BFS + binding)
- **findings** — the induced kinds from a Dracula slice, the rope/jug/zebra
  solutions, the GL laws, the elimination demonstrations

## Boot from it

```
import { open, entries, weave } from "pharos/lib/pharos.mjs";
const h = open("mind", { dir: "mind-pharos", writer: "<you>" });
entries(h);   // the 25 woven entries — this is the starting state
```

## Merge to main

```
merge(open("main", { dir: "<main-pharos>" }), open("mind", { dir: "mind-pharos" }));
```

The log is append-only; unweaving is a typed `retract`, never an erase. The
entry ids are content-addressed, so a re-weave of the same content is a no-op
and a merge of the same entries is a union.
