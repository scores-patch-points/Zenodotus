#!/usr/bin/env node
// fetch-anticolonial-vast.mjs — expand 21-anti-colonial at scale.
//
// Pulls, from the Gutenberg catalog, every work whose SUBJECTS place it in the
// anti-colonial / colonial / liberation field — colonies and colonization,
// imperialism, independence and nationalism, indigenous peoples, slavery and
// abolition, race relations, and the history of the colonized regions (India
// under the British, Africa, Ireland, Egypt, the Philippines, Cuba, …). Fiction
// and juvenile noise are excluded so this is the argument/record, not novels
// that merely mention a colony.
//
//   node scripts/fetch-anticolonial-vast.mjs
//   node scripts/fetch-anticolonial-vast.mjs --cap 1500

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, getBounded } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '21-anti-colonial', 'colonial-studies');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.tsv');

const INCLUDE = /coloni|imperialis|independence|nationalism|self-determin|indigenous|race relations|slave|abolition|decolon|sepoys|colonization|british occupation|oppression/i;
const REGION = /india|africa|ireland|egypt|philippine|cuba|china|japan|persia|ottoman|boer|native american|indian|west indies|caribbean|algeria|nigeria|kenya|ghana|south africa|mexico|peru|brazil/i;
const EXCLUDE = /\b(fiction|novel|juvenile|children|poetry|drama|romance|fairy|humor|ghost|detective|christmas)\b/i;

function splitCsvRows(t) { const r = []; let c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') { q = true; } else if (ch === '\n') { r.push(c); c = ''; } else c += ch; } if (c) r.push(c); return r; }
function splitCsvFields(row) { const o = []; let c = '', q = false; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (q) { if (ch === '"') { if (row[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') { q = true; } else if (ch === ',') { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(f => f.trim()); }
const slug = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';

async function main() {
  const cap = process.argv.includes('--cap') ? +process.argv[process.argv.indexOf('--cap') + 1] : 1600;
  const maxBytes = process.argv.includes('--max-bytes') ? +process.argv[process.argv.indexOf('--max-bytes') + 1] : 3_000_000;
  console.log('=== Vast Anti-Colonial Puller (Gutenberg, by subject) ===\n');
  // ids already held so we never re-pull
  const held = new Set();
  for (const m of ['global-literature-manifest.json', 'counter-archive-manifest.json']) {
    try { for (const p of (JSON.parse(fs.readFileSync(path.join(ROOT, 'manifests', m), 'utf8')).pulled || [])) if (p.id) held.add(String(p.id)); } catch { }
  }
  const rows = fs.readFileSync(CATALOG, 'utf8').split('\n').map(l => l.split('\t'));
  const picks = [];
  for (const f of rows) {
    if (f.length < 6) continue;
    const id = f[0], type = f[1], title = f[2], lang = (f[3] || '').split(';')[0].trim(), authors = f[4], subjects = f[5] || '', shelves = f[6] || '';
    if (type !== 'Text' || lang !== 'en') continue;
    const hay = `${subjects} ${shelves}`;
    if (!INCLUDE.test(hay)) continue;
    if (EXCLUDE.test(subjects) && !/history|government|politic|social|race|slave|coloni/i.test(subjects)) continue;
    if (held.has(String(id))) continue;
    picks.push({ id, title, authors, subjects });
  }
  console.log(`matched ${picks.length} anti-colonial works (de-duped); pulling up to ${cap}\n`);
  const list = picks.slice(0, cap);
  const manifest = { source: 'Project Gutenberg catalog (subjects: colonies/colonial/imperialism/independence/nationalism/indigenous/slavery/race)', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const w of list) {
    const file = path.join(OUT, `${w.id}-${slug(w.authors.split(',')[0] || 'anon')}-${slug(w.title).slice(0, 40)}.txt`);
    if (fs.existsSync(file)) { n++; continue; }
    const got = await getBounded(`https://www.gutenberg.org/cache/epub/${w.id}/pg${w.id}.txt`, maxBytes);
    let text = got && got.text ? got.text : null;
    if (!text) { const g2 = await getBounded(`https://www.gutenberg.org/cache/epub/${w.id}/pg${w.id}-0.txt`, maxBytes); text = g2 && g2.text ? g2.text : null; }
    if (!text) { manifest.rejected.push({ id: w.id, title: w.title, reason: 'fetch_failed_or_oversize' }); continue; }
    let s = text.indexOf('*** START OF'); if (s === -1) s = text.indexOf('*END THE SMALL PRINT'); if (s !== -1) { const nl = text.indexOf('\n', s); if (nl !== -1) text = text.slice(nl + 1); }
    let e = text.indexOf('*** END OF'); if (e === -1) e = text.indexOf('End of the Project Gutenberg'); if (e !== -1) text = text.slice(0, e);
    text = text.trim();
    const words = wordsIn(text);
    if (words < 600) { manifest.rejected.push({ id: w.id, title: w.title, reason: 'under_600_words', words }); continue; }
    const region = (w.subjects.match(REGION) || ['global'])[0].toLowerCase();
    const front = ['---', `title: ${w.title}`, 'collection: 21-anti-colonial/colonial-studies', `region: ${region}`, 'counter: colonialism / empire', `subjects: ${w.subjects.replace(/\s+/g, ' ').slice(0, 220)}`, 'source: Project Gutenberg', `source_url: https://www.gutenberg.org/ebooks/${w.id}`, 'language: English', 'license: public domain', `author_catalog: ${w.authors.slice(0, 160)}`, 'perspective: colonized peoples', '---', ''].join('\n');
    fs.writeFileSync(file, front + text + '\n', 'utf8');
    manifest.pulled.push({ id: w.id, title: w.title, region, words, file: path.relative(ROOT, file) });
    n++;
    if (n % 50 === 0) console.log(`  ${n} pulled`);
    await sleep(100);
  }
  fs.writeFileSync(path.join(ROOT, 'manifests', 'anticolonial-vast-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
