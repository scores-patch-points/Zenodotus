# display-priors — the hang bench

The display rules the holodeck's hang organ (`holodeck/holodeck-hang.js`)
hangs bytes with: which lens reveals the most meaning here — code/graph,
prose/sequence, grid/table — decided per document from its own witness
lines, so that a repo is never read as a novel and a table never as verse.

## The loop these files hold the result of

1. **Encounter** — a new kind of bytes arrives (a repo, a report, a recording,
   a scraped blob) and the current primitives mis-hang it or gap it.
2. **Lesson** — the miss is measured (panel confusion, near-miss rows) and a
   structural change is proposed: a cleaner, a signature, a fallback. No tuned
   numbers: counting, resolution units, and comparative wins only.
3. **Falsify** — the lesson re-runs over the whole panel: past kinds must
   still hang as they did (no regression), the new kind must hang right, and
   a near-miss where it must not fire must stay quiet. `standing`: HELD,
   NARROWED (with the scope it holds in), REFUTED, SEED (proposed, not yet
   measured), plus UNTAUGHT gaps below — kinds with no lesson yet, each naming
   what to encounter first.
4. **Hang** — `readHanging(content)` runs text hangs comparatively (winner
   must strictly beat its runner-up; ties and zero-witness are typed gaps),
   records media hangs from holodeck-media's sniff magic, and lets ordinal
   user directions (`hd:hang-directions`, append-only, superseded never
   edited) override pairwise — every flip attributable on the ingest replay.

**The user's rule for this bench: learned lessons, never pre-learned
everything.** A lesson enters with its encounter (file, panel date, the miss
it fixes) and holds only while the panel says so. Anything without an
encounter stays UNTAUGHT — a typed gap with a look-first pointer, never a
guess dressed as a rule.

## Files

| file | schema | what |
|---|---|---|
| `hang-bench-v1.json` | `HangBench@1` | the lessons: `id`, `primitive` + `params`, `action`, `family` (code-convention / text-convention / extraction-artifact), `covers` (hang ids), `evidence`, `falsification` rows, `standing`, `learnedFrom` (encounter, never assumed) |

## Competency (measured, not asserted)

Run the panel: priors home ground (`01-literature`, `02-encyclopedic`,
`05-academic`, `06-government-legal`, `08-news`, `09-source-code`,
`14-holy-texts`, `16-wordplay`, `18-childrens`) plus wild web pages. A kind
is **taught** when its lesson is HELD and past kinds still hang; **learning**
when proposed; **untaught** when it gaps (the encounter to run first).
