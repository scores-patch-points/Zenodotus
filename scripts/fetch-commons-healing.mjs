#!/usr/bin/env node
// fetch-commons-healing.mjs — the real voice for how people LIVE TOGETHER:
// collective power, self-governed commons, and traditions of healing and
// self-care. Three registers, one pass:
//
//  22-commons/  — mutual aid and the governing of the commons (Kropotkin,
//                 Proudhon, the enclosure of the commons, village communities;
//                 plus Elinor Ostrom's own Nobel lecture on polycentric
//                 governance and the cases she learned from)
//  23-healing/  — cultural traditions of self-care and healing: Western
//                 herbals, and the Sanskrit Ayurveda (Charaka, Vagbhata) and
//                 Ojibwe ethnobotany as non-Western medicine
//
// Gutenberg ids are RESOLVED LIVE from the catalog, never typed (LP1). The
// Ostrom lecture is fetched as PDF and converted with pdftotext.
//
//   node scripts/fetch-commons-healing.mjs
//   node scripts/fetch-commons-healing.mjs --only commons

import fs from 'fs';
import path from 'path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'manifests', 'gutenberg-catalog.csv');
const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

// Gutenberg registry: [author substring, title keyword, outdir, note]
const GUTENBERG = [
  ['Kropotkin', 'Mutual Aid', '22-commons', 'mutual aid as the driver of evolution — collectivist power'],
  ['Kropotkin', 'The Conquest of Bread', '22-commons', 'anarchist-communist vision of the commons'],
  ['Kropotkin', 'Fields, Factories', '22-commons', 'decentralised, self-provisioning economy'],
  ['Proudhon', 'What is Property', '22-commons', 'property as theft — the founding commons polemic'],
  ['Boyle, James', 'The Public Domain', '22-commons', 'enclosing the commons of the mind'],
  ['Seebohm', 'The English Village Community', '22-commons', 'the historical village commons'],
  ['Seebohm', 'Tribal Custom', '22-commons', 'customary law and collective tenure'],
  ['Culpeper, Nicholas', 'The Complete Herbal', '23-healing', 'the people\u2019s herbal — self-help medicine'],
  ['Fernie', 'Herbal Simples', '23-healing', 'herbal simples for modern use'],
  ['Buchan, William', 'Domestic medicine', '23-healing', 'the household medical advisor'],
  ['Smith, Huron', 'Ethnobotany of the Ojibwe', '23-healing', 'Ojibwe plant medicine, recorded'],
  ['Mooney, James', 'Sacred Formulas of the Cherokees', '23-healing', 'Cherokee healing formulas, recorded'],
  ['Mooney, James', 'Myths of the Cherokee', '23-healing', 'Cherokee sacred narrative'],
  ['Lindlahr, Henry', 'Nature Cure', '23-healing', 'nature-cure philosophy and practice'],
  // more collectivist / commons theory
  ['Marx, Karl', 'Communist Manifesto', '22-commons', 'the collectivist call to arms'],
  ['Engels, Friedrich', 'Condition of the Working-Class', '22-commons', 'the working class of England, documented'],
  ['Morris, William', 'News from Nowhere', '22-commons', 'a socialist utopia of the commons'],
  ['Morris, William', 'A Dream of John Ball', '22-commons', 'the commons against enclosure'],
  ['Bellamy, Edward', 'Looking Backward', '22-commons', 'the cooperative commonwealth'],
  ['George, Henry', 'Progress and Poverty', '22-commons', 'the land as a common inheritance'],
  ['Marx, Karl', 'The Eighteenth Brumaire', '22-commons', 'class and the state'],
];

// GRETIL Sanskrit Ayurveda (original language)
const GRETIL = [
  ['https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_agniveza-carakasaMhitA-parts-comm.txt', '23-healing', 'Caraka-Saṃhitā (Ayurveda, Sanskrit)', 'the foundational Sanskrit medical compendium'],
  ['https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_vAgbhaTa-aSTAGgahRdayasUtra.txt', '23-healing', 'Vāgbhaṭa, Aṣṭāṅgahṛdaya (Ayurveda, Sanskrit)', 'the Ayurvedic compendium of the heart'],
];

// PDF sources → pdftotext
const PDF = [
  ['https://www.nobelprize.org/uploads/2018/06/ostrom_lecture.pdf', '22-commons', 'Elinor Ostrom, Beyond Markets and States: Polycentric Governance (Nobel Lecture 2009)', 'the commons cases Ostrom studied \u2014 self-governance in the real world'],
];

