#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '05-academic-papers', 'plos');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const QUERIES = [
  { name: 'genetics', q: '*:*', fq: 'journal:"PLoS Genetics" AND article_type:"Research Article"', rows: 15 },
  { name: 'biology', q: '*:*', fq: 'journal:"PLoS Biology" AND article_type:"Research Article"', rows: 15 },
  { name: 'medicine', q: '*:*', fq: 'journal:"PLoS Medicine" AND article_type:"Research Article"', rows: 15 },
  { name: 'computation', q: '*:*', fq: 'journal:"PLoS Computational Biology" AND article_type:"Research Article"', rows: 15 },
  { name: 'pathogens', q: '*:*', fq: 'journal:"PLoS Pathogens" AND article_type:"Research Article"', rows: 15 },
  { name: 'ntd', q: '*:*', fq: 'journal:"PLoS Neglected Tropical Diseases" AND article_type:"Research Article"', rows: 15 },
];

async function searchPLOS(q, fq, rows = 15) {
  const params = new URLSearchParams({
    q,
    fq,
    fl: 'id,journal,author,publication_date,article_type',
    rows: String(rows),
    sort: 'publication_date desc',
    wt: 'json',
  });
  try {
    const res = await fetch(`https://api.plos.org/search?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.response?.docs || [];
  } catch (e) {
    return [];
  }
}

async function fetchArticleText(doi) {
  try {
    const res = await fetch(`https://api.plos.org/text?id=info:doi/${doi}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 200 ? text : null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== PLOS Fetcher ===\n');
  const manifest = {
    source: 'PLOS (Public Library of Science)',
    url: 'https://www.plos.org',
    api: 'https://api.plos.org',
    license: 'CC BY (open access)',
    fetched_at: new Date().toISOString(),
    categories: {},
  };

  for (const q of QUERIES) {
    console.log(`\n--- ${q.name} ---`);
    const docs = await searchPLOS(q.q, q.fq, q.rows);
    console.log(`  Found ${docs.length} docs`);

    const catDir = path.join(OUTPUT_DIR, q.name);
    fs.mkdirSync(catDir, { recursive: true });

    const seenDois = new Set();
    const items = [];

    for (const doc of docs) {
      const baseDoi = (doc.id || '').replace(/\/(abstract|body|references|results_and_discussion|introduction|materials_and_methods|discussion|conclusions|supporting_information|figures|tables|summary|reviewers)$/, '');
      if (seenDois.has(baseDoi)) continue;
      seenDois.add(baseDoi);

      const safeDoi = baseDoi.replace(/[^a-zA-Z0-9._-]/g, '_');
      const meta = {
        id: baseDoi,
        journal: doc.journal || '',
        authors: doc.author || [],
        date: doc.publication_date || '',
        article_type: doc.article_type || '',
        url: `https://journals.plos.org/${(doc.journal || '').toLowerCase().replace(/\s/g, '')}/article?id=info:doi/${baseDoi}`,
      };

      const fullText = await fetchArticleText(baseDoi);
      if (fullText) {
        meta.full_text_chars = fullText.length;
        const file = path.join(catDir, `${safeDoi}.txt`);
        fs.writeFileSync(file, `Authors: ${meta.authors.join(', ')}\nJournal: ${meta.journal}\nDate: ${meta.date}\nDOI: ${baseDoi}\n\n${fullText}`, 'utf8');
        console.log(`  ${baseDoi}: ${fullText.length} chars`);
      } else {
        const file = path.join(catDir, `${safeDoi}_meta.json`);
        fs.writeFileSync(file, JSON.stringify(meta, null, 2), 'utf8');
        console.log(`  ${baseDoi}: meta only`);
      }

      items.push(meta);
      await new Promise(r => setTimeout(r, 500));
    }

    manifest.categories[q.name] = { fq: q.fq, count: items.length };
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'plos-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  let total = 0;
  for (const cat of Object.values(manifest.categories)) total += cat.count;
  console.log(`\n=== Done: ${total} papers cataloged ===`);
}

main().catch(console.error);
