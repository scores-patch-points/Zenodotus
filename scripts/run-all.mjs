#!/usr/bin/env node
// Master runner: executes all corpus fetch scripts
// Usage: node scripts/run-all.mjs [--skip <name>] [--only <name>]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;

const SCRIPTS = [
  { name: 'sefaria', file: 'fetch-sefaria.mjs', desc: 'Tanakh, Talmud, commentaries (Sefaria API)' },
  { name: 'suttacentral', file: 'fetch-suttacentral.mjs', desc: 'Pali Canon (SuttaCentral API)' },
  { name: 'quran', file: 'fetch-quran.mjs', desc: 'Quran (alquran.cloud / Tanzil)' },
  { name: 'greek-nt', file: 'fetch-greek-nt.mjs', desc: 'Greek NT (SBLGNT, Nestle 1904)' },
  { name: 'gutenberg', file: 'fetch-gutenberg.mjs', desc: 'Project Gutenberg texts' },
  { name: 'gutenberg-non-en', file: 'fetch-gutenberg-non-en.mjs', desc: 'Gutenberg non-English texts' },
  { name: 'wikipedia', file: 'fetch-wikipedia.mjs', desc: 'Wikipedia articles (EN)' },
  { name: 'wikipedia-lang', file: 'fetch-wikipedia-lang.mjs', desc: 'Wikipedia articles (16 languages)' },
  { name: 'wikisource', file: 'fetch-wikisource.mjs', desc: 'Wikisource PD literature' },
  { name: 'britannica-1911', file: 'fetch-britannica-1911.mjs', desc: '1911 Britannica via Wikisource' },
  { name: 'wikinews', file: 'fetch-wikinews.mjs', desc: 'Wikinews (CC BY 2.5)' },
  { name: 'eu-press', file: 'fetch-eu-press.mjs', desc: 'EU Commission press (CC BY 4.0)' },
  { name: 'government', file: 'fetch-government.mjs', desc: 'US gov/legal docs' },
  { name: 'world-government', file: 'fetch-world-government.mjs', desc: 'World legislation + UN UDHR + World Factbook' },
  { name: 'replacements', file: 'fetch-replacements.mjs', desc: 'Whole books, works, chapters and project docs' },
  { name: 'govinfo', file: 'fetch-govinfo.mjs', desc: 'GovInfo + SEC EDGAR' },
  { name: 'shakespeare', file: 'fetch-shakespeare.mjs', desc: 'Shakespeare (Folger/Gutenberg)' },
  { name: 'code-repos', file: 'fetch-code-repos.mjs', desc: 'Open source code repos (landmark tier)' },
  { name: 'audited-code', file: 'fetch-audited-code.mjs', desc: 'Security-audited code repos, pinned commits' },
  { name: 'ccel', file: 'fetch-ccel.mjs', desc: 'Christian Classics (CCEL)' },
  { name: 'mysticism', file: 'fetch-mysticism.mjs', desc: 'Mysticism texts' },
  { name: 'ganjoor', file: 'fetch-ganjoor.mjs', desc: 'Persian classical poetry' },
  { name: 'arxiv', file: 'fetch-arxiv.mjs', desc: 'arXiv paper metadata/abstracts' },
  { name: 'plos', file: 'fetch-plos.mjs', desc: 'PLOS open-access papers (CC BY)' },
  { name: 'nasa', file: 'fetch-nasa.mjs', desc: 'NASA media (public domain)' },
  { name: 'museums', file: 'fetch-museums.mjs', desc: 'Met Museum + Smithsonian + Rijksmuseum (CC0)' },
  { name: 'openstax', file: 'fetch-openstax.mjs', desc: 'OpenStax OER textbooks (CC BY)' },
  { name: 'libretexts', file: 'fetch-libretexts.mjs', desc: 'LibreTexts OER courses (CC BY)' },
  { name: 'bilara-data', file: 'fetch-bilara-data.mjs', desc: 'SuttaCentral bilara-data (CC0)' },
  { name: 'storyweaver', file: 'fetch-storyweaver.mjs', desc: 'StoryWeaver stories (CC BY)' },
  { name: 'african-storybook', file: 'fetch-african-storybook.mjs', desc: 'African Storybook (CC BY)' },
  { name: 'archive-media', file: 'fetch-archive-media.mjs', desc: 'Internet Archive media metadata' },
  { name: 'chat-logs', file: 'fetch-chat-logs.mjs', desc: 'Real human chat logs (SMS, IRC, email, Chinese chat)' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const skip = new Set();
  const only = new Set();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skip' && args[i + 1]) {
      skip.add(args[++i]);
    } else if (args[i] === '--only' && args[i + 1]) {
      only.add(args[++i]);
    }
  }

  return { skip, only };
}

async function main() {
  const { skip, only } = parseArgs();
  const toRun = SCRIPTS.filter(s => {
    if (only.size > 0 && !only.has(s.name)) return false;
    if (skip.has(s.name)) return false;
    return true;
  });

  console.log('=== live_priors Corpus Builder ===\n');
  console.log(`Running ${toRun.length}/${SCRIPTS.length} fetchers:\n`);

  for (const script of toRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${script.name}: ${script.desc}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      execSync(`node "${path.join(SCRIPTS_DIR, script.file)}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (e) {
      console.log(`\n  FAILED: ${script.name} (${e.message})`);
    }

    // Brief pause between fetchers
    await new Promise(r => setTimeout(r, 1000));
  }

  // The corpus floor is part of the build, not an afterthought: fold the media
  // metadata into catalogues, drop anything still under MIN_WORDS, then vet
  // the source-code section (checksums + content scan; fails the build on a
  // FAIL finding).
  for (const step of ['consolidate-media-catalogs.mjs', 'enforce-min-words.mjs', 'vet-source-code.mjs']) {
    const args = step === 'enforce-min-words.mjs' ? ' --prune' : '';
    console.log(`\n${'='.repeat(60)}\n  ${step}\n${'='.repeat(60)}\n`);
    try {
      execSync(`node "${path.join(SCRIPTS_DIR, step)}"${args}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (e) {
      console.log(`\n  FAILED: ${step} (${e.message})`);
    }
  }

  console.log('\n\n=== All fetchers complete ===');
  console.log('\nTo see what was collected:');
  console.log('  ls -la manifests/');
  console.log('  find . -name "*.txt" | head -50');
}

main().catch(console.error);
