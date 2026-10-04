#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '08-news-current', 'wikinews');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://en.wikinews.org/w/api.php';

const CATEGORIES = [
  'Category:Politics_and_conflicts',
  'Category:Science_and_technology',
  'Category:Business_and_economy',
  'Category:Health',
  'Category:Culture_and_entertainment',
  'Category:Sports',
  'Category:Environment',
  'Category:Weather',
];

async function fetchCategory(catName) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: catName,
    cmlimit: '10',
    cmsort: 'timestamp',
    cmdir: 'desc',
    format: 'json',
  });
  try {
    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.query?.categorymembers || [];
  } catch (e) {
    return [];
  }
}

async function fetchArticle(title) {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'text',
    format: 'json',
  });
  try {
    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.parse?.text?.['*'] || null;
  } catch (e) {
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== Wikinews Fetcher ===\n');
  const manifest = {
    source: 'Wikinews',
    url: 'https://en.wikinews.org',
    license: 'CC BY 2.5',
    fetched_at: new Date().toISOString(),
    articles: [],
  };

  const seen = new Set();

  for (const cat of CATEGORIES) {
    console.log(`\n--- ${cat} ---`);
    const members = await fetchCategory(cat);
    console.log(`  ${members.length} articles`);

    for (const member of members) {
      if (seen.has(member.title)) continue;
      seen.add(member.title);

      const html = await fetchArticle(member.title);
      if (html) {
        const text = stripHtml(html);
        if (text.length > 200) {
          const safeName = member.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
          const file = path.join(OUTPUT_DIR, `${safeName}.txt`);
          fs.writeFileSync(file, text, 'utf8');
          manifest.articles.push({
            title: member.title,
            pageid: member.pageid,
            category: cat,
            chars: text.length,
            file: path.relative(path.join(__dirname, '..'), file),
          });
          console.log(`  ${member.title}: ${text.length} chars`);
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'wikinews-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.articles.length} articles fetched ===`);
}

main().catch(console.error);
