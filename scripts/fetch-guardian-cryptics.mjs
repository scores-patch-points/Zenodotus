#!/usr/bin/env node
// Guardian cryptic crossword clue archive — Rozner, Potts & Mahowald's
// released compilation (NeurIPS 2021, "Decrypting Cryptic Crosswords"),
// via Dryad (CC0-1.0). This is the first live_priors "mini universe of
// reference" — a corpus slice keyed by Geography + Period provenance, the
// same tolerant frontmatter parseFrontmatter (the-fold/priors.js) already
// reads for every other category, no schema change needed.
//
// The one caveat worth stating up front, so the landed document states it
// too rather than implying more than is true: this released file (unlike
// the paper's own scraping methodology) carries no per-clue date. "Period"
// below is the compilers' own stated scrape range, not a per-record fact.
// And CC0-1.0 is the COMPILERS' waiver of their own rights in the dataset
// — never an affirmative grant from The Guardian or the 61 named setters
// who wrote the underlying clues, each credited inline in the body below.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { wordsIn } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_URL = 'https://raw.githubusercontent.com/jsrozner/decrypt/main/data/guardian_2020_10_08.json.zip';
const OUTPUT_DIR = path.join(ROOT, '16-wordplay', 'guardian-cryptics');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'guardian-cryptic-clues-1999-2020.txt');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'guardian-cryptics-manifest.json');

// Casing is deliberate, not decorative: priors-toggles.js's provenanceLine
// reads title/country/status by an EXACT-CASE lowercase lookup (only
// publisher/date/url go through priors.js::provenanceOf's case-insensitive
// alias fill) — a fixture check (priors-toggles.test.mjs) confirmed this,
// so country/status are written lowercase here specifically so they still
// surface in the compact citation line, matching how every other category
// already reads. Geography/Period/Compiler are new concepts with no
// existing display slot, so their casing is free — capitalized to match
// this file's own title-case reading.
const HEADER = `The Guardian Cryptic Crossword Clue Archive
Geography: United Kingdom
country: GB
Period: 1999-2020
publisher: The Guardian
Compiler: Joshua Rozner, Christopher Potts, and Kyle Mahowald
date: 2021
status: CC0-1.0 (public domain dedication, via Dryad)
source: https://doi.org/10.5061/dryad.n02v6wwzp
Count: {{COUNT}}

This file bundles {{COUNT}} cryptic crossword clues published in The
Guardian and compiled by Joshua Rozner, Christopher Potts, and Kyle
Mahowald (Rozner, Potts & Mahowald, "Decrypting Cryptic Crosswords:
Semantically Complex Wordplay Puzzles as a Target for NLP," NeurIPS 2021),
released via Dryad (https://doi.org/10.5061/dryad.n02v6wwzp) under a
CC0-1.0 public domain dedication. The compilers' own methodology states
the underlying puzzles were scraped from Guardian archives spanning
1999-2020; this specific released file carries no date per individual
clue, so the period above describes the compilation's overall scope, not
a verified fact about any one clue below. CC0-1.0 reflects the compilers'
own waiver of their rights in the compiled dataset — it is not an
affirmative rights grant from The Guardian or from the 61 named setters
who wrote the original clues, each credited by name after every clue
below exactly as the released dataset attributes it.

`;

async function main() {
  console.log('=== Guardian Cryptics Fetcher ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tmpDir = fs.mkdtempSync(path.join(ROOT, '.guardian-cryptics-tmp-'));
  const zipPath = path.join(tmpDir, 'guardian.json.zip');
  try {
    console.log(`Fetching ${SOURCE_URL} ...`);
    const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'live_priors corpus builder' } });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

    execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(tmpDir)}`);
    const jsonPath = path.join(tmpDir, 'guardian_2020_10_08.json');
    const records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`  ${records.length} clues parsed`);

    // Trailing period, deliberately: both consumers in the-fold's priors
    // organ bound a match by the nearest surrounding periods (checkPrior's
    // sentence walk; /api/priors/surfaces's passage extraction) — a line
    // with no period of its own would let a match's returned "passage"
    // bleed into whichever neighboring clues happen to sit between the
    // last real period before it and the next one after.
    const lines = records.map(
      (r) => `"${r.clue}" — ${r.soln_with_spaces || r.soln} (setter: ${r.creator || 'unattributed'}).`,
    );
    const body = HEADER.replaceAll('{{COUNT}}', String(records.length)) + lines.join('\n') + '\n';

    fs.writeFileSync(OUTPUT_FILE, body, 'utf8');
    const words = wordsIn(body);
    console.log(`  wrote ${OUTPUT_FILE} (${body.length} chars, ~${words} words)`);

    const setters = {};
    for (const r of records) setters[r.creator || 'unattributed'] = (setters[r.creator || 'unattributed'] || 0) + 1;

    const manifest = {
      source: 'Guardian cryptic crossword clues (Rozner, Potts & Mahowald compilation)',
      url: SOURCE_URL,
      doi: 'https://doi.org/10.5061/dryad.n02v6wwzp',
      license: 'CC0-1.0 (compilers’ own waiver; not a grant from The Guardian or the credited setters)',
      geography: 'United Kingdom',
      period: '1999-2020',
      fetched_at: new Date().toISOString(),
      clue_count: records.length,
      distinct_setters: Object.keys(setters).length,
      top_setters: Object.entries(setters)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      file: path.relative(ROOT, OUTPUT_FILE),
      words,
    };
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`  wrote ${MANIFEST_FILE}`);
    console.log('\n=== Done ===');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
