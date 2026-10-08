#!/usr/bin/env node
// Fetch the pre-CE Sanskrit originals missing from the Indian holdings, from
// GRETIL (Göttingen Register of Electronic Texts in Indian Languages) — the
// same source that already fed the corpus's Sanskrit canon (Pāṇini, the Yoga
// and Nyāya sūtras, the Mahābhārata).
//
// This pass: the Atharvaveda (Saunaka recension, accented IAST text — GRETIL,
// public-domain-critical edition of 1991/2009 collated with Roth–Whitney 1856).
// The Kautiliya-Arthashastra's GRETIL entry points at a dead INDOLOGY mirror,
// and the Aśoka edict corpus is not on the reachable hosts this pass; both are
// recorded as measured gaps rather than fetched from a mirror of uncertain
// provenance.
//
//   node scripts/fetch-sanskrit-pre0.mjs
//   node scripts/fetch-sanskrit-pre0.mjs --only atharvaveda

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'sanskrit-originals');

const WORKS = [
  { slug: 'atharvaveda-saunaka', title: 'Atharvaveda-Saṃhitā, Śaunaka recension (IAST, accented)', url: 'https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/1_veda/1_sam/avs_acu.htm' },
];

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchUrl(url, retries = 3) {
  const { execFile } = await import('node:child_process');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = await new Promise((res, rej) => {
        execFile('curl', ['-sL', '-m', '60', '-A', 'live_priors corpus builder (educational corpus)', '--globoff', url], { maxBuffer: 8 * 1024 * 1024 }, (e, stdout) => (e ? rej(e) : res(stdout)));
      });
      if (out) return out;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  const raw = await fetchUrl(work.url);
  if (!raw) {
    console.log(`FETCH FAILED`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'fetch_failed', url: work.url });
    return;
  }
  const body = cleanHtml(raw);
  const words = wordsIn(body);
  if (words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/sanskrit-originals',
    'era: pre-0 (Atharvaveda ~1200–1000 BCE; this recension collated Roth–Whitney 1856, Orlandi 1991)',
    'source: GRETIL (Göttingen Register of Electronic Texts in Indian Languages)',
    `source_url: ${work.url}`,
    'language: Sanskrit (IAST, accented)',
    'license: public domain (scientific edition; text public domain)',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Sanskrit Pre-0 Fetcher (GRETIL) ===\n');
  const manifest = {
    source: 'GRETIL (Göttingen Register of Electronic Texts in Indian Languages)',
    era: 'pre-0',
    license: 'public domain scientific edition',
    gaps_this_pass: [
      'Kautiliya-Arthashastra: GRETIL entry points at a dead INDOLOGY mirror; not fetched from an unverified mirror.',
      'Aśoka edicts (Prakrit): not on a reachable original-language host this pass.',
      'Yajurveda/Sāmaveda: defer to a later pass; Atharvaveda landed first.',
    ],
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'sanskrit-pre0-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);