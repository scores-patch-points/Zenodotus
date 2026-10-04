#!/usr/bin/env node
// Fetch the Latin originals of the St. John's Western canon — the sophomore
// Roman/medieval core plus the Latin-science and Latin-philosophy texts read in
// the junior/senior tutorials — from Latin Wikisource (la.wikisource.org),
// read through the MediaWiki parse API.
//
//   node scripts/fetch-latin-originals.mjs
//   node scripts/fetch-latin-originals.mjs --only tacitus-annals,livy

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'latin-originals');
const API = 'https://la.wikisource.org/w/api.php';

const WORKS = [
  { slug: 'tacitus-annals', title: 'Tacitus, Ab excessu divi Augusti (Annales)', prefix: 'Ab excessu divi Augusti (Annales)/' },
  { slug: 'tacitus-histories', title: 'Tacitus, Historiae', prefix: 'Historiae (Tacitus)/' },
  { slug: 'livy-history', title: 'Livius, Ab urbe condita', prefix: 'Ab urbe condita/' },
  { slug: 'augustine-confessions', title: 'Augustinus, Confessiones', prefix: 'Confessiones (ed. Migne)/' },
  { slug: 'boethius-consolation', title: 'Boethius, De philosophiae consolatione', prefix: 'De philosophiae consolatione/' },
  { slug: 'anselm-proslogion', title: 'Anselmus, Proslogion seu Alloquium de Dei existentia', page: 'Proslogion seu Alloquium de Dei existentia' },
  { slug: 'aquinas-summa-prima', title: 'Thomas Aquinas, Summa Theologiae — Prima pars', prefix: 'Summa Theologiae/Prima pars/' },
  { slug: 'spinoza-ethica', title: 'Spinoza, Ethica ordine geometrico demonstrata', prefix: 'Ethica/Pars ' },
  { slug: 'bacon-novum-organum', title: 'Bacon, Novum Organum', prefix: 'Novum Organum/' },
  { slug: 'copernicus-revolutionibus', title: 'Copernicus, De revolutionibus orbium coelestium', prefix: 'De revolutionibus orbium coelestium/' },
  { slug: 'newton-principia', title: 'Newton, Philosophiæ naturalis principia mathematica', prefix: 'Philosophiae Naturalis Principia Mathematica/' },
];

function cleanHtml(html) {
  // Same rule as the Greek fetcher: never strip <table>, some Latin texts
  // (notably the Principia) are laid out in tables.
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

async function apiGet(params, retries = 4) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'live_priors corpus builder (educational corpus)' } });
      if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(1500);
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
    await sleep(600);
  } else {
    const titles = await subpages(work.prefix);
    if (!titles.length) {
      console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
      return;
    }
    for (const title of titles) {
      const t = await parsePage(title);
      if (t) parts.push({ title, text: t });
      await sleep(500);
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
  const sourceRef = work.pages
    ? work.pages.map(p => `https://la.wikisource.org/wiki/${encodeURIComponent(p)}`).join(' ')
    : `https://la.wikisource.org/wiki/${encodeURIComponent(work.page || work.prefix)}`;
  const header = [
    '---',
    `title: ${work.title}`,
    `collection: 11-multi-language/latin-originals`,
    `source: Latin Wikisource (la.wikisource.org)`,
    `source_url: ${sourceRef}`,
    `format: Latin`,
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

  console.log('=== Latin Originals Fetcher (la.wikisource.org) ===\n');
  const manifest = {
    source: 'Latin Wikisource (la.wikisource.org) via the MediaWiki parse API',
    license: 'Public domain',
    format: 'Latin',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'latin-originals-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);