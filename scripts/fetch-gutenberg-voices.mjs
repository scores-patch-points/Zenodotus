#!/usr/bin/env node
// Fill the corpus's voices register with women and people-of-colour authors,
// global-south focus, across time — resolved against the live Project
// Gutenberg catalog (pg_catalog.csv).
//
// Resolution discipline (LP1 — a label is not a source): the registry lists
// an AUTHOR string (as the catalog writes it) and TITLES by keyword. Every
// ebook id is RESOLVED FROM THE CATALOG at run time, never typed. An id whose
// catalog row fails to match the declared author is rejected into the
// manifest. This is the same live-resolution rule as fetch-parallel-classics.
//
//   node scripts/fetch-gutenberg-voices.mjs
//   node scripts/fetch-gutenberg-voices.mjs --only cherries<candidate set>
//   node scripts/fetch-gutenberg-voices.mjs --refresh-catalog

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '20-first-person-voices', 'gutenberg');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.csv');
const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

// each entry: author is the catalog author string (or substring), books are
// [titleKeyword, label] pairs. The catalog is searched for author + keyword.
const AUTHORS = {
  'chesnutt-black': {
    labels: ['poc', 'first_person'],
    author: 'Chesnutt',
    region: 'African American',
    books: [
      ['The Conjure Woman', 'Conjure Woman short stories'],
      ['The House Behind the Cedars', 'novel of passing'],
      ['The Marrow of Tradition', 'novel of Wilmington 1898'],
    ],
  },
  'dunbar-black': {
    labels: ['poc'],
    author: 'Dunbar, Paul Laurence',
    region: 'African American',
    books: [
      ['The Sport of the Gods', 'novel'],
      ['Complete Poems', 'poetry'],
    ],
  },
  'harper-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Harper, Frances Ellen Watkins',
    region: 'African American',
    books: [
      ['Iola Leroy', 'the first best-selling novel by an African American woman'],
      ['Sowing and Reaping', 'novel'],
      ['Minnie\'s Sacrifice', 'novel'],
      ['Trial and Triumph', 'novel'],
      ['Atlanta offering', 'poems'],
      ['Sketches of Southern life', 'stories'],
      ['Idylls of the Bible', 'poems'],
    ],
  },
  'james-weldon-black': {
    labels: ['poc', 'first_person'],
    author: 'Johnson, James Weldon',
    region: 'African American',
    books: [
      ['The Autobiography of an Ex-Colored Man', 'first-person racial passing'],
      ['Fifty Years', 'poems'],
    ],
  },
  'w-w-brown-black': {
    labels: ['poc', 'first_person'],
    author: 'Brown, William Wells',
    region: 'African American',
    books: [
      ['Clotel', 'first novel by an African American'],
      ['Narrative of William W. Brown', 'slave narrative'],
      ['The Anti-Slavery Harp', 'song collection'],
    ],
  },
  'northup-black': {
    labels: ['poc', 'first_person'],
    author: 'Northup, Solomon',
    region: 'African American',
    books: [
      ['Twelve Years a Slave', 'slave narrative'],
    ],
  },
  'booker-black': {
    labels: ['poc', 'first_person'],
    author: 'Washington, Booker T.',
    region: 'African American',
    books: [
      ['Up from Slavery', 'autobiography'],
    ],
  },
  'dubois-black': {
    labels: ['poc'],
    author: 'Du Bois, W. E. B.',
    region: 'African American',
    books: [
      ['The Souls of Black Folk', 'essays'],
      ['Darkwater', 'essays'],
      ['The Suppression of the African Slave Trade', 'history'],
      ['The Quest of the Silver Fleece', 'novel'],
      ['The Negro', 'history'],
    ],
  },
  'wells-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Wells-Barnett, Ida B.',
    region: 'African American',
    books: [
      ['Southern Horrors', 'antilynching pamphlet'],
      ['The Red Record', 'antilynching statistics'],
      ['Mob Rule in New Orleans', 'antilynching'],
      ['Lynch Law in Georgia', 'antilynching'],
    ],
  },
  'crafts-black': {
    labels: ['poc', 'first_person'],
    author: 'Craft, William',
    region: 'African American',
    books: [
      ['Running a Thousand Miles for Freedom', 'escape narrative (with Ellen Craft)'],
    ],
  },
  'truth-black-woman': {
    labels: ['woman', 'poc', 'first_person'],
    author: 'Truth, Sojourner',
    region: 'African American',
    books: [
      ['The Narrative of Sojourner Truth', 'autobiography'],
    ],
  },
  'gibran-lebanese': {
    labels: ['poc', 'global_south'],
    author: 'Gibran, Kahlil',
    region: 'Lebanon (Mahjar)',
    books: [
      ['The Prophet', 'prose poetry'],
      ['The Madman', 'parables'],
      ['The Forerunner', 'parables'],
    ],
  },
  'mckay-black': {
    labels: ['poc', 'first_person', 'global_south'],
    author: 'McKay, Claude',
    region: 'Jamaican-born American',
    books: [
      ['Harlem shadows', 'poetry'],
      ['A Long Way from Home', 'memoir'],
    ],
  },
  'hughes-black': {
    labels: ['poc'],
    author: 'Hughes, Langston',
    region: 'African American',
    books: [
      ['The Weary Blues', 'first book of poems'],
    ],
  },
  'toomer-black': {
    labels: ['poc'],
    author: 'Toomer, Jean',
    region: 'African American',
    books: [
      ['Cane', 'hybrid fiction/verse'],
    ],
  },
  'cullen-black': {
    labels: ['poc'],
    author: 'Cullen, Countee',
    region: 'African American',
    books: [
      ['Color', 'first book of poems'],
    ],
  },
  'nelson-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Dunbar-Nelson, Alice',
    region: 'African American',
    books: [
      ['The Goodness of St. Rocque', 'stories of the Creole quarter'],
      ['Violets and Other Tales', 'stories'],
    ],
  },
  'hurston-black-woman': {
    labels: ['woman', 'poc', 'first_person'],
    author: 'Hurston, Zora Neale',
    region: 'African American',
    books: [
      ['The Mule-Bone', 'folk play (with Langston Hughes)'],
    ],
  },
  'hopkins-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Hopkins, Pauline',
    region: 'African American',
    books: [
      ['Of One Blood', 'novel of the hidden self'],
      ['Winona', 'novel'],
    ],
  },
  'fauset-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Fauset, Jessie',
    region: 'African American',
    books: [
      ['There Is Confusion', 'novel'],
    ],
  },
  'grimke-black-woman': {
    labels: ['woman', 'poc'],
    author: 'Grimk\u00e9, Angelina Weld',
    region: 'African American',
    books: [
      ['Rachel', 'play'],
    ],
  },
  'zitkala-first-nation': {
    labels: ['woman', 'poc', 'first_person'],
    author: 'Zitkala',
    region: 'Yankton Dakota',
    books: [
      ['Old Indian Legends', 'legends'],
      ['American Indian Stories', 'first-person'],
    ],
  },
  'eastman-first-nation': {
    labels: ['poc', 'first_person'],
    author: 'Eastman, Charles',
    region: 'Santee Sioux (Dakota)',
    books: [
      ['Indian Boyhood', 'first-person'],
      ['Old Indian Days', 'stories'],
      ['The Soul of the Indian', 'interpretation'],
      ['Indian Heroes and Great Chieftains', 'biographies'],
    ],
  },
  'schreiner-south-africa-woman': {
    labels: ['woman', 'global_south'],
    author: 'Schreiner, Olive',
    region: 'South Africa',
    books: [
      ['The Story of an African Farm', 'novel'],
      ['Trooper Peter Halket of Mashonaland', 'novel'],
    ],
  },
  'mansfield-new-zealand-woman': {
    labels: ['woman', 'global_south'],
    author: 'Mansfield, Katherine',
    region: 'New Zealand',
    books: [
      ['In a German Pension', 'stories'],
      ['Bliss', 'stories'],
      ['The Garden Party', 'stories'],
    ],
  },
  'naidu-indian-woman': {
    labels: ['woman', 'poc', 'global_south'],
    author: 'Naidu, Sarojini',
    region: 'India',
    books: [
      ['The Golden Threshold', 'poetry'],
    ],
  },
  'toru-dutt-indian-woman': {
    labels: ['woman', 'poc', 'global_south'],
    author: 'Dutt, Toru',
    region: 'India',
    books: [
      ['Ancient Ballads and Legends of Hindustan', 'poetry'],
    ],
  },
  'tagore-indian': {
    labels: ['poc', 'global_south'],
    author: 'Tagore, Rabindranath',
    region: 'India',
    books: [
      ['Gitanjali', 'poetry (1921, Nobel)'],
      ['The Home and the World', 'novel'],
      ['Sadhana', 'lectures'],
    ],
  },
  'sor-juana-mexican-woman': {
    labels: ['woman', 'poc', 'global_south'],
    author: 'Juana Inés de la Cruz',
    region: 'Mexico',
    books: [
      ['Obras selectas', 'selected works'],
    ],
  },
  'gorriti-argentina-woman': {
    labels: ['woman', 'poc', 'global_south'],
    author: 'Gorriti, Juana Manuela',
    region: 'Argentina / Peru',
    books: [
      ['Oasis en la vida', 'stories'],
    ],
  },
  'machado-brazilian': {
    labels: ['poc', 'global_south'],
    author: 'Machado de Assis',
    region: 'Brazil',
    books: [
      ['Dom Casmurro', 'novel (pt)'],
      ['Quincas Borba', 'novel (pt)'],
      ['Memorias Posthumas de Braz Cubas', 'novel (pt)'],
      ['Memorial de Ayres', 'novel (pt)'],
    ],
  },
  'rizal-filipino': {
    labels: ['poc', 'global_south'],
    author: 'Rizal',
    region: 'Philippines (Spanish colonial)',
    books: [
      ['The Social Cancer', 'Noli Me Tangere (Eng tr.)'],
      ['Friars and Filipinos', 'tr. of Noli'],
      ['El Filibusterismo', 'The Reign of Greed (cont.)'],
    ],
  },
  'marti-cuban': {
    labels: ['poc', 'global_south'],
    author: 'Martí, José',
    region: 'Cuba',
    books: [
      ['La Edad de Oro', 'magazine for children'],
    ],
  },
  'dario-nicaraguan': {
    labels: ['poc', 'global_south'],
    author: 'Darío, Rubén',
    region: 'Nicaragua',
    books: [
      ['Prosas Profanas', 'poetry'],
      ['Cantos de Vida y Esperanza', 'poetry'],
    ],
  },
  'prince-caribbean-woman': {
    labels: ['woman', 'poc', 'first_person', 'global_south'],
    author: 'Prince, Mary',
    region: 'West Indies (Bermuda-born enslaved)',
    books: [
      ['The History of Mary Prince', 'first slave narrative by a woman'],
    ],
  },
  'wilson-black-woman': {
    labels: ['woman', 'poc', 'first_person'],
    author: 'Wilson, Harriet E.',
    region: 'African American',
    books: [
      ['Our Nig', 'first novel by an African American woman'],
    ],
  },
  'keckley-black-woman': {
    labels: ['woman', 'poc', 'first_person'],
    author: 'Keckley, Elizabeth',
    region: 'African American',
    books: [
      ['Behind the Scenes', 'memoir of the White House'],
    ],
  },
  // ---- Women authors of the global North (through time) — the axis asked for is
  // women + people of colour; these expand the women side of the register.
  'austen-woman': {
    labels: ['woman'],
    author: 'Austen, Jane',
    region: 'England',
    books: [
      ['Pride and Prejudice', 'novel'], ['Emma', 'novel'], ['Northanger Abbey', 'novel'], ['Sense and Sensibility', 'novel'],
    ],
  },
  'shelley-woman': {
    labels: ['woman'],
    author: 'Shelley, Mary Wollstonecraft',
    region: 'England',
    books: [
      ['Frankenstein', 'novel'], ['The Last Man', 'novel'],
    ],
  },
  'bronte-woman': {
    labels: ['woman'],
    author: ['Brontë, Charlotte, 1816-1855', 'Brontë, Emily, 1818-1848', 'Brontë, Anne, 1820-1849'],
    region: 'England',
    books: [
      ['Jane Eyre', 'novel'], ['Wuthering Heights', 'novel'], ['The Tenant of Wildfell Hall', 'novel'], ['The Professor', 'novel'],
    ],
  },
  'gaskell-woman': {
    labels: ['woman'],
    author: 'Gaskell, Elizabeth',
    region: 'England',
    books: [
      ['North and South', 'novel'], ['Cranford', 'novel'], ['Mary Barton', 'novel'],
    ],
  },
  'g-e-liot-woman': {
    labels: ['woman'],
    author: 'Eliot, George',
    region: 'England',
    books: [
      ['Middlemarch', 'novel'], ['Silas Marner', 'novel'], ['The Mill on the Floss', 'novel'], ['Adam Bede', 'novel'],
    ],
  },
  'edgeworth-woman': {
    labels: ['woman'],
    author: 'Edgeworth, Maria',
    region: 'Ireland',
    books: [
      ['Castle Rackrent', 'first regional novel in English'],
    ],
  },
  'alcott-woman': {
    labels: ['woman'],
    author: 'Alcott, Louisa May',
    region: 'United States',
    books: [
      ['Little Women', 'novel'], ['Work', 'novel'], ['An Old-Fashioned Girl', 'novel'], ['Hospital Sketches', 'memoir of nursing'],
    ],
  },
  'stowe-woman': {
    labels: ['woman'],
    author: 'Stowe, Harriet Beecher',
    region: 'United States',
    books: [
      ['Uncle Tom\'s Cabin', 'novel'], ['Dred', 'antislavery novel'],
    ],
  },
  'chopin-woman': {
    labels: ['woman'],
    author: 'Chopin, Kate',
    region: 'United States (Louisiana)',
    books: [
      ['The Awakening', 'novella'], ['Bayou Folk', 'stories'],
    ],
  },
  'gilman-woman': {
    labels: ['woman'],
    author: 'Gilman, Charlotte Perkins',
    region: 'United States',
    books: [
      ['The Yellow Wallpaper', 'short fiction'], ['Herland', 'novel'],
    ],
  },
  'wharton-woman': {
    labels: ['woman'],
    author: 'Wharton, Edith',
    region: 'United States',
    books: [
      ['The House of Mirth', 'novel'], ['Ethan Frome', 'novel'], ['The Age of Innocence', 'novel'], ['Bunner Sisters', 'novella'],
    ],
  },
  'jewett-woman': {
    labels: ['woman'],
    author: 'Jewett, Sarah Orne',
    region: 'United States (Maine)',
    books: [
      ['The Country of the Pointed Firs', 'novel'],
    ],
  },
  'freeman-woman': {
    labels: ['woman'],
    author: 'Freeman, Mary E. Wilkins',
    region: 'United States',
    books: [
      ['The Wind in the Rose-Bush', 'stories'], ['The Copy-Cat', 'stories'], ['Pembroke', 'novel'],
    ],
  },
  'cather-woman': {
    labels: ['woman'],
    author: 'Cather, Willa',
    region: 'United States',
    books: [
      ['O Pioneers!', 'novel'], ['My Ántonia', 'novel'],
    ],
  },
  'e-stuart-woman': {
    labels: ['woman'],
    author: 'Phelps, Elizabeth Stuart',
    region: 'United States',
    books: [
      ['Men, Women, and Ghosts', 'stories'], ['The Gates Between', 'novel'], ['The Gates Ajar', 'novel'],
    ],
  },
  'mary-prince-caribbean': {
    labels: ['woman', 'poc', 'first_person', 'global_south'],
    author: 'Prince, Mary',
    region: 'Bermuda / West Indies',
    books: [
      ['The History of Mary Prince', 'first-person slave narrative'],
    ],
  },
};

