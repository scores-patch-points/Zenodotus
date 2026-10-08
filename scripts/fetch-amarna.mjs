#!/usr/bin/env node
// Fetch the Amarna letters — the 14th-century-BCE diplomatic correspondence
// between the Egyptian court and its vassals, in the Akkadian lingua franca
// of the Late Bronze Age — from the ORACC aemw/amarna corpus (openly
// licensed, CC BY-SA 3.0).
//
// Each letter is short (the floor would reject any single one), and the
// archive's own unit is the correspondent, so letters are aggregated into
// one document PER SENDER CITY — the way a diplomatic archive is read, and
// the way Sappho's fragments are held. Every document carries the Akkadian
// transliteration AND its English rendering, with provenance per letter.
//
// Enumeration is LIVE from the ORACC pager (bkmk=pagination) — never a
// typed list. The genre field (client letter / royal letter) and the
// sender city are carried into the frontmatter.
//
//   node scripts/fetch-amarna.mjs
//   node scripts/fetch-amarna.mjs --only Amurru

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'mesopotamian', 'amarna-letters');
const PAGER = 'https://oracc.museum.upenn.edu/aemw/amarna';
const BASE = 'https://oracc.museum.upenn.edu/aemw/amarna';

const UA = 'live_priors corpus builder (educational corpus)';

async function curlGet(url, retries = 3) {
  const { execFile } = await import('node:child_process');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = await new Promise((res, rej) => {
        execFile('curl', ['-sk', '-L', '-m', '45', '-A', UA, '--globoff', url], { maxBuffer: 16 * 1024 * 1024 }, (e, stdout) => (e ? rej(e) : res(stdout)));
      });
      if (out) return out;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

function strip(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Each item from a pager page: {p, ea, genre, dialect, city} */
function pagerItems(html) {
  const items = [];
  // parse whole rows — a letter's cells all sit in one <tr>
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gs)];
  for (const r of rows) {
    const row = r[1];
    const p = (row.match(/data-iref="(P\d{6})"/) || [])[1];
    if (!p) continue;
    const ea = (row.match(/data-iref="P\d{6}"[^>]*>\s*([^<]+?)<\/a>/) || [])[1]?.trim() || '';
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(m => strip(m[1])).filter(Boolean);
    const genre = cells.find(c => /(?:^|\s)(client letter|royal letter|letter|administrative text)/.test(c)) || cells.find(c => /letter|administrative/.test(c)) || '';
    const dialect = cells.find(c => /Babylonian|Egypt/.test(c)) || '';
    const city = cells.find(c => /[^\s]/.test(c) && !/letter|Babylonian|administrative/.test(c) && c !== ea && c.indexOf('template') === -1) || 'unspecified';
    items.push({ p, ea: ea.replace(/EA\s?/, '').trim(), genre, dialect, city });
  }
  return items;
}

/** Pull every letter P-number + its sender metadata from all pager pages. */
async function enumerate() {
  const items = [];
  let bkmk = 1;
  while (bkmk < 40) {
    const html = await curlGet(`${PAGER}?page=${bkmk}`);
    if (!html) break;
    const page = pagerItems(html);
    const seen = new Set(items.map(i => i.p));
    const fresh = page.filter(i => !seen.has(i.p));
    const seenPage = new Set();
    const uniq = fresh.filter(i => (seenPage.has(i.p) ? false : (seenPage.add(i.p), true)));
    items.push(...uniq);
    if (!uniq.length) break; // pagination ran past the end
    bkmk++;
    await sleep(1000);
  }
  // final global dedupe, stable order
  const seen = new Set();
  return items.filter(i => (seen.has(i.p) ? false : (seen.add(i.p), true)));
}

/** Extract the Akkadian transliteration lines and the English from a letter page. */
function letterParts(html) {
  const tlits = [...html.matchAll(/<td class="tlit">(.*?)<\/td>/gs)].map(m => strip(m[1])).filter(Boolean);
  const xtrs = [...html.matchAll(/<td class="t1 xtr"[^>]*>.*?<\/td>/gs)].map(m => strip(m[1])).filter(Boolean);
  return { translit: tlits, english: xtrs };
}

