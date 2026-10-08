#!/usr/bin/env node
// Fetch the pre-CE (pre-0) Chinese originals of the classical canon from
// Chinese Wikisource (zh.wikisource.org) through the MediaWiki parse API.
// Every work here predates the Common Era: the Analects (論語), Zhuangzi
// (莊子), Yijing (周易), Shijing (詩經), Sunzi (孫子), Mengzi (孟子) and
// Han Feizi (韓非子) — the original Chinese text, the way the corpus already
// holds Tao Te Ching, Mozi, Xunzi and Shiji from the same host.
//
//   node scripts/fetch-chinese-pre0.mjs
//   node scripts/fetch-chinese-pre0.mjs --only analects,zhuangzi

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'chinese-originals');
const API = 'https://zh.wikisource.org/w/api.php';

const WORKS = [
  { slug: 'analects', title: '論語 (Yúnyǔ, The Analects, ~5th–4th c. BCE)', prefix: '論語' },
  { slug: 'zhuangzi', title: '莊子 (Zhuāngzǐ, ~4th–3rd c. BCE)', prefix: '莊子' },
  { slug: 'yijing', title: '周易 (Zhōuyì / I Ching, map-text 8th–7th c. BCE)', prefix: '周易' },
  { slug: 'shijing', title: '詩經 (Shījīng / Book of Odes, 11th–7th c. BCE)', prefix: '詩經' },
  { slug: 'sunzi-bingfa', title: '孫子兵法 (Sūnzǐ bīngfǎ / The Art of War, ~5th c. BCE)', page: '孫子兵法' },
  { slug: 'mengzi', title: '孟子 (Mèngzǐ, ~4th c. BCE)', prefix: '孟子' },
  { slug: 'hanfeizi', title: '韓非子 (Hánfēizǐ, ~3rd c. BCE)', prefix: '韓非子' },
];

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<span[^>]*class="[^"]*(mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(params, retries = 4) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'live_priors corpus builder (educational corpus)' } });
      if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(2000);
  }
  return null;
}

async function parsePage(page) {
  const data = await apiGet({ action: 'parse', page, prop: 'text', redirects: '1' });
  const html = data?.parse?.text?.['*'];
  if (!html) return null;
  const text = cleanHtml(html);
  return text.length ? text : null;
}

async function subpages(prefix) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const data = await apiGet({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
    if (data) return (data.query?.allpages || []).map(p => p.title);
    await sleep(8000 * (attempt + 1));
  }
  return null;
}

/** pick only the book's own chapter pages (X子/章名), not marginalia */
function chapterPages(titles, root) {
  const drops = ['序', '序說', '全覽', '目録', '目錄', '卷首', '卷', '後序', '(四庫全書本)', '(四部叢刊本)', '辯', '注', '疏', '附錄', '附', '疏證', '音義', '集解', '評'];
  const seen = new Set();
  const out = [];
  for (const t of titles) {
    if (!t.startsWith(`${root}/`)) continue;
    if (drops.some(d => t.includes(d))) continue;
    const base = t.slice(root.length + 1);
    if (!/^[\u3400-\u9fff]{1,6}$/.test(base)) continue; // a textbook chapter name
    // dedupe traditional-variant twins of the same chapter (為政/爲政)
    const norm = base.replace(/[衞爲]/g, '衛為');
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(t);
  }
  return out;
}

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.page) {
    const t = await parsePage(work.page);
    if (t) parts = [{ title: work.page, text: t }];
    else {
      console.log(`PAGE MISSING`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'page_missing', page: work.page });
      return;
    }
    await sleep(600);
  } else {
    const titles = await subpages(work.prefix);
    if (!titles) {
      console.log(`RATE-LIMITED, skipping`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'rate_limited', prefix: work.prefix });
      return;
    }
    const chapters = chapterPages(titles, work.prefix);
    if (!chapters.length) {
      console.log(`NO CHAPTER PAGES for prefix "${work.prefix}" (${titles.length} raw)`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_chapter_pages', prefix: work.prefix, raw_titles: titles.slice(0, 20) });
      return;
    }
    for (const title of chapters) {
      const t = await parsePage(title);
      if (t) parts.push({ title, text: t });
      await sleep(400);
    }
  }

  const body = parts.map(p => `${p.title}\n\n${p.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(body);
  if (!parts.length || words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const sourceRef = (work.page ? [work.page] : [work.prefix])
    .map(p => `https://zh.wikisource.org/wiki/${encodeURIComponent(p)}`).join(' ');
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/chinese-originals',
    'era: pre-0 (BCE)',
    `source: Chinese Wikisource (zh.wikisource.org)`,
    `source_url: ${sourceRef}`,
    'format: Classical Chinese',
    'language: Chinese',
    'license: public domain (pre-0 classical text)',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} chapters)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Chinese Pre-CE Classics Fetcher (zh.wikisource.org) ===\n');
  const manifest = {
    source: 'Chinese Wikisource (zh.wikisource.org) via the MediaWiki parse API',
    era: 'pre-0 (BCE)',
    license: 'Public domain',
    format: 'Classical Chinese',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'chinese-pre0-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);