# derived-priors

Everything under this directory is **computed from** the numbered source
categories (`01-literature-books/`, etc.), never itself a source text. It
does not belong to any of the 17 categories the top-level README describes
— those map to `eoPriors/docs/corpus-sources.md`'s own fixed catalog of
*where a text came from*; this directory is *what was measured about* texts
already here, and grows independently of that catalog.

Each subdirectory is one measurement kind. Every file states its own
schema, giver, and the exact declared parameters that produced it — the
same discipline the source corpus holds itself to (frontmatter, provenance,
pull status) — so a reader can tell a measured number from an asserted one.

## `fold-reading-priors/`

`FoldReadingPrior@1` — for one "read" text, how relevant each candidate
prior in this corpus is to predicting what comes next in it, measured two
independent ways (an order-4 interpolated Witten-Bell mixture-of-experts
share via `the legacy engine.1/packages/engine/generation/belief.js`, and gzip
Normalized Compression Distance) that do not always agree — both are kept,
disagreement included, rather than collapsed to one number.

**This is a declared recipe and a measured verdict, not a resumable model
snapshot.** `belief.js`'s trained layers have no export/import hook, so
"bootstrapping" from one of these files means re-running training from its
`declared_params` and `priors` list (deterministic, reproducible) — not
loading serialized weights. Each file's own `known_limitation` field says
this again in place, since it's easy to assume otherwise from the name.

Each file's `history` array is meant to grow: a later reading session that
re-measures the same read text appends a new dated entry rather than
overwriting the first one, so the record shows how the verdict moved, not
just where it currently stands.

## `code-priors/`

Two measurements over the retained source corpus (`09-source-code/`) and the
running Python engine, both serving eoreader7's code-generation universe:

- **`CodeNamePrior@1`** (`code-name-prior-v1.json`) — for a declared
  function/method/class name, how many DISTINCT real repositories declare it.
  Built from `09-source-code/`'s own bytes (26 files across 16 audited +
  landmark repos, C/Go/Python/TypeScript) by
  `scripts/build-code-name-prior.mjs`. Its job is genericity: tell a
  locally-recurring name (`init`, `main`, `run`) from one that recurs across
  independent real codebases — the same closed-class-from-frequency
  discipline as the prose function-word set, never a hand-typed stoplist.

- **`LanguageLawPrior@1`** (`python-language-law-prior-v1.json`) — the Python
  language's OWN laws, introspected from the running engine (CPython 3.12,
  compiled to WASM as pyodide): keywords, `ast` node kinds (the grammar's
  structure as data), builtins, `sys.stdlib_module_names`, and
  `inspect.signature` over 25 core stdlib modules (493 callables). Built by
  `scripts/build-language-law-prior.mjs`. The engine is the law — this is a
  DERIVED index over it, not a re-definition. Two received tables are
  disclosed as such: operator precedence (the PEG grammar is not
  introspectable data) and the declaration-recipe shapes. Semantics stay in
  the engine (`compile`/`exec`); idioms stay in `CodeNamePrior@1`.
  `lexical.unicodeIdentifiers` records that the identifier law is PEP 3131
  (Unicode XID), not `[A-Za-z_]` — the engine parses Greek/CJK/Arabic/Hangul
  identifiers, so a Western `[A-Za-z]` recipe is the assumption to drop, not
  a fact of the language.

- **`LanguageLawPrior@1`** (`wenyan-language-law-prior-v1.json`) — the same
  schema, for 文言 (Wenyan, classical Chinese), built by
  `scripts/build-wenyan-language-law-prior.mjs` from the Wenyan compiler's own
  reserved-word table (`src/keywords.ts`): 91 keywords (若 if, 為是 while,
  加 +, 書之 print, 術 function), 41 numeral characters, 25 token types,
  grouped by the cube's three faces. The point of this file beside the Python
  one: the "engine defines the law" mechanism is script-agnostic — a language
  whose keywords are Han characters has its laws fetched and indexed exactly
  like one whose keywords are Latin, so the code-generation universe is not
  Western-centric by construction.

The language-law mechanism generalizes to any language whose engine (a
grammar file, a compiler, a runtime) can be fetched or run. Built so far, by
source of law:

- **Engine-introspected** (`build-language-law-prior.mjs`): `python` — the
  full law read off the running CPython (keywords, AST kinds, builtins,
  stdlib signatures, Unicode-identifier law).
- **Compiler-source fetched** (`build-wenyan-language-law-prior.mjs`):
  `wenyan` (文言) — 91 Han keywords from the Wenyan compiler's own table.
- **tree-sitter grammars** (`build-tree-sitter-grammar-prior.mjs`): `c`,
  `cpp`, `java`, `javascript`, `typescript`, `go`, `rust`, `ruby`, `php`,
  `c-sharp`, `bash`, `html`, `css`, `json` — node types (the open/close/nest
  structure) + keywords + operators from each grammar's compiled
  `node-types.json` (grammar.js heuristic fallback for the generated
  grammars).
- **Non-Western script engines** (`build-script-language-law-priors.mjs`):
  `nadesiko` (なでしこ, 38 keywords), `ezhil` (எழில், 46 Tamil keywords + the
  58-letter syllabary), `qalb` (قلب, a Lisp — no reserved words, the Arabic
  alphabet + Arabic-Indic numerals), `aheui` (아희, no keywords — the Hangul
  syllabary is the law: 9 vowel directions + 49 consonant operations).

Still the same build, a different source, for the rest:

| language | script | where its laws live (the engine) | built |
|---|---|---|---|
| 文言 Wenyan | 漢字 | `wenyan-lang/wenyan` `src/keywords.ts` | ✅ |
| なでしこ Nadesiko | 日本語 | `kujirahand/nadesiko3` `nako_reserved_words.mts` | ✅ |
| எழில் Ezhil | தமிழ் | `Ezhil-Language-Foundation/Ezhil-Lang` `ezhil_scanner.py` | ✅ |
| قلب Qalb | العربية | `nasser/---` `peg/qlb.peg` (Lisp) | ✅ |
| 아희 Aheui | 한글 | `aheui/jsaheui` (the Hangul opcode table) | ✅ |
| Hindawi | देवनागरी | the Hindawi Programming System (Indic BASIC) | — |
| Python/Java/JS/Go/Rust/C++/… | Latin + Unicode | own specs/type-checkers; identifier law is Unicode XID, keywords Latin | ✅ (tree-sitter) |

- **`SovereigntyPrior@1`** (`data-sovereignty-prior-v1.json`) — the
  *constructive* face of the ethos: the architectural shapes that protect
  stored/communicated data (end-to-end encryption, local-first, zero-knowledge,
  minimization, consent, deletion/portability, federation), grounded in the
  human-rights instruments that license them — UDHR Art. 12, EU Charter Art. 8,
  Council of Europe Convention 108+, and the CARE/OCAP Indigenous data
  governance principles. A curated index over the named instruments (prose,
  not parseable data — disclosed as received, like the operator-precedence
  table), plus the protocol/crypto/architecture/domain signals the proxy uses
  to recognize a data-sovereignty-relevant task and bias the generative ground
  toward Matrix/E2EE/local-first shapes. The positive twin of the harm-shape
  detection: attract sovereignty, don't just repel robbery.

## `lavar-priors/`

`LaVarPrior@1` — for one text, composition affordances, kind parameters, and
relational structure that a frontier model caught by reading the material
directly, meant to enter the hyperlexicon as given, with LaVar named as the
giver (see `LAVAR.md` at this repo's root — a reading agent that grades a
small structural reader against source material and keeps a curriculum of
its own corrections; the eoreader7-side action items it names live in a
copy at `eoreader7/LAVAR.md`). Every `priors[]` entry carries a byte `address` into
`read.source_path` — a claim with no address behind it is a typed gap here,
not a prior — and a `confidence` note stating how much of the text backs it
(one passage vs. a full read).

`scripts/lavar-prior-scaffold.mjs` does only the part a script can do
honestly: hashing the source file and counting its words, then laying down
a skeleton with `priors: []` and `mistakes: []` for a LaVar session to fill
by hand. It refuses to overwrite an existing file, so a second run can
never blow away hand-written judgment.

`mistakes[]` holds revision records once a `sidecar` (an eoreader7 reading)
exists to disagree with — an empty array here means either a clean read or
no sidecar yet, and the file says which. `history[]` grows the same way
`fold-reading-priors/`'s does: a later pass appends, never overwrites, so
the record shows a verdict moving rather than only where it currently
stands.

This directory holds worked examples ahead of the children's-book corpus
LaVar's ladder (rungs 4 in the directive) is meant to run against; entries
here should not be read as a completed pass over any book.

## `pronunciation-priors/`

`PronunciationPrior@1` — a SOUND-FIRST pronunciation dictionary for the six
Rosetta languages (eng, fra, spa, rus, arb, cmn_hans), wired on user
direction 2026-09-22 to store the WAV of the sound rather than a
transcription (the repo's own surface-is-bytes law applied to sound). Each
manifest is committed — per surface word, the espeak-ng IPA (a DERIVED
annotation), the sha256 pin, and the recipe (voice + word) — while the WAV
BYTES resolve on demand into the gitignored `cache/` via the lookup API
(`scripts/pronunciation.mjs`), re-synthesized deterministically from the
manifest's own recipe and verified against the pin. The comparative layer
(`scripts/pronunciation-compare.mjs`) projects each pronunciation into a
shared articulatory-feature space and measures distance there — the same
surface/meaning split `eot-rich.js` holds for syntax, applied to sound.

Word lists are the distinct forms of the six UDHR texts the Rosetta
(`eoreader7/native/eval/lavar/udhr-rosetta.mjs`) actually reads — a prior
with no consumer is not coverage (LP10). cmn_hans has no whitespace
segmentation, so its unit is the clause (disclosed per entry). Builder,
full design, the lookup API contract, and the comparative measurements:
`scripts/pronunciation-RESULTS.md`.

## `vision-priors/`

`VisionPrior@1` — where the **no-model optics reader (Alhazen,
`scores-patch-points/Alhazen`) keeps its priors**, as a pointer index. Pointers
(never copies) to the reader's source and its byte-identical vendored copy
(`sha256`-pinned, with the holodeck vendor commit), the nested-document reader
(`EODocRead@1`), the 4D video harness, and the live widget; plus the extracted
eye registry, observation schemas, value-format table, scene kinds and layer
roles, and the four learned structures (rule ledger `AlhazenRules@1`, pheromone
board `AlhazenPheromone@1`, online background/salience `AlhazenSalience@1`,
sign vocabulary `AlhazenSigns@1`). Built by
`scripts/build-alhazen-vision-prior.mjs`, which extracts the taxonomies from the
source by regex so they cannot drift. Discipline: pointers pinned by `sha256`;
the falsifying control is a pointer whose hash no longer matches its source, or
an eye/schema name here the source no longer declares. `standing: CANDIDATE`.
