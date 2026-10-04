#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '05-academic-papers', 'arxiv');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'http://export.arxiv.org/api/query';

const QUERIES = [
  { name: 'machine-learning', search: 'cat:cs.LG', max: 25 },
  { name: 'artificial-intelligence', search: 'cat:cs.AI', max: 25 },
  { name: 'computational-complexity', search: 'cat:cs.CC', max: 15 },
  { name: 'mathematical-physics', search: 'cat:math-ph', max: 15 },
  { name: 'number-theory', search: 'cat:math.NT', max: 10 },
  { name: 'quant-physics', search: 'cat:quant-ph', max: 15 },
  { name: 'computational-biology', search: 'cat:q-bio', max: 10 },
  { name: 'statistics', search: 'cat:stat.ME', max: 10 },
  { name: 'linguistics-computational', search: 'cat:cs.CL', max: 15 },
  { name: 'cryptography', search: 'cat:cs.CR', max: 10 },
];

async function queryArxiv(searchQuery, maxResults = 20) {
  const params = new URLSearchParams({
    search_query: searchQuery,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  });
  const url = `${API_BASE}?${params}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseEntries(xml);
  } catch (e) {
    return [];
  }
}

function parseEntries(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const get = (tag) => {
      const m = entryXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const links = [];
    const linkRegex = /<link[^>]*href="([^"]*)"[^>]*\/?>/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(entryXml)) !== null) {
      links.push(linkMatch[1]);
    }
    const categories = [];
    const catRegex = /<category[^>]*term="([^"]*)"[^>]*\/?>/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entryXml)) !== null) {
      categories.push(catMatch[1]);
    }

    entries.push({
      id: get('id'),
      title: get('title').replace(/\s+/g, ' '),
      summary: get('summary').replace(/\s+/g, ' '),
      published: get('published'),
      updated: get('updated'),
      authors: [...entryXml.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => m[1].trim()),
      categories,
      links,
      pdf_url: links.find(l => l.endsWith('.pdf') || l.includes('/pdf/')) || '',
    });
  }
  return entries;
}

async function main() {
  console.log('=== arXiv Fetcher ===\n');
  const manifest = {
    source: 'arXiv',
    url: 'https://arxiv.org',
    api: 'http://export.arxiv.org/api/query',
    license: 'Author-retained copyright; metadata is open',
    fetched_at: new Date().toISOString(),
    categories: {},
  };

  for (const q of QUERIES) {
    console.log(`\n--- ${q.name} ---`);
    const entries = await queryArxiv(q.search, q.max);
    console.log(`  Found ${entries.length} papers`);

    const catDir = path.join(OUTPUT_DIR, q.name);
    fs.mkdirSync(catDir, { recursive: true });

    for (const entry of entries) {
      const safeId = entry.id.split('/').pop().replace(/[^a-zA-Z0-9._]/g, '_');
      const content = `Title: ${entry.title}\nAuthors: ${entry.authors.join(', ')}\nPublished: ${entry.published}\nCategories: ${entry.categories.join(', ')}\nURL: ${entry.id}\n\nAbstract:\n${entry.summary}\n`;
      const file = path.join(catDir, `${safeId}.txt`);
      fs.writeFileSync(file, content, 'utf8');
    }

    manifest.categories[q.name] = {
      query: q.search,
      count: entries.length,
    };

    await new Promise(r => setTimeout(r, 3000));
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'arxiv-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  let total = 0;
  for (const cat of Object.values(manifest.categories)) total += cat.count;
  console.log(`\n=== Done: ${total} papers cataloged ===`);
}

main().catch(console.error);
