#!/usr/bin/env node
// Fetch the Classical Arabic originals of the St. John's Middle Eastern
// Classics (MAMEC) canon from Arabic Wikisource (ar.wikisource.org), read
// through the MediaWiki parse API. Arabic Wikisource rate-limits aggressively,
// so this fetcher backs off harder than the others.
//
//   node scripts/fetch-arabic-originals.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'arabic-originals');
const API = 'https://ar.wikisource.org/w/api.php';

const WORKS = [
  { slug: 'al-ghazali-deliverance-from-error', title: 'الغزالي، المنقذ من الضلال (al-Ghazālī, Deliverance from Error)', page: 'المنقذ من الضلال' },
  { slug: 'al-ghazali-incoherence', title: 'الغزالي، تهافت الفلاسفة (al-Ghazālī, The Incoherence of the Philosophers)', prefix: 'تهافت الفلاسفة/' },
  { slug: 'ibn-rushd-decisive-treatise', title: 'ابن رشد، فصل المقال فيما بين الحكمة والشريعة من الاتصال (Ibn Rushd, The Decisive Treatise)', page: 'فصل المقال فيما بين الحكمة والشريعة من الاتصال' },
  { slug: 'ibn-rushd-bidayat-al-mujtahid', title: 'ابن رشد، بداية المجتهد ونهاية المقتصد (Ibn Rushd, Bidāyat al-Mujtahid)', prefix: 'بداية المجتهد - كتاب ' },
  { slug: 'ibn-khaldun-muqaddimah', title: 'ابن خلدون، مقدمة (Ibn Khaldūn, The Muqaddimah)', prefix: 'مقدمة ابن خلدون/' },
];

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(params, retries = 5) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'live_priors corpus builder (educational corpus)' } });
      if (res.status === 429) { await sleep(8000 * (attempt + 1)); continue; }
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
  const data = await apiGet({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
  return (data?.query?.allpages || []).map(p => p.title).sort();
}

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.page) {
    const t = await parsePage(work.page);
    if (t) parts = [{ title: work.page, text: t }];
    await sleep(800);
  } else {
    const titles = await subpages(work.prefix);
    if (!titles.length) {
      const t = await parsePage(work.prefix.replace(/\/$/, ''));
      if (t) { parts = [{ title: work.prefix.replace(/\/$/, ''), text: t }]; }
      else {
        console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
        manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
        return;
      }
    } else {
      for (const title of titles) {
        const t = await parsePage(title);
        if (t) parts.push({ title, text: t });
        await sleep(700);
      }
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
  const sourceRef = work.page
    ? `https://ar.wikisource.org/wiki/${encodeURIComponent(work.page)}`
    : `https://ar.wikisource.org/wiki/${encodeURIComponent(work.prefix)}`;
  const header = [
    '---',
    `title: ${work.title}`,
    `collection: 11-multi-language/arabic-originals`,
    `source: Arabic Wikisource (ar.wikisource.org)`,
    `source_url: ${sourceRef}`,
    `format: Classical Arabic`,
    `license: public domain`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} part${parts.length > 1 ? 's' : ''})`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Arabic Originals Fetcher (ar.wikisource.org) ===\n');
  const manifest = {
    source: 'Arabic Wikisource (ar.wikisource.org) via the MediaWiki parse API',
    license: 'Public domain',
    format: 'Classical Arabic',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'arabic-originals-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);