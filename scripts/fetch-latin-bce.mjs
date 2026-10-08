#!/usr/bin/env node
// Fetch the pre-CE (BCE) Latin originals of the Roman canon from Latin
// Wikisource (la.wikisource.org), read through the MediaWiki parse API. This
// closes the pre-0 hole the corpus had: the golden-age Latin core that never
// landed — Caesar, Lucretius, Catullus, Cicero, Virgil, Horace, Ovid, Plautus,
// Terence, Sallust. Livy and Martial were already held; Tacitus is post-0.
//
// The public-domain provenance of every one of these is the publisher's own
// page: la.wikisource hosts the critical edition each work names.
//
//   node scripts/fetch-latin-bce.mjs
//   node scripts/fetch-latin-bce.mjs --only cicero-catilinam,caesar-gallic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'latin-originals');
const API = 'https://la.wikisource.org/w/api.php';

const WORKS = [
  // Caesar — Commentarii de bello Gallico, 8 books (58–50 BCE)
  { slug: 'caesar-gallic-war', title: 'C. Iulius Caesar, Commentarii de bello Gallico', prefix: 'Commentarii de bello Gallico/' },

  // Lucretius — De rerum natura, 6 books (c. 55 BCE)
  { slug: 'lucretius-de-rerum-natura', title: 'Titus Lucretius Carus, De rerum natura', prefix: 'De rerum natura (Titus Lucretius Carus)/' },

  // Catullus — Carmina (c. 54 BCE); epigrammata are one short poem per page,
  // so the whole corpus lands as one aggregated document (the Sappho rule).
  { slug: 'catullus-carmina', title: 'Gaius Valerius Catullus, Carmina', prefix: 'Carmina (Catullus, ed. Cornish)/' },

  // Cicero — the orations and the philosophical works (70–43 BCE)
  { slug: 'cicero-catilinam', title: 'M. Tullius Cicero, In L. Catilinam orationes', prefix: 'In L. Catilinam orationes/' },
  { slug: 'cicero-de-officiis', title: 'M. Tullius Cicero, De officiis', prefix: 'De officiis/' },
  { slug: 'cicero-tusculanae', title: 'M. Tullius Cicero, Tusculanae disputationes', prefix: 'Tusculanae disputationes/' },
  { slug: 'cicero-de-natura-deorum', title: 'M. Tullius Cicero, De natura deorum', prefix: 'De natura deorum/' },
  { slug: 'cicero-epistulae-ad-atticum', title: 'M. Tullius Cicero, Epistulae ad Atticum', prefix: 'Epistulae (Marcus Tullius Cicero)/Epistulae ad Atticum/' },

  // Virgil — Aeneid (12 books), Eclogae, Georgica (29–19 BCE)
  { slug: 'virgil-aeneid', title: 'P. Vergilius Maro, Aeneis', prefix: 'Aeneis/' },
  { slug: 'virgil-eclogae', title: 'P. Vergilius Maro, Eclogae vel bucolica', prefix: 'Eclogae vel bucolica/' },
  { slug: 'virgil-georgica', title: 'P. Vergilius Maro, Georgica', prefix: 'Georgica (Hachette)/' },

  // Horace — Carmina, 4 books of odes (23–13 BCE)
  { slug: 'horace-carmina', title: 'Q. Horatius Flaccus, Carmina', prefix: 'Carmina (Horatius)/' },

  // Ovid — Metamorphoses, 15 books (8 CE is post-0, but the bulk of Ovid —
  // Amores, Heroides, Ars amatoria — is 16–1 BCE; the Metamorphoses is the
  // only one that hangs at the boundary, so it is kept and dated honestly).
  { slug: 'ovid-metamorphoses', title: 'P. Ovidius Naso, Metamorphoses', prefix: 'Metamorphoses (Ovidius)/' },
  { slug: 'ovid-amores', title: 'P. Ovidius Naso, Amores (16–1 BCE)', prefix: 'Amores/' },
  { slug: 'ovid-heroides', title: 'P. Ovidius Naso, Heroides (c. 20–1 BCE)', prefix: 'Heroides/' },
  { slug: 'ovid-ars-amatoria', title: 'P. Ovidius Naso, Ars amatoria (1 CE–2, mostly 1 BCE)', prefix: 'Ars amatoria/' },

  // Plautus — completa like Amphitruo; the fragment titles under Comoediae
  // (Plautus) are under the floor and are not counted as works.
  { slug: 'plautus-amphitruo', title: 'T. Maccius Plautus, Amphitruo', pages: ['Amphitruo (Lindsay)/Argumenta', 'Amphitruo (Lindsay)/Personae', 'Amphitruo (Lindsay)/Actus I', 'Amphitruo (Lindsay)/Actus II', 'Amphitruo (Lindsay)/Actus III', 'Amphitruo (Lindsay)/Actus IV', 'Amphitruo (Lindsay)/Actus V'] },

  // Terence — Andria (166 BCE), Adelphoe (160 BCE)
  { slug: 'terence-andria', title: 'P. Terentius Afer, Andria', prefix: 'Andria/' },
  { slug: 'terence-adelphoe', title: 'P. Terentius Afer, Adelphoe', pages: ['Adelphoe (ed. Fleckeisen)', 'Adelphoe (ed. Kauer-Lindsay)'] },

  // Sallust — both monographs (43–40 BCE)
  { slug: 'sallust-catilina', title: 'C. Sallustius Crispus, De Catilinae coniuratione', page: 'De Catilinae coniuratione' },
  { slug: 'sallust-iugurtha', title: 'C. Sallustius Crispus, Bellum Iugurthinum', page: 'Bellum Iugurthinum' },
];

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<span[^>]*class="[^"]*(mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ')
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
      if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
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
  for (let attempt = 0; attempt < 4; attempt++) {
    const data = await apiGet({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
    if (data) return (data.query?.allpages || []).map(p => p.title);
    await sleep(8000 * (attempt + 1));
  }
  return null;
}

async function pull(work, manifest) {
  const existing = path.join(OUT, `${work.slug}.txt`);
  if (fs.existsSync(existing) && !process.argv.includes('--fresh')) {
    const words = wordsIn('---\ntitle: ' + work.title + '\n---\n\n' + fs.readFileSync(existing, 'utf8'));
    manifest.pulled.push({ slug: work.slug, title: work.title, words, reused: true, file: path.relative(ROOT, existing) });
    console.log(`  ${work.slug}... reused (${words} words)`);
    return;
  }
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.pages) {
    for (const p of work.pages) {
      const t = await parsePage(p);
      if (t) parts.push({ title: p, text: t });
      await sleep(450);
    }
  } else if (work.page) {
    const t = await parsePage(work.page);
    if (t) parts = [{ title: work.page, text: t }];
    await sleep(600);
  } else {
    const titles = await subpages(work.prefix);
    if (!titles) {
      console.log(`RATE-LIMITED, skipping`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'rate_limited', prefix: work.prefix });
      return;
    }
    if (!titles.length) {
      console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
      return;
    }
    for (const title of titles) {
      const t = await parsePage(title);
      if (t) parts.push({ title, text: t });
      await sleep(450);
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
  const sourceRef = (work.pages || (work.page ? [work.page] : [work.prefix]))
    .map(p => `https://la.wikisource.org/wiki/${encodeURIComponent(p)}`).join(' ');
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/latin-originals',
    'era: pre-0 (BCE)',
    `source: Latin Wikisource (la.wikisource.org)`,
    `source_url: ${sourceRef}`,
    'format: Latin',
    'license: public domain',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} parts)`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Latin BCE Originals Fetcher (la.wikisource.org) ===\n');
  const manifest = {
    source: 'Latin Wikisource (la.wikisource.org) via the MediaWiki parse API',
    era: 'pre-0 (BCE)',
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

  const manifestFile = path.join(ROOT, 'manifests', 'latin-bce-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);