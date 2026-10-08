#!/usr/bin/env node
// fetch-counter-archive.mjs — the counter-weight to empire.
//
// The corpus is heavy with the gaze of empire: government/legal texts, the
// 1911 Britannica, the Western canon, and (until removed) the CIA World
// Factbook. This driver builds the opposing shelf: the ANTI-COLONIAL,
// INDIGENOUS, and GLOBAL-SOUTH canon — the people who were colonized speaking
// back — resolved live from the Gutenberg catalog, never from typed ids.
//
// Every work is public domain. Each lands in 21-anti-colonial/ with its
// region, language, and the axis it counters in the frontmatter.
//
//   node scripts/fetch-counter-archive.mjs
//   node scripts/fetch-counter-archive.mjs --only india,indigenous

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '21-anti-colonial');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.csv');
const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

// author = catalog author string (substring); books = [titleKeyword, note]
const REGISTRY = {
  'indonesia': {
    region: 'Indonesia (Dutch East Indies)', counter: 'Dutch colonial rule',
    author: 'Kartini, Raden Adjeng',
    books: [['Letters of a Javanese Princess', 'a Javanese woman\u2019s letters against colonial tradition and for her people']],
  },
  'philippines': {
    region: 'Philippines (Spanish/American colonial)', counter: 'Spanish and US empire',
    author: ['Mabini, Apolinario', 'Aguinaldo, Emilio'],
    books: [
      ['Decalogue for Filipinos', 'Mabini\u2019s revolutionary decalogue'],
      ['True Version of the Philippine Revolution', 'Aguinaldo\u2019s own account'],
    ],
  },
  'india': {
    region: 'India (British Raj)', counter: 'British empire',
    author: 'Lajpat Rai, Lala',
    books: [
      ['Young India', 'India under British rule'],
      ['An Open Letter', 'open letter to Lloyd George'],
      ['The Political Future of India', 'self-rule'],
    ],
  },
  'china': {
    region: 'China (semi-colonial)', counter: 'the unequal treaties / foreign domination',
    author: 'Sun, Yat-sen',
    books: [['The International Development of China', 'Sun Yat-sen\u2019s own plan for a sovereign China']],
  },
  'south-africa': {
    region: 'South Africa', counter: 'British/Boer settler rule',
    author: 'Plaatje, Sol. T.',
    books: [['Native Life in South Africa', 'the Natives\u2019 Land Act, from a Black South African']],
  },
  'west-indies': {
    region: 'Trinidad / West Indies', counter: 'British colonial historiography',
    author: 'Thomas, J. J.',
    books: [['Froudacity', 'an Afro-Caribbean rebuttal of Froude\u2019s colonial history']],
  },
  'cuba': {
    region: 'Cuba', counter: 'Spanish colonial rule',
    author: 'Mart\u00ed, Jos\u00e9',
    books: [['Amistad funesta', 'Mart\u00ed\u2019s novel (Spanish original)']],
  },
  'indigenous': {
    region: 'Native North America', counter: 'settler colonialism',
    author: 'Apess, William',
    books: [['Indian Nullification', 'Pequot writer against Massachusetts\u2019 dispossession']],
  },
  'indigenous-canada': {
    region: 'Mohawk / Canada', counter: 'settler colonialism',
    author: 'Johnson, E. Pauline',
    books: [
      ['Flint and Feather', 'collected verse (Tekahionwake)'],
      ['Legends of Vancouver', 'Salish stories'],
      ['The Shagganappi', 'stories'],
    ],
  },
  'indigenous-pokagon': {
    region: 'Potawatomi', counter: 'settler dispossession',
    author: 'Pokagon, Simon',
    books: [["Rebuke", "his address on dispossession"]],
  },
  'african-american-appeal': {
    region: 'United States (slavery/racism)', counter: 'slavocracy and empire',
    author: 'Walker, David',
    books: [["Appeal", "the 1829 appeal to the enslaved"]],
  },
  'african-american-turner': {
    region: 'United States (slavery)', counter: 'slavocracy',
    author: 'Turner, Nat',
    books: [['The Confessions of Nat Turner', 'the rebellion leader\u2019s own words (as recorded)']],
  },
  'african-american-cuffe': {
    region: 'United States / Sierra Leone', counter: 'slavocracy and colonization',
    author: 'Cuffe, Paul',
    books: [['Narrative of the Life and Adventures of Paul Cuffe', 'a Black-Pequot mariner\u2019s narrative']],
  },
  'african-american-pennington': {
    region: 'United States', counter: 'slavocracy',
    author: 'Pennington, James W. C.',
    books: [['The Fugitive Blacksmith', 'fugitive slave narrative']],
  },
  'african-american-woman': {
    region: 'United States', counter: 'racism and sexism',
    author: 'Mossell, N. F.',
    books: [['The Work of the Afro-American Woman', 'a Black woman\u2019s account of her own advancement']],
  },
  'african-american-convention': {
    region: 'United States', counter: 'racism',
    author: 'Cromwell, John Wesley',
    books: [['The Early Negro Convention Movement', 'the Black convention movement']],
  },
};

