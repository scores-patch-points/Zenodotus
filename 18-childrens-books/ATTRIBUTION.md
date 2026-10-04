# Attribution and rights — 18-childrens-books

This directory holds children's books pulled to bootstrap LaVar's reading
system. Every book here carries per-document license and source metadata in
`manifests/childrens-books-manifest.json`; this file summarizes what those
licenses require.

Generated alongside `scripts/fetch-childrens-books.mjs`; do not edit by hand.

## Sources

| Directory | Source | License | Notes |
|---|---|---|---|
| `global-digital-library/` | [content.digitallibrary.io](https://digitallibrary.io) — Global Digital Library and StoryWeaver, merged on one platform. The `publisher` field on each manifest entry records which catalogued a given book (`StoryWeaver`, `BookDash`, `3asafeer`, or `unknown` where the API left it blank). | Mostly CC BY 4.0 / CC BY-SA 4.0. **A minority are CC BY-NC-SA** (3asafeer titles) — non-commercial only. Check the `license` field per book before any commercial use. | EPUBs fetched via the platform's `epub-generator` endpoint; page text extracted from each EPUB's `<p>` elements. |
| `african-storybook/` | [global-asp/global-asp](https://github.com/global-asp/global-asp) — the Global African Storybook Project's GitHub mirror of African Storybook Project translations. | CC BY (per-file, stated inline in each Markdown file's own credit block: text author, illustrator, translator). | Markdown kept as fetched — license and credits are already part of the file. |

## Not pulled

- **Bloom Library** (`sil-ai/bloom-lm` on Hugging Face) — gated. Hugging Face
  requires a logged-in account to accept the dataset's terms before any file
  is servable; this repo's fetch scripts do not hold or acquire credentials.
  Pulling Bloom needs a human to accept the terms at
  https://huggingface.co/datasets/sil-ai/bloom-lm and hand the fetcher a
  token.
- **StoryWeaver direct** (storyweaver.org.in) — no bulk API of its own. Its
  open-source repo, `PrathamBooks/StoryWeaverOpen`, is a landing page, not a
  content mirror. StoryWeaver-published books are reachable anyway, through
  the merged `content.digitallibrary.io` platform above.

## The 600-word floor does not apply here

`scripts/enforce-min-words.mjs` exempts `18-childrens-books/` — a complete
picture book is the whole work, not a fragment of one, even at 60 words.