async function pullCity(city, group, manifest) {
  const slug = 'amarna-' + city
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʿʼ' ,./()]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .toLowerCase() || 'amarna-unspecified';
  process.stdout.write(`  ${city} (${group.length} letters)... `);
  const body = [];
  let totalWords = 0, landed = 0, missing = 0;
  for (const it of group) {
    const html = await curlGet(`${BASE}/${it.p}`);
    if (!html) { missing++; continue; }
    const { translit, english } = letterParts(html);
    if (!translit.length && !english.length) { missing++; continue; }
    const label = it.ea ? `EA ${it.ea}` : it.p;
    body.push(`# ${label} — ${it.dialect}, ${it.genre}, from ${it.city}\n\n## Akkadian (transliteration)\n\n${translit.join(' ')}\n\n## English\n\n${english.join(' ')}\n`);
    totalWords += wordsIn(english.join(' '));
    landed++;
    await sleep(950);
  }
  const full = body.join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(full);
  if (landed === 0 || words < 600) {
    console.log(`too short (${words} words, ${landed} letters)`);
    manifest.rejected.push({ city, letters: group.length, landed, words, reason: 'under_600_words' });
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${slug}.txt`);
  const header = [
    '---',
    `title: Amarna letters from ${city}`,
    'collection: 11-multi-language/mesopotamian/amarna-letters',
    'era: pre-0 (14th century BCE, Amarna period)',
    'source: ORACC aemw/amarna (The Amarna Letters), CC BY-SA 3.0',
    `source_url: ${BASE}`,
    `letters: ${group.length}`,
    `genre: ${group[0].genre}`,
    `dialect: ${group[0].dialect}`,
    'language: Akkadian (cuneiform transliteration) + English',
    'license: CC BY-SA 3.0 (aemw/amarna project)',
    'aggregation: per-sender-city (letters are individually under the 600-word floor; the archive unit is the correspondent)',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + full + '\n', 'utf8');
  manifest.pulled.push({ city, letters: group.length, landed, words, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${landed}/${group.length} letters)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').map(s => s.trim()))
    : null;

  console.log('=== Amarna Letters Fetcher (ORACC aemw/amarna) ===\n');
  const manifest = {
    source: 'ORACC aemw/amarna — The Amarna Letters, CC BY-SA 3.0',
    era: 'pre-0 (14th century BCE)',
    license: 'CC BY-SA 3.0',
    format: 'Akkadian (cuneiform transliteration) + English',
    aggregation: 'per sender city',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  const items = await enumerate();
  console.log(`Enumerated ${items.length} letters.\n`);
  if (!items.length) { console.log('Enumeration failed.'); return; }

  // group by sender city, keeping publish order
  const byCity = new Map();
  for (const it of items) {
    const c = it.city || 'unspecified';
    if (!byCity.has(c)) byCity.set(c, []);
    byCity.get(c).push(it);
  }
  if (only) {
    for (const [city, group] of byCity) {
      if (only.has(city)) await pullCity(city, group, manifest);
    }
  } else {
    // two tiers: a sender with >=4 letters is its own document (archive unit);
    // smaller senders aggregate into one "minor vassals" document so no
    // single-letter fragment misrepresents a whole correspondence.
    const majors = [...byCity].filter(([, g]) => g.length >= 4);
    const minors = [...byCity].filter(([, g]) => g.length < 4);
    for (const [city, group] of majors) {
      await pullCity(city, group, manifest);
    }
    if (minors.length) {
      const flat = minors.flatMap(([, g]) => g);
      const combined = flat.map((it, n) => ({
        ...it,
        ea: (it.ea || it.p) + ` (city ${n})`,
      }));
      await pullCity('minor-vassals', combined, manifest);
    }
  }

  const manifestFile = path.join(ROOT, 'manifests', 'amarna-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });