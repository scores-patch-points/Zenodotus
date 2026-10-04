#!/usr/bin/env node
// fetch-ethos-canon.mjs — pull the missing original-language canon for the
// ethos archons into the corpus: Dante (Italian), George Eliot (English),
// Pascal (French), and the German Nietzsche corpus. Each work lands in the
// original language, with provenance frontmatter, following the existing
// greek/latin/arabic-originals and gutenberg fetchers.
//
//   node scripts/fetch-ethos-canon.mjs
//
// Original-language sources:
//   it.wikisource  Divina Commedia (subpages, enumerated live)
//   fr.wikisource  Pensées (subpages)
//   gutenberg.org  Middlemarch (English), Nietzsche German works
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GUTENBERG = path.join(ROOT, '01-literature-books', 'gutenberg');
const GUTENBERG_DE = path.join(ROOT, '11-multi-language', 'gutenberg-non-en', 'de');
const ITALIAN = path.join(ROOT, '11-multi-language', 'italian-originals');
const FRENCH = path.join(ROOT, '11-multi-language', 'french-originals');
const UA = 'live_priors corpus builder (educational corpus)';

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection|mw-pt-)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(api, params, retries = 6) {
  const url = `${api}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await sleep(9000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
      const t = await res.text();
      if (!t.trim().startsWith('{')) { await sleep(4000); continue; }
    } catch { /* retry */ }
    await sleep(2500);
  }
  return null;
}

async function parsePage(api, page) {
  const data = await apiGet(api, { action: 'parse', page, prop: 'text', redirects: '1' });
  const html = data?.parse?.text?.['*'];
  if (!html) return null;
  const text = cleanHtml(html);
  return text.length ? text : null;
}

async function subpages(api, prefix) {
  const out = [];
  let params = { action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' };
  for (;;) {
    const data = await apiGet(api, params);
    if (!data) break;
    out.push(...(data.query?.allpages || []).map(p => p.title));
    if (!data.continue) break;
    params = { ...params, ...data.continue };
    await sleep(300);
  }
  return out.sort();
}

async function pullWikisource(api, work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.page) {
    const t = await parsePage(api, work.page);
    if (t) parts = [{ title: work.page, text: t }];
    await sleep(900);
  } else {
    const skip = new Set(work.skip ?? []);
    const all = await subpages(api, work.prefix);
    const titles = all.filter(t => !skip.has(t) && !t.includes(':')); // skip ns-chrome
    for (const title of titles) {
      const t = await parsePage(api, title);
      if (t) parts.push({ title, text: t });
      await sleep(500);
    }
  }
  if (!parts.length) {
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_pages' });
    console.log('no pages');
    return;
  }
  // Dedupe by content hash
  const byHash = new Map();
  const deduped = [];
  for (const p of parts) {
    const h = crypto.createHash('sha1').update(p.text.trim()).digest('hex');
    if (byHash.has(h)) continue;
    byHash.set(h, p.title);
    deduped.push(p);
  }
  const body = deduped.map(p => `${p.title}\n\n${p.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(body);
  if (words < 600) {
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    console.log(`too short (${words} words)`);
    return;
  }
  fs.mkdirSync(work.dir, { recursive: true });
  const file = path.join(work.dir, `${work.slug}.txt`);
  const header = [
    '---',
    `title: ${work.title}`,
    `collection: ${path.relative(ROOT, work.dir)}`,
    `source: ${work.source}`,
    `source_url: ${work.sourceUrl}`,
    `format: ${work.format}`,
    `license: public domain`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: deduped.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${deduped.length} parts)`);
}

async function pullGutenberg(id, title, outDir, manifest) {
  process.stdout.write(`  ${slugify(title)}... `);
  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  let text = null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) text = await res.text();
  } catch { /* fall through */ }
  if (!text) { manifest.rejected.push({ slug: `pg${id}`, title, reason: 'fetch_failed' }); console.log('fetch failed'); return; }
  let start = text.indexOf('*** START OF');
  if (start === -1) start = text.indexOf('*END THE SMALL PRINT');
  if (start !== -1) { const nl = text.indexOf('\n', start); if (nl !== -1) text = text.slice(nl + 1); }
  let end = text.indexOf('*** END OF');
  if (end === -1) end = text.indexOf('End of the Project Gutenberg');
  if (end !== -1) text = text.slice(0, end);
  text = text.trim();
  const words = wordsIn(text);
  if (words < 600) { manifest.rejected.push({ slug: `pg${id}`, title, reason: 'under_600_words', words }); console.log('too short'); return; }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `pg${id}_${slugify(title)}.txt`);
  fs.writeFileSync(file, text + '\n', 'utf8');
  manifest.pulled.push({ slug: `pg${id}`, title, words, parts: 1, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words)`);
}

async function main() {
  const manifest = {
    source: 'it.wikisource / fr.wikisource / Project Gutenberg',
    license: 'public domain originals',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  console.log('=== Dante, Divina Commedia (Italian original) ===');
  await pullGutenberg(1000, 'La_Divina_Commedia_di_Dante_Italian', ITALIAN, manifest);

  console.log('\n=== Pascal, Pensées (French original) ===');
  await pullWikisource('https://fr.wikisource.org/w/api.php', {
    slug: 'pascal-pensees', title: 'Blaise Pascal, Pensées (éd. Brunschvicg, French)',
    prefix: 'Pensées (Pascal, éd. Brunschvicg)/Pensées/', dir: FRENCH, format: 'French',
    source: 'French Wikisource (fr.wikisource.org)',
    sourceUrl: 'https://fr.wikisource.org/wiki/Pens%C3%A9es_(Pascal,_%C3%A9d._Brunschvicg)',
    skip: ['Pensées (Pascal, éd. Brunschvicg)/Pensées'],
  }, manifest);

  console.log('\n=== George Eliot, Middlemarch (English original) ===');
  await pullGutenberg(145, 'Middlemarch_George_Eliot', GUTENBERG, manifest);

  console.log('\n=== Nietzsche, German originals (Gutenberg DE) ===');
  const nietzsche = [
    [7204, 'Jenseits_von_Gut_und_Böse_Nietzsche'],
    [7203, 'Götzen-Dämmerung_Nietzsche'],
    [7202, 'Ecce_Homo_Nietzsche'],
    [7206, 'Die_Geburt_der_Tragödie_Nietzsche'],
    [7207, 'Menschliches_Allzumenschliches_Nietzsche'],
    [60360, 'Der_Wille_zur_Macht_Nietzsche'],
  ];
  for (const [id, title] of nietzsche) {
    await pullGutenberg(id, title, GUTENBERG_DE, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'ethos-canon-manifest.json');
  let prior = { pulled: [], rejected: [] };
  try { prior = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first run */ }
  const mergeBySlug = (older, newer) => {
    const bySlug = new Map(older.map(e => [e.slug, e]));
    for (const e of newer) bySlug.set(e.slug, e);
    return [...bySlug.values()];
  };
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify({
    ...manifest,
    pulled: mergeBySlug(prior.pulled ?? [], manifest.pulled),
    rejected: mergeBySlug(prior.rejected ?? [], manifest.rejected),
  }, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);