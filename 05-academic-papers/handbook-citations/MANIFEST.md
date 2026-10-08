# Handbook-cited sources — manifest

Every outside source `eoreaderhandbook` compares itself to, as inventoried by
the handbook's own citation audit,
[`801-telling-a-rhyme-from-a-borrowing.md`](https://github.com/clovenbradshaw-ctrl/eoreaderhandbook/blob/claude/handbook-articles-live-priors-n6u1o3/801-telling-a-rhyme-from-a-borrowing.md).
That chapter scores every comparison the handbook makes as **Witnessed** (the
project itself names the source), **Unreceived origin, now named** (a
distinctive borrowing with no named source), **Rhymes** (this book's own
noticed resemblance, not a lineage claim), **Named contrast**, or
**Background fact** (not a resemblance claim at all). This manifest adds a
**Status** column: whether the actual work has been pulled into this corpus.

**Coordination note (2026-08-16):** a sibling session ("Grounding tool
development") is independently mapping this same citation set to live_priors
— see [issue #3](https://github.com/scores-patch-points/Zenodotus/issues/3).
This manifest is this session's inventory pass; reconcile before assuming a
row marked `not fetched` here is still unfetched elsewhere.

**Why so few rows are `fetched`:** this environment's egress reaches PLOS,
ACL Anthology, Gutenberg, Wikipedia/Wikisource, arXiv and ERIC, but has no
PDF-text-extraction tool installed (no `pdftotext`, `pdfminer`, `PyPDF2` or
`pymupdf`) — most of the "reachable" rows below are PDF-only pages that
returned HTTP 200 but couldn't be converted to the plain text this corpus
requires. That's recorded per-row rather than silently skipped, per this
repo's own SOURCES.md convention for reachability gaps.

## Fetched

| Work | Cited in | Verdict | Location |
|---|---|---|---|
| Ioannidis, "Why Most Published Research Findings Are False" (2005) | 5.4 | Rhymes | `ioannidis-2005-why-most-published-research-findings-are-false.txt` — full text, CC BY, via PLOS |

## Reachable but blocked on PDF extraction (typed gap, not a silent skip)

| Work | Cited in | Verdict | Known URL | Blocker |
|---|---|---|---|---|
| Fader, Soderland & Etzioni, ReVerb (2011) | 6.2, 6.5 | Witnessed | `https://aclanthology.org/D11-1142.pdf` (HTTP 200) | PDF only, no extractor in this environment |
| Rajpurkar et al., SQuAD (2016) | 6.1 | Witnessed | ACL Anthology D16-1264 | PDF only |
| Chen, Bolton & Manning (2016) | 6.1 | Witnessed | ACL Anthology | PDF only |
| Jia & Liang (2017) | 6.1 | Witnessed | ACL Anthology | PDF only |
| Hermann et al. (2015) | 6.1 | Witnessed | NeurIPS proceedings | PDF only |
| Fillmore, "The Case for Case" | 6.2 | Witnessed | `https://files.eric.ed.gov/fulltext/ED019631.pdf` (HTTP 200) | PDF only |
| Simon, "The Architecture of Complexity" (1962) | 5.5/7.2 | Unreceived origin, now named | Iowa State faculty archive scan (cited in 801, exact URL not given) | PDF/scan, not located precisely |
| Quillian, TLC (1969) | 6.3 | Witnessed | archive.org DTIC AD687746 | `archive.org` returned HTTP 503 from this environment when probed |
| Peirce, *Collected Papers* 2.228, 2.247–249 | 2.1 | Witnessed | colorysemiotica.files.wordpress.com electronic edition | Not attempted — a ~600-word floor document would need scoping (Peirce's Collected Papers is multi-volume; the citation is three short passages) |

## Not attempted this pass (named, not yet pulled)

Everything else the 801 scorecard lists — including the majority verdict,
**Rhymes** (this book's own noticed resemblance, explicitly *not* claimed as
something the project drew on): Morris (1938), Quine "On What There Is"
(1948), Popper, Bender et al. "Stochastic Parrots" (2021), Vaswani et al.
"Attention Is All You Need" (2017), Rubin (1915)/Koffka Gestalt
figure-ground, Bateson *Steps to an Ecology of Mind* (1972 — **Witnessed**,
but a full copyrighted book, not pulled for rights reasons), Shannon (1948,
**Witnessed** — Harvard math dept. hosts a PDF, not extracted this pass),
Kuhn (1962), Cannon (1932), Green & Swets (1966), Commons/Richards/Kuhn
(1982, **Witnessed as convergence**), Hamming (1950), Zurek (2003,
**Witnessed**), Benford's Law / Newcomb (1881) / Benford (1938,
**Witnessed**), Fodor (1983), Baddeley, Chow (1970), Rubin (1976),
Łukasiewicz (1920, **Witnessed**), Montesquieu (1748), Dijkstra, Cockburn
(2005), Nielsen (1994), Brainerd & Reyna, Baars (1988), Dehaene & Naccache
(2001), McClelland/McNaughton/O'Reilly (1995, **Witnessed, in-file**),
Teyler & DiScenna (1986), Lewis et al. (2020), Wu et al. (2022), Gurnee et
al. (2026), Bridgman (1927), Bertrand Meyer (1986), Schank (1972), Schank &
Abelson (1977), Lenat's CYC, MUC (1987–98), Hirschman's Deep Read (1999),
Levesque (2011), TextRunner (2007), NELL (2010), Landauer & Dumais (1997),
Marr (1971, **Witnessed, in-file**), Collins & Loftus (1975), Crestani
(1997), Foote (2000, **Witnessed, in-file**), Hearst (1997), Choi's C99
(2000), Beeferman/Berger/Lafferty (1999), Pevzner & Hearst (2002),
Fortescue/Kershenbaum/Ydstie (1981), Gama/Medas/Castillo/Rodrigues (2004,
DDM), Bifet & Gavaldà (2007, ADWIN), Gutiérrez et al., HippoRAG 2 (2025),
Zwaan & Radvansky (1998), Kintsch (1988), Gernsbacher (1990) — the last two
explicitly marked **not retrieved (paywalled or unreachable)** by the
handbook's own audit already.

The full verdict and evidence for each of these is in
`801-telling-a-rhyme-from-a-borrowing.md`'s scorecard tables — this manifest
doesn't repeat it, to avoid the two documents silently drifting apart.

## Method

Fetched via `journals.plos.org` article HTML (PLOS's `api.plos.org/text`
endpoint used by `scripts/fetch-plos.mjs` returned 404 — deprecated), body
extracted from the `id="artText"` div, tags stripped, entities unescaped.
No script was written for this single fetch; if more PLOS/open-journal
citations get pulled later, the extraction in this manifest's git history
is the pattern to generalize into `scripts/fetch-plos.mjs` rather than
re-deriving it.
