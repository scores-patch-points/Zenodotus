#!/usr/bin/env node
// fetch-saho.mjs — the anti-apartheid primary record, from South African
// History Online (SAHO), an openly licensed people's-history archive
// (CC BY-NC-SA 4.0). This pulls SAHO's /archive/ items — the flyers, letters,
// newsletters and statements of the liberation movement, the voice of the
// people under apartheid — from the site's own sitemap.
//
// License: SAHO content is CC BY-NC-SA 4.0; the corpus is non-commercial and
// carries the attribution on every document.
//
//   node scripts/fetch-saho.mjs
//   node scripts/fetch-saho.mjs --pages 1 --cap 40

import fs from 'fs';
import path from 'path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '21-anti-colonial', 'saho-archive');
const HOST = 'https://www.sahistory.org.za';

function curl(url, timeout = 45) {
  return new Promise((res, rej) => {
    execFile('curl', ['-skL', '--compressed', '-m', String(timeout), '-A', 'live_priors corpus builder', '--globoff', url], { maxBuffer: 32 * 1024 * 1024 }, (e, o) => (e ? rej(e) : res(o)));
  });
}

function stripChrome(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
}
function toText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&[a-z]+;/g, ' ').replace(/[ \t\u00a0]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extract(page) {
  const ld = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
  const rec = ld.find(x => x['@type'] === 'CreativeWork' || x['@type'] === 'Article') || {};
  const title = rec.name || (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [,''])[1].replace(/<[^>]+>/g, '').trim();
  const date = (rec.datePublished || rec.dateModified || '').slice(0, 10);
  // body: the field--name-body div (class is "field field--name-body ...")
  const start = page.search(/<div[^>]*class="[^"]*field--name-body[^"]*"[^>]*>/);
  let body = '';
  if (start >= 0) {
    const openTag = page.slice(start).match(/^<div[^>]*>/);
    const from = start + (openTag ? openTag[0].length : 0);
    const rest = page.slice(from);
    const endRel = rest.search(/<section[^>]*saho-citation|<div[^>]*class="[^"]*field--name-field-|<\/article>/);
    body = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 40000);
  } else {
    const a = page.match(/<article[\s\S]*?<\/article>/);
    body = a ? a[0] : page;
  }
  let text = toText(stripChrome(body));
  return { title: toText(title), date, body: text };
}

async function main() {
  const pagesCap = process.argv.includes('--pages') ? +process.argv[process.argv.indexOf('--pages') + 1] : 2;
  const cap = process.argv.includes('--cap') ? +process.argv[process.argv.indexOf('--cap') + 1] : 120;
  console.log('=== SAHO archive fetcher (CC BY-NC-SA 4.0) ===\n');
  // collect /archive/ URLs from sitemap pages
  const urls = new Set();
  for (let p = 1; p <= pagesCap && urls.size < cap * 4; p++) {
    try {
      const xml = await curl(`${HOST}/sitemap.xml?page=${p}`);
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const u = m[1].replace(/^http:\/\/default/, HOST);
        if (u.includes('/archive/')) urls.add(u);
      }
    } catch { }
    await sleep(500);
  }
  const list = [...urls].slice(0, cap);
  console.log(`collected ${urls.size} /archive/ URLs; fetching ${list.length}\n`);
  const manifest = { source: 'South African History Online (SAHO)', license: 'CC BY-NC-SA 4.0', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };
  const shorts = [];
  let n = 0;
  for (const u of list) {
    let html; try { html = await curl(u); } catch { html = null; }
    if (!html) { manifest.rejected.push({ url: u, reason: 'fetch_failed' }); continue; }
    const { title, date, body } = extract(html);
    if (!title) { manifest.rejected.push({ url: u, reason: 'no_title' }); continue; }
    const words = wordsIn(body);
    // short primary documents (flyers, statements) are the voice too — hold
    // them by aggregation rather than discard them under the floor.
    if (words < 600) { shorts.push({ title, date, body, url: u }); continue; }
    fs.mkdirSync(OUT, { recursive: true });
    const slug = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || `saho-${n}`;
    const file = path.join(OUT, `${slug}.txt`);
    const front = ['---', `title: ${title}`, 'collection: 21-anti-colonial/saho-archive', 'region: South Africa', 'counter: apartheid / settler colonialism / empire', `date: ${date || 'n.d.'}`, 'source: South African History Online (SAHO)', `source_url: ${u}`, 'language: English', 'license: CC BY-NC-SA 4.0 (South African History Online)', 'attribution: South African History Online, https://www.sahistory.org.za', '---', ''].join('\n');
    fs.writeFileSync(file, front + body + '\n', 'utf8');
    manifest.pulled.push({ title, date, words, file: path.relative(ROOT, file), url: u });
    n++;
    if (n % 10 === 0) console.log(`  ... ${n} pulled`);
    await sleep(350);
  }
  // aggregate the short documents into one living collection file
  const shortText = shorts.map(s => `## ${s.title} (${s.date || 'n.d.'})\n${s.url}\n\n${s.body}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  if (shortText && wordsIn(shortText) >= 600) {
    fs.mkdirSync(OUT, { recursive: true });
    const front = ['---', `title: South African liberation documents — collected short statements, flyers and letters (${shorts.length} items)`, 'collection: 21-anti-colonial/saho-archive', 'region: South Africa', 'counter: apartheid / settler colonialism / empire', 'source: South African History Online (SAHO)', 'source_url: https://www.sahistory.org.za/', 'language: English', 'license: CC BY-NC-SA 4.0 (South African History Online)', 'attribution: South African History Online, https://www.sahistory.org.za', 'note: short primary documents aggregated (flyers, statements, letters)', '---', ''].join('\n');
    fs.writeFileSync(path.join(OUT, 'saho-short-documents-collected.txt'), front + shortText + '\n', 'utf8');
    manifest.pulled.push({ title: 'collected short documents', items: shorts.length, words: wordsIn(shortText), file: '21-anti-colonial/saho-archive/saho-short-documents-collected.txt' });
    console.log(`  ✓ aggregated ${shorts.length} short documents`);
  }
  fs.writeFileSync(path.join(ROOT, 'manifests', 'saho-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} files pulled (${shorts.length} shorts aggregated), ${manifest.rejected.length} rejected ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
