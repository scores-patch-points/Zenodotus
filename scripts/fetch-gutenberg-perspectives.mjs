#!/usr/bin/env node
// scripts/fetch-gutenberg-perspectives.mjs — fill the THIN perspective rows
// with genuine first-person public-domain testimony, resolved live against
// Project Gutenberg's own catalog (pg_catalog.csv), never from typed ids.
//
// The perspectives register measures the corpus on two axes: how often a group
// is SPOKEN ABOUT, and how often a member of the group SPEAKS in the first
// person. This driver attacks the second axis for the rows where `by` is
// thinnest: children, the mentally ill, older people, indigenous peoples, the
// imprisoned, the working class, disabled people, the unhoused, religious
// minorities, colonized peoples, sex workers.
//
// Every document carries `author:` (so the register's name regex can see it)
// and `perspective:` (so its declared group is counted), plus provenance.
//
//   node scripts/fetch-gutenberg-perspectives.mjs
//   node scripts/fetch-gutenberg-perspectives.mjs --only mentally-ill,children

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '20-first-person-voices', 'perspectives');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.csv');
const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

// group registry: each book is [authorPattern, titleKeyword, note]
const GROUPS = {
  'children': {
    perspective: 'children',
    region: 'children',
    books: [
      ['Ashford, Daisy', 'The Young Visiters', 'written at age nine'],
      ['Ashford, Daisy', 'Daisy Ashford', 'child-authored stories'],
      ['Whiteley, Opal', 'The Story of Opal', 'a child naturalist\u2019s journal'],
      ['MacLane, Mary', 'The Story of Mary MacLane', 'written at nineteen'],
      ['Browne, Mary', 'The Diary of a Girl in France', 'girl\u2019s diary, 1821'],
      ['Barton, Clara', 'The Story of My Childhood', 'memoir of a childhood'],
    ],
  },
  'mentally-ill': {
    perspective: 'mentally ill',
    region: 'the mentally ill',
    books: [
      ['Pengilly, Mary Huestis', 'Diary Written in the Provincial Lunatic Asylum', 'patient\u2019s diary'],
      ['Adler, G. J.', 'Letters of a Lunatic', 'patient\u2019s letters'],
      ['Merivale, Herman Charles', 'My Experiences in a Lunatic Asylum', 'patient memoir'],
      ['Chase, Hiram', 'Two Years and Four Months in a Lunatic Asylum', 'patient memoir'],
      ['Barbellion, W. N. P.', 'The Journal of a Disappointed Man', 'illness diary'],
    ],
  },
  'older-people': {
    perspective: 'older people',
    region: 'older people',
    books: [
      ['Hoar, George Frisbie', 'Autobiography of Seventy Years', 'recollections at the end of a long life'],
      ['Depew, Chauncey', 'My Memories of Eighty Years', 'eighty years of public life'],
      ['Hake, Thomas Gordon', 'Memoirs of Eighty Years', 'a poet\u2019s long retrospect'],
      ['Harland, Marion', 'Autobiography', 'the story of a long life'],
      ['Cuyler, Theodore', 'Recollections of a Long Life', 'an old minister\u2019s memoir'],
      ['Hussey, Samuel Murray', 'Reminiscences of an Irish Land Agent', 'fifty years of country life'],
    ],
  },
  'rural-poor': {
    perspective: 'rural poor',
    region: 'rural poor / landless',
    books: [
      ['Clare, John', 'Life and Remains of John Clare', '\u201cthe Northamptonshire peasant poet\u201d'],
    ],
  },
  'indigenous': {
    perspective: 'indigenous',
    region: 'Native American',
    books: [
      ['Apess, William', 'Indian Nullification', 'Pequot writer\u2019s first-person account'],
    ],
  },
  'imprisoned': {
    perspective: 'imprisoned',
    region: 'the imprisoned',
    books: [
      ['Wilde, Oscar', 'De Profundis', 'letter from Reading Gaol'],
      ['Dostoyevsky, Fyodor', 'The House of the Dead', 'first-person prison memoir'],
      ['Donovan Rossa, Jeremiah', 'Rossa', 'political prisoner memoir'],
    ],
  },
  'working-class': {
    perspective: 'working class',
    region: 'the working class',
    books: [
      ['Tressell, Robert', 'The Ragged Trousered Philanthropists', 'a worker\u2019s novel'],
      ['Sinclair, Upton', 'The Jungle', 'the stockyards, from inside'],
    ],
  },
  'disabled': {
    perspective: 'disabled',
    region: 'disabled people',
    books: [
      ['Keller, Helen', 'The Story of My Life', 'deafblind first-person'],
      ['Keller, Helen', 'The World I Live In', 'deafblind first-person'],
    ],
  },
  'unhoused': {
    perspective: 'unhoused',
    region: 'the unhoused',
    books: [
      ['London, Jack', 'The People of the Abyss', 'life among the London poor'],
      ['Goodkind, Ben', 'An American Hobo in Europe', 'hobo memoir'],
      ['Lynn, Ethel', 'The Adventures of a Woman Hobo', 'a woman on the road'],
    ],
  },
  'religious-minority': {
    perspective: 'religious minority',
    region: 'Jewish diaspora',
    books: [
      ['Yezierska, Anzia', 'Hungry Hearts', 'immigrant Jewish women\u2019s lives'],
      ['Yezierska, Anzia', 'Children of Loneliness', 'immigrant Jewish lives'],
      ['Zangwill, Israel', "Children of the Ghetto", 'the London Jewish ghetto'],
      ['Lazarus, Emma', 'The Poems of Emma Lazarus', 'the Jewish-American poet'],
    ],
  },
  'colonized': {
    perspective: 'colonized',
    region: 'colonized peoples',
    books: [
      ['Gandhi', 'Indian Home Rule', 'Hind Swaraj'],
      ['Gandhi', "Freedom's Battle", 'Indian self-rule'],
      ['Aguinaldo, Emilio', 'True Version of the Philippine Revolution', 'Filipino revolutionary'],
      ['Mabini, Apolinario', 'Decalogue for Filipinos', 'Filipino revolutionary'],
      ['Delany, Martin', 'The Condition, Elevation, Emigration', 'Black emigrationist'],
    ],
  },
  'sex-workers': {
    perspective: 'sex workers',
    region: 'sex workers',
    books: [
      ['Wyndham, Horace', 'The Magnificent Montez', 'the life of Lola Montez'],
    ],
  },
};

function splitCsvRows(text) {
  const rows = []; let cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { cur += ch; if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } }
    else if (ch === '"') { inQ = true; cur += ch; }
    else if (ch === '\n') { rows.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.length) rows.push(cur);
  return rows;
}
function splitCsvFields(row) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQ) { if (ch === '"') { if (row[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
    else if (ch === '"') { inQ = true; }
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(f => f.trim());
}

let catalogText = '';
function resolve(author, keyword) {
  for (const row of splitCsvRows(catalogText)) {
    const f = splitCsvFields(row);
    if (f.length < 6) continue;
    const authors = f[5].toLowerCase(), title = f[3].toLowerCase();
    if (authors.includes(author.split(',')[0].toLowerCase()) &&
        keyword.toLowerCase().split(/\s+/).every(w => title.includes(w))) {
      return { id: f[0], title: f[3].replace(/\n/g, ' ').trim().slice(0, 160), language: f[4], authors: f[5] };
    }
  }
  return null;
}

async function main() {
  const only = process.argv.includes('--only')
    ? new Set((process.argv[process.argv.indexOf('--only') + 1] || '').split(','))
    : null;
  if (!fs.existsSync(CATALOG)) {
    const res = await fetch(CATALOG_URL, { headers: { 'User-Agent': 'live_priors corpus builder' } });
    catalogText = await res.text();
    fs.writeFileSync(CATALOG, catalogText, 'utf8');
  } else catalogText = fs.readFileSync(CATALOG, 'utf8');

  console.log('=== Gutenberg Perspectives Fetcher (thin rows) ===\n');
  const manifest = { source: 'Project Gutenberg (resolved live)', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };

  for (const [key, spec] of Object.entries(GROUPS)) {
    if (only && !only.has(key)) continue;
    console.log(`\n── ${key} → perspective: ${spec.perspective}`);
    for (const [author, kw, note] of spec.books) {
      const hit = resolve(author, kw);
      if (!hit) { console.log(`  ✗ «${kw}» not resolved`); manifest.rejected.push({ key, author, kw, reason: 'not_resolved' }); continue; }
      const { id, title, language, authors } = hit;
      const file = path.join(OUT, `${key}-${id}.txt`);
      if (fs.existsSync(file) && !process.argv.includes('--fresh')) {
        manifest.pulled.push({ key, id, title, perspective: spec.perspective, words: wordsIn(fs.readFileSync(file, 'utf8')), file: path.relative(ROOT, file), reused: true });
        console.log(`  ↺ #${id} «${title}» reused`); continue;
      }
      const ua = { 'User-Agent': 'live_priors corpus builder' };
      let text = null;
      try {
        const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: ua });
        text = r.ok ? await r.text() : await (async () => { const r2 = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`, { headers: ua }); return r2.ok ? r2.text() : null; })();
      } catch { text = null; }
      if (!text) { console.log(`  ✗ #${id} «${title}» fetch failed`); manifest.rejected.push({ key, id, kw, reason: 'fetch_failed' }); continue; }
      let clean = text;
      let s = clean.indexOf('*** START OF'); if (s === -1) s = clean.indexOf('*END THE SMALL PRINT');
      if (s !== -1) { const nl = clean.indexOf('\n', s); if (nl !== -1) clean = clean.slice(nl + 1); }
      let e = clean.indexOf('*** END OF'); if (e === -1) e = clean.indexOf('End of the Project Gutenberg');
      if (e !== -1) clean = clean.slice(0, e);
      clean = clean.trim();
      const words = wordsIn(clean);
      if (words < 600) { console.log(`  ✗ #${id} under floor (${words})`); manifest.rejected.push({ key, id, kw, reason: 'under_600_words', words }); continue; }
      fs.mkdirSync(OUT, { recursive: true });
      const front = [
        '---',
        `title: ${title}`,
        'collection: 20-first-person-voices/perspectives',
        `author: ${authors.split(';')[0].replace(/\s*\[.*\]$/, '').trim()}`,
        `perspective: ${spec.perspective}`,
        `region: ${spec.region}`,
        `note: ${note}`,
        'source: Project Gutenberg',
        `source_url: https://www.gutenberg.org/ebooks/${id}`,
        `language: ${language || 'en'}`,
        'license: public domain',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(file, front + clean + '\n', 'utf8');
      manifest.pulled.push({ key, id, title, perspective: spec.perspective, words, file: path.relative(ROOT, file), language });
      console.log(`  ✓ #${id} «${title}» (${words} w)`);
      await sleep(400);
    }
  }
  const mf = path.join(ROOT, 'manifests', 'gutenberg-perspectives-manifest.json');
  fs.mkdirSync(path.dirname(mf), { recursive: true });
  fs.writeFileSync(mf, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}

main().catch(e => { console.error(e); process.exit(1); });