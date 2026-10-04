#!/usr/bin/env node
// Fetch the Quran from alquran.cloud API (Tanzil text, CC BY 3.0)
// Source: https://api.alquran.cloud
// License: CC BY 3.0

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '14-holy-texts', 'tanzil-quran');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'tanzil-quran-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'https://api.alquran.cloud/v1';

// Editions: Arabic Uthmani, English translations (Sahih International, Yusuf Ali, Pickthall)
const EDITIONS = {
  ar: 'quran-uthmani',       // Arabic Uthmani script
  en_sahih: 'en.sahih',       // Sahih International
  en_yusufali: 'en.yusufali', // Yusuf Ali
  en_pickthall: 'en.pickthall', // Pickthall
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  Failed: ${url} (${res.status})`);
    return null;
  }
  const data = await res.json();
  return data.code === 200 ? data.data : null;
}

async function fetchSurah(number, edition = 'quran-uthmani') {
  const url = `${BASE_URL}/surah/${number}/${edition}`;
  return fetchJSON(url);
}

async function fetchFullQuran(edition = 'quran-uthmani') {
  const url = `${BASE_URL}/quran/${edition}`;
  return fetchJSON(url);
}

function formatAyahs(data) {
  if (!data || !data.ayahs) return '';
  return data.ayahs.map(a => {
    const num = `${a.surah.number}:${a.numberInSurah}`;
    return `[${num}] ${a.text}`;
  }).join('\n');
}

async function main() {
  console.log('=== Quran (Tanzil) Fetcher ===\n');
  const manifest = {
    source: 'Tanzil Project / alquran.cloud',
    url: 'https://tanzil.net',
    api: 'https://api.alquran.cloud',
    license: 'CC BY 3.0',
    fetched_at: new Date().toISOString(),
    editions: {},
    surahs: [],
  };

  // Fetch full Quran in each edition
  for (const [key, edition] of Object.entries(EDITIONS)) {
    console.log(`\nFetching full Quran: ${edition}...`);
    const data = await fetchFullQuran(edition);
    if (data && data.surahs) {
      const text = data.surahs.map(s => {
        const ayahs = s.ayahs.map(a => a.text).join(' ');
        return `=== Surah ${s.number}: ${s.englishName} (${s.englishNameTranslation}) ===\n${ayahs}`;
      }).join('\n\n');

      const file = path.join(OUTPUT_DIR, `quran_${edition.replace('.', '_')}.txt`);
      fs.writeFileSync(file, text, 'utf8');

      manifest.editions[key] = {
        edition,
        chars: text.length,
        file: path.relative(path.join(__dirname, '..'), file),
      };
      console.log(`  Saved: ${text.length} chars, ${data.surahs.length} surahs`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Also fetch per-surah with all editions combined
  console.log('\nFetching per-surah (Arabic + English parallel)...');
  for (let i = 1; i <= 114; i++) {
    const arData = await fetchSurah(i, EDITIONS.ar);
    const enData = await fetchSurah(i, EDITIONS.en_sahih);

    if (arData && enData) {
      const lines = [];
      lines.push(`=== Surah ${arData.number}: ${arData.englishName} (${arData.englishNameTranslation}) ===`);
      lines.push(`Revelation: ${arData.revelationType}`);
      lines.push('');

      const maxAyahs = Math.max(arData.ayahs?.length || 0, enData.ayahs?.length || 0);
      for (let j = 0; j < maxAyahs; j++) {
        const ar = arData.ayahs?.[j];
        const en = enData.ayahs?.[j];
        lines.push(`[${ar?.numberInSurah || j + 1}]`);
        if (ar) lines.push(`  AR: ${ar.text}`);
        if (en) lines.push(`  EN: ${en.text}`);
        lines.push('');
      }

      const text = lines.join('\n');
      const file = path.join(OUTPUT_DIR, 'parallel', `surah_${String(i).padStart(3, '0')}_parallel.txt`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text, 'utf8');

      manifest.surahs.push({
        number: i,
        name: arData.englishName,
        ayahs: arData.ayahs?.length || 0,
        file: path.relative(path.join(__dirname, '..'), file),
      });
    }

    if (i % 10 === 0) console.log(`  Progress: ${i}/114 surahs`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: 4 full editions + 114 parallel surahs ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