function curl(url, { timeout = 90, bin = false } = {}) {
  return new Promise((res, rej) => {
    const args = ['-skL', '--compressed', '-m', String(timeout), '-A', 'live_priors corpus builder', '--globoff'];
    if (bin) args.push('-o', '/tmp/_lp_fetch.pdf', url);
    else args.push(url);
    execFile('curl', args, { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (e, out) => (e ? rej(e) : res(out)));
  });
}

function splitCsvRows(t) { const r = []; let c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { c += ch; if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } } else if (ch === '"') { q = true; c += ch; } else if (ch === '\n') { r.push(c); c = ''; } else c += ch; } if (c) r.push(c); return r; }
function splitCsvFields(row) { const o = []; let c = '', q = false; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (q) { c += ch; if (ch === '"') { if (row[i + 1] === '"') { c += '"'; i++; } else q = false; } } else if (ch === '"') { q = true; } else if (ch === ',') { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(f => f.trim()); }
let catalog = '';
function resolve(author, keyword) {
  for (const row of splitCsvRows(catalog)) {
    const f = splitCsvFields(row);
    if (f.length < 6) continue;
    const authors = f[5].toLowerCase(), title = f[3].toLowerCase();
    if (authors.includes(author.split(',')[0].toLowerCase()) && keyword.toLowerCase().split(/\s+/).every(w => title.includes(w))) return { id: f[0], title: f[3].replace(/\n/g, ' ').trim().slice(0, 160), language: f[4], authors: f[5] };
  }
  return null;
}

function write(outdir, slug, front, text) {
  const dir = path.join(ROOT, outdir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.txt`);
  fs.writeFileSync(file, front + text.trim() + '\n', 'utf8');
  return file;
}

async function main() {
  const only = process.argv.includes('--only') ? new Set((process.argv[process.argv.indexOf('--only') + 1] || '').split(',')) : null;
  catalog = fs.existsSync(CATALOG) ? fs.readFileSync(CATALOG, 'utf8') : await (async () => (await fetch(CATALOG_URL)).text())();
  console.log('=== Commons & Healing Fetcher ===\n');
  const manifest = { source: 'Project Gutenberg + GRETIL + nobelprize.org', purpose: 'collectivist power, commons governance, healing/self-care traditions', fetched_at: new Date().toISOString(), pulled: [], rejected: [] };

  if (!only || only.has('commons') || only.has('healing')) {
    for (const [author, kw, outdir, note] of GUTENBERG) {
      if (only && !only.has(outdir.replace('22-', '').replace('23-', '')) && !only.has(outdir)) continue;
      const hit = resolve(author, kw);
      if (!hit) { console.log(`  ✗ «${kw}» not resolved`); manifest.rejected.push({ kw, reason: 'not_resolved' }); continue; }
      const { id, title, language, authors } = hit;
      const slug = `${outdir.split('-')[1]}-${kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
      let text = null;
      try { const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: { 'User-Agent': 'live_priors corpus builder' } }); text = r.ok ? await r.text() : null; } catch { text = null; }
      if (!text) { console.log(`  ✗ #${id} fetch failed`); manifest.rejected.push({ id, kw, reason: 'fetch_failed' }); continue; }
      let clean = text; let s = clean.indexOf('*** START OF'); if (s === -1) s = clean.indexOf('*END THE SMALL PRINT'); if (s !== -1) { const nl = clean.indexOf('\n', s); if (nl !== -1) clean = clean.slice(nl + 1); }
      let e = clean.indexOf('*** END OF'); if (e === -1) e = clean.indexOf('End of the Project Gutenberg'); if (e !== -1) clean = clean.slice(0, e); clean = clean.trim();
      const words = wordsIn(clean);
      if (words < 600) { console.log(`  ✗ #${id} under floor`); manifest.rejected.push({ id, kw, reason: 'under_600_words', words }); continue; }
      const front = ['---', `title: ${title}`, `collection: ${outdir}`, `note: ${note}`, 'source: Project Gutenberg', `source_url: https://www.gutenberg.org/ebooks/${id}`, `language: ${language || 'en'}`, 'license: public domain', `author_catalog: ${authors.slice(0, 160)}`, '---', ''].join('\n');
      write(outdir, slug, front, clean);
      manifest.pulled.push({ outdir, slug, title, words, source: 'gutenberg', id });
      console.log(`  ✓ [${outdir}] «${title}» (${words} w)`);
      await sleep(300);
    }
  }

  if (!only || only.has('healing')) {
    for (const [url, outdir, title, note] of GRETIL) {
      const slug = 'healing-' + title.split(',')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      let text = null;
      try { text = await curl(url); } catch { }
      if (!text || text.length < 500) { console.log(`  ✗ GRETIL ${title} failed`); manifest.rejected.push({ title, reason: 'fetch_failed' }); continue; }
      const words = wordsIn(text);
      if (words < 600) { console.log(`  ✗ GRETIL ${title} under floor`); manifest.rejected.push({ title, reason: 'under_600_words', words }); continue; }
      write(outdir, slug, ['---', `title: ${title}`, `collection: ${outdir}`, `note: ${note}`, 'source: GRETIL', `source_url: ${url}`, 'language: Sanskrit (IAST)/Sanskrit', 'license: public domain', '---', ''].join('\n'), text);
      manifest.pulled.push({ outdir, slug, title, words, source: 'gretil' });
      console.log(`  ✓ [${outdir}] ${title} (${words} w)`);
    }
  }

  if (!only || only.has('commons')) {
    for (const [url, outdir, title, note] of PDF) {
      const slug = 'commons-ostrom-nobel-lecture';
      try {
        await curl(url, { bin: true, timeout: 120 });
        const out = await new Promise((res, rej) => execFile('pdftotext', ['-q', '/tmp/_lp_fetch.pdf', '-'], { maxBuffer: 64 * 1024 * 1024 }, (e, o) => (e ? rej(e) : res(o))));
        const words = wordsIn(out);
        if (words < 600) { console.log('  ✗ ostrom under floor'); manifest.rejected.push({ title, reason: 'under_600_words', words }); continue; }
        write(outdir, slug, ['---', `title: ${title}`, `collection: ${outdir}`, `note: ${note}`, 'source: nobelprize.org (Prize Lecture)', `source_url: ${url}`, 'language: English', 'license: Nobel Foundation published lecture', '---', ''].join('\n'), out);
        manifest.pulled.push({ outdir, slug, title, words, source: 'nobel' });
        console.log(`  ✓ [${outdir}] ${title} (${words} w)`);
      } catch (e) { console.log('  ✗ ostrom failed: ' + e.message); manifest.rejected.push({ title, reason: 'fetch_or_convert_failed' }); }
    }
  }

  fs.writeFileSync(path.join(ROOT, 'manifests', 'commons-healing-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
}
main().catch(e => { console.error(e); process.exit(1); });
