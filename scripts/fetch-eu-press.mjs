#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '08-news-current', 'eu-commission');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchPressReleases(page = 1) {
  const url = `https://commission.europa.eu/news/press-releases_en?page=${page}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'live_priors corpus builder',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) return null;
    return res.text();
  } catch (e) {
    return null;
  }
}

async function fetchEcPressCorner(page = 0) {
  const url = `https://ec.europa.eu/commission/presscorner/api/page?pageNumber=${page}&pageSize=20&languageCode=en&contentDateFrom=&contentDateTo=&languageCombo=&keyword=&contentTypes=IP,MEMO,SPEECH,SPEECH_TRANSCRIPT,PRESS_RELEASE&sort=Date`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'live_priors corpus builder',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function fetchViaWikinews() {
  console.log('\n--- EU via Wikinews API ---');
  const url = 'https://en.wikinews.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: 'European Union OR European Commission',
    srlimit: '20',
    srnamespace: '0',
    format: 'json',
  });
  const items = [];
  try {
    const res = await fetch(`${url}?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return items;
    const data = await res.json();
    const results = data.query?.search || [];

    for (const r of results) {
      const parseParams = new URLSearchParams({
        action: 'parse',
        page: r.title,
        prop: 'text',
        format: 'json',
      });
      const parseRes = await fetch(`${url}?${parseParams}`, {
        headers: { 'User-Agent': 'live_priors corpus builder' },
      });
      if (parseRes.ok) {
        const parseData = await parseRes.json();
        const html = parseData.parse?.text?.['*'] || '';
        const text = html
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length > 200) {
          items.push({ title: r.title, text });
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (e) {}
  return items;
}

async function main() {
  console.log('=== EU Commission Press Fetcher ===\n');
  const manifest = {
    source: 'EU Commission Press',
    url: 'https://ec.europa.eu/commission/presscorner',
    license: 'CC BY 4.0',
    fetched_at: new Date().toISOString(),
    articles: [],
  };

  const euArticles = await fetchViaWikinews();
  for (const art of euArticles) {
    const safeName = art.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
    const file = path.join(OUTPUT_DIR, `${safeName}.txt`);
    fs.writeFileSync(file, art.text, 'utf8');
    manifest.articles.push({
      title: art.title,
      chars: art.text.length,
      file: path.relative(path.join(__dirname, '..'), file),
    });
    console.log(`  ${art.title}: ${art.text.length} chars`);
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'eu-press-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.articles.length} articles fetched ===`);
}

main().catch(console.error);
