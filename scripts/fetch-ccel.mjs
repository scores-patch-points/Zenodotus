#!/usr/bin/env node
// Fetch texts from Christian Classics Ethereal Library (CCEL)
// Source: https://ccel.org
// Status: Public domain
// Note: CCEL doesn't have a clean API, so we use known URLs for major works

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '15-western-canon', 'ccel');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'ccel-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// CCEL hosts full texts at predictable URLs
// Format: https://www.ccel.org/ccel/{author_short}/{work_id}.{format}
const WORKS = [
  // Augustine
  { author: 'augustine', work: 'conf', title: 'Confessions', url: 'https://www.ccel.org/ccel/augustine/conf' },
  { author: 'augustine', work: 'cityofgod1', title: 'City of God (Book I-X)', url: 'https://www.ccel.org/ccel/augustine/cityofgod1' },
  { author: 'augustine', work: 'cityofgod2', title: 'City of God (Book XI-XXII)', url: 'https://www.ccel.org/ccel/augustine/cityofgod2' },
  { author: 'augustine', work: 'trin', title: 'On the Trinity', url: 'https://www.ccel.org/ccel/augustine/trin' },

  // Aquinas
  { author: 'aquinas', work: 'summa', title: 'Summa Theologica', url: 'https://www.ccel.org/ccel/aquinas/summa' },

  // Church Fathers
  { author: 'augustine', work: 'enchiridion', title: 'Enchiridion', url: 'https://www.ccel.org/ccel/augustine/enchiridion' },
  { author: 'athanasius', work: 'incarnation', title: 'On the Incarnation', url: 'https://www.ccel.org/ccel/athanasius/incarnation' },
  { author: 'irenaeus', work: 'heresies1', title: 'Against Heresies (Book I-III)', url: 'https://www.ccel.org/ccel/irenaeus/heresies1' },
  { author: 'tertullian', work: 'apology', title: 'Apology', url: 'https://www.ccel.org/ccel/tertullian/apology' },
  { author: 'clement1', work: 'stromata1', title: 'Stromata (Book I-V)', url: 'https://www.ccel.org/ccel/clement1/stromata1' },

  // Medieval Mystics
  { author: 'kempis', work: 'imitation', title: 'The Imitation of Christ', url: 'https://www.ccel.org/ccel/kempis/imitation' },
  { author: 'bunyan', work: 'holywar', title: 'The Holy War', url: 'https://www.ccel.org/ccel/bunyan/holywar' },
  { author: 'bunyan', work: 'pilgrim', title: 'The Pilgrim\'s Progress', url: 'https://www.ccel.org/ccel/bunyan/pilgrim' },
  { author: 'taylor', work: 'holyliving', title: 'Holy Living and Holy Dying', url: 'https://www.ccel.org/ccel/taylor/holyliving' },

  // Reformation
  { author: 'luther', work: 'bondage', title: 'The Bondage of the Will', url: 'https://www.ccel.org/ccel/luther/bondage' },
  { author: 'calvin', work: 'institutes1', title: 'Institutes (Book I-II)', url: 'https://www.ccel.org/ccel/calvin/institutes1' },
  { author: 'calvin', work: 'institutes2', title: 'Institutes (Book III-IV)', url: 'https://www.ccel.org/ccel/calvin/institutes2' },

  // Classic Theology
  { author: 'edwards', work: 'affections', title: 'Religious Affections', url: 'https://www.ccel.org/ccel/edwards/affections' },
  { author: 'owen', work: 'mortification', title: 'Mortification of Sin', url: 'https://www.ccel.org/ccel/owen/mortification' },
  { author: 'spurgeon', work: 'lectures', title: 'Lectures to My Students', url: 'https://www.ccel.org/ccel/spurgeon/lectures' },
];

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    // Extract text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 200 ? text : null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== CCEL (Christian Classics) Fetcher ===\n');
  const manifest = {
    source: 'Christian Classics Ethereal Library',
    url: 'https://ccel.org',
    license: 'Public domain',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  for (const work of WORKS) {
    console.log(`Fetching ${work.title}...`);
    const text = await fetchText(work.url);
    if (text) {
      const file = path.join(OUTPUT_DIR, `${work.work}.txt`);
      fs.writeFileSync(file, text, 'utf8');
      manifest.texts.push({
        title: work.title,
        url: work.url,
        chars: text.length,
        file: path.relative(path.join(__dirname, '..'), file),
      });
      console.log(`  Saved: ${text.length} chars`);
    } else {
      console.log(`  Failed or too short`);
    }
    await new Promise(r => setTimeout(r, 1000)); // CCEL rate limiting
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} texts fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
