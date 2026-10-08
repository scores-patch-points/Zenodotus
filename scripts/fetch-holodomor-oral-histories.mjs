#!/usr/bin/env node
// Fetch the US Commission on the Ukraine Famine ORAL HISTORY PROJECT — survivor
// testimony of the 1932–33 Holodomor, translated into English and published by
// the U.S. Government Printing Office (1990). A U.S. federal work: public
// domain (17 USC §105). Three volumes, from archive.org.
//
// This is first-person ATROCITY testimony — people speaking about a famine
// that killed millions — and lands in the corpus's perspective register
// (people who faced atrocity) as a vendored, open hold.
//
//   node scripts/fetch-holodomor-oral-histories.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '20-first-person-voices', 'oral-histories');

const VOLUMES = [
  { slug: 'holodomor-oral-history-vol1', id: 'investigationofu01mace', title: 'Oral History Project of the Commission on the Ukraine Famine, Vol. 1' },
  { slug: 'holodomor-oral-history-vol2', id: 'investigationofu02mace', title: 'Oral History Project of the Commission on the Ukraine Famine, Vol. 2' },
  { slug: 'holodomor-oral-history-vol3', id: 'investigationofu03mace', title: 'Oral History Project of the Commission on the Ukraine Famine, Vol. 3' },
];

async function fetchText(url, retries = 3) {
  const { execFile } = await import('node:child_process');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = await new Promise((res, rej) => {
        execFile('curl', ['-skL', '--compressed', '-m', '90', '-A', 'live_priors corpus builder', '--globoff', url], { maxBuffer: 64 * 1024 * 1024 }, (e, s) => (e ? rej(e) : res(s)));
      });
      if (out && out.length > 1000) return out;
    } catch { /* retry */ }
    await sleep(3000 * (attempt + 1));
  }
  return null;
}

async function main() {
  console.log('=== Holodomor Oral History Fetcher (US Commission on the Ukraine Famine, PD) ===\n');
  const manifest = {
    source: 'US Commission on the Ukraine Famine, Oral History Project (US G.P.O. 1990), via archive.org',
    license: 'Public domain (US federal work, 17 USC §105)',
    perspective: 'atrocity survivors (Holodomor 1932-33)',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };
  for (const v of VOLUMES) {
    process.stdout.write(`  ${v.slug}... `);
    const url = `https://archive.org/download/${v.id}/${v.id}_djvu.txt`;
    const text = await fetchText(url);
    if (!text) { console.log('FETCH FAILED'); manifest.rejected.push({ slug: v.slug, reason: 'fetch_failed', url }); continue; }
    const words = wordsIn(text);
    if (words < 600) { console.log(`too short (${words})`); manifest.rejected.push({ slug: v.slug, reason: 'under_600_words', words }); continue; }
    fs.mkdirSync(OUT, { recursive: true });
    const file = path.join(OUT, `${v.slug}.txt`);
    const front = [
      '---',
      `title: ${v.title}`,
      'collection: 20-first-person-voices/oral-histories',
      'perspective: atrocity survivors',
      'region: Ukraine (Holodomor, 1932-33)',
      'source: US Commission on the Ukraine Famine, Oral History Project (US G.P.O., 1990)',
      `source_url: https://archive.org/details/${v.id}`,
      'language: English (translation of Ukrainian/Russian testimony)',
      'license: public domain (US federal work)',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(file, front + text.trim() + '\n', 'utf8');
    manifest.pulled.push({ slug: v.slug, title: v.title, words, file: path.relative(ROOT, file) });
    console.log(`ok (${words} words)`);
    await sleep(500);
  }
  const mf = path.join(ROOT, 'manifests', 'holodomor-oral-histories-manifest.json');
  fs.writeFileSync(mf, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
