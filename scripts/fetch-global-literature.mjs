#!/usr/bin/env node
// fetch-global-literature.mjs — mass-pull the literature of the global south,
// to match the corpus's empire/western weight. It takes EVERY public-domain
// work in the Gutenberg catalog whose declared language is a global-south /
// non-Western language, and holds it in its ORIGINAL language (the corpus rule:
// original-language canon).
//
// Languages: Spanish, Portuguese, Chinese, Tagalog, Afrikaans, Japanese,
// Arabic, Persian, Hindi and the other Indic languages, Hebrew/Yiddish, Korean,
// Vietnamese, Thai, Turkish, Swahili, Malay/Indonesian, the Iberian minority
// languages, etc. — whatever the catalog declares and has in the public domain.
//
//   node scripts/fetch-global-literature.mjs
//   node scripts/fetch-global-literature.mjs --langs es,pt,zh
//   node scripts/fetch-global-literature.mjs --per-lang 300 --max-bytes 3000000

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, getBounded } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '24-global-literature');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.csv');

// global-south / non-Western declared languages, largest corpora first
const LANGS = ['es', 'pt', 'zh', 'tl', 'af', 'ja', 'he', 'yi', 'te', 'ko', 'ar', 'fa', 'sa', 'hi', 'bn', 'ta', 'ml', 'kn', 'mr', 'gu', 'pa', 'ne', 'si', 'ur', 'tr', 'sw', 'yo', 'ha', 'ig', 'zu', 'xh', 'id', 'ms', 'vi', 'th', 'ca', 'gl', 'eu', 'eo'];

function splitCsvRows(t) { const r = []; let c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') { q = true; } else if (ch === '\n') { r.push(c); c = ''; } else c += ch; } if (c) r.push(c); return r; }
function splitCsvFields(row) { const o = []; let c = '', q = false; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (q) { if (ch === '"') { if (row[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') { q = true; } else if (ch === ',') { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(f => f.trim()); }

function slug(s) { return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9\u0400-\u04ff\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled'; }

async function main() {
  const langs = process.argv.includes('--langs') ? new Set(process.argv[process.argv.indexOf('--langs') + 1].split(',')) : new Set(LANGS);
  const perLang = process.argv.includes('--per-lang') ? +process.argv[process.argv.indexOf('--per-lang') + 1] : 900;
  const maxBytes = process.argv.includes('--max-bytes') ? +process.argv[process.argv.indexOf('--max-bytes') + 1] : 2_500_000;
  console.log('=== Global Literature Mass-Pull (Gutenberg, original languages) ===\n');
  const rows = splitCsvRows(fs.readFileSync(CATALOG, 'utf8')).slice(1);
  const byLang = {};
  for (const row of rows) {
    const f = splitCsvFields(row);
    if (f.length < 6 || f[1] !== 'Text') continue;
    const primLang = (f[4] || '').split(';')[0].trim();
    if (!langs.has(primLang)) continue;
    (byLang[primLang] ??= []).push({ id: f[0], title: f[3].replace(/\n/g, ' ').trim().slice(0, 160), authors: f[5], subjects: (f[6] || '').slice(0, 200) });
  }
  let total = 0, rejected = 0;
  const manifest = { source: 'Project Gutenberg catalog (original languages)', fetched_at: new Date().toISOString(), by_language: {}, pulled: [], rejected: [] };
  for (const lang of LANGS) {
    if (!langs.has(lang) || !byLang[lang]) continue;
    const list = byLang[lang].slice(0, perLang);
    console.log(`\n── ${lang}: ${byLang[lang].length} available, pulling ${list.length}`);
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const w of list) {
      const file = path.join(dir, `${lang}-${w.id}-${slug(w.authors.split(',')[0] || 'anon')}.txt`);
      if (fs.existsSync(file)) { total++; n++; continue; }
      const got = await getBounded(`https://www.gutenberg.org/cache/epub/${w.id}/pg${w.id}.txt`, maxBytes);
      let text = got && got.text ? got.text : null;
      if (!text) {
        const got2 = await getBounded(`https://www.gutenberg.org/cache/epub/${w.id}/pg${w.id}-0.txt`, maxBytes);
        text = got2 && got2.text ? got2.text : null;
      }
      if (!text) { rejected++; manifest.rejected.push({ lang, id: w.id, title: w.title, reason: 'fetch_failed_or_oversize' }); continue; }
      let s = text.indexOf('*** START OF'); if (s === -1) s = text.indexOf('*END THE SMALL PRINT'); if (s !== -1) { const nl = text.indexOf('\n', s); if (nl !== -1) text = text.slice(nl + 1); }
      let e = text.indexOf('*** END OF'); if (e === -1) e = text.indexOf('End of the Project Gutenberg'); if (e !== -1) text = text.slice(0, e);
      text = text.trim();
      const words = wordsIn(text);
      if (words < 600) { rejected++; manifest.rejected.push({ lang, id: w.id, title: w.title, reason: 'under_600_words', words }); continue; }
      const front = ['---', `title: ${w.title}`, `collection: 24-global-literature/${lang}`, `language: ${lang}`, 'region: global south / non-Western', 'source: Project Gutenberg', `source_url: https://www.gutenberg.org/ebooks/${w.id}`, 'license: public domain', `author_catalog: ${w.authors.slice(0, 160)}`, `subjects: ${w.subjects}`, '---', ''].join('\n');
      fs.writeFileSync(file, front + text + '\n', 'utf8');
      manifest.pulled.push({ lang, id: w.id, title: w.title, words, file: path.relative(ROOT, file) });
      total++; n++;
      if (n % 50 === 0) console.log(`   ${lang}: ${n}`);
      await sleep(120);
    }
    manifest.by_language[lang] = { available: byLang[lang].length, pulled: n };
    console.log(`   ${lang} done: ${n}`);
  }
  fs.writeFileSync(path.join(ROOT, 'manifests', 'global-literature-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${total} works held, ${rejected} rejected ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
