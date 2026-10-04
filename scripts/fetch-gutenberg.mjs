#!/usr/bin/env node
// Fetch sample texts from Project Gutenberg
// Source: https://www.gutenberg.org
// Status: Public domain (mostly pre-1929 US)
// Uses direct raw URLs (confirmed reachable)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '01-literature-books', 'gutenberg');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'gutenberg-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Curated selection of public domain texts across genres/languages
const TEXTS = [
  // English literature
  { id: 100, title: 'Complete Works of Shakespeare', lang: 'en', genre: 'drama' },
  { id: 1342, title: 'Pride and Prejudice', lang: 'en', genre: 'fiction' },
  { id: 768, title: 'The Adventures of Sherlock Holmes', lang: 'en', genre: 'fiction' },
  { id: 2701, title: 'Moby Dick', lang: 'en', genre: 'fiction' },
  { id: 174, title: 'The Picture of Dorian Gray', lang: 'en', genre: 'fiction' },
  { id: 84, title: 'Frankenstein', lang: 'en', genre: 'fiction' },
  { id: 1661, title: 'The Adventures of Tom Sawyer', lang: 'en', genre: 'fiction' },
  { id: 98, 'title': 'A Tale of Two Cities', lang: 'en', genre: 'fiction' },
  { id: 11, title: 'Alice\'s Adventures in Wonderland', lang: 'en', genre: 'children' },
  { id: 12, title: 'Through the Looking-Glass', lang: 'en', genre: 'children' },

  // Philosophy
  { id: 5827, title: 'Meditations by Marcus Aurelius', lang: 'en', genre: 'philosophy' },
  { id: 55201, title: 'The Republic by Plato', lang: 'en', genre: 'philosophy' },
  { id: 8394, title: 'Beyond Good and Evil by Nietzsche', lang: 'en', genre: 'philosophy' },
  { id: 59129, title: 'Leviathan by Hobbes', lang: 'en', genre: 'philosophy' },

  // Science
  { id: 62168, title: 'The Origin of Species by Darwin', lang: 'en', genre: 'science' },
  { id: 32063, title: 'On the Electrodynamics of Moving Bodies (Einstein)', lang: 'en', genre: 'science' },

  // Poetry
  { id: 2397, title: 'Leaves of Grass by Whitman', lang: 'en', genre: 'poetry' },
  { id: 13453, title: 'The Divine Comedy by Dante', lang: 'en', genre: 'poetry' },

  // Non-English
  { id: 135, title: 'Les Misérables (French)', lang: 'fr', genre: 'fiction' },
  { id: 2636, title: 'Faust (German)', lang: 'de', genre: 'drama' },
  { id: 5196, title: 'Don Quixote (Spanish)', lang: 'es', genre: 'fiction' },
  { id: 10671, title: 'The Iliad (Greek)', lang: 'en', genre: 'epic' },
  { id: 17270, title: 'The Aeneid (Latin)', lang: 'en', genre: 'epic' },
];

async function fetchText(id) {
  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  try {
    const res = await fetch(url);
    if (res.ok) return res.text();
    if (res.status === 404) {
      // Try UTF-8 variant
      const utf8Url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`;
      const res2 = await fetch(utf8Url);
      if (res2.ok) return res2.text();
    }
    console.log(`  Failed: pg${id} (${res.status})`);
    return null;
  } catch (e) {
    console.log(`  Error: pg${id} - ${e.message}`);
    return null;
  }
}

function stripGutenbergHeaderFooter(text) {
  // Remove the standard Gutenberg boilerplate
  let start = text.indexOf('*** START OF');
  if (start === -1) start = text.indexOf('*END THE SMALL PRINT');
  if (start !== -1) {
    const nl = text.indexOf('\n', start);
    if (nl !== -1) text = text.slice(nl + 1);
  }
  let end = text.indexOf('*** END OF');
  if (end === -1) end = text.indexOf('End of the Project Gutenberg');
  if (end !== -1) text = text.slice(0, end);
  return text.trim();
}

async function main() {
  console.log('=== Project Gutenberg Fetcher ===\n');
  const manifest = {
    source: 'Project Gutenberg',
    url: 'https://www.gutenberg.org',
    access: 'Direct HTTP cache URLs',
    license: 'Public domain (mostly pre-1929 US)',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  for (const text of TEXTS) {
    console.log(`Fetching pg${text.id}: ${text.title}...`);
    const raw = await fetchText(text.id);
    if (raw) {
      const cleaned = stripGutenbergHeaderFooter(raw);
      const file = path.join(OUTPUT_DIR, `pg${text.id}_${text.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.txt`);
      fs.writeFileSync(file, cleaned, 'utf8');

      manifest.texts.push({
        id: text.id,
        title: text.title,
        lang: text.lang,
        genre: text.genre,
        raw_chars: raw.length,
        cleaned_chars: cleaned.length,
        file: path.relative(path.join(__dirname, '..'), file),
      });
      console.log(`  Saved: ${cleaned.length} chars`);
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limit courtesy
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} texts fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
