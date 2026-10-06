#!/usr/bin/env node
// scripts/fetch-written-oral-histories.mjs — transcribed oral history in text:
// the people of empty tiers speaking, written down. All public domain.
//
// Covers the register's discussed-but-empty rows with their foundational
// written oral histories:
//   - the working class / poor  Henry Mayhew, London Labour and the London
//     Poor (1851-62): verbatim interviews with costermongers, street-sellers,
//     the destitute — the founding written oral history of English sociology.
//   - the poor of New York      Jacob Riis, How the Other Half Lives (1890):
//     the tenements in the immigrants' and poor's own words.
//   - the mentally ill          Clifford Beers, A Mind That Found Itself
//     (1908): the first-person account that began the mental-hygiene movement.
//
//   node scripts/fetch-written-oral-histories.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '20-first-person-voices', 'written-oral-histories');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) eo-corpus/1.0';

const WORKS = [
  { id: 55998, file: 'mayhew-london-labour-vol1.txt', title: 'London Labour and the London Poor, Vol. 1', who: 'the working poor and street-sellers of London, interviewed and transcribed verbatim', persp: 'working class / poor' },
  { id: 60440, file: 'mayhew-london-labour-vol2.txt', title: 'London Labour and the London Poor, Vol. 2', who: 'the working poor and street-sellers of London, interviewed and transcribed verbatim', persp: 'working class / poor' },
  { id: 57060, file: 'mayhew-london-labour-vol3.txt', title: 'London Labour and the London Poor, Vol. 3', who: 'the working poor and street-sellers of London, interviewed and transcribed verbatim', persp: 'working class / poor' },
  { id: 45502, file: 'riis-how-the-other-half-lives.txt', title: 'How the Other Half Lives: Studies Among the Tenements of New York', who: 'the tenement poor of New York — immigrants, the unemployed, the unhoused', persp: 'the poor / the unhoused' },
  { id: 11962, file: 'beers-a-mind-that-found-itself.txt', title: 'A Mind That Found Itself: An Autobiography', who: 'Clifford Whittingham Beers', persp: 'the mentally ill' },
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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
  let done = 0;
  for (const w of WORKS) {
    if (done >= limit) break;
    const out = path.join(OUT_DIR, w.file);
    if (fs.existsSync(out)) { console.log(`skip ${w.file}`); continue; }
    try {
      const res = await fetch(`https://www.gutenberg.org/ebooks/${w.id}.txt.utf-8`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = clean(await res.text());
      const fm = [
        '---',
        `title: ${w.title}`,
        `who: ${w.who}`,
        'language: English',
        'collection: 20-first-person-voices/written-oral-histories',
        `source: Project Gutenberg #${w.id}`,
        `source_url: https://www.gutenberg.org/ebooks/${w.id}`,
        'license: public domain',
        'genre: written oral history — transcribed voices',
        `perspective: ${w.persp}`,
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(out, fm + '\n' + body + '\n');
      console.log(`  ${w.file}: ${body.length} chars`);
    } catch (e) {
      console.error(`  ${w.file}: ${e.message}`);
    }
    done++;
  }
}

main().catch(console.error);