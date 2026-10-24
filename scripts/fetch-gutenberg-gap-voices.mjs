#!/usr/bin/env node
// fetch-gutenberg-gap-voices.mjs — the Project Gutenberg tail of GAP-SOURCES-PLAN.md (2026-10-24): English books by
// South Asian, African, Indigenous North American authors and first-person accounts of asylum, prison and migration
// that Zenodotus does not hold. Host: www.gutenberg.org (approved earlier; public domain in the USA). Follows
// GAP-INGEST-SPEC.md: frontmatter claims with their basis, sha256 of the bytes as received, the text kept as received
// (LP1: Gutenberg's own header and licence stay in the file), 3 s between requests.
//
// Ids are listed here, but each is checked against the local catalog (manifests/gutenberg-catalog.csv) before it is
// fetched: an id whose catalog author does not match the declared author is rejected. Held ids (any Zenodotus document
// whose header names gutenberg.org/ebooks/<id>) are skipped. `place_by` / `perspective_by` come only from CHECKED below.
//
//   node scripts/fetch-gutenberg-gap-voices.mjs            (resumable; skips files already written)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '20-first-person-voices', 'gutenberg');
const COLL = '20-first-person-voices/gutenberg';
const UA = { 'User-Agent': 'Zenodotus live_priors corpus builder (non-commercial research)' };
const LICENSE = 'Public domain in the USA (Project Gutenberg); see the licence text inside the file';

// [id, authorKey, catalog author pattern, voice]
const FP = 'first-person', UNK = 'unknown';
const LIST = [
  [7951, 'tagore', /Tagore/, FP],
  [22217, 'tagore', /Tagore/, FP],
  [2502, 'tagore', /Tagore/, UNK], [6521, 'tagore', /Tagore/, UNK], [6523, 'tagore', /Tagore/, UNK], [6524, 'tagore', /Tagore/, UNK],
  [23136, 'tagore', /Tagore/, UNK], [24607, 'tagore', /Tagore/, UNK], [33131, 'tagore', /Tagore/, UNK], [33525, 'tagore', /Tagore/, UNK],
  [34757, 'tagore', /Tagore/, UNK], [77892, 'tagore', /Tagore/, UNK], [6519, 'kabir-tagore', /Kabir/, UNK],
  [63231, 'ambedkar', /Ambedkar/, UNK], [63132, 'ambedkar', /Ambedkar/, UNK],
  [40373, 'gandhi', /Gandhi/, UNK], [41954, 'gandhi', /Gandhi/, UNK],
  [69647, 'sorabji', /Sorabji/, UNK], [71004, 'sorabji', /Sorabji/, UNK],
  [15042, 'gronniosaw', /Gronniosaw/, FP],
  [25907, 'eastman', /Eastman, Charles/, UNK], [27448, 'eastman', /Eastman, Charles/, UNK], [28099, 'eastman', /Eastman, Charles/, UNK],
  [34461, 'eastman', /Eastman, Charles/, UNK], [37373, 'eastman', /Eastman, Charles/, UNK],
  [52988, 'pauline-johnson', /Johnson, E\. Pauline/, UNK],
  [11962, 'beers', /Beers, Clifford/, FP],
  [36591, 'packard', /Packard, E/, FP],
  [59899, 'nellie-bly', /Bly, Nellie/, FP], [49314, 'nellie-bly', /Bly, Nellie/, FP],
  [12093, 'keller', /Keller, Helen/, UNK], [31622, 'keller', /Keller, Helen/, UNK],
  [34406, 'berkman', /Berkman/, FP],
  [66938, 'goldman-berkman', /Berkman/, FP],
  [68442, 'berkman-goldman', /Berkman/, UNK],
  [20885, 'antin', /Antin, Mary/, FP],
  [20638, 'antin', /Antin, Mary/, FP],
  [40535, 'antin', /Antin, Mary/, UNK],
];

const csvRows = (t) => { const out = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i];
  if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
  else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
  if (f || row.length) { row.push(f); out.push(row); } return out; };
const yaml = (v) => (v == null ? 'unknown' : /[:#\n"']|^\s|\s$/.test(String(v)) ? JSON.stringify(String(v)) : String(v));


// Place and standpoint claims: written only where a first-person sentence of the author's own text was found and checked
// by reading (2026-10-24, cc-a39f00ac): the value and the sentence's char offset in the body are listed here, and the
// sentence itself is copied into the basis. A pattern search alone was not enough: it matched titles, a translator's
// preface and other people's introductions. Anything not listed is `unknown`.
const CHECKED = {
  15042: { place_by: ['Bornu (Bournou, as the narrative spells it)', 6586], perspective_by: ['enslaved (own account)', 19734] },
  36591: { perspective_by: ['woman committed to an asylum by her husband (own account)', 6370] },
  34406: { perspective_by: ['imprisoned (own account)', 80564] },
  66938: { perspective_by: ['imprisoned (own account)', 6733] },
  20638: { place_by: ['Plotzk (Polotsk), Russia', 6379], perspective_by: ['emigrant (own account)', 7825] },
  7951: { place_by: ['Bengal', 34141] },
  22217: { place_by: ['Calcutta', 116546] },
};
function claimFor(body, id, field) {
  const c = (CHECKED[id] || {})[field];
  if (!c) return { value: 'unknown', basis: 'not stated by the source, or not checked' };
  const s = body.slice(c[1]).match(/^[^]*?[.!?](?=\s|$)/), snip = (s ? s[0] : body.slice(c[1], c[1] + 200)).replace(/\s+/g, ' ').trim();
  return { value: c[0], basis: `stated-in-text (first-person sentence at char ${c[1]}, checked by reading): "${snip.slice(0, 200)}"` };
}

function heldIds() {
  const held = new Set(), re = /gutenberg\.org\/ebooks\/(\d+)|(?:Project Gutenberg|EBook|eBook) #(\d+)/;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.txt')) { const fd = fs.openSync(p, 'r'), b = Buffer.alloc(4096);
      const n = fs.readSync(fd, b, 0, 4096, 0); fs.closeSync(fd); const m = b.slice(0, n).toString('utf8').match(re); if (m) held.add(m[1] || m[2]); } } };
  for (const top of fs.readdirSync(ROOT)) if (/^\d\d-/.test(top)) walk(path.join(ROOT, top));
  return held;
}

