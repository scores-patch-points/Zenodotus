# live_priors — Pull Status

This file tracks **what has been pulled** into this repo. The canonical source catalog with URLs, access methods, and legal status is [`eoPriors/docs/corpus-sources.md`](https://github.com/clovenbradshaw-ctrl/eoPriors/blob/main/docs/corpus-sources.md) — this file does not duplicate it.

## The 600-word floor

Every document in this corpus carries at least **600 words**. `scripts/enforce-min-words.mjs`
measures the corpus and, with `--prune`, deletes anything under the floor; the fetchers apply
the same check before writing, so nothing under it comes back. 886 fragments were removed in
the pass that introduced the floor — image accession records, paper abstracts, single verses,
one-paragraph gazette notices — and replaced with the whole works they were fragments of.

Word counting is script-aware (`countWords()` in `scripts/lib/corpus-util.mjs`): Han, Kana,
Hangul and Thai text is counted per codepoint rather than split on spaces, so unspaced scripts
are not mistaken for empty documents.

## Pull Status by Category

| Category | Sources | Pulled | Notes |
|---|---|---|---|
| 1. Literature | 6 | ✅ 43 complete works | 23 via Gutenberg + 20 via GITenberg (War and Peace, Ulysses, Jane Eyre, Crime and Punishment, Federalist Papers, Wealth of Nations …) |
| 2. Encyclopedic | 4 | ✅ 54 articles | Wikipedia + 1911 Britannica |
| 3. OER/Textbooks | 8 | ⬜ | No bulk APIs available |
| 4. Pre-aggregated | 2 | ⬜ | Common Pile/RedPajama require local HF datasets |
| 5. Academic papers | 4 | ✅ 94 book chapters + **97 NTRS white papers** | arXiv/PLOS abstracts removed (under the floor); replaced with open-licensed monographs + NASA technical reports — see below |
| 6. Government/Legal | 6 | ✅ **965 documents** | 449 statutes from 28 jurisdictions, 516 UDHR translations (all re-read for reading-pipeline blind spots — see POLICIES.md LP8). The 255 CIA World Factbook profiles were **removed 2026-10-08** (user direction) to begin balancing the corpus's empire-POV weight — see `manifests/retired-factbook.json` and GREAT-SCROLL.md |
| 7. Images/Media | 4 | ✅ 2 collection catalogues | NASA (185 items) and Met Museum (140 items) folded into catalogue documents |
| 8. News | 4 | ⚠️ 1 document | Wikinews items were under the floor; wikinews.org is not reachable to refetch |
| 9. Source Code | 31 | ✅ 89 files across 31 repos | Two tiers: 20 landmark repos + 11 security-audited repos at pinned commits, all vetted (see `09-source-code/VETTING.md`) |
| 10. Audio/Music | 5 | ✅ 13 collection catalogues | Per-item metadata folded into catalogues; 2 collections were too thin even consolidated |
| 11. Multi-language | 8 | ✅ 96 texts (+107 pre-year-0, 2026-10-08; +19 Amarna +3 Ovid BCE, 2026-10-08) | Gutenberg non-English + Wikipedia in 16 languages + War and Peace (en/ru/fr), content-verified, at `war-and-peace/` — see POLICIES.md LP7; the `gutenberg-non-en/` row above it is 20/20 mislabeled, see `digested/CORPUS-INTEGRITY-FINDING.md`. Added 2026-09-09: `concepticon/` (3 files, the cross-linguistic concept-ID backbone, CC BY 4.0) and `parallel-classics/` (31 texts, 7 public-domain works each independently translated into several languages — every download's own declared header is checked against what it was fetched for before being saved, see `scripts/fetch-parallel-classics.mjs`). **Added 2026-10-08 — the pre-year-0 expansion.** New subdirectories `mesopotamian/` (10 Sumerian compositions: Gilgameš cycle, Enki & Ninḫursaĝa, Enki & Ninmaḫ, Inana's Descent, Sumerian King List, Lament for Urim — ETCSL transliteration + English interlinear) and **`mesopotamian/amarna-letters/`** (19 per-sender-city documents, all **305 Amarna letters** — the 14th-c. BCE Akkadian diplomatic correspondence, transliteration + English, CC BY-SA via ORACC aemw/amarna, enumerated live from the ORACC pager), `avestan/` (the five Gathās, Avestan + English, avesta.org), `egyptian/` (5 PD translations: Budge Book of the Dead, Ptahhotep, Petrie Egyptian Tales, Budge literature — territory honestly classed half-open until a transliteration source is reachable). Inside the existing originals dirs: `greek-originals/` +62 (Hesiod Theogony + Works and Days, Homeric Hymns, Xenophon Anabasis, Euclid Elements, and the Septuagint Rahlfs — 60 books enumerated live from Wikisource's own Rahlfs category, the Psalms aggregated), `latin-originals/` +21 (Caesar, Lucretius, Catullus, Cicero incl. Epistulae ad Atticum, Virgil, Horace, **Ovid incl. Amores + Heroides + Ars amatoria**, Plautus, Terence, Sallust), `chinese-originals/` +7 (Analects, Zhuangzi, Yijing, Shijing, Sunzi, Mengzi, Han Feizi), `sanskrit-originals/` +1 (Atharvaveda, GRETIL IAST). All over the 600-word floor with `*.structure.json` outlines; drivers in `scripts/fetch-{latin-bce,greek-bce,mesopotamian,amarna,chinese-pre0,egyptian,avestan,sanskrit-pre0}.mjs`; see GREAT-SCROLL.md 2026-10-08 entries |
| 12. Non-Western Music | 5 | ✅ Great 78 catalogue | Other sources not yet pulled |
| 13. Mysticism | 3 | ⬜ | Cloudflare blocks sacred-texts.com |
| 14. Holy Texts | 10 | ✅ 492 files | Whole books: Tanakh (38), SBLGNT (23), Qur'an by sura (81), Pali suttas (186) + earlier pulls |
| 15. Western Canon | 8 | ✅ 18 files | Folger Shakespeare bulk + individual plays. CCEL extracts were under the floor and were removed |
| 16. Organic/Community | 10 | ⬜ | Ganjoor not yet scripted. StoryWeaver and African Storybook are pulled, but as children's books, not organic/community text — see category 18 below |
| 17. Formal Algebraic | 11 | ⬜ | All catalogued, none fetched (PDFs/images/specialized formats) |
| 18. Children's Books *(added, not in the original 17)* | 3 | ⚠️ 38 documents, pilot | Global Digital Library + StoryWeaver (merged platform) and African Storybook, across 17 languages. Bloom Library not pulled — gated on Hugging Face, needs a human to accept terms and supply a token. Exempt from the 600-word floor — see `18-childrens-books/ATTRIBUTION.md` |
| 19. Organic/Community — real human chat *(added, not in the original 17)* | 5 | ✅ **297 documents** | Real, unedited human typing — SMS, IRC support chat, workplace email, Weibo conversation — in en/zh/de/es/it. See `19-organic-community/README.md` and `ATTRIBUTION.md` |

**Total:** 3,071 documents scanned by the floor gate, **2,997 at or above** the 600-word floor (including **297 real-human chat-log documents** in the new `19-organic-community` register, added 2026-10-01), plus 38 children's books exempt from the floor. The remaining 74 under-floor files are pre-existing and are pruned by `run-all.mjs`'s build step.

## Fetched Content Details

### 6. Government & Legal

The largest section of the corpus, and the one most recently rebuilt. It previously held nine
Federal Register abstracts; it now holds documents published by institutions in 28
jurisdictions plus two multi-country instruments.

- **world-legislation/** — 449 statutes, codes and regulations, one directory per jurisdiction:
  Andorra, Argentina, Austria, Belgium, Chile, Colombia, Czechia, European Union, Finland,
  France, Germany, Greece, Italy, Latvia, Liechtenstein, Luxembourg, Netherlands, Norway,
  Poland, Portugal, Romania, Slovakia, Spain, Sweden, Switzerland, United Kingdom, United
  States, Uruguay. Each file carries YAML frontmatter with the publishing institution, official
  source URL, publication date and in-force status.
- **un-udhr/** — the Universal Declaration of Human Rights in 516 languages, as encoded by
  OHCHR. Public domain.
- **world-factbook/** — REMOVED 2026-10-08 (255 CIA World Factbook profiles; a US intelligence-agency survey, the clearest empire-POV block, retired to balance the corpus). See `manifests/retired-factbook.json`.
  from JSON to prose. Public domain (US federal work).

Rights are not uniform. Official legal texts are outside copyright in most of these
jurisdictions (Germany §5 UrhG, US 17 USC §105, Poland, Czechia, Sweden, Switzerland and
others); the United Kingdom (OGL v3.0), European Union (CC BY 4.0), France (Etalab v2.0) and
Spain publish under open licences that require attribution. Every publisher's required notice
is reproduced in [`06-government-legal/ATTRIBUTION.md`](06-government-legal/ATTRIBUTION.md),
which is generated from the manifest.

Legislation is read from the [legalize.dev](https://legalize.dev) mirrors, which convert each
publisher's official XML/HTML feed to Markdown. Converted text is not the authentic instrument;
only the version published in the issuing institution's official gazette is authoritative.

### 14. Holy Texts

Verse- and section-level fragments were replaced with whole books:

- **wlc-tanakh/** — 38 books of the Hebrew Bible, Westminster Leningrad Codex (public domain)
- **sblgnt-books/** — 23 books of the Greek New Testament, SBLGNT via MorphGNT
- **quran-suras/** — 81 suras with Arabic text, transliteration and English translation
- **pali-suttas/** — 186 discourses from the Dīgha and Majjhima Nikāya, Pali with Bhikkhu
  Sujato's English translation (CC0)
- **upanishads/** + **bhagavad-gita/** — the principal Upaniṣads and the Bhagavadgītā in
  Sanskrit (IAST) from GRETIL, added 2026-09-13 with the St. John's canon pull.

### 11. Multi-language — original-language canon (added 2026-09-13)

The St. John's College Western and Eastern canons, fetched in original text
from GRETIL (Sanskrit), Greek/Latin/Japanese/Arabic Wikisource, plus Gutenberg
for the Latin classics already present. See `digested/STJOHNS-CANON-GAP-ANALYSIS.md`
for the full canon cross-reference and every documented blocker; POLICIES.md
LP20–LP21 record the reading-system debt these languages carry.

| subdir | contents |
|---|---|
| `sanskrit-originals/` | Ṛgveda, all 18 parvas of the Mahābhārata, Vālmīki Rāmāyaṇa, Yoga/Nyāya/Vaiśeṣika Sūtras, Sāṃkhya Kārikā, Kālidāsa (Śakuntalā, Kumārasambhava, Meghadūta, Raghuvaṃśa), Lotus Sūtra — IAST from GRETIL |
| `greek-originals/` | Homer, the tragedians, Aristophanes, Herodotus, Thucydides, Plato, Aristotle, Sappho, Pindar, Epictetus, Plotinus — polytonic Greek from el.wikisource |
| `latin-originals/` | Tacitus, Livy, Augustine, Boethius, Anselm, Aquinas (Summa, Prima Pars), Spinoza, Bacon, Copernicus, Newton — Latin from la.wikisource |
| `japanese-originals/` | Genji, Pillow Book, Tsurezuregusa, Hōjōki, Bashō — Classical Japanese from ja.wikisource |
| `arabic-originals/` | al-Ghazālī, Ibn Rushd, Ibn Khaldūn — Arabic from ar.wikisource |

Every fetched source also carries a `*.structure.json` outline
(`scripts/extract-source-structure.mjs`, `SourceStructure@1`) splitting the
raw bytes on the source's own delimiters — see
`digested/STRUCTURE-FROM-BYTES-FINDING.md`.

### 19. Organic/Community — real human chat logs (added 2026-10-01)

The register the corpus had no voice for: **people typing at each other**,
with typos, slang and keyboard fumbles, in the informal registers the formal
sources never carry. Built by `scripts/fetch-chat-logs.mjs`, which aggregates
short messages into documents that clear the 600-word floor — one person's SMS
for a period, one IRC channel-day, one conversation thread, one mailbox's
emails for a month — the same consolidation
`consolidate-media-catalogs.mjs` applies to short per-item media metadata.

| subdir | contents |
|---|---|
| `nus-sms/en/`, `nus-sms/zh/` | Real personal SMS contributed by volunteers (mostly Singapore students) — Singlish, abbreviations, typos. 55,835 English + 31,465 Chinese messages, grouped by contributor-year. Research use; cite Chen & Kan (2013). Contributor IDs are anonymous |
| `cosem/` | Corpus of Singapore English Messages — ~900k lines of online text messages, scrubbed/anonymized, grouped by conversation. Cite Gonzales et al. (2021) |
| `ubuntu-irc/` | Ubuntu IRC support-channel logs served publicly by Canonical, 2004-2015 — two sampled days per channel-year, `#ubuntu`-family plus `-de/-es/-it/-pt/-zh` channels |
| `enron/` | Real workplace emails 1998-2002 released by FERC during the Enron investigation — public domain (CMU 2015 tarball, mirror `SnowZeng/enron_mail`), grouped by mailbox-month |
| `lccc/` | Large-scale Cleaned Chinese Conversation (MIT, thu-coai) — real Weibo/Douban/PTT conversation, 40 batched documents |

Every document carries YAML frontmatter (source, language, period, license,
grouping) and is recorded in `manifests/chat-logs-manifest.json` — including
everything fetched but rejected (404s, under-floor batches, per-source caps).
Rights notes for each source are in `19-organic-community/ATTRIBUTION.md`.

### 5. Academic Papers

arXiv and PLOS were stored as abstracts of 60–200 words. Neither host is reachable from the
build environment to fetch full texts, so the abstracts were removed and the category is now
carried by open-licensed scholarly books, chapter by chapter:

- **open-access-books/d2l/** — *Dive into Deep Learning* (CC BY-SA 4.0)
- **open-access-books/paip/** — *Paradigms of Artificial Intelligence Programming*, Norvig (MIT)

**ntrs-white-papers/ — 97 public-domain scientific white papers from NASA's NTRS** (added
2026-09-22). US federal government works are in the public domain (17 USC §105); every record
is a NASA-published technical report, memorandum, special publication or conference paper whose
own NTRS copyright record marks it public-use (no third-party material, public distribution) —
the per-record determination is carried in each paper's frontmatter and the manifest, never
assumed. Extracted by `scripts/fetch-ntrs-papers.mjs` through the eoreader7 CV look loop: a
`pdftotext -layout` fast face, then pages whose own bytes trigger eoreader7's
`weirdFormattingScore` are rendered and read by the OpenCV box/connector detector
(`visual-detect.py`) with per-region Tesseract OCR. The CV findings land as a `<slug>.cv.md`
sidecar beside each paper (LP1: a reading is never the source); each paper also carries a
`*.structure.json` byte-structure outline like the original-language canon. See the fetcher's
own header and `manifests/ntrs-papers-manifest.json`.

### 7 & 10. Images, Media, Audio

Per-item metadata records — one JSON file per photograph, artwork or recording — were folded
into one catalogue document per collection by `scripts/consolidate-media-catalogs.mjs`. The
information is preserved; the unit of a prior is now the collection rather than the accession
record.

### 9. Source Code

Two tiers, indexed in [`09-source-code/README.md`](09-source-code/README.md):

- **Landmark tier** — 20 repos with source files, licences, and substantive upstream
  documentation: kernel coding style and patch-submission process, the CPython tutorial and
  data model reference, PostgreSQL subsystem READMEs, the Flask and FastAPI tutorials, the
  ripgrep guide, and more. Fetched from branch heads (unpinned) on 2026-08-03.
- **Audited tier** — 11 repos chosen because their security posture is externally documented
  (published third-party audits, formal verification, or a continuous audit process): curl,
  git, OpenSSL, OpenSSH, libsodium, wireguard-go, Kubernetes, s2n-tls, Bitcoin Core, Apache
  httpd, libsignal. Fetched at **pinned commits** with per-file sha256 recorded in
  `manifests/audited-code-manifest.json`; each directory carries a `PROVENANCE.md` with the
  security review record and citations.

The whole section is vetted mechanically by `scripts/vet-source-code.mjs` — trojan-source
bidi controls (CVE-2021-42574), invisible codepoints, credential-shaped strings, private-key
material, binary smuggling, and checksum verification against the pinned manifest — with the
generated record in [`09-source-code/VETTING.md`](09-source-code/VETTING.md) and full results
in `manifests/source-code-vetting.json`. Findings are adjudicated in the open, never deleted.
Nothing in this corpus is executed; these files are read as documents.

### 11. Multi-language additions (2026-09-09)

Two additions to `11-multi-language/`, both aimed at cross-lingual concept
grounding rather than more single-language text — see the proposal that
motivated them for the full reasoning.

- **`concepticon/`** — not text in any language: a shared concept-ID space
  (4,165 concept sets, `concepticon.tsv`) that ~160 independent fieldwork
  concept lists (Swadesh lists, naming tests, elicitation lists) reference,
  so a concept is comparable across those lists' languages without any one
  language's word standing in as the reference point. Fetched from
  [concepticon/concepticon-data](https://github.com/concepticon/concepticon-data).
  **License CC BY 4.0**, verified directly from that repo's own
  `.zenodo.json`/`metadata.json` at fetch time, not assumed. The ~160
  underlying per-language concept lists themselves are not vendored here —
  see `11-multi-language/concepticon/README.md`.
- **`parallel-classics/`** — the same public-domain work, independently
  translated, for direct "Rosetta Stone"-style comparison: 7 works (Alice's
  Adventures in Wonderland, The Adventures of Pinocchio, Grimms' Fairy
  Tales, Robinson Crusoe, Gulliver's Travels, Faust Part 1, Perrault's Fairy
  Tales), 31 editions across 8 languages (en, de, fr, it, nl, fi, hu, es).
  All via Project Gutenberg, ids resolved live against
  [Gutendex](https://gutendex.com) rather than typed from memory —
  `digested/CORPUS-INTEGRITY-FINDING.md` documents that every one of the 20
  hand-typed ids in the older `gutenberg-non-en/` pull turned out to name
  the wrong book once the bytes were read. `scripts/fetch-parallel-classics.mjs`
  checks each download's own declared header against what it was fetched
  for, and separately checks each edition's word count against its work's
  median (catching, live, a LibriVox audio edition whose "text/plain"
  format was a chapter-timing index, not the novel — pg19517, replaced with
  pg52484). Both checks' rejections are recorded in
  `manifests/parallel-classics-manifest.json`, not silently dropped.

Deferred from the original proposal (needs per-translation or per-language
license triage before pulling, same pattern as WikiConv/NCTE): Open
Multilingual Wordnet, Tatoeba, the Parallel Bible Corpus, and multi-language
Aesop's Fables. The Little Prince remains excluded — its French original is
US-public-domain but each translation carries separate copyright.

## Running the fetchers

```bash
node scripts/run-all.mjs                        # everything, then catalogues + prune
node scripts/fetch-world-government.mjs         # legislation, UDHR (Factbook retired 2026-10-08)
node scripts/fetch-world-government.mjs --jurisdictions de,fr,uk
node scripts/fetch-replacements.mjs --only scripture
node scripts/fetch-concepticon.mjs              # cross-linguistic concept backbone
node scripts/fetch-parallel-classics.mjs        # same work, several languages
node scripts/enforce-min-words.mjs              # audit; add --prune to delete
# pre-year-0 expansion drivers (2026-10-08):
node scripts/fetch-latin-bce.mjs                # Caesar..Sallust, Ovid BCE (la.wikisource)
node scripts/fetch-greek-bce.mjs                # Hesiod, Hymns, Xenophon, Euclid, LXX-Rahlfs (el.wikisource, LXX enumerated live from the Rahlfs category)
node scripts/fetch-mesopotamian.mjs             # Sumerian Gilgames cycle etc. (ETCSL, translit + English)
node scripts/fetch-amarna.mjs                   # all 305 Amarna letters, per-sender-city (ORACC aemw/amarna, CC BY-SA)
node scripts/fetch-chinese-pre0.mjs             # Analects, Zhuangzi, Yijing, Shijing, Sunzi, Mengzi, Han Feizi (zh.wikisource)
node scripts/fetch-egyptian.mjs                 # Book of the Dead, Ptahhotep, Egyptian Tales (Gutenberg PD translations)
node scripts/fetch-avestan.mjs                  # the five Gathas (avesta.org, Avestan + English)
node scripts/fetch-sanskrit-pre0.mjs            # Atharvaveda (GRETIL IAST)
# voices sweep (2026-10-08):
node scripts/fetch-gutenberg-voices.mjs         # women + people of colour + global south, across time (resolved live from pg_catalog.csv)
```

## eochat Consumption

eochat consumes this corpus via `live-priors-source.js`:

```js
// Get the directory tree for browsing
import { livePriorsTree } from './server/live-priors-source.js';
const tree = livePriorsTree();

// Read a specific file
import { readLivePrior } from './server/live-priors-source.js';
const result = readLivePrior('06-government-legal/world-legislation/de/GG.md');
```

**Key paths:**
- `livePriorsTree()` — returns the full directory tree with file counts
- `readLivePrior(relPath)` — reads file contents by relative path
- `livePriorsCategories()` — lists the 17 top-level category folders

**Consumption boundary:** eochat reads these files on demand when a user navigates to them in the Priors tab. It does NOT auto-ingest them into the engine. The JSON artifacts in `eoPriors/priors/` are the ingested priors; this corpus is the raw material they were built from.

## Network reachability

The build environment reaches `raw.githubusercontent.com`, `gitlab.com`, `registry.npmjs.org`
and `pypi.org`. Direct government portals — legislation.gov.uk, EUR-Lex, Légifrance, e-Gov
Japan, Wikisource, arXiv, archive.org — are refused at the egress proxy. Every source used
here is therefore read from a mirror on one of the reachable hosts, with the originating
institution recorded per document.

## Pulling Remaining Content

### Requires local execution
```bash
# HuggingFace datasets (run locally)
pip install datasets
python -c "from datasets import load_dataset; ds = load_dataset('common-pile/doab')"

# Gutenberg bulk via rsync
rsync -av aleph.gutenberg.org::gutenberg ./gutenberg-mirror/
```

### Requires browser/manual download
- sacred-texts.com (Cloudflare protected) — use browser or archive.org mirrors
- HathiTrust — apply for research access at hathitrust.org

### Requires API keys
- CText (Chinese Text Project) — free key at ctext.org/tools/api
- CORE (academic papers) — free key at core.ac.uk/services/api/
