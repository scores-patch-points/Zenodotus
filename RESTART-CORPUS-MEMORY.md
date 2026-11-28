# Restart: the corpus memory (Zenodotus → the pharos)

Written 2026-11-28 at the end of a working session, so the next one can pick up without re-deriving anything. Everything below that is code is on `main` in Zenodotus, khora and penelope; what lives only on a machine is listed with how to rebuild it and the hash to check it against.

## The goal

All of Zenodotus as the reader's priors and as memory a chat can draw on. Three things, all written to the pharos (binary, PHB1): the **corpus** (Zenodotus itself, never restated), the **model** (what reading it changed in the reader), the **activation paths** (byte addresses from the model back into the corpus). The design, stage by stage on the 27-cell cube and by holon level, with every falsifier and result: `INGEST-CUBE.md`.

## Where it stands

| part | state |
|---|---|
| provenance (one `source` entry per document) | built for all 16,953 documents (372.9M words); `manifests/corpus-ingest-manifest.json` |
| which documents the reader can read | `manifests/corpus-reading-plan.json`: 55.5% of words readable English, 29.0% readable with typed gaps, 5.1% no stem, 10.5% no label |
| the day, the night, recall, falsifiers | built and tested on 32 + 8 Old Bailey trials; `scripts/read-corpus.mjs`, `consolidate-corpus.mjs`, `recall-corpus.mjs`, `falsify-corpus-memory.mjs` |
| the full read of the corpus | **not done**: about 40 documents read. Blocked by time (about 14 core-days for the readable English at ~1 KB/s per core) and by where to run it (below) |

Merged along the way: khora #118 (doors take `minCharacters`; the gate writes a read in one bulk write, about 6× faster; DMD renamed apart), #119 (rounds 31 and 32: two opt-in being-ladder rungs, preregistered, results in `identity/novels/NOVELS-RESULTS-ROUND31.md` and `ROUND32.md`), #121 (unknown languages refused, never read as English; the language alias table `LanguageAliases@1`); penelope #18; Zenodotus #15, #17, #18.

## The one decision that unblocks the rest

Where the full read runs. This cloud container restarts when idle and loses its processes and anything not pushed. Options: the owner's machine (attach a folder), a persistent cloud environment with a resumable job, or a declared sample (e.g. `--stride N`). The pharos for the whole corpus is expected to stay under 1 GB in its compact form; measured so far: the gate's own entries about 1.16 MB per 130K characters, the compact index and deposits about 0.24 MB.

## Rebuild what lived only on the machine

Clone the siblings beside each other (`khora`, `janus`, `pharos`, `penelope`, `Zenodotus` in one directory). Environment for every read: `PHAROS_HOME=../pharos KHORA_HOME=../khora KHORA_PRIORS_DIR=../janus/priors`.

1. **Provenance pharos and the checkpoint the other scripts need** (about 15 min):
   `node scripts/ingest-corpus.mjs --dir ../zenodotus-pharos` → `../zenodotus-pharos/ingest-checkpoint.jsonl`.
2. **The Wiktionary pack** (192 MB): `node scripts/wiktionary/fetch-wiktionary-slim.mjs --dir ~/.cache/live_priors/wiktionary`; sha256 `3ca48e8a84125a07279c756e408b219939bb96820851d7ae6d6bb6abb95ba478` (v2; the `v3` and Spanish packs janus's `run.sh` names were never published).
3. **The hyperlexicon** (janus, about 25 min, 6.7 GB), in `janus/scripts/hyperlexicon` with `HL_ZEN=<Zenodotus> HL_OUT=<out>`:
   `python3 -I s0_ground.py`, `python3 -I s1_postings.py`, `node s2_givers.mjs --pack <pack> --giver wiktionary-en --version 2026-10-01-v2`, `python3 -I s3_join.py`, `python3 -I s4_gates.py` (all four gates T1-T4 passed), the manifest and head lines of `run.sh`, `python3 -I s5_compile.py`. Head last built: `997d3665b8acc8bfd9db23ea649ed2e480cd165ffa59cf0ffd38dd6a50af40a3`. No dates input was available (P1 resolutions 0).
   Door: `node janus/native/organs/hyperlexicon/door.mjs --log <out> --zen <Zenodotus> --port 11450`. Its `names` ask answers only dotted forms by design.
4. **Gold for the reader's rounds** (UD English GUM, master): train sha256 `4672bc446b6f516877b023384d2e33952bb012aca052506b197c92ddba67b78e` (the one khora's baseline pins), test `40854b004a1475412c8cdd0ba9536d77e4876467238d8e035718dd33bd29c1e3`, dev `ed955aa38fe62d3c2670701ef92dd577608a9a10c5ee452e6990dc3d1fe3c7ce`. With them, `GUM_TRAIN=<train> node identity/novels/gum-falsify3.mjs E` reproduces the baseline (CONTROL 101/40 on slice E).
5. **The language alias table** (only to rebuild it): the Library of Congress ISO 639-2 table from `datasets/language-codes` (`data/language-codes-full.csv`, sha256 `72735a905b71b9779344429a2a50ce973990e09186cc2a43b927769a1ab635e9`, ODC-PDDL-1.0); `node scripts/build-language-aliases.mjs <csv> [--pharos <dir>]` in khora. SIL's own host was not reachable from the cloud environment.

## Then, to read

- The day, sharded, resumable, whole documents only: `node scripts/read-corpus.mjs --shard i/4 [--only <collection>] [--stride N] [--budget-sec S] [--max-bytes B] --dir ../zenodotus-pharos/model-i`. English only today (labels must resolve to `eng`).
- The night: `node scripts/consolidate-corpus.mjs <model dirs>` (khora `projectField`, floor 2; a new directory each night).
- Recall: `node scripts/recall-corpus.mjs "<cue>" <model and field dirs>`.
- Checks: `node scripts/falsify-corpus-memory.mjs --model <dirs> --field <dir> [--again <dirs>]` (F1 spans open onto their beings, F2 recurrence, F7 reproducibility).
- Rebuild the plan after the corpus changes: `node scripts/plan-corpus-reading.mjs`.

## Open threads

- **No POS prior:** Sepedi (nso), Xitsonga (ts), Tshivenda (ve), siSwati (ss), Sumerian: 5.1% of words. Needs treebanks, if any exist.
- **No language label:** 2,441 documents (10.5% of words), including the CORAAL transcripts (English) and the CRC charter files: their manifests or headers should declare it; a folder name is never taken as a language.
- **Roles judged per perspective** (the next reader round): khora nominates a span's role distribution and collapses nothing; penelope judges it per perspective (author, observer, asker, annotator), reusing `organs/perspective-eva.mjs`, `asker-dmd.mjs`, `minds-ledger.mjs`. The annotator lens is measurable on GUM; the asker lens has no gold yet. Why: rounds 31 and 32 (above) collapsed in the reader and paid in recall.
- **Known, not fixed:** `stemOf("ga")` gives Ga (gaa) through the registry though ISO 639-1 `ga` is Irish; the night does not run the elenchus (it needs a model `ask` and surface matching, both outside the rules); the gate's per-pronoun bindings are most of the bytes (a khora gate change); holodeck and the-fold still vendor the old `dmd.js` names until they re-vendor.
- **Another live session** (khora drafts #117, #120; Zenodotus draft #16, `25-industry-discovery/`, licence not established) is working near these files; its category number and licences are the owner's call.
