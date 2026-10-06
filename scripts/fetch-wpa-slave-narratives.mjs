#!/usr/bin/env node
// scripts/fetch-wpa-slave-narratives.mjs — the written oral histories of the
// formerly enslaved, WPA Federal Writers' Project (1936-38), public domain.
//
// These are transcribed interviews — people speaking, captured in text — the
// single largest written-oral-history corpus in American letters. Over 2,300
// interviews across seventeen states. This driver lands each available volume
// from Project Gutenberg with provenance frontmatter; the voice is the
// interviewee's own, transcribed by the FWP fieldworkers.
//
// The interview is a written oral history: what the person said, then written
// down. The corpus holds it as the testimony it is — the speaker's first
// person, not an account about them.
//
//   node scripts/fetch-wpa-slave-narratives.mjs [--ids 11255,12297] [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '20-first-person-voices', 'slave-narratives-wpa');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) eo-corpus/1.0';

const VOLUMES = [
  [11255, 'Volume II Arkansas Narratives, Part 1'],
  [11422, 'Volume II Arkansas Narratives, Part 2'],
  [11544, 'Volume II Arkansas Narratives, Part 3'],
  [11709, 'Volume II Arkansas Narratives, Part 5'],
  [12297, 'Volume III Florida Narratives'],
  [13579, 'Volume II Arkansas Narratives, Part 6'],
  [13602, 'Volume IV Georgia Narratives, Part 1'],
  [18484, 'Volume VI Indiana Narratives'],
  [18485, 'Volume V Iowa Narratives'],
  [18912, 'Volume XIV South Carolina Narratives, Part 1'],
  [19446, 'Volume XIV South Carolina Narratives, Part 5'],
  [20785, 'Volume XIII Oklahoma Narratives'],
  [21508, 'Volume XIV South Carolina Narratives, Part 2'],
  [22166, 'Volume IV Georgia Narratives, Part 2'],
  [22976, 'Volume XI North Carolina Narratives, Part 1'],
  [25154, 'Volume II Arkansas Narratives, Part 4'],
  [28170, 'Volume XIV South Carolina Narratives, Part 4'],
  [30576, 'Volume XVI Texas Narratives, Part 1'],
  [30967, 'Volume XIV South Carolina Narratives, Part 6'],
  [31219, 'Volume XI North Carolina Narratives, Part 2'],
  [35379, 'Volume X Missouri Narratives'],
  [35380, 'Volume XVI Texas Narratives, Part 3'],
  [35381, 'Volume XVI Texas Narratives, Part 4'],
  [36020, 'Volume XVI Texas Narratives, Part 5'],
  [36022, 'Volume XIV South Carolina Narratives, Part 3'],
];

function clean(text) {
  let t = text;
  const m = t.match(/\*\*\* START OF .*?\*\*\*(.*?)\*\*\* END OF/s);
  if (m) t = m[1];
  else {
    const s = t.indexOf('*** START OF');
    if (s > -1) t = t.slice(s);
  }
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchGutenberg(id) {
  const res = await fetch(`https://www.gutenberg.org/ebooks/${id}.txt.utf-8`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const idsArg = process.argv.find((a) => a.startsWith('--ids='));
  const ids = idsArg ? new Set(idsArg.split('=')[1].split(',')) : null;
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
  let done = 0;
  for (const [id, vol] of VOLUMES) {
    if (ids && !ids.has(String(id))) continue;
    if (done >= limit) break;
    const slug = vol.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^volume-/, 'vol-');
    const out = path.join(OUT_DIR, `wpa-${slug}-${id}.txt`);
    if (fs.existsSync(out)) { console.log(`skip #${id}`); continue; }
    try {
      const raw = await fetchGutenberg(id);
      const body = clean(raw);
      const fm = [
        '---',
        `title: Slave Narratives — ${vol} (Federal Writers' Project, 1936-38)`,
        'author: the interviewees (transcribed by FWP fieldworkers)',
        'year: 1936-38',
        'language: English',
        'collection: 20-first-person-voices/slave-narratives-wpa',
        `source: Project Gutenberg #${id}`,
        `source_url: https://www.gutenberg.org/ebooks/${id}`,
        'license: public domain (US federal works, WPA)',
        'genre: written oral history — transcribed interviews',
        'perspective: the interviewees\' own first person',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(out, fm + '\n' + body + '\n');
      console.log(`  #${id} ${vol}: ${body.length} chars`);
    } catch (e) {
      console.error(`  #${id}: ${e.message}`);
    }
    done++;
  }
}

main().catch(console.error);