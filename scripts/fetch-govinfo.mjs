#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', '06-government-legal');

async function fetchGovInfo() {
  const outputDir = path.join(BASE_DIR, 'govinfo');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('\n--- GovInfo ---');

  const collections = ['FR', 'USC', 'PL', 'CRECB', 'HMG', 'SMG'];
  const items = [];

  for (const coll of collections) {
    const url = `https://www.govinfo.gov/feed/bulkdata/${coll}/recent.json`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'live_priors corpus builder' },
      });
      if (!res.ok) { console.log(`  ${coll}: ${res.status}`); continue; }
      const data = await res.json();
      const entries = data.entries || [];

      for (const entry of entries.slice(0, 10)) {
        const item = {
          title: entry.title || '',
          link: entry.link || '',
          published: entry.published || '',
          summary: (entry.summary || '').substring(0, 500),
          collection: coll,
          guid: entry.id || '',
        };
        items.push(item);

        const safeName = (entry.id || entry.title || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
        const file = path.join(outputDir, `govinfo_${coll}_${safeName}.json`);
        fs.writeFileSync(file, JSON.stringify(item, null, 2), 'utf8');
      }
    } catch (e) {
      console.log(`  ${coll} error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`  Saved ${items.length} items`);
  return items.length;
}

async function fetchSECEdgar() {
  const outputDir = path.join(BASE_DIR, 'sec-edgar');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('\n--- SEC EDGAR ---');

  const url = 'https://efts.sec.gov/LATEST/search-index?q=%22*&dateRange=custom&startdt=2026-01-01&enddt=2026-12-31&forms=10-K,10-Q,8-K&from=0&size=20';
  const items = [];

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'live_priors corpus builder corpus@example.com',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const fallbackUrl = 'https://efts.sec.gov/LATEST/search-index?q=%22*&forms=10-K&from=0&size=10';
      const res2 = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'live_priors corpus builder corpus@example.com',
          'Accept': 'application/json',
        },
      });
      if (!res2.ok) { console.log(`  Failed: ${res2.status}`); return 0; }
    }
    const data = await res.json();
    const hits = data.hits?.hits || [];

    for (const hit of hits) {
      const src = hit._source || {};
      const item = {
        file_date: src.file_date || '',
        form_type: src.form_type || '',
        entity_names: src.entity_names || [],
        file_num: src.file_num || [],
        cik: src.cik || '',
        id: hit._id || '',
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${src.cik || ''}&type=${src.form_type || ''}`,
      };
      items.push(item);
      const safeName = (hit._id || '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const file = path.join(outputDir, `edgar_${safeName}.json`);
      fs.writeFileSync(file, JSON.stringify(item, null, 2), 'utf8');
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  console.log(`  Saved ${items.length} filings`);
  return items.length;
}

async function main() {
  console.log('=== GovInfo + SEC EDGAR Fetcher ===\n');
  const govInfoCount = await fetchGovInfo();
  const secCount = await fetchSECEdgar();
  console.log(`\n=== Done: ${govInfoCount + secCount} documents total ===`);
}

main().catch(console.error);
