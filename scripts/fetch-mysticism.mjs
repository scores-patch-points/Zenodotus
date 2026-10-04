#!/usr/bin/env node
// Fetch mysticism texts from Internet Sacred Text Archive and other sources
// Source: https://sacred-texts.com, archive.org
// Status: Mostly public domain (pre-1929 translations)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '13-mysticism');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'mysticism-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Corpus Hermeticum (Mead translation) - available on sacred-texts.com
const HERMETICA_URL = 'https://www.sacred-texts.com/eso/city/index.htm';

// Nag Hammadi - older PD translations
const NAG_HAMMADI_URL = 'https://www.sacred-texts.com/chr/nag/index.htm';

// Gnostic texts
const GNOSTIC_URL = 'https://www.sacred-texts.com/chr/gnos/index.htm';

// Kabbalah - Zohar excerpts
const ZOHAR_URL = 'https://www.sacred-texts.com/jud/zohar/index.htm';

// Sufism - Rumi (older translations)
const RUMI_URL = 'https://www.sacred-texts.com/isl/diw/index.htm';

// Theosophy - Secret Doctrine
const SECRET_DOCTRINE_URL = 'https://www.sacred-texts.com/the/sd1/index.htm';

// Swedenborg
const SWEDENBORG_URL = 'https://www.sacred-texts.com/swd/hh/index.htm';

async function fetchPage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 200 ? text : null;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Mysticism Corpus Fetcher ===\n');
  const manifest = {
    source: 'Mysticism Texts',
    fetched_at: new Date().toISOString(),
    texts: [],
    note: 'Sacred-texts.com uses Cloudflare bot protection; direct fetches may fail. For full corpus, use browser-based download or archive.org.',
  };

  const sources = [
    { name: 'corpus-hermeticum', url: HERMETICA_URL, dir: 'corpus-hermeticum' },
    { name: 'nag-hammadi', url: NAG_HAMMADI_URL, dir: 'nag-hammadi' },
    { name: 'gnostic-texts', url: GNOSTIC_URL, dir: 'gnostic-texts' },
    { name: 'zohar', url: ZOHAR_URL, dir: 'kabbalah' },
    { name: 'rumi', url: RUMI_URL, dir: 'sufism' },
    { name: 'secret-doctrine', url: SECRET_DOCTRINE_URL, dir: 'theosophy' },
    { name: 'heaven-and-hell', url: SWEDENBORG_URL, dir: 'swedenborg' },
  ];

  for (const source of sources) {
    console.log(`Fetching ${source.name}...`);
    const text = await fetchPage(source.url);
    if (text) {
      const dir = path.join(OUTPUT_DIR, source.dir);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'index.txt');
      fs.writeFileSync(file, text, 'utf8');
      manifest.texts.push({
        name: source.name,
        url: source.url,
        chars: text.length,
        file: path.relative(path.join(__dirname, '..'), file),
        note: 'Index page only; full texts require per-chapter fetches',
      });
      console.log(`  Saved index: ${text.length} chars`);
    } else {
      console.log(`  Failed (likely Cloudflare protection)`);
      manifest.texts.push({
        name: source.name,
        url: source.url,
        status: 'failed-cloudflare',
        note: 'Requires browser-based fetch or archive.org mirror',
      });
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Also fetch from archive.org for texts available there
  console.log('\nFetching from Internet Archive...');
  const archiveTexts = [
    {
      name: 'corpus-hermeticum-mead',
      url: 'https://archive.org/download/cityofgod00auguuoft/cityofgod00auguuoft.pdf',
      note: 'PDF - requires pdf-to-text conversion',
    },
  ];

  for (const at of archiveTexts) {
    console.log(`  ${at.name}: ${at.note}`);
    manifest.texts.push({
      name: at.name,
      url: at.url,
      status: 'archive-pdf',
      note: at.note,
    });
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} entries ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
