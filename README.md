# live_priors

A living corpus of source texts, organized by the 17 categories from [`eoPriors/docs/corpus-sources.md`](https://github.com/clovenbradshaw-ctrl/eoPriors/blob/main/docs/corpus-sources.md), plus one added category (children's books, `18-`) for bootstrapping LaVar's reading system.

This repo **pulls** the sources — not just catalogs them. Texts are stored as documents with fetch scripts for every API-accessible source.

**Every document carries at least 600 words**, with one deliberate exception: see
[The 600-word floor](#the-600-word-floor) below.

## What's Here

2,100+ documents. The largest section is government and legal, which holds official texts
published by institutions in 28 jurisdictions. The newest section, `19-organic-community/`,
holds 297 real human chat-log documents (SMS, IRC, email, Weibo) in English, Chinese,
German, Spanish and Italian.

| Directory | Content |
|---|---|
| `01-literature-books/` | 43 complete works (Gutenberg + GITenberg) |
| `02-encyclopedic/` | 54 articles (Wikipedia, 1911 Britannica) |
| `05-academic-papers/open-access-books/` | 94 chapters from open-licensed scholarly books |
| `05-academic-papers/ntrs-white-papers/` | **97 public-domain NASA white papers** (NTRS technical reports), each with an eoreader7 CV look-loop sidecar (`*.cv.md`) and a `*.structure.json` outline |
| `06-government-legal/world-legislation/` | **449 statutes and codes from 28 jurisdictions** |
| `06-government-legal/un-udhr/` | **516 translations of the Universal Declaration of Human Rights** |
| `06-government-legal/` | **965 documents** — 449 statutes from 28 jurisdictions + 516 UDHR translations. *(The 255 CIA World Factbook profiles were removed 2026-10-08 to balance the corpus's empire-POV weight; see `manifests/retired-factbook.json`.)* |
| `09-source-code/` | 31 repos in two tiers: 20 landmark + 11 security-audited at pinned commits, content-vetted (`VETTING.md`) |
| `14-holy-texts/` | 492 files — whole books of the Tanakh, Greek NT, Qur'an and Pali canon; plus **upanishads/** and **bhagavad-gita/** in Sanskrit (IAST) added 2026-09-13 |
| `15-western-canon/folger-shakespeare/` | Bulk text + XML + 15 individual plays |
| `11-multi-language/` | Gutenberg non-English + Wikipedia in 16 languages + War and Peace (en/ru/fr); **greek-originals/**, **latin-originals/**, **sanskrit-originals/**, **japanese-originals/**, **arabic-originals/** added 2026-09-13 as original-language texts of the St. John's canon (Homer through Ibn Khaldūn) — see `digested/STJOHNS-CANON-GAP-ANALYSIS.md`; every one carries a `*.structure.json` byte-structure outline (see `digested/STRUCTURE-FROM-BYTES-FINDING.md` and POLICIES.md LP20–LP21) |
| `11-multi-language/mesopotamian/` *(2026-10-08)* | **10 Sumerian compositions** — the Gilgameš cycle, Enki & Ninḫursaĝa, Enki & Ninmaḫ, Inana's Descent, the Sumerian King List, the Lament for Urim — ETCSL transliteration with interlinear English |
| `11-multi-language/mesopotamian/amarna-letters/` *(2026-10-08)* | **All 305 Amarna letters** — the 14th-c.-BCE Akkadian diplomatic correspondence between Egypt and its vassals — aggregated into 19 per-sender-city documents (Byblos/Rib-Hadda 71, Amurru 18, etc.), transliteration + English, CC BY-SA (ORACC `aemw/amarna`) |
| `11-multi-language/avestan/` *(2026-10-08)* | **The five Gathās of Zarathustra** (Old Avestan + English; the two short Gathās aggregate per the Sappho rule), from avesta.org |
| `11-multi-language/egyptian/` *(2026-10-08)* | **5 public-domain translations** — Budge's Book of the Dead, the Instruction of Ptah-Hotep (~2400 BCE), Petrie's Egyptian Tales, Budge's literature and afterlife volumes. *Territory classed half-open:* the hieroglyphic originals are images and the transliteration standard (TLA) is gated, so these land as corpus text, not as held original-language canon |
| `11-multi-language/chinese-originals/` *(BCE classics, 2026-10-08)* | Analects 論語, Zhuangzi 莊子, Yijing 周易 (65 hexagrams), Shijing 詩經, Sunzi 孫子兵法, Mengzi 孟子, Han Feizi 韓非子 — the pre-0 Chinese canon in the original, joining the held Tao Te Ching, Mozi, Xunzi, Shiji |
| `11-multi-language/latin-originals/` | 21 BCE-era original-language works: Caesar's Bello Gallico, Lucretius, Catullus, Cicero (Catilinam, De officiis, Tusculanae, De natura deorum, Epistulae ad Atticum), Virgil (Aeneid/Eclogae/Georgica), Horace's Carmina, Ovid (Amores, Heroides, Ars amatoria, Metamorphoses), Plautus, Terence, Sallust |
| `18-childrens-books/` | Pilot pull: 38 books across 17 languages (Global Digital Library + StoryWeaver, African Storybook) — see [`18-childrens-books/ATTRIBUTION.md`](18-childrens-books/ATTRIBUTION.md) |
| `11-multi-language/concepticon/` | Cross-linguistic concept backbone: 4,165 concept sets linking ~160 fieldwork concept lists across languages (CC BY 4.0) |
| `11-multi-language/parallel-classics/` | 7 public-domain works (Alice in Wonderland, Pinocchio, Grimms' Fairy Tales, Robinson Crusoe, Gulliver's Travels, Faust Part 1, Perrault's Fairy Tales), 31 editions across 8 languages, same work independently translated — for direct cross-language comparison, "Rosetta Stone" style |
| `19-organic-community/` | **297 real human chat-log documents** — unedited human typing with typos, slang and informal register across eras and languages: NUS SMS (en/zh, Singlish), CoSEM (Singapore English messages 2016-2022), Ubuntu IRC logs (en/de/es/it, 2004-2015), Enron workplace email (en, 1998-2002, public domain), LCCC Chinese conversation (zh). See [`19-organic-community/README.md`](19-organic-community/README.md) |
| `20-first-person-voices/gutenberg/` *(2026-10-08)* | **118 public-domain works by women and people of colour**, global-south focus, across time — resolved live from the Gutenberg catalog (`fetch-gutenberg-voices.mjs`). African American (Chesnutt, Dunbar, F. E. W. Harper, W. W. Brown, Du Bois, McKay, Hughes, Toomer, Cullen, Hopkins, Fauset, Hurston, Ida B. Wells, Truth, Mary Prince, H. E. Wilson); Indigenous (Zitkala-Ša, Eastman); global south (Rizal, Machado de Assis, Gibran, Tagore, Naidu, Toru Dutt, Darío, Martí, Sor Juana, Gorriti, Schreiner, Mansfield); women of the North (Austen, Shelley, Brontës, Gaskell, Eliot, Alcott, Stowe, Chopin, Wharton, Cather…) |
| `pointers/` *(2026-10-08)* | **Sources the corpus cites but does not hold** — a citation + working fetch recipe for copyrighted/gated works, resolved on demand into a git-ignored local cache (never committed, never served). Seeded: Ugarit (Baal Cycle), the Pyramid Texts, Nag Hammadi, the Zohar, and (2026-10-08) 16 atrocity/global-south oral-history archives (Voice/Vision Holocaust, Boder, South African TRC, Palestinian Nakba, Partition 1947, DC-Cam, Nanjing, Rwanda, Colombia CNMH, Guatemala CEH, Humanizing Deportation…). Policy = **LP22**. See [`pointers/README.md`](pointers/README.md) |
| `20-first-person-voices/oral-histories/` *(2026-10-08)* | **Holodomor survivor testimony** — the US Commission on the Ukraine Famine Oral History Project (1932-33 famine; English translations; US G.P.O. 1990 = public domain), 3 volumes / ~1.0M words. `fetch-holodomor-oral-histories.mjs` |
| `21-anti-colonial/` *(2026-10-08)* | **The counter-weight to empire** — 21 public-domain works by the colonized and dispossessed speaking back: Kartini (*Letters of a Javanese Princess*, Indonesia), Sun Yat-sen, Lala Lajpat Rai (×3, India), Sol Plaatje (*Native Life in South Africa*), J. J. Thomas (*Froudacity*, Trinidad), Aguinaldo + Mabini (Philippines), José Martí (Cuba); indigenous — William Apess, E. Pauline Johnson (×3, Mohawk), Simon Pokagon; African-American — David Walker's *Appeal*, Nat Turner, Paul Cuffe, J. W. C. Pennington, N. F. Mossell, J. W. Cromwell. ~873k words. `fetch-counter-archive.mjs` |
| `22-commons/` *(2026-10-08)* | **Collectivist power and the governing of the commons** — Kropotkin (*Mutual Aid*, *The Conquest of Bread*, *Fields, Factories and Workshops*), Proudhon (*What is Property?*), Boyle (*The Public Domain*), Seebohm (the English village commons), and **Elinor Ostrom's 2009 Nobel lecture** on polycentric governance — the commons cases she learned from. `fetch-commons-healing.mjs` |
| `23-healing/` *(2026-10-08)* | **Traditions of self-care and healing** — Culpeper's *Complete Herbal*, Fernie's *Herbal Simples*, Buchan's *Domestic Medicine*, the *Ethnobotany of the Ojibwe Indians*, and the Sanskrit Ayurveda (*Caraka-Saṃhitā*, Vāgbhaṭa's *Aṣṭāṅgahṛdaya*). `fetch-commons-healing.mjs` |
| `24-global-literature/` *(2026-10-08)* | **The global-south canon in original languages** — a mass-pull of the Gutenberg corpus by language: Spanish (704), Portuguese (548), Chinese (413), Catalan (89), Esperanto (106), Tagalog (51), Japanese, Afrikaans, Hebrew, Telugu, Gujarati, Arabic, Persian, Sanskrit and more — **1,893 works / ~103M words**, held in their own scripts. Built by `fetch-global-literature.mjs` to counter-weight the empire block. |

See [`SOURCES.md`](SOURCES.md) for the complete catalog with pull status, and
[`06-government-legal/ATTRIBUTION.md`](06-government-legal/ATTRIBUTION.md) for the rights notice
each publishing institution requires.

## Real Human Chat Logs (`19-organic-community/`)

The one register the rest of this corpus never carries: **people typing at
each other** — text messages, IRC support channels, workplace email — with
the typos, slang, dropped articles and keyboard fumbles of real typing.
Fetched by `scripts/fetch-chat-logs.mjs` from five already-public research
corpora spanning 1998-2022 in English, Chinese, German, Spanish and Italian.
Short messages are aggregated into documents that clear the 600-word floor
(the same consolidation `consolidate-media-catalogs.mjs` applies to media
metadata); nothing is rewritten, and everything fetched but rejected is
recorded in `manifests/chat-logs-manifest.json`.

## Government & Legal

`06-government-legal/` holds 1,220 documents from institutions around the world:

- **National legislation** — Andorra, Argentina, Austria, Belgium, Chile, Colombia, Czechia,
  European Union, Finland, France, Germany, Greece, Italy, Latvia, Liechtenstein, Luxembourg,
  Netherlands, Norway, Poland, Portugal, Romania, Slovakia, Spain, Sweden, Switzerland,
  United Kingdom, United States, Uruguay. Each file keeps the publisher's YAML frontmatter:
  official source URL, publishing department, publication date, in-force status.
- **UN Universal Declaration of Human Rights** in 516 languages, as encoded by OHCHR.
- **CIA World Factbook** — removed 2026-10-08 (US intelligence survey; retired to balance the corpus's empire-POV weight).

Rights vary by publisher. Official legal texts are outside copyright in most of these
jurisdictions (Germany §5 UrhG, US 17 USC §105, Poland, Czechia, Sweden, Switzerland and
others). The UK (OGL v3.0), EU (CC BY 4.0), France (Etalab v2.0) and Spain publish under open
licences that require attribution, and those notices are carried in `ATTRIBUTION.md`.

Converted Markdown is not the authentic legal instrument — only the text published in the
issuing institution's official gazette is authoritative.

## The 600-word floor

`scripts/enforce-min-words.mjs` is the corpus quality gate:

```bash
node scripts/enforce-min-words.mjs           # audit: what is under the floor
node scripts/enforce-min-words.mjs --prune   # delete it, and record what went
node scripts/enforce-min-words.mjs --min 800 # a different floor
```

The pass that introduced the floor removed 886 fragments — museum accession records, arXiv
abstracts, single scripture verses, one-paragraph gazette notices — and replaced them with the
whole works they were fragments of: complete books of the Tanakh rather than verses, complete
novels rather than excerpts, statutes rather than summaries. Media metadata, which is
legitimately short per item, was folded into one catalogue document per collection by
`scripts/consolidate-media-catalogs.mjs` rather than discarded.

Word counting is script-aware, so Chinese, Japanese, Korean and Thai documents are measured by
codepoint rather than split on spaces. `manifests/min-words-audit.json` records every removal.

**`18-childrens-books/` is exempt.** A picture book can be a complete work at 60 words; the floor
exists to catch fragments standing in for a whole work, not to reject a genre that is naturally
short. `enforce-min-words.mjs`'s `EXEMPT_DIR` pattern skips this category entirely.

## Running the Fetchers

```bash
# Fetch everything automatable, then build catalogues and enforce the floor
node scripts/run-all.mjs

# Fetch specific sources
node scripts/run-all.mjs --only gutenberg sefaria quran

# World legislation and UDHR (optionally a subset of jurisdictions)
node scripts/fetch-world-government.mjs
node scripts/fetch-world-government.mjs --jurisdictions de,fr,uk

# Whole books, works and chapters that replaced the pruned fragments
node scripts/fetch-replacements.mjs --only scripture

# NASA public-domain white papers, extracted through the eoreader7 CV look loop
# (pdftotext fast face + OpenCV/Tesseract on triggered pages). Set
# VISUAL_DETECT_PYTHON to a python with opencv-python-headless + numpy for the CV leg.
node scripts/fetch-ntrs-papers.mjs --limit 40

# Download actual media files
node scripts/download-archive-media.mjs --category classical-music --limit 5
```

## eochat Consumption

eochat reads this corpus via `live-priors-source.js`:

```
live_priors/
  └── [numbered category folders]
        └── [source subfolders]
              └── [actual text files]
```

The `livePriorsTree()` function exposes the directory structure for browsing. `readLivePrior(relPath)` reads file contents by relative path. eochat never ingests these files directly — it reads them on demand when a user navigates to them in the Priors tab.

Directory layout is unchanged by the government expansion — `world-legislation/` adds one
subfolder per jurisdiction, which browses the same way as any other source subfolder.

**Two-layer consumption model:**
- **eoPriors/priors/** — JSON artifacts (corpus-prior.json, coref/*.json) ingested into the engine's priors pool via `priors-source.js`
- **live_priors/** — Raw corpus texts browsable via `live-priors-source.js`, never auto-ingested

The boundary matters: a prior is witness-tier knowledge ABOUT a corpus, not evidence FROM one.

## Multi-Dimensional Prior Similarity

The `src/priors-similarity.js` module implements three-axis similarity navigation:

| Axis | Metric | What it captures |
|---|---|---|
| **Phasepost** | Asymmetric compression (DL) in 27-cell space | *How* content is structured |
| **Surprise** | KL divergence from corpus prior | *How expected* content is |
| **Entity** | Jaccard overlap on coref surfaces | *Who* content is about |

### Why Asymmetric Compression?

Cosine is symmetric; compression isn't:
- **DL(content | prior)**: "is this content an instance of what the prior knows?"
- **DL(prior | content)**: "does this content reveal the structure the prior gestured at?"

The **asymmetry** = `DL(prior|content) - DL(content|prior)` is the signal cosine loses.

```js
import { queryPriors, compressionDistance } from './src/priors-similarity.js';

const result = await queryPriors({
  measurements: { /* 27-cell phasepost measurements */ },
  textStats: { bins: { veryLow, low, mid, high, veryHigh }, mean },
  surfaces: 'raw text or Set of entity surfaces',
}, '/path/to/eoPriors/priors', {
  weights: { phasepost: 0.4, surprise: 0.3, entity: 0.3 },
  topK: 10,
});
```

## Relationship to eoPriors

- **eoPriors** = "how we measure what we know" (ledger, compression, projection)
- **live_priors** = "what we know" (the actual texts)