async function main() {
  const cat = new Map(); for (const r of csvRows(fs.readFileSync(path.join(ROOT, 'manifests', 'gutenberg-catalog.csv'), 'utf8')).slice(1)) if (r.length > 5) cat.set(r[0], r);
  const held = heldIds(), today = new Date().toISOString().slice(0, 10);
  const manifest = { source: 'Project Gutenberg', license: LICENSE, fetched_at: new Date().toISOString(),
    terms_read: [{ url: 'https://www.gutenberg.org/policy/license.html', date: today, summary: 'Books are public domain in the USA; redistribution with the Project Gutenberg licence kept, or with its trademark removed. Robot access policy: use the mirrors or the cache/epub URLs at a modest rate.' }],
    pulled: [], rejected: [], gaps: [] };
  // resumable: a rerun keeps the rows of earlier runs and retries only what is not yet pulled
  const mfile = path.join(ROOT, 'manifests', 'gutenberg-gap-voices-manifest.json');
  if (fs.existsSync(mfile)) manifest.pulled = JSON.parse(fs.readFileSync(mfile, 'utf8')).pulled || [];
  const done = new Set(manifest.pulled.map((p) => String(p.id)));
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, key, authorPat, voice] of LIST) {
    if (done.has(String(id))) continue;
    const row = cat.get(String(id));
    if (!row) { manifest.rejected.push({ id, reason: 'not_in_catalog' }); continue; }
    const [, type, issued, title, language, authors, subjects] = row;
    if (type !== 'Text' || !authorPat.test(authors)) { manifest.rejected.push({ id, title, reason: 'catalog_author_mismatch', authors }); continue; }
    if (held.has(String(id))) { manifest.rejected.push({ id, title, reason: 'already_held' }); continue; }
    const file = path.join(OUT, `gap-${key}-${id}.txt`);
    if (fs.existsSync(file)) { manifest.rejected.push({ id, title, reason: 'already_written_this_run' }); continue; }
    let buf = null, url = null;
    for (const u of [`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, `https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`]) {
      try { const r = await fetch(u, { headers: UA }); await sleep(3000); if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); url = u; break; } } catch { await sleep(3000); }
    }
    if (!buf) { manifest.rejected.push({ id, title, reason: 'fetch_failed' }); continue; }
    const text = buf.toString('utf8'), words = wordsIn(text);
    if (words < 600) { manifest.rejected.push({ id, title, reason: 'under_600_words', words }); continue; }
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const claim = (name) => claimFor(text, id, name);
    const pb = claim('place_by'), pp = claim('perspective_by');
    const head = {
      title: title.replace(/\s+/g, ' ').trim(), author: authors.replace(/\s+/g, ' ').trim(), collection: COLL, source: 'Project Gutenberg',
      source_url: `https://www.gutenberg.org/ebooks/${id}`, retrieved: today, sha256: sha, received_format: 'txt',
      license: LICENSE, license_url: 'https://www.gutenberg.org/policy/license.html', license_tier: 'pd', attribution: 'none required (public domain in the USA)',
      language: language || 'unknown', language_basis: 'catalog', date: 'unknown', date_basis: 'unknown (the catalog gives the Gutenberg release date only)',
      gutenberg_issued: issued, place_by: pb.value, place_by_basis: pb.basis, place_about: 'unknown', perspective_by: pp.value, perspective_by_basis: pp.basis,
      perspective_about: 'unknown', voice, voice_basis: voice === FP ? 'the work is the author\'s own account (autobiography, letters, memoir or reportage in the first person)' : 'not decided (literary or expository work)',
      translation_of: 'none (or as the title page states)', cultural_note: 'none', privacy_note: 'none', words, catalog_subjects: (subjects || '').replace(/\s+/g, ' ').slice(0, 300),
    };
    const front = ['---', ...Object.entries(head).map(([k, v]) => `${k}: ${yaml(v)}`), '---', ''].join('\n');
    fs.writeFileSync(file, front + text, 'utf8');
    manifest.pulled.push({ file: path.relative(ROOT, file), url, id, ...head });
    console.log(`✓ #${id} ${head.title.slice(0, 60)} (${words} w) ${pb.value !== 'unknown' ? '[place_by] ' : ''}${pp.value !== 'unknown' ? '[perspective_by]' : ''}`);
  }
  fs.writeFileSync(mfile, JSON.stringify(manifest, null, 2));
  console.log(`done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected`);
}
main();
