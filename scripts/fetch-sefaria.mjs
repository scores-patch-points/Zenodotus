#!/usr/bin/env node
// Fetch holy texts from Sefaria API (Tanakh, Talmud, commentaries)
// Source: https://www.sefaria.org/api/texts/
// License: Mixed CC/public domain per-text

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '14-holy-texts', 'sefaria');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'sefaria-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'https://www.sefaria.org/api/texts';

// Tanakh books by category
const TANAKH_BOOKS = {
  torah: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  neviim: ['Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'],
  ketuvim: ['Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles'],
};

// Additional texts
const OTHER_TEXTS = [
  'Pirkei Avot',
  'Ruth Rabbah',
  'Eichah Rabbah',
  'Pesikta De-Rav Kahana',
];

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429) {
        console.log(`  Rate limited, waiting ${delay * (i + 1)}ms...`);
        await new Promise(r => setTimeout(r, delay * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

async function fetchText(ref, version = 'Hebrew Calendar') {
  const url = `${BASE_URL}/${encodeURIComponent(ref)}?version=${encodeURIComponent(version)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.log(`  Failed: ${ref} (${res.status})`);
    return null;
  }
  return res.json();
}

function flattenText(text) {
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) return text.map(flattenText).join('\n');
  return '';
}

async function fetchBook(bookName, category) {
  console.log(`Fetching ${bookName}...`);
  const data = await fetchText(bookName);
  if (!data) return;

  const hebrewText = flattenText(data.he || []);
  const englishText = flattenText(data.en || []);

  const entry = {
    ref: data.ref,
    categories: data.categories || [],
    hebrew_chars: hebrewText.length,
    english_chars: englishText.length,
    sections: data.sectionNames || [],
    fetched_at: new Date().toISOString(),
  };

  // Save Hebrew
  if (hebrewText.length > 0) {
    const heFile = path.join(OUTPUT_DIR, `${bookName.replace(/ /g, '_')}_he.txt`);
    fs.writeFileSync(heFile, hebrewText, 'utf8');
    entry.hebrew_file = path.relative(path.join(__dirname, '..'), heFile);
  }

  // Save English (JPS translation, public domain)
  if (englishText.length > 0) {
    const enFile = path.join(OUTPUT_DIR, `${bookName.replace(/ /g, '_')}_en.txt`);
    fs.writeFileSync(enFile, englishText, 'utf8');
    entry.english_file = path.relative(path.join(__dirname, '..'), enFile);
  }

  return entry;
}

async function main() {
  console.log('=== Sefaria Corpus Fetcher ===\n');
  const manifest = {
    source: 'Sefaria',
    url: 'https://www.sefaria.org',
    api: 'https://www.sefaria.org/api/texts/',
    license: 'Mixed CC/public domain per-text',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  // Fetch Tanakh
  for (const [category, books] of Object.entries(TANAKH_BOOKS)) {
    console.log(`\n--- ${category.toUpperCase()} ---`);
    for (const book of books) {
      const entry = await fetchBook(book, category);
      if (entry) manifest.texts.push(entry);
      await new Promise(r => setTimeout(r, 500)); // Rate limit courtesy
    }
  }

  // Fetch other texts
  console.log('\n--- OTHER TEXTS ---');
  for (const text of OTHER_TEXTS) {
    const entry = await fetchText(text);
    if (entry) {
      const hebrewText = flattenText(entry.he || []);
      const englishText = flattenText(entry.en || []);
      const entryMeta = {
        ref: entry.ref,
        categories: entry.categories || [],
        hebrew_chars: hebrewText.length,
        english_chars: englishText.length,
        fetched_at: new Date().toISOString(),
      };

      if (hebrewText.length > 0) {
        const heFile = path.join(OUTPUT_DIR, `${text.replace(/ /g, '_')}_he.txt`);
        fs.writeFileSync(heFile, hebrewText, 'utf8');
        entryMeta.hebrew_file = path.relative(path.join(__dirname, '..'), heFile);
      }
      if (englishText.length > 0) {
        const enFile = path.join(OUTPUT_DIR, `${text.replace(/ /g, '_')}_en.txt`);
        fs.writeFileSync(enFile, englishText, 'utf8');
        entryMeta.english_file = path.relative(path.join(__dirname, '..'), enFile);
      }
      manifest.texts.push(entryMeta);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} texts fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
