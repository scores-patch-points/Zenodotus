#!/usr/bin/env node
// Fetch classical Persian poetry from Ganjoor API
// Source: https://ganjoor.net, api.ganjoor.net
// Status: Public domain (Hafez, Rumi, Ferdowsi, Saadi, etc.)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '16-organic-community', 'ganjoor-persian');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'ganjoor-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://api.ganjoor.net';

// Major poets and their works
const POETS = [
  { id: 'hafez', name: 'Hafez', works: ['ghazal'] },
  { id: 'rumi', name: 'Rumi (Mowlavi)', works: ['masnavi', 'ghazal'] },
  { id: 'ferdowsi', name: 'Ferdowsi', works: ['shahnameh'] },
  { id: 'saadi', name: 'Saadi', works: ['golestan', 'bustan'] },
  { id: 'khayyam', name: 'Omar Khayyam', works: ['robaiyat'] },
  { id: 'nezami', name: 'Nezami Ganjavi', works: ['panjganj'] },
  { id: 'attar', name: 'Attar', works: ['manteq'] },
  { id: 'beyhaghi', name: 'Beyhaghi', works: ['tarikh'] },
];

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function fetchPoet(poetId) {
  return fetchJSON(`${API_BASE}/v1/poet/${poetId}`);
}

async function fetchPoem(poetId, poemId) {
  return fetchJSON(`${API_BASE}/v1/poem/${poetId}/${poemId}`);
}

async function fetchPoems(poetId, page = 1) {
  return fetchJSON(`${API_BASE}/v1/poems/${poetId}?page=${page}`);
}

async function main() {
  console.log('=== Ganjoor Persian Poetry Fetcher ===\n');
  const manifest = {
    source: 'Ganjoor',
    url: 'https://ganjoor.net',
    api: 'https://api.ganjoor.net',
    license: 'Public domain (classical Persian poetry)',
    fetched_at: new Date().toISOString(),
    poets: [],
  };

  for (const poet of POETS) {
    console.log(`\n--- ${poet.name} ---`);
    const poetDir = path.join(OUTPUT_DIR, poet.id);
    fs.mkdirSync(poetDir, { recursive: true });

    const poetEntry = {
      id: poet.id,
      name: poet.name,
      works: [],
    };

    // Fetch poet info
    const poetData = await fetchPoet(poet.id);
    if (poetData) {
      console.log(`  Poet: ${poetData.title || poet.name}`);
    }

    // Fetch poems (first page, sample)
    const poemsData = await fetchPoems(poet.id, 1);
    if (poemsData && poemsData.poems) {
      console.log(`  Found ${poemsData.poems.length} poems on page 1`);

      for (const poem of poemsData.poems.slice(0, 10)) {
        console.log(`    ${poem.title || poem.id}...`);

        // Fetch full poem text
        const fullPoem = await fetchPoem(poet.id, poem.id);
        if (fullPoem && fullPoem.text) {
          const file = path.join(poetDir, `${poem.id}.txt`);
          fs.writeFileSync(file, fullPoem.text, 'utf8');

          poetEntry.works.push({
            id: poem.id,
            title: poem.title || poem.id,
            chars: fullPoem.text.length,
            file: path.relative(path.join(__dirname, '..'), file),
          });
        }

        await new Promise(r => setTimeout(r, 300));
      }
    }

    manifest.poets.push(poetEntry);
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.poets.length} poets, ${manifest.poets.reduce((s, p) => s + p.works.length, 0)} poems ===`);
}

main().catch(console.error);