function splitCsvRows(text) {
  const rows = [];
  let cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      cur += ch;
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
    } else if (ch === '"') { inQ = true; cur += ch; }
    else if (ch === '\n') { rows.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.length) rows.push(cur);
  return rows;
}

function splitCsvFields(row) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQ) {
      cur += ch;
      if (ch === '"') { if (row[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
    } else if (ch === '"') { inQ = true; }
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(f => f.trim());
}

/** resolve one (author, titleKeyword) against the catalog; return id or null */
function resolve(authorPats, keyword) {
  for (const row of splitCsvRows(catalogText)) {
    const f = splitCsvFields(row);
    if (f.length < 6) continue;
    const id = f[0], authors = f[5].toLowerCase(), title = f[3].toLowerCase();
    const authorOk = Array.isArray(authorPats)
      ? authorPats.some(a => authors.includes(a.split(',')[0].toLowerCase()))
      : authors.includes(authorPats.split(',')[0].toLowerCase());
    if (authorOk && keyword.toLowerCase().split(/\s+/).every(w => title.includes(w) || authors.includes(w))) {
      return { id, title: f[3].replace(/\n/g, ' ').trim().slice(0, 160), language: f[4], authors: f[5] };
    }
  }
  return null;
}

let catalogText = '';

async function main() {
  const only = process.argv.includes('--only')
    ? new Set((process.argv[process.argv.indexOf('--only') + 1] || '').split(','))
    : null;
  const refresh = process.argv.includes('--refresh-catalog');

  console.log('=== Gutenberg Voices Fetcher (women + people of colour, global south) ===\n');

  if (!refresh && fs.existsSync(CATALOG)) {
    catalogText = fs.readFileSync(CATALOG, 'utf8');
    console.log(`Using cached catalog (${CATALOG})`);
  } else {
    console.log(`Downloading catalog ...`);
    const res = await fetch(CATALOG_URL, { headers: { 'User-Agent': 'live_priors corpus builder' } });
    catalogText = await res.text();
    fs.mkdirSync(path.dirname(CATALOG), { recursive: true });
    fs.writeFileSync(CATALOG, catalogText, 'utf8');
  }
  console.log(`catalog rows: ${splitCsvRows(catalogText).length}\n`);

  const manifest = {
    source: 'Project Gutenberg (pg_catalog.csv), resolved live',
    axis: 'women + people of colour + global south, across time',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const [key, spec] of Object.entries(AUTHORS)) {
    if (only && !only.has(key)) continue;
    console.log(`\n── ${key} [${spec.labels.join(', ')}] — ${spec.region}`);
    for (const [titleKw, note] of spec.books) {
      const hit = resolve(spec.author, titleKw);
      if (!hit) {
        console.log(`  ✗ «${titleKw}» — not resolved in catalog`);
        manifest.rejected.push({ key, title: titleKw, reason: 'not_resolved' });
        continue;
      }
      const { id, title, language, authors } = hit;
      const preFile = path.join(OUT, `${key}-${id}.txt`);
      if (fs.existsSync(preFile) && !process.argv.includes('--fresh')) {
        const words = wordsIn(fs.readFileSync(preFile, 'utf8'));
        manifest.pulled.push({ key, id, title, region: spec.region, labels: spec.labels, words, file: path.relative(ROOT, preFile), language, reused: true });
        console.log(`  ↺ #${id} «${title}» reused (${words} w)`);
        continue;
      }
      const ua = { 'User-Agent': 'live_priors corpus builder' };
      let text;
      try {
        const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: ua });
        text = r.ok ? await r.text() : await (async () => {
          const r2 = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`, { headers: ua });
          return r2.ok ? r2.text() : null;
        })();
      } catch (e) { text = null; }
      if (!text) {
        console.log(`  ✗ #${id} «${title}» — fetch failed`);
        manifest.rejected.push({ key, id, title: titleKw, reason: 'fetch_failed' });
        continue;
      }
      let clean = text;
      let s = clean.indexOf('*** START OF');
      if (s === -1) s = clean.indexOf('*END THE SMALL PRINT');
      if (s !== -1) { const nl = clean.indexOf('\n', s); if (nl !== -1) clean = clean.slice(nl + 1); }
      let e = clean.indexOf('*** END OF');
      if (e === -1) e = clean.indexOf('End of the Project Gutenberg');
      if (e !== -1) clean = clean.slice(0, e);
      clean = clean.trim();
      const words = wordsIn(clean);
      if (words < 600) {
        console.log(`  ✗ #${id} «${title}» — under floor (${words})`);
        manifest.rejected.push({ key, id, title: titleKw, reason: 'under_600_words', words });
        continue;
      }
      fs.mkdirSync(OUT, { recursive: true });
      const file = path.join(OUT, `${key}-${id}.txt`);
      const front = [
        '---',
        `title: ${title}`,
        'collection: 20-first-person-voices/gutenberg',
        `identity: ${spec.region} | ${spec.labels.join('; ')}`,
        'axis: ' + spec.labels.join('; '),
        'source: Project Gutenberg',
        `source_url: https://www.gutenberg.org/ebooks/${id}`,
        `language: ${language || 'en'}`,
        'license: public domain',
        `note: ${note}`,
        `author_catalog: ${authors.slice(0, 200)}`,
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(file, front + clean + '\n', 'utf8');
      manifest.pulled.push({ key, id, title, region: spec.region, labels: spec.labels, words, file: path.relative(ROOT, file), language });
      console.log(`  ✓ #${id} «${title}» (${words} w) → ${path.relative(ROOT, file)}`);
      await sleep(400);
    }
  }

  const manifestFile = path.join(ROOT, 'manifests', 'gutenberg-voices-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });