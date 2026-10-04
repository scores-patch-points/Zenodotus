#!/usr/bin/env node
// Concepticon fetcher — the cross-linguistic concept backbone for
// 11-multi-language/, added per the 2026-09-09 multilingual
// concept/abstraction proposal.
//
// live_priors so far is concept-dense but structurally single-language-per-
// item: a novel, a statute, an article exists in one original language.
// Concepticon is different in kind — it is not text in any language, it is
// a shared ID space (4,165 concept sets) that ~160 independent fieldwork
// concept lists (Swadesh lists, naming tests, elicitation lists) reference,
// so "the concept BRAVE" can be looked up across those lists' languages
// without picking one language's word as the anchor. This is the backbone;
// live_priors does not vendor the ~160 underlying lists themselves here —
// see README.md for why.
//
// Source: github.com/concepticon/concepticon-data (master branch).
// License: CC BY 4.0 — verified directly from the repo's own
// .zenodo.json ({"license":{"id":"CC-BY-4.0"}}) and metadata.json
// (dc:license -> CC BY 4.0), not assumed from any outside description.
//
//   node scripts/fetch-concepticon.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get, wordsIn } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, '11-multi-language', 'concepticon');
const RAW_BASE = 'https://raw.githubusercontent.com/concepticon/concepticon-data/master/concepticondata';

const FILES = [
  {
    name: 'concepticon.tsv',
    url: `${RAW_BASE}/concepticon.tsv`,
    desc: 'The 4,165 concept sets: ID, English GLOSS, SEMANTICFIELD, DEFINITION, ONTOLOGICAL_CATEGORY.',
  },
  {
    name: 'conceptlists.tsv',
    url: `${RAW_BASE}/conceptlists.tsv`,
    desc: 'Metadata for the ~160 source concept lists (Swadesh lists, naming tests, elicitation lists) that reference concept IDs above — which fieldwork list, which languages it was collected in, citation.',
  },
  {
    name: 'conceptrelations.tsv',
    url: `${RAW_BASE}/conceptrelations.tsv`,
    desc: 'Typed relations between concept sets (e.g. broader/narrower, part-whole) — the ontological structure connecting the flat concept list.',
  },
];

function countTsvRows(text) {
  return text.trim().split('\n').length - 1; // minus header
}

async function main() {
  console.log('=== Concepticon Fetcher ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    source: 'Concepticon (concepticon/concepticon-data)',
    url: 'https://github.com/concepticon/concepticon-data',
    license: 'CC BY 4.0',
    licenseVerifiedFrom: [
      `${RAW_BASE.replace('/concepticondata', '')}/.zenodo.json`,
      `${RAW_BASE.replace('/concepticondata', '')}/metadata.json`,
    ],
    fetched_at: new Date().toISOString(),
    files: [],
  };

  for (const f of FILES) {
    console.log(`Fetching ${f.name}...`);
    const text = await get(f.url);
    if (!text) {
      console.log(`  Failed`);
      manifest.files.push({ ...f, status: 'failed' });
      continue;
    }
    const file = path.join(OUTPUT_DIR, f.name);
    fs.writeFileSync(file, text, 'utf8');
    const rows = countTsvRows(text);
    console.log(`  Saved: ${rows} rows, ${wordsIn(text)} words`);
    manifest.files.push({
      name: f.name,
      url: f.url,
      desc: f.desc,
      rows,
      words: wordsIn(text),
      file: path.relative(ROOT, file),
      status: 'ok',
    });
  }

  const readme = `# Concepticon — cross-linguistic concept backbone

Fetched by \`scripts/fetch-concepticon.mjs\` from
[concepticon/concepticon-data](https://github.com/concepticon/concepticon-data),
master branch. **License: CC BY 4.0**, verified directly from the repo's own
\`.zenodo.json\` and \`metadata.json\` at fetch time (see \`manifests/concepticon-manifest.json\`).

## What this is

Concepticon is not text in any one language. It is a shared concept-ID space:
4,165 concept sets (\`concepticon.tsv\`), each with an English gloss used only
as the ID's mnemonic label, a semantic field, a short definition, and an
ontological category (Person/Thing, Action/Process, Property, ...).

~160 independently collected fieldwork concept lists — Swadesh lists, naming
tests, elicitation lists, spanning many languages — each map their own items
onto these shared IDs (\`conceptlists.tsv\` catalogs the lists themselves:
which languages, which citation). That mapping is what makes "the concept
BRAVE" comparable across lists collected in different languages, without
picking any one language's word as the reference point. \`conceptrelations.tsv\`
adds typed relations (broader/narrower, part-whole) between concept sets.

## What is NOT here

The ~160 underlying concept lists themselves (the actual per-language word
forms) are not vendored in this pull — only the backbone that links them.
Concepticon's own repo does not bundle them either; they live in separate
Lexibank/CLDF datasets, each with its own license, and pulling them is a
separate, larger piece of work with per-list triage, matching the pattern
already run for WikiConv/NCTE and the Parallel Bible Corpus. This pull adds
the ID space itself, since that is small, uniformly licensed, and useful on
its own as a concept catalog independent of any single language's literature.

## Files

| File | Rows | Content |
|---|---|---|
| \`concepticon.tsv\` | 4,165 | Concept sets: ID, GLOSS, SEMANTICFIELD, DEFINITION, ONTOLOGICAL_CATEGORY |
| \`conceptlists.tsv\` | ~160 | Source concept list metadata (languages, citation) |
| \`conceptrelations.tsv\` | — | Typed relations between concept sets |
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf8');

  const manifestFile = path.join(ROOT, 'manifests', 'concepticon-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  const ok = manifest.files.filter(f => f.status === 'ok').length;
  console.log(`\n=== Done: ${ok}/${FILES.length} files ===`);
}

main().catch(console.error);
