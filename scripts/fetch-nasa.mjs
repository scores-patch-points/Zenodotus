#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '07-images-media', 'nasa');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://images-api.nasa.gov';

const QUERIES = [
  { name: 'apollo-missions', q: 'apollo mission', n: 20 },
  { name: 'hubble', q: 'hubble telescope', n: 20 },
  { name: 'earth-observation', q: 'earth observation satellite', n: 20 },
  { name: 'mars-rovers', q: 'mars rover', n: 20 },
  { name: 'iss', q: 'international space station', n: 20 },
  { name: 'james-webb', q: 'james webb space telescope', n: 20 },
  { name: 'space-shuttle', q: 'space shuttle', n: 20 },
  { name: 'voyager', q: 'voyager mission', n: 15 },
  { name: 'moon-landing', q: 'moon landing', n: 15 },
  { name: 'nasa-people', q: 'astronaut', n: 15 },
];

async function searchNASA(query, count = 20) {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&media_type=image`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.collection?.items || []).slice(0, count);
  } catch (e) {
    return [];
  }
}

async function fetchAsset(nasaId) {
  const url = `${API_BASE}/asset/${nasaId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.collection?.items || [];
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== NASA Media Fetcher ===\n');
  const manifest = {
    source: 'NASA',
    url: 'https://images.nasa.gov',
    api: 'https://images-api.nasa.gov',
    license: 'Public domain (US federal government)',
    fetched_at: new Date().toISOString(),
    categories: {},
  };

  for (const q of QUERIES) {
    console.log(`\n--- ${q.name} ---`);
    const results = await searchNASA(q.q, q.n);
    console.log(`  Found ${results.length} results`);

    const items = [];
    for (const item of results) {
      const d = item.data?.[0] || {};
      const assets = await fetchAsset(d.nasa_id);
      const imageUrls = (assets || []).filter(a => a.href || a.location);

      const entry = {
        nasa_id: d.nasa_id,
        title: d.title || '',
        description: d.description?.substring(0, 300) || '',
        date_created: d.date_created || '',
        center: d.center || '',
        keywords: d.keywords || [],
        media_type: d.media_type || '',
        photographer: d.photographer || '',
        secondary_creator: d.secondary_creator || '',
        image_urls: imageUrls.map(a => a.href || '').filter(Boolean).slice(0, 5),
        asset_url: `https://images-api.nasa.gov/asset/${d.nasa_id}`,
      };

      items.push(entry);

      const outFile = path.join(OUTPUT_DIR, `${q.name}_${(d.nasa_id || '').replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
      fs.writeFileSync(outFile, JSON.stringify(entry, null, 2), 'utf8');

      await new Promise(r => setTimeout(r, 200));
    }

    manifest.categories[q.name] = {
      query: q.q,
      count: items.length,
    };
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'nasa-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  let total = 0;
  for (const cat of Object.values(manifest.categories)) total += cat.count;
  console.log(`\n=== Done: ${total} items cataloged ===`);
}

main().catch(console.error);
