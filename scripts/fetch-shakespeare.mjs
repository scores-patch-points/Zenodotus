#!/usr/bin/env node
// Fetch Shakespeare's complete works from Folger Digital Texts
// Source: https://shakespeare.folger.edu
// Status: Public domain (play text), scholarly apparatus may have separate copyright
// Uses confirmed direct bulk download links

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '15-western-canon', 'folger-shakespeare');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'folger-shakespeare-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Folger bulk download URLs (confirmed working)
const FOLGER_TEXTS_URL = 'https://flgr.sh/txtfssAlltxt';
const FOLGER_XML_URL = 'https://flgr.sh/txtfssAllxml';

// Fallback: Gutenberg Complete Works
const GUTENBERG_SHAKESPEARE_URL = 'https://www.gutenberg.org/cache/epub/100/pg100.txt';

async function fetchZipAsBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  Failed: ${url} (${res.status})`);
    return null;
  }
  return res.arrayBuffer();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  Failed: ${url} (${res.status})`);
    return null;
  }
  return res.text();
}

async function main() {
  console.log('=== Folger Shakespeare Fetcher ===\n');
  const manifest = {
    source: 'Folger Shakespeare Library',
    url: 'https://shakespeare.folger.edu',
    license: 'Public domain (play text)',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  // Try Folger bulk text download first
  console.log('Attempting Folger bulk text download...');
  try {
    const buffer = await fetchZipAsBuffer(FOLGER_TEXTS_URL);
    if (buffer) {
      // Save the zip for later extraction
      const zipFile = path.join(OUTPUT_DIR, 'folger-complete-texts.zip');
      fs.writeFileSync(zipFile, Buffer.from(buffer));
      manifest.texts.push({
        source: 'folger-bulk-text',
        file: path.relative(path.join(__dirname, '..'), zipFile),
        size: buffer.byteLength,
        format: 'zip',
      });
      console.log(`  Saved bulk text zip: ${buffer.byteLength} bytes`);
    }
  } catch (e) {
    console.log(`  Folger text download failed: ${e.message}`);
  }

  // Try Folger XML bulk
  console.log('\nAttempting Folger bulk XML download...');
  try {
    const buffer = await fetchZipAsBuffer(FOLGER_XML_URL);
    if (buffer) {
      const zipFile = path.join(OUTPUT_DIR, 'folger-complete-xml.zip');
      fs.writeFileSync(zipFile, Buffer.from(buffer));
      manifest.texts.push({
        source: 'folger-bulk-xml',
        file: path.relative(path.join(__dirname, '..'), zipFile),
        size: buffer.byteLength,
        format: 'zip',
      });
      console.log(`  Saved bulk XML zip: ${buffer.byteLength} bytes`);
    }
  } catch (e) {
    console.log(`  Folger XML download failed: ${e.message}`);
  }

  // Fallback: Gutenberg Complete Works
  console.log('\nFetching Gutenberg Complete Works (fallback)...');
  try {
    const text = await fetchText(GUTENBERG_SHAKESPEARE_URL);
    if (text) {
      const file = path.join(OUTPUT_DIR, 'shakespeare-complete-gutenberg.txt');
      fs.writeFileSync(file, text, 'utf8');
      manifest.texts.push({
        source: 'gutenberg-complete-works',
        file: path.relative(path.join(__dirname, '..'), file),
        chars: text.length,
        format: 'text',
      });
      console.log(`  Saved: ${text.length} chars`);
    }
  } catch (e) {
    console.log(`  Gutenberg fallback failed: ${e.message}`);
  }

  // Also fetch individual plays from Gutenberg if bulk failed
  const INDIVIDUAL_PLAYS = [
    { id: 1513, title: 'Hamlet' },
    { id: 1532, title: 'Romeo and Juliet' },
    { id: 1533, title: 'Macbeth' },
    { id: 1503, title: 'A Midsummer Nights Dream' },
    { id: 1523, title: 'Julius Caesar' },
    { id: 1521, title: 'Othello' },
    { id: 1512, title: 'King Lear' },
    { id: 1531, title: 'The Tempest' },
    { id: 1522, title: 'The Merchant of Venice' },
    { id: 1524, title: 'As You Like It' },
    { id: 1502, title: 'Much Ado About Nothing' },
    { id: 1511, title: 'Henry V' },
    { id: 1514, title: 'Richard III' },
    { id: 1504, title: 'The Taming of the Shrew' },
    { id: 1515, title: 'Twelfth Night' },
  ];

  console.log('\nFetching individual plays...');
  for (const play of INDIVIDUAL_PLAYS) {
    console.log(`  ${play.title}...`);
    try {
      const res = await fetch(`https://www.gutenberg.org/cache/epub/${play.id}/pg${play.id}.txt`);
      if (res.ok) {
        const text = await res.text();
        const file = path.join(OUTPUT_DIR, `${play.title.replace(/ /g, '_')}.txt`);
        fs.writeFileSync(file, text, 'utf8');
        manifest.texts.push({
          source: 'gutenberg-individual',
          title: play.title,
          file: path.relative(path.join(__dirname, '..'), file),
          chars: text.length,
          format: 'text',
        });
      }
    } catch (e) {
      console.log(`    Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} items fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
