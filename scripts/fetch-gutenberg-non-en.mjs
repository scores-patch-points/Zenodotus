#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '11-multi-language', 'gutenberg-non-en');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const TEXTS = [
  { id: 67098, title: 'Die Verwandlung (Kafka)', lang: 'de', genre: 'fiction' },
  { id: 2148, title: 'Die Leiden des jungen Werther (Goethe)', lang: 'de', genre: 'fiction' },
  { id: 42671, title: 'Also sprach Zarathustra (Nietzsche)', lang: 'de', genre: 'philosophy' },
  { id: 74987, title: 'La Metamorfosis (Kafka)', lang: 'es', genre: 'fiction' },
  { id: 14200, title: 'La Divina Comedia (Dante)', lang: 'es', genre: 'poetry' },
  { id: 174, title: 'Il ritratto di Dorian Gray', lang: 'it', genre: 'fiction' },
  { id: 32773, title: 'Il Principe (Machiavelli)', lang: 'it', genre: 'philosophy' },
  { id: 42108, title: 'Le Comte de Monte-Cristo', lang: 'fr', genre: 'fiction' },
  { id: 17489, title: 'Madame Bovary', lang: 'fr', genre: 'fiction' },
  { id: 15807, title: 'Nana', lang: 'fr', genre: 'fiction' },
  { id: 5200, title: 'Metamorphoses (Ovid, Latin)', lang: 'la', genre: 'epic' },
  { id: 8800, title: 'De Rerum Natura (Lucretius)', lang: 'la', genre: 'philosophy' },
  { id: 160, title: 'Crime and Punishment (Dostoyevsky)', lang: 'en', genre: 'fiction', note: 'English trans.' },
  { id: 2500, title: 'The Brothers Karamazov', lang: 'en', genre: 'fiction', note: 'English trans.' },
  { id: 2542, title: 'War and Peace', lang: 'en', genre: 'fiction', note: 'English trans.' },
  { id: 76749, title: 'Sota satulavyö (Finnish)', lang: 'fi', genre: 'fiction' },
  { id: 49010, title: 'Runeberg runoelmat (Finnish)', lang: 'fi', genre: 'poetry' },
  { id: 7700, title: 'De la démocratie en Amérique (Tocqueville)', lang: 'fr', genre: 'philosophy' },
  { id: 1232, name: 'Othello (Dutch)', lang: 'nl', genre: 'drama' },
  { id: 43668, title: 'Fäders brott (Swedish)', lang: 'sv', genre: 'fiction' },
];

async function fetchText(id) {
  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  try {
    const res = await fetch(url);
    if (res.ok) return res.text();
    const utf8Url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`;
    const res2 = await fetch(utf8Url);
    if (res2.ok) return res2.text();
    return null;
  } catch (e) {
    return null;
  }
}

function stripHeaderFooter(text) {
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
  console.log('=== Gutenberg Non-English Fetcher ===\n');
  const manifest = {
    source: 'Project Gutenberg (Non-English)',
    url: 'https://www.gutenberg.org',
    license: 'Public domain',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  for (const text of TEXTS) {
    console.log(`Fetching pg${text.id}: ${text.title || text.name}...`);
    const raw = await fetchText(text.id);
    if (raw) {
      const cleaned = stripHeaderFooter(raw);
      if (cleaned.length > 200) {
        const langDir = path.join(OUTPUT_DIR, text.lang);
        fs.mkdirSync(langDir, { recursive: true });
        const safeTitle = (text.title || text.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
        const file = path.join(langDir, `pg${text.id}_${safeTitle}.txt`);
        fs.writeFileSync(file, cleaned, 'utf8');
        manifest.texts.push({
          id: text.id,
          title: text.title || text.name,
          lang: text.lang,
          chars: cleaned.length,
          file: path.relative(path.join(__dirname, '..'), file),
        });
        console.log(`  Saved: ${cleaned.length} chars (${text.lang})`);
      }
    } else {
      console.log(`  Failed`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'gutenberg-non-en-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} texts in ${new Set(manifest.texts.map(t => t.lang)).size} languages ===`);
}

main().catch(console.error);
