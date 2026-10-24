# Gap ingest spec (2026-10-24)

The shared rules for the pulls approved in `../GAP-SOURCES-PLAN.md`, which cover the South Asia, Africa, Indigenous and first-person gaps (all hosts approved by the user, 2026-10-24). Every fetcher written for them follows this file and the existing convention: `scripts/fetch-dloc-oral-histories.mjs`, `scripts/lib/corpus-util.mjs`, YAML frontmatter at the top of each `.txt`, one manifest per collection. Where this file and `POLICIES.md` disagree, `POLICIES.md` wins.

## Hosts

Only these, plus the CDN hosts their own item URLs point to:

`www.gutenberg.org` (approved earlier) · `dumps.wikimedia.org` · `storyweaver.org.in` · `digitallibrary.io` · `africanstorybook.org` · `repo.sadilar.org` · `www.sahistory.org.za` · `www.projectmadurai.org` · `paperspast.natlib.govt.nz` · `api.digitalnz.org` · `nupepa.org` · `ulukau.org` · `papakilodatabase.com` · `chroniclingamerica.loc.gov` · `www.loc.gov` · `docsouth.unc.edu` · `archive.org` · `www.oldbaileyonline.org`

## Before the first bulk request to a host

1. Read its `robots.txt` and its terms of use, copyright or reuse page.
2. Record what they say in the manifest's `terms_read`: the URL, the date read, and a summary in your own words.
3. If the terms forbid automated download or reuse of the material, stop for that host. Record it under `rejected` with the reason, and report it. Never work around a block, a login or a CAPTCHA.
4. If a host needs an API key or an account, stop and report it. Never create one.

## Politeness

- **User-Agent:** `Zenodotus live_priors corpus builder (non-commercial research)`.
- **Pace:** at least 1 s between requests to a large host and at least 3 s to a small institutional or community host.
- **Method:** prefer bulk dumps to crawling. Fetchers are resumable and keep a cache.
- **Caps:** each fetcher has a size cap. If the cap stops a pull, record it in the manifest's `gaps` as a typed gap (`capped`, with what remains), never silently.

## Each document

A `.txt` file whose first lines are YAML frontmatter, then the text. Every claim says how it was reached. A claim no one states is `unknown`. Never guess, and never copy a folder label onto a document as its standpoint.

```
title:             as the source gives it
author:            as the source gives it, or unknown
collection:        folder path, e.g. 11-multi-language/wikisource/bn
source:            institution or project
source_url:        canonical URL of the item
retrieved:         ISO date
sha256:            of the bytes as received, before any conversion
received_format:   html | wikitext | xml | json | pdf | djvu-txt | txt
license:           the exact statement, or an SPDX id
license_url:       where that statement is
license_tier:      pd | open | nc        (nc = non-commercial terms; kept apart)
attribution:       if the licence requires it
language:          ISO 639-1 code, else 639-3
language_basis:    declared-by-source | catalog | dictionary-coverage
script:            ISO 15924, if not Latin
date:              year or lo-hi interval, or unknown
date_basis:        stated-in-text | source-metadata | unknown
place_by:          where the author or speaker is from, only if the source or the text states it; else unknown
place_about:       the place the text is about, if stated
perspective_by:    the speaker's standpoint, only if the source declares it or the text states it in the first person; else unknown
perspective_about: the standpoint the text is about, if stated
voice:             first-person | reported | about | mixed | unknown
voice_basis:       how that was decided (the source's genre label, a stated narrator, an interview format ...)
translation_of:    the original language and item, if a translation; else none
cultural_note:     the holder's guidance, e.g. on Maori content; else none
privacy_note:      where the holder flags privacy or publicity rights; else none
words:             count
```

The same claims go into the collection's manifest, so readings can use them without re-parsing the files.

- **Floor:** 600 words. Exempt: children's books, and short items the holder publishes as complete, such as a newspaper article or a speech. Each exempt document carries `floor_exempt: <reason>`.
- **Conversion:** HTML, wikitext, PDF and OCR text are converted to plain text on the way in. The sha256 and the URL point back to what was received, and no later reading edits the file (LP1).

## Each collection

- **Folders** (the atmosphere stays the top folder):
  - `11-multi-language/wikisource/<lang>/`
  - `18-childrens-books/{storyweaver,global-digital-library,african-storybook}/<lang>/`
  - `11-multi-language/sadilar/<lang>/`
  - `21-anti-colonial/saho-archive/`
  - `11-multi-language/tamil-originals/`
  - `11-multi-language/niupepa-maori/`
  - `11-multi-language/nupepa-hawaii/`
  - `08-news-current/chronicling-america/<title-lccn>/`
  - `20-first-person-voices/{federal-writers-life-histories,slave-narratives-loc,docsouth-slave-narratives,old-bailey,archive-org,gutenberg,slave-narratives-wpa}/`
  - `11-multi-language/dli/<lang>/`
- **Manifest:** `manifests/<collection>-manifest.json`, shaped `{ source, license, fetched_at, terms_read: [...], pulled: [...], rejected: [...], gaps: [...] }`. A `pulled` row carries `file`, `url`, `sha256` and every header claim.
- **Attribution:** an `ATTRIBUTION.md` in the collection folder, carrying the holder's required notice.
- **Fetcher:** `scripts/fetch-<collection>.mjs` (or `.py`), with a header comment naming the host, the terms read, the cap, and how to rerun it.

## What fetchers do not touch

`SOURCES.md`, `GREAT-SCROLL.md`, `PERSPECTIVES-REGISTER.md`, `POLICIES.md`, other collections' folders and manifests, and git (no commits, branches or pushes). No hyphae. The shared files are updated centrally once the pulls report.
