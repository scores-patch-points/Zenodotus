#!/usr/bin/env node
// Fetch the Masnavi-ye Ma'navi of Rumi in the ORIGINAL Persian from Ganjoor
// (ganjoor.net) — the public-domain classical Persian verse library. Each
// daftar (book) is discovered from its index page's section links; each
// section page carries the couplets (beyts) in Persian. No translation stands
// in for the original; the file is held as the Persian text itself.
//
//   node scripts/fetch-rumi-masnavi-persian.mjs [--daftar 1] [--limit 2]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '11-multi-language', 'persian-originals');
const SITE = 'https://ganjoor.net';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) eo-corpus/1.0';

async function get(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) { await sleep(20000 + attempt * 20000); continue; }
      if (!res.ok) { console.error(`  ${url}: HTTP ${res.status}`); return null; }
      return await res.text();
    } catch (e) { console.error(`  ${url}: ${e.message}`); await sleep(15000 * (attempt + 1)); }
  }
}

const clean = (x) => String(x).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function sectionCouplets(url) {
  const html = await get(url);
  if (!html) return [];
  const m1 = [...html.matchAll(/class="m1"[^>]*>(.*?)<\/div>/g)].map((x) => clean(x[1]));
  const m2 = [...html.matchAll(/class="m2"[^>]*>(.*?)<\/div>/g)].map((x) => clean(x[1]));
  const beyts = [];
  for (let i = 0; i < Math.max(m1.length, m2.length); i++) {
    if (m1[i] || m2[i]) beyts.push(`${m1[i] ?? ''}\t${m2[i] ?? ''}`);
  }
  return beyts;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const daftarArg = (process.argv.find(a => a.startsWith('--daftar=')) ?? '').split('=')[1];
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;

  const daftars = Array.from({ length: 6 }, (_, i) => i + 1).filter(d => !daftarArg || String(d) === daftarArg);
  for (const d of daftars) {
    const out = path.join(OUT_DIR, `masnavi-maanavi-daftar-${d}.txt`);
    if (fs.existsSync(out)) { console.log(`skip daftar ${d}`); continue; }
    console.log(`== Daftar ${d}`);
    const idx = await get(`${SITE}/moulavi/masnavi/daftar${d}/`);
    if (!idx) { console.error(`  no daftar index`); continue; }
    const links = [...new Set([...idx.matchAll(/href="(\/moulavi\/masnavi\/daftar\d+\/sh\d+)"?\s*[^>]*>\s*([^<]*)</g)].map((x) => ({ url: x[1], title: clean(x[2]).replace(/^[-\sـ]*/, '') })))];
    if (!links.length) { console.error(`  no sections found`); continue; }
    const sections = [];
    let done = 0;
    for (const l of links) {
      if (done >= limit) break;
      const title = (l.title || decodeURIComponent(l.url.split('/').pop()).replace(/^sh\d+\s*[-ـ]\s*/, ''))
        .replace(/^بخش\s*(?:۱|۲|۳|۴|۵|۶|۷|۸|۹|۰)?\s*[-ـ]?\s*/u, '').trim();
const beyts = await sectionCouplets(`${SITE}${l.url}`);
      if (beyts.length) sections.push(`\n### ${title}\n\n${beyts.join('\n')}`);
      else console.error(`  ${l.url}: no beyts`);
      if (done % 25 === 0) console.error(`  daftar ${d}: ${done}/${links.length} sections`);
      done++;
      await sleep(1200);
    }
    if (!sections.length) { console.error(`  daftar ${d}: nothing`); continue; }
    const fm = [
      '---',
      `title: مثنوی معنوی — دفتر ${d} (Masnavi-ye Ma'navi, Daftar ${d}, Rumi — Persian)`,
      'collection: 11-multi-language/persian-originals',
      'source: Ganjoor (ganjoor.net) — classical Persian verse library, Mowlana/molavi masnavi',
      `source_url: ${SITE}/moulavi/masnavi/daftar${d}/`,
      'format: Persian (Perso-Arabic script)',
      'license: public domain (Jalal al-Din Rumi, 13th c.); as published by Ganjoor',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(out, fm + sections.join('\n') + '\n');
    console.log(`  daftar ${d}: ${sections.length} sections, ${links.length} total`);
    await sleep(3000);
  }
}

main().catch(console.error);