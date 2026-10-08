#!/usr/bin/env node
// fetch-dloc-oral-histories.mjs — Caribbean oral histories from the Digital
// Library of the Caribbean (dLOC / UFDC), an openly licensed archive. The
// items' rights record reads: "available for reuse under a Creative Commons
// Attribution Non-Commercial License (CC BY-NC)" — so the transcripts are
// vendored with attribution, non-commercially.
//
// The API: exactsearch?genre=Oral histories (paginated by start=), then each
// item's citation (/<bibid>/<vid>/citation) gives the transcript PDF filename,
// which is fetched from ufdcimages and converted with pdftotext.
//
//   node scripts/fetch-dloc-oral-histories.mjs
//   node scripts/fetch-dloc-oral-histories.mjs --cap 40

import fs from 'fs';
import path from 'path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '21-anti-colonial', 'dloc-oral-histories');
const API = 'https://api.dloc.patron.uflib.ufl.edu';

function curl(args, timeout = 60) {
  return new Promise((res, rej) => {
    execFile('curl', ['-skL', '--compressed', '-m', String(timeout), '-A', 'live_priors corpus builder', '--globoff', ...args], { maxBuffer: 64 * 1024 * 1024 }, (e, o) => (e ? rej(e) : res(o)));
  });
}
const jget = async (url) => { const t = await curl([url]); try { return JSON.parse(t); } catch { return null; } };

function pdfUrl(bibid, vid, filename) {
  const prefix = (bibid.match(/../g) || []).join('/');
  // filename (item_pdf) is already URL-encoded by the API — do not re-encode
  return `https://ufdcimages.uflib.ufl.edu/${prefix}/${vid}/${filename}`;
}

async function main() {
  const cap = process.argv.includes('--cap') ? +process.argv[process.argv.indexOf('--cap') + 1] : 200;
  console.log('=== dLOC Oral Histories Fetcher (CC BY-NC) ===\n');
  const hits = [];
  for (let start = 0; start < cap; start += 25) {
    const d = await jget(`${API}/exactsearch?genre=Oral+histories&start=${start}`);
    const h = (d?.hits || []);
    hits.push(...h);
    console.log(`  start=${start}: ${h.length} hits`);
    if (h.length < 25) break;
    await sleep(400);
  }
  console.log(`\ntotal ${hits.length} oral-history items\n`);
  // de-duplicate by bibid (pagination can overlap)
  const seen = new Set();
  const uniq = hits.filter(h => (h.bibid && !seen.has(h.bibid)) ? (seen.add(h.bibid), true) : false);
  console.log(`unique: ${uniq.length}\n`);
  const manifest = { source: 'Digital Library of the Caribbean (dLOC/UFDC)', license: 'CC BY-NC', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const h of uniq.slice(0, cap)) {
    const bibid = h.bibid, vid = h.vid;
    if (!bibid || !vid) { manifest.rejected.push({ title: h.title, reason: 'no_bibid' }); continue; }
    const cit = await jget(`${API}/${bibid}/${vid}/citation`);
    const pdf = cit?.item_pdf;
    const rights = cit?.RightsManagement || 'CC BY-NC (Digital Library of the Caribbean)';
    if (!pdf) { manifest.rejected.push({ title: h.title, reason: 'no_item_pdf' }); continue; }
    let text = '';
    try {
      await curl(['-o', '/tmp/_dloc.pdf', pdfUrl(bibid, vid, pdf)], 90);
      text = await new Promise((res, rej) => execFile('pdftotext', ['-q', '/tmp/_dloc.pdf', '-'], { maxBuffer: 64 * 1024 * 1024 }, (e, o) => (e ? rej(e) : res(o))));
    } catch { text = ''; }
    const words = wordsIn(text);
    if (words < 600) { manifest.rejected.push({ title: h.title, words, reason: words ? 'under_600_words' : 'no_text' }); continue; }
    const slug = (h.title || bibid).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
    const file = path.join(OUT, `${slug}-${bibid}.txt`);
    const creators = (cit?.Creators || []).map(c => `${c.name} (${c.role})`).join('; ') || (h.creator || []).join('; ');
    const front = ['---', `title: ${h.title}`, 'collection: 21-anti-colonial/dloc-oral-histories', 'region: Caribbean', `counter: colonialism / empire`, `interviewee/creator: ${creators}`, `subjects: ${(h.subject_keyword || []).join('; ')}`, `spatial: ${(h.spatial_coverage || []).join('; ')}`, `date: ${h.publication_date || 'n.d.'}`, `source_institution: ${h.source_institution || ''}`, 'source: Digital Library of the Caribbean (dLOC/UFDC)', `source_url: https://dloc.com/${bibid}/${vid}`, 'language: English', `license: ${rights}`, 'attribution: Digital Library of the Caribbean (dLOC)', 'perspective: colonized peoples', '---', ''].join('\n');
    fs.writeFileSync(file, front + text.trim() + '\n', 'utf8');
    manifest.pulled.push({ title: h.title, words, file: path.relative(ROOT, file), bibid, vid });
    n++;
    console.log(`  ✓ «${h.title}» (${words} w)`);
    await sleep(250);
  }
  fs.writeFileSync(path.join(ROOT, 'manifests', 'dloc-oral-histories-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
