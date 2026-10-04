# eot-sidecar.mjs — sample validation and sizing decision (task #7)

Driver: `eot-sidecar-sample.mjs`, re-runnable, not a committed regression
test (this project's own P19/P27 posture: numbers are reported here, not
pinned to fail the moment the corpus grows). Raw output:
`eot-sidecar-sample-results.json`.

## The sample

Every one of the 12 top-level category directories contributes its three
LARGEST files and three SMALLEST non-trivial files (a category with fewer
than six files contributes everything it has) — 58 files total, 12.9MB
raw. Declared, not randomly drawn, for the same reason this project's own
`mine-1-*.mjs`/`asserted-eval.mjs` drivers favour reproducible construction
over a seeded shuffle when the question is "does this handle real
material," including its worst cases, not "what is the population
average."

## Throughput — the sizing question this task exists to answer

Mean 198ms/file, p50 138ms, p90 498ms, max 918ms (the single largest file
in the whole corpus — `16-wordplay`'s 10.1MB guardian-cryptics file).
**Full-corpus projection: 2,204 files × mean ≈ 7.3 minutes, sequential,
one process.** This is not a bottleneck at any excerpt size this pass
considered — `EXCERPT_CHARS` bounds the actual linguistic processing
(splitSentences/extractSurfaces/discoverReferents/relationsFor all run
over the excerpt alone, never the raw file), so a 10MB single-file
document and a 4KB one differ only in the cost of the two whole-body
regex passes (`stripContainer`, `blankCatalogLines`) — both still under a
second even at 10MB.

**Decision: `EXCERPT_CHARS` stays at 8000.** No throughput reason to
shrink it (nothing is slow); no measured reason to grow it blindly either
— the real failures found below are about excerpt POSITION, not excerpt
SIZE, and inflating the number to fit one specimen is exactly the
tuning-against-a-case this project's own CLAUDE.md forbids ("never tune a
parameter by checking what it does to a golden's own score" — the same
discipline, aimed at a sizing decision instead of a threshold).

## Gates, over the sample

`{"clean": 49, "empty": 8, "gapped_script": 1}` — 84% clean, 14% empty, 2%
script-gapped. `catalogDominated: 4/58`. `script gaps:
{"script_mostly_without_case": 1}` (a Quran fixture in Uthmani Arabic
script, correctly gated before any candidate edge reached admission).

## Two real, disclosed anomalies — named for task #9's audit, not fixed here

**Front-matter dominance: a long table of contents starves the excerpt.**
`01-literature-books/gutenberg/pg135_Les_Mis_rables__French_.txt` (3.3MB,
and — a SECOND corpus-integrity specimen alongside the already-known
pg67098/Winnie-the-Pooh case — this file is Isabel Hapgood's ENGLISH
translation of Hugo despite its path claiming French) reads `empty`.
Traced by hand, not assumed: this file carries no Gutenberg START/END
marker at all (`bodyOffset: 0` is correct — there is nothing to strip),
and its own table of contents runs from raw offset 398 to 21,623 — the
first real narrative sentence ("In 1815, M. Charles-François-Bienvenu
Myriel was Bishop of D——") does not begin until byte 21,623, nearly three
times past the 8,000-character excerpt window. Widening `EXCERPT_CHARS`
to fit this one book would be the forbidden move named above; the real
fix is structural — detecting and skipping a front-matter table of
contents (a general shape: a long run of short lines matching a repeated
heading pattern) before excerpting, not a bigger flat window for
everyone. Not attempted here — real, scoped work for the audit.

**The identical shape, one register over: an HTML document's own head
block.** `09-source-code/ziglang_zig/doc_langref.html.in.txt` (343KB)
reads `empty` for the same underlying reason — its first 8000 characters
are `<!doctype html>`/`<meta>`/base64-encoded favicon data, with no prose
sentence anywhere in the window. A different surface, the same root
cause: the reader assumes real content sits at byte 0, and some
documents' own front matter says otherwise.

## What this task closes, and what it hands off

Sizing is decided (8000, on throughput grounds, positively rather than
by default). The admission gate is confirmed working correctly across a
real, declared sample spanning all 12 categories, including its
worst-case single file (10MB) and its known problem shapes (catalog
boilerplate, a caseless script). Two real front-matter-position anomalies
are named, traced to their root cause, and handed to task #9's
adversarial audit rather than patched ad hoc under this pass's own time
budget — consistent with this project's standing rule that a fix earned
by reasoning about ONE specimen is not yet a fix earned by testing
against several.
