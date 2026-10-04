#!/usr/bin/env node
// Children's books corpus fetcher — a pilot pull for the 18-childrens-books/
// category, built to bootstrap LaVar's reading system.
//
// Two sources, both reachable without authentication:
//
//   global-digital-library/   Global Digital Library + StoryWeaver, merged on
//                              one platform at content.digitallibrary.io. Each
//                              book's `publisher` field records which of the
//                              two catalogued it, so this single source covers
//                              both. EPUBs are fetched and their per-page <p>
//                              text is extracted with the system `unzip`.
//
//   african-storybook/        The Global African Storybook Project's GitHub
//                              mirror (global-asp/global-asp): one Markdown
//                              file per story per language, license and
//                              credits already inline.
//
// A third source, SIL's Bloom Library (sil-ai/bloom-lm on Hugging Face), is
// gated — it requires a logged-in HF account to accept its terms before any
// file is servable. That is a credential-gated action this script does not
// perform; pulling Bloom needs a human to accept the dataset terms and hand
// this script an HF token first.
//
// Children's books are far short of the corpus's 600-word MIN_WORDS floor
// (see scripts/enforce-min-words.mjs) — a single picture book might carry 80
// words across 12 pages. This category is therefore listed in that script's
// EXEMPT_DIR pattern rather than pruned.
//
//   node scripts/fetch-childrens-books.mjs
//   node scripts/fetch-childrens-books.mjs --per-lang 5

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { get, wordsIn, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATEGORY_DIR = path.join(ROOT, '18-childrens-books');
const GDL_DIR = path.join(CATEGORY_DIR, 'global-digital-library');
const ASP_DIR = path.join(CATEGORY_DIR, 'african-storybook');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'childrens-books-manifest.json');

const argv = process.argv.slice(2);
const perLangIdx = argv.indexOf('--per-lang');
const PER_LANG = perLangIdx >= 0 ? Number(argv[perLangIdx + 1]) : 2;

// A diverse pilot slate, not exhaustive — see README's "How to grow this
// pilot" note for the full language lists each source actually offers.
const GDL_LANGS = ['en', 'es-ni', 'fr', 'sw-ke', 'am', 'ar', 'pt-br', 'vi', 'ti', 'lo-laoo'];
const ASP_LANGS = ['de', 'es', 'fr', 'hi', 'ar', 'ja', 'ko', 'vi', 'ru', 'pl'];

const GDL_API = 'https://content.digitallibrary.io/wp-json/content-api/v1';

// ------------------------------------------------------------- utilities --

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

// ------------------------------------------------------ Global Digital Library --

async function fetchGdlBooksForLang(lang) {
  const res = await get(`${GDL_API}/books/${lang}`);
  if (!res) return [];
  try {
    const data = JSON.parse(res);
    return data.books || [];
  } catch {
    return [];
  }
}

async function extractEpubText(epubBuffer, tmpDir) {
  const epubPath = path.join(tmpDir, 'book.epub');
  fs.writeFileSync(epubPath, Buffer.from(epubBuffer));
  const extractDir = path.join(tmpDir, 'extract');
  fs.mkdirSync(extractDir, { recursive: true });
  try {
    execFileSync('unzip', ['-q', '-o', epubPath, '-d', extractDir]);
  } catch {
    return null; // unzip exits non-zero on some warnings even when usable; treat as failure here
  }

  const oebpsDir = fs.existsSync(path.join(extractDir, 'OEBPS'))
    ? path.join(extractDir, 'OEBPS')
    : extractDir;
  const pageFiles = fs
    .readdirSync(oebpsDir)
    .filter(f => /^\d+\.xhtml$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const pages = [];
  for (const f of pageFiles) {
    const html = fs.readFileSync(path.join(oebpsDir, f), 'utf8');
    const paras = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => stripHtml(m[1])).filter(Boolean);
    pages.push(...paras);
  }
  return pages.join('\n\n');
}

