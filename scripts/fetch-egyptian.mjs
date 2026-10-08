#!/usr/bin/env node
// Fetch the pre-CE Egyptian literary corpus — via public-domain translations,
// since the hieroglyphic originals are images and the transliteration standard
// (TLA) is gated. Per the corpus rule, these land as corpus text with the
// territory classed half-open until a transliteration source is reachable.
//
// Sources (all Project Gutenberg, all PD):
//   pg7145  Budge, The Book of the Dead (1912–13)
//   pg30508 The Instruction of Ptah-Hotep and the Instruction of Ke'Gemni
//            (the oldest wisdom text, ~2400 BCE)
//   pg7413  Petrie, Egyptian Tales, XVIIIth–XIXth dynasty
//   pg15932 Budge, The Literature of the Ancient Egyptians
//   pg11277 Budge, Egyptian Ideas of the Future Life
//
// Explicitly NOT attempted this pass: the Pyramid Texts (need the eoreader7 CV
// loop against archive.org scans) — recorded as a gap in the manifest.
//
//   node scripts/fetch-egyptian.mjs
//   node scripts/fetch-egyptian.mjs --only book-of-the-dead,ptahhotep

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'egyptian');
const MANIFEST_DIR = path.join(ROOT, 'manifests');

const WORKS = [
  { id: 7145, slug: 'book-of-the-dead', title: 'E. A. Wallis Budge, The Book of the Dead (1912–13, English translation)', note: 'the Book of the Dead papyri, ~1550 BCE onward; Egyptian territory, translation-only' },
  { id: 30508, slug: 'ptahhotep', title: 'The Instruction of Ptah-Hotep and the Instruction of Ke\'Gemni (~2400 BCE, English translation)', note: 'the oldest wisdom text; Egyptian territory, translation-only' },
  { id: 7413, slug: 'egyptian-tales-petrie', title: 'W. M. Flinders Petrie, Egyptian Tales (XVIIIth–XIXth dynasty, English translation)', note: 'incl. The Tale of the Shipwrecked Sailor etc.; translation-only' },
  { id: 15932, slug: 'literature-of-ancient-egyptians', title: 'E. A. Wallis Budge, The Literature of the Ancient Egyptians (English translation)', note: 'anthology of the Pyramid Texts and Book of the Dead excerpts; translation-only' },
  { id: 11277, slug: 'egyptian-ideas-of-the-future-life', title: 'E. A. Wallis Budge, Egyptian Ideas of the Future Life (1908, English)', note: 'theology of the afterlife texts; translation-only' },
];

async function fetchText(id) {
  for (const url of [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`,
  ]) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch { /* try next */ }
    await sleep(800);
  }
  return null;
}

function stripGutenberg(raw) {
  let text = raw;
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

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  const raw = await fetchText(work.id);
  if (!raw) {
    console.log(`FETCH FAILED (pg${work.id})`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'fetch_failed', id: work.id });
    return;
  }
  const cleaned = stripGutenberg(raw);
  const words = wordsIn(cleaned);
  if (words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words, id: work.id });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/egyptian',
    'era: pre-0 (Egyptian texts 2400–0 BCE; the renderings below are PD translations, not the hieroglyphic originals)',
    `source: Project Gutenberg`,
    `source_url: https://www.gutenberg.org/ebooks/${work.id}`,
    'language: English (translation of ancient Egyptian)',
    'license: public domain',
    `note: ${work.note}`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + cleaned + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, id: work.id, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Egyptian Fetcher (Project Gutenberg, PD translations) ===\n');
  const manifest = {
    source: 'Project Gutenberg',
    era: 'pre-0 (Egyptian texts 2400–0 BCE)',
    license: 'Public domain (translations)',
    honest_boundary: 'Translations only: the hieroglyphic originals are images and the transliteration standard (TLA) is gated. Territory classed half-open until a transliteration source is reachable.',
    gap_this_pass: 'Pyramid Texts (require the eoreader7 CV loop against archive.org scans)',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  const manifestFile = path.join(MANIFEST_DIR, 'egyptian-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);