// archive.org-sourced works (PD; the Gutenberg catalog lacks them)
const ARCHIVE = [
  { key: 'india-naoroji', id: 'povertyunbritish00naoruoft', region: 'India (British Raj)', counter: 'British empire', title: 'Poverty and Un-British Rule in India', author: 'Dadabhai Naoroji', note: 'the "Grand Old Man of India" on the drain of wealth under British rule' },
  { key: 'african-cugoano', id: 'thoughtssentimen00cugo', region: 'Britain / West Africa (Fanti)', counter: 'the slave trade and empire', title: 'Thoughts and Sentiments on the Evil of Slavery', author: 'Ottobah Cugoano', note: 'a formerly enslaved African\u2019s 1787 argument against slavery' },
  { key: 'african-garvey', id: 'philosophyopinio01garv', region: 'Jamaica / United States', counter: 'colonialism and white supremacy', title: 'Philosophy and Opinions of Marcus Garvey', author: 'Marcus Garvey', note: 'the Pan-Africanist\u2019s own speeches and writings (1923)' },
];

function splitCsvRows(t) { const r = []; let c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { c += ch; if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } } else if (ch === '"') { q = true; c += ch; } else if (ch === '\n') { r.push(c); c = ''; } else c += ch; } if (c) r.push(c); return r; }
function splitCsvFields(row) { const o = []; let c = '', q = false; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (q) { c += ch; if (ch === '"') { if (row[i + 1] === '"') { c += '"'; i++; } else q = false; } } else if (ch === '"') { q = true; } else if (ch === ',') { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(f => f.trim()); }

let catalog = '';
function resolve(authorPats, keyword) {
  for (const row of splitCsvRows(catalog)) {
    const f = splitCsvFields(row);
    if (f.length < 6) continue;
    const authors = f[5].toLowerCase(), title = f[3].toLowerCase();
    const ok = (Array.isArray(authorPats) ? authorPats : [authorPats]).some(a => authors.includes(a.split(',')[0].toLowerCase()));
    if (ok && keyword.toLowerCase().split(/\s+/).every(w => title.includes(w))) return { id: f[0], title: f[3].replace(/\n/g, ' ').trim().slice(0, 160), language: f[4], authors: f[5] };
  }
  return null;
}

async function main() {
  const only = process.argv.includes('--only') ? new Set((process.argv[process.argv.indexOf('--only') + 1] || '').split(',')) : null;
  catalog = fs.existsSync(CATALOG) ? fs.readFileSync(CATALOG, 'utf8') : await (async () => { const r = await fetch(CATALOG_URL); return r.text(); })();
  console.log('=== Counter-Archive Fetcher (anti-colonial / indigenous / global south) ===\n');
  const manifest = { source: 'Project Gutenberg (resolved live)', purpose: 'counter-weight to the corpus\'s empire-POV holdings', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };
  for (const [key, spec] of Object.entries(REGISTRY)) {
    if (only && !only.has(key)) continue;
    console.log(`\n── ${key} — ${spec.region}`);
    for (const [kw, note] of spec.books) {
      const hit = resolve(spec.author, kw);
      if (!hit) { console.log(`  ✗ «${kw}» not resolved`); manifest.rejected.push({ key, kw, reason: 'not_resolved' }); continue; }
      const { id, title, language, authors } = hit;
      const file = path.join(OUT, `${key}-${id}.txt`);
      if (fs.existsSync(file) && !process.argv.includes('--fresh')) {
        manifest.pulled.push({ key, id, title, region: spec.region, words: wordsIn(fs.readFileSync(file, 'utf8')), file: path.relative(ROOT, file), reused: true });
        console.log(`  ↺ #${id} «${title}» reused`); continue;
      }
      let text = null;
      const ua = { 'User-Agent': 'live_priors corpus builder' };
      try { const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: ua }); text = r.ok ? await r.text() : null; } catch { text = null; }
      if (!text) { console.log(`  ✗ #${id} fetch failed`); manifest.rejected.push({ key, id, kw, reason: 'fetch_failed' }); continue; }
      let clean = text;
      let s = clean.indexOf('*** START OF'); if (s === -1) s = clean.indexOf('*END THE SMALL PRINT'); if (s !== -1) { const nl = clean.indexOf('\n', s); if (nl !== -1) clean = clean.slice(nl + 1); }
      let e = clean.indexOf('*** END OF'); if (e === -1) e = clean.indexOf('End of the Project Gutenberg'); if (e !== -1) clean = clean.slice(0, e);
      clean = clean.trim();
      const words = wordsIn(clean);
      if (words < 600) { console.log(`  ✗ #${id} under floor (${words})`); manifest.rejected.push({ key, id, kw, reason: 'under_600_words', words }); continue; }
      fs.mkdirSync(OUT, { recursive: true });
      const front = ['---', `title: ${title}`, 'collection: 21-anti-colonial', `region: ${spec.region}`, `counter: ${spec.counter}`, `note: ${note}`, 'source: Project Gutenberg', `source_url: https://www.gutenberg.org/ebooks/${id}`, `language: ${language || 'en'}`, 'license: public domain', `author_catalog: ${authors.slice(0, 160)}`, '---', ''].join('\n');
      fs.writeFileSync(file, front + clean + '\n', 'utf8');
      manifest.pulled.push({ key, id, title, region: spec.region, counter: spec.counter, words, file: path.relative(ROOT, file), language });
      console.log(`  ✓ #${id} «${title}» (${words} w)`);
      await sleep(400);
    }
  }
  // archive.org-sourced works
  for (const w of ARCHIVE) {
    if (only && !only.has(w.key)) continue;
    console.log(`\n── ${w.key} — ${w.region}`);
    const file = path.join(OUT, `${w.key}.txt`);
    if (fs.existsSync(file) && !process.argv.includes('--fresh')) {
      manifest.pulled.push({ key: w.key, title: w.title, region: w.region, words: wordsIn(fs.readFileSync(file, 'utf8')), file: path.relative(ROOT, file), reused: true });
      console.log(`  ↺ reused`); continue;
    }
    let text = null;
    try { const r = await fetch(`https://archive.org/download/${w.id}/${w.id}_djvu.txt`, { headers: { 'User-Agent': 'live_priors corpus builder' } }); text = r.ok ? await r.text() : null; } catch { text = null; }
    if (!text || text.length < 1000) { console.log(`  ✗ ${w.id} fetch failed`); manifest.rejected.push({ key: w.key, id: w.id, reason: 'fetch_failed' }); continue; }
    const words = wordsIn(text);
    if (words < 600) { console.log(`  ✗ under floor (${words})`); manifest.rejected.push({ key: w.key, id: w.id, reason: 'under_600_words', words }); continue; }
    fs.mkdirSync(OUT, { recursive: true });
    const front = ['---', `title: ${w.title}`, 'collection: 21-anti-colonial', `region: ${w.region}`, `counter: ${w.counter}`, `note: ${w.note}`, 'source: Internet Archive', `source_url: https://archive.org/details/${w.id}`, 'language: English', 'license: public domain', '---', ''].join('\n');
    fs.writeFileSync(file, front + text.trim() + '\n', 'utf8');
    manifest.pulled.push({ key: w.key, title: w.title, region: w.region, counter: w.counter, words, file: path.relative(ROOT, file) });
    console.log(`  ✓ «${w.title}» (${words} w)`);
  }

  const mf = path.join(ROOT, 'manifests', 'counter-archive-manifest.json');
  fs.writeFileSync(mf, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
