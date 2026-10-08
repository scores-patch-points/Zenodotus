# Pointers — sources the corpus cites but does not hold

A **pointer** is a citation plus a working fetch recipe, not the bytes. Where a
source is public domain or openly licensed, the corpus *vends* it (the bytes sit
in the numbered directories, provenance in the frontmatter). Where the only
usable edition is **copyrighted or gated**, the corpus commits a pointer and the
reader fetches the source **on demand** into a non-distributed local cache
(`.pointer-cache/`, git-ignored).

This is the difference between a library's *card catalogue* and its *shelves*.
Publishing a pointer is publishing a citation; the copy is made locally, by the
reader, for reading — never committed, never served. The bytes never enter the
public repository.

## Why this shape

- **The corpus stays open-only for what it publishes.** A public repo that
  redistributes whole copyrighted works is distribution; a public repo that
  cites where to find them is a bibliography.
- **Fair use is a defense, not a standard** (see POLICIES.md LP1 on the source
  being the received bytes). The corpus does not build its admission rule on a
  defense it would have to raise later. It publishes open material, and points
  at the rest.
- **Provenance travels to the end.** Every pointer names its edition, author,
  year, rights status and address; every on-demand read is anchored by the
  resolver recording URL, byte count and sha256 at fetch time.
- **A pointer is cheap to retract and re-resolve.** If a source moves or a
  rights posture changes, the pointer is edited and the next read follows it —
  there are no cached bytes in the repo to purge.

## The rule

> The corpus **vends** PD/open sources and **points at** copyrighted or gated
> ones. It never re-hosts a copyrighted work, and it never routes around a
> rights status by re-uploading elsewhere.

A pointer is admissible only if its recipe **actually resolves** — a dead
pointer is deleted or corrected, never left as decoration.

## Using a pointer

```bash
node scripts/read-pointer.mjs --list                 # what pointers exist
node scripts/read-pointer.mjs ugarit-baal-cycle      # fetch on demand + read
node scripts/read-pointer.mjs --fetch pyramid-texts  # populate the cache only
node scripts/read-pointer.mjs --verify pyramid-texts # re-fetch, check sha256
```

The cache lives at `.pointer-cache/<id>.txt` with `.pointer-cache/<id>.meta.json`
recording `{url, fetched_at, bytes, sha256, recipe}` — the anchor for whatever
was read.

## Adding a pointer

Add an entry to `pointers/pointers.json`:

```json
{
  "id": "example",
  "title": "...",
  "author": "...",
  "era": "...",
  "language": "...",
  "rights": "copyrighted | gated | pd | cc-by | cc-by-nc | cc-by-sa",
  "rights_evidence": "where the status is stated",
  "vendorable": false,
  "why_pointer": "...",
  "recipe": { "kind": "http", "urls": ["https://..."], "stripHtml": false },
  "expected": { "minBytes": 10000, "sha256": null },
  "falsifying_control": "what proves the pointer wrong"
}
```

`recipe.kind` is one of:

- `http` — GET the listed `urls` directly.
- `wayback` — each `urls` entry is a **live URL**; the resolver rewrites it to
  its raw archive.org Wayback snapshot (`https://web.archive.org/web/<ts>id_/<url>`)
  and fetches that. Use this for a site that is Cloudflare-blocked, offline, or
  otherwise unreachable live: the archive.org copy is the reading source.
- `wayback-index` — `index` is a live index URL; the resolver fetches its
  Wayback snapshot, follows every link matching `linkPattern` (skipping
  `exclude`), resolves each through Wayback, and **assembles them into one
  document on the fly**. This is how a multi-page work on a blocked site is read
  as a whole without vendoring a byte.

Common options: `stripHtml` (default true; set false for raw text/djvu.txt),
`jsonPath` (extract a JSON field, e.g. Sefaria's `he`), `timestamp` (pin a
Wayback snapshot — needed when the site's latest snapshot is a redesign, e.g.
sacred-texts' 2016 static site), `max` (cap pages), `delayMs` (be polite to
archive.org; default 1500).
