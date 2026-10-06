#!/usr/bin/env node
// Fetch the Greek original of the Poimandres (Corpus Hermeticum I) — the
// demiurge tractate — from the proofread 1854 Parthey edition on Greek
// Wikisource. Pages 25-42 of the DjVu carry the poemander proper; we pull
// each proofread page's <section begin="text"/> block, strip el.wikisource
// markup and critical notes, and keep only the running Greek text.
//
// The score-card rule (like fetch-sanskrit-canon.mjs): every fetched doc
// carries YAML frontmatter with source/provenance, and the original-language
// text is preserved; no translation stands in for it.
//
//   node scripts/fetch-poimandres-greek.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '11-multi-language', 'greek-originals');
const OUT_FILE = path.join(OUT_DIR, 'corpus-hermeticum-poimandres.txt');
const API = 'https://el.wikisource.org/w/api.php';
const PAGES = Array.from({ length: 42 - 25 + 1 }, (_, i) => 25 + i);
const UA = 'eo-corpus/1.0 (slow research fetcher)';

function stripMarkup(raw) {
  let s = raw
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '')
    .replace(/<onlyinclude>|<\/onlyinclude>/g, '')
    .replace(/<section[^>]*>/g, '')
    .replace(/<\/section>/g, '');
  // remove the critical-apparatus block entirely (notes), keep flow text
  s = s.replace(/<div style="margin-left:2em[^>]*>[\s\S]*?<\/div>/g, '');
  // remove interlinear reference templates: {{αρίθμηση Burnet|...}}
  s = s.replace(/\{\{αρίθμηση Burnet\|[^}]*\}\}/g, ' ');
  // strip note templates down to their lemma (the second positional arg)
  s = s.replace(/\{\{Σημείωση\|(?:[^}|]*\|)?([^}|]*)\|?.*?\}\}/g, '$1');
  // unwrap display-only templates
  s = s.replace(/\{\{(?:c|larger|small|κσγ|κσχασ)\|([^}]*)\}\}/g, '$1');
  s = s.replace(/\{\{κσχασ\|[^}]*\}\}/g, ' ');
  // fold any remaining {{...}} to empty and drop stray markup
  s = s.replace(/\{\{[^}]*\}\}/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

async function fetchPage(n) {
  const title = `Σελίδα:Hermetis Trismegisti Poemander (1854).djvu/${n}`;
  const qs = new URLSearchParams({
    action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    titles: title, format: 'json',
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) { await sleep(40000 + attempt * 20000); continue; }
      if (!res.ok) { console.error(`  page ${n}: HTTP ${res.status}`); return null; }
      const data = await res.json();
      const pg = Object.values(data?.query?.pages ?? {})[0];
      const html = pg?.revisions?.[0]?.slots?.main?.['*'];
      if (!html) { console.error(`  page ${n}: no content`); return null; }
      return stripMarkup(html);
    } catch (e) {
      console.error(`  page ${n}: ${e.message}`);
      await sleep(20000 * (attempt + 1));
    }
  }
}

async function fetchPlain(title) {
  const qs = new URLSearchParams({
    action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    titles: title, format: 'json',
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) { await sleep(40000 + attempt * 20000); continue; }
      if (!res.ok) return null;
      const data = await res.json();
      const pg = Object.values(data?.query?.pages ?? {})[0];
      const html = pg?.revisions?.[0]?.slots?.main?.['*'];
      if (!html) return null;
      return stripMarkup(html);
    } catch { await sleep(20000 * (attempt + 1)); }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const wantOthers = process.argv.includes('--others');
  if (!wantOthers || !fs.existsSync(OUT_FILE)) {
    console.log('=== Poimandres (Corpus Hermeticum I), Greek, 1854 Parthey ===');
    const parts = [];
    let failed = 0;
    for (const n of PAGES) {
      const text = await fetchPage(n);
      if (text && text.length > 100) { parts.push(`${text}\n`); }
      else failed++;
      console.log(`  page ${n}: ${text?.length ?? 0} chars`);
      await sleep(3000);
    }
    if (!parts.length) { console.error('no pages retrieved'); process.exit(1); }
    const body = parts.join('\n');
    const frontmatter = [
      '---',
      'title: Ἑρμοῦ τοῦ Τρισμεγίστου Ποιμάνδρης (Poimandres, Corpus Hermeticum I)',
      'collection: 11-multi-language/greek-originals',
      'source: Greek Wikisource — Hermetis Trismegisti Poemander, Gustav Parthey ed., Berlin 1854 (proofread pages 25–42)',
      'source_url: https://el.wikisource.org/wiki/%CE%A0%CE%BF%CE%B9%CE%BC%CE%AC%CE%BD%CE%B4%CF%81%CE%B7%CF%82',
      'format: Ancient Greek (polytonic)',
      'license: public domain (1854 critical edition; ancient text)',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(OUT_FILE, frontmatter + body + '\n');
    console.log(`\nWrote ${OUT_FILE} (${body.length} chars body)`);
    console.log(`pages failed: ${failed}/${PAGES.length}`);
  } else {
    console.log('=== Poimandres present, --others only ===');
  }

  // The other Corpus Hermeticum tractates Greek Wikisource holds as plain pages.
  const OTHERS = [
    { slug: 'corpus-hermeticum-krater', title: 'Ὁ κρατῆρ, ἡ μονάς (Corpus Hermeticum IV, To Tatt)', page: 'Ο κρατήρ, η μονάς' },
    { slug: 'corpus-hermeticum-tat', title: 'Πρὸς Τὰτ υἱόν (Corpus Hermeticum IV continuation)', page: 'Προς Τατ υιόν' },
    { slug: 'corpus-hermeticum-hieros-logos', title: 'Λόγος ἱερός (Corpus Hermeticum III, Sacred Sermon)', page: 'Λόγος ιερός' },
    { slug: 'corpus-hermeticum-kerygmata', title: 'Κηρύγματα (Corpus Hermeticum, Proclamations)', page: 'Κηρύγματα' },
  ];
  for (const o of OTHERS) {
    const text = await fetchPlain(o.page);
    const out = path.join(OUT_DIR, `${o.slug}.txt`);
    if (!text || text.length < 200) { console.error(`  ${o.slug}: no text (${text?.length ?? 0})`); continue; }
    const fm = [
      '---',
      `title: ${o.title}`,
      'collection: 11-multi-language/greek-originals',
      `source: Greek Wikisource — ${o.page}`,
      `source_url: https://el.wikisource.org/wiki/${encodeURIComponent(o.page)}`,
      'format: Ancient Greek (polytonic)',
      'license: public domain (ancient text; 1854 Parthey edition where paginated)',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(out, fm + text + '\n');
    console.log(`  ${o.slug}: wrote ${text.length} chars`);
    await sleep(12000);
  }
}

main().catch(console.error);