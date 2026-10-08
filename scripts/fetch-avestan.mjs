#!/usr/bin/env node
// Fetch the Gathas of Zarathustra — the founding hymns of Zoroastrianism,
// oldest stratum of the Avesta, ~1200–600 BCE (Old Avestan) — from the
// Avesta -- Zoroastrian Archives (avesta.org). Each of the five Gathas lands
// as a document carrying the Avestan original (transliterated) and its
// English translation, with the chapter split preserved.
//
// The Avestan text is ancient and public domain; the site's transcription of
// it (a faithful transliteration of the sacred text) is carried as the
// original-language canon. English rendering rides beside it as a reading,
// exactly the way the corpus holds the Pali canon with Sujato's translation.
//
//   node scripts/fetch-avestan.mjs
//   node scripts/fetch-avestan.mjs --only ahunavaiti

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'avestan');

const GATHAS = [
  { slug: 'ahunavaiti', name: 'Ahunavaiti Gatha', chapters: 'Yasna 28–34', url: 'https://www.avesta.org/yasna/y28to34.htm' },
  { slug: 'ushtavaiti', name: 'Ushtavaiti Gatha', chapters: 'Yasna 43–46', url: 'https://www.avesta.org/yasna/y43to46.htm' },
  { slug: 'spenta-mainyu', name: 'Spentamainyu Gatha', chapters: 'Yasna 47–50', url: 'https://www.avesta.org/yasna/y47to50.htm' },
  // The two shortest Gathas are complete works under the 600-word floor, so
  // they aggregate into one document the way Sappho's fragments do — every
  // hymn preserved whole, the collection made to clear the gate.
  { slug: 'short-gathas', name: 'Gāthās: Vohuxšathra (Yasna 51) and Vahištōišti (Yasna 53)', chapters: 'Yasna 51 and 53', parts: [
      { url: 'https://www.avesta.org/yasna/y51.htm', title: 'Vohuxšathra Gatha (Yasna 51)' },
      { url: 'https://www.avesta.org/yasna/y53.htm', title: 'Vahištōišti Gatha (Yasna 53)' },
    ] },
];

function cleanHtml(html) {
  const NAMED = {
    '&ocirc;': 'ô', '&acirc;': 'â', '&ecirc;': 'ê', '&icirc;': 'î', '&ucirc;': 'û',
    '&yacute;': 'ý', '&aring;': 'å', '&ntilde;': 'ñ', '&ccedil;': 'ç', '&aelig;': 'æ',
    '&scaron;': 'š', '&zacute;': 'ź', '&Vcirc;': 'V', '&ocirc;': 'ô', '&Megrave;': 'M',
    '&Acirc;': 'Â', '&Ecirc;': 'Ê', '&Icirc;': 'Î', '&Ucirc;': 'Û', '&Yacute;': 'Ý',
    '&Aring;': 'Å', '&Ntilde;': 'Ñ', '&Scaron;': 'Š',
  };
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  for (const [k, v] of Object.entries(NAMED)) out = out.replaceAll(k, v);
  out = out
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

async function fetchPage(url, retries = 3) {
  const { execFile } = await import('node:child_process');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = await new Promise((res, rej) => {
        execFile('curl', ['-sL', '-m', '40', '-A', 'live_priors corpus builder (educational corpus)', '--globoff', url], (e, stdout) => (e ? rej(e) : res(stdout)));
      });
      if (out) return out;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

/** keep the content between the header chrome and the closing navigation */
function sliceText(cleaned, heading) {
  const start = cleaned.indexOf(heading);
  if (start !== -1) cleaned = cleaned.slice(start);
  const foot = cleaned.search(/\bEnd of Document\b|\bZoroastrian Archives.*Glossary\b|\bLast updated:|\bglossary\b/i);
  // no reliable footer — work down from the Appended chariot of nav words
  const nav = cleaned.lastIndexOf('Appendices');
  if (foot === -1 && nav > 500) cleaned = cleaned.slice(0, nav);
  else if (foot > 500) cleaned = cleaned.slice(0, foot);
  return cleaned.trim();
}

async function pull(g, manifest) {
  process.stdout.write(`  ${g.slug}... `);
  let body = '';
  if (g.parts) {
    const pieces = [];
    for (const p of g.parts) {
      const html = await fetchPage(p.url);
      if (html) pieces.push(`# ${p.title}\n\n${sliceText(cleanHtml(html), p.title)}`);
      await sleep(2000);
    }
    body = pieces.join('\n\n' + '─'.repeat(60) + '\n\n');
  } else {
    const html = await fetchPage(g.url);
    if (html) body = sliceText(cleanHtml(html), g.name);
  }
  if (!body) {
    console.log(`FETCH FAILED`);
    manifest.rejected.push({ slug: g.slug, name: g.name, reason: 'fetch_failed', url: g.url });
    return;
  }
  const words = wordsIn(body);
  if (words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: g.slug, name: g.name, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${g.slug}.txt`);
  const header = [
    '---',
    `title: ${g.name} (${g.chapters})`,
    'collection: 11-multi-language/avestan',
    'era: pre-0 (Old Avestan, c. 1200–600 BCE)',
    'source: Avesta -- Zoroastrian Archives (avesta.org)',
    `source_url: ${g.url}`,
    'language: Avestan (transliterated) + English',
    'license: Avestan text public domain (ancient); transcription by Joseph H. Peterson, avesta.org',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: g.slug, name: g.name, words, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Avestan / Gathas Fetcher (avesta.org) ===\n');
  const manifest = {
    source: 'Avesta -- Zoroastrian Archives (avesta.org)',
    era: 'pre-0 (Old Avestan, c. 1200–600 BCE)',
    license: 'Avestan text public domain (ancient); transcription by Joseph H. Peterson, avesta.org',
    format: 'Avestan (transliterated) + English',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const g of GATHAS) {
    if (only && !only.has(g.slug)) continue;
    await pull(g, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'avestan-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);