async function fetchGlobalDigitalLibrary() {
  console.log('=== Global Digital Library + StoryWeaver (content.digitallibrary.io) ===\n');
  fs.mkdirSync(GDL_DIR, { recursive: true });
  const entries = [];

  for (const lang of GDL_LANGS) {
    const books = await fetchGdlBooksForLang(lang);
    if (!books.length) {
      console.log(`  ${lang}: no books returned`);
      continue;
    }
    let kept = 0;
    for (const book of books) {
      if (kept >= PER_LANG) break;
      const h5pId = book.h5pId;
      if (!h5pId) continue;
      const epubUrl = `${GDL_API.replace('/content-api/v1', '')}/epub-generator/v1/book/${h5pId}`;
      console.log(`  ${lang}: fetching "${book.title}" (h5p ${h5pId})...`);
      try {
        const res = await fetch(epubUrl, { signal: AbortSignal.timeout(45000) });
        if (!res.ok) {
          console.log(`    skip: HTTP ${res.status}`);
          continue;
        }
        const buf = await res.arrayBuffer();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdl-epub-'));
        let text;
        try {
          text = await extractEpubText(buf, tmpDir);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        if (!text || !text.trim()) {
          console.log('    skip: no extractable text');
          continue;
        }

        const langDir = path.join(GDL_DIR, lang);
        fs.mkdirSync(langDir, { recursive: true });
        const fileName = `${h5pId}_${slugify(book.title)}.txt`;
        const filePath = path.join(langDir, fileName);
        fs.writeFileSync(filePath, text, 'utf8');

        const licenseName = book.license?.[0]?.name || 'unknown';
        const languageName = book.language?.[0]?.name || lang;
        entries.push({
          source: 'global-digital-library',
          publisher: book.publisher || 'unknown',
          title: book.title,
          lang,
          language_name: languageName,
          license: licenseName,
          url: book.postLink,
          h5p_id: h5pId,
          words: wordsIn(text),
          file: path.relative(ROOT, filePath),
        });
        kept++;
        console.log(`    saved: ${wordsIn(text)} words, license ${licenseName}, publisher ${book.publisher}`);
      } catch (e) {
        console.log(`    error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return entries;
}

// --------------------------------------------------------- African Storybook --

async function fetchAfricanStorybook() {
  console.log('\n=== African Storybook (global-asp/global-asp) ===\n');
  fs.mkdirSync(ASP_DIR, { recursive: true });
  const entries = [];

  for (const lang of ASP_LANGS) {
    const listing = await get(`https://api.github.com/repos/global-asp/global-asp/contents/${lang}`);
    if (!listing) {
      console.log(`  ${lang}: directory not found`);
      continue;
    }
    let files;
    try {
      files = JSON.parse(listing).filter(f => f.type === 'file' && f.name.endsWith('.md'));
    } catch {
      continue;
    }
    const picks = files.slice(0, PER_LANG);
    for (const f of picks) {
      console.log(`  ${lang}: fetching ${f.name}...`);
      const raw = await get(f.download_url);
      if (!raw) {
        console.log('    skip: fetch failed');
        continue;
      }
      const langDir = path.join(ASP_DIR, lang);
      fs.mkdirSync(langDir, { recursive: true });
      const filePath = path.join(langDir, f.name);
      fs.writeFileSync(filePath, raw, 'utf8');

      const licenseMatch = raw.match(/\*\s*License:\s*\[?([^\]\n]+)\]?/i);
      const titleMatch = raw.match(/^#\s*(.+)$/m);
      entries.push({
        source: 'african-storybook',
        publisher: 'African Storybook Project',
        title: titleMatch ? titleMatch[1].trim() : f.name,
        lang,
        license: licenseMatch ? licenseMatch[1].trim() : 'CC-BY (per African Storybook Project default)',
        url: f.html_url,
        words: wordsIn(raw),
        file: path.relative(ROOT, filePath),
      });
      console.log(`    saved: ${wordsIn(raw)} words`);
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return entries;
}

// ------------------------------------------------------------------- main --

async function main() {
  fs.mkdirSync(CATEGORY_DIR, { recursive: true });

  const gdlEntries = await fetchGlobalDigitalLibrary();
  const aspEntries = await fetchAfricanStorybook();
  const entries = [...gdlEntries, ...aspEntries];

  const manifest = {
    fetched_at: new Date().toISOString(),
    per_lang: PER_LANG,
    skipped_sources: [
      {
        name: 'Bloom Library (sil-ai/bloom-lm)',
        reason:
          'Gated on Hugging Face — requires a logged-in account to accept dataset terms before files are servable. Needs a human to accept the terms and provide an HF token.',
      },
      {
        name: 'StoryWeaver (storyweaver.org.in direct)',
        reason:
          'No bulk API of its own; its open-source repo (PrathamBooks/StoryWeaverOpen) is a landing page, not book content. StoryWeaver-published books are reachable instead through the merged content.digitallibrary.io platform (see publisher field on each entry below).',
      },
    ],
    documents: entries,
  };
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${entries.length} documents fetched ===`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main().catch(console.error);
