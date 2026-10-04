#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', '07-images-media');

const UA = 'live_priors corpus builder';

async function fetchMetMuseum() {
  const outputDir = path.join(BASE_DIR, 'met-museum');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('\n--- Met Museum (CC0) ---');

  const departments = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21];
  const items = [];

  for (const deptId of departments) {
    const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${deptId}&hasImages=true&q=*`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const data = await res.json();
      const objectIDs = (data.objectIDs || []).slice(0, 10);

      for (const id of objectIDs) {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        try {
          const objRes = await fetch(objUrl, { headers: { 'User-Agent': UA } });
          if (!objRes.ok) continue;
          const obj = await objRes.json();
          const entry = {
            objectID: obj.objectID,
            title: obj.title || '',
            artist: obj.artistDisplayName || '',
            date: obj.objectDate || '',
            medium: obj.medium || '',
            dimensions: obj.dimensions || '',
            department: obj.department || '',
            culture: obj.culture || '',
            period: obj.period || '',
            classification: obj.classification || '',
            primaryImage: obj.primaryImage || '',
            primaryImageSmall: obj.primaryImageSmall || '',
            objectURL: obj.objectURL || '',
            creditLine: obj.creditLine || '',
            isPublicDomain: obj.isPublicDomain,
          };
          items.push(entry);
          const file = path.join(outputDir, `met_${obj.objectID}.json`);
          fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  Saved ${items.length} items`);
  return items.length;
}

async function fetchSmithsonian() {
  const outputDir = path.join(BASE_DIR, 'smithsonian');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('\n--- Smithsonian (CC0) ---');

  const queries = ['painting', 'sculpture', 'photograph', 'artifact', 'document', 'natural history'];
  const items = [];

  for (const q of queries) {
    const url = `https://api.si.edu/openaccess/api/v1.0/search?api_key=demo_key&q=${encodeURIComponent(q)}&rows=15&start=0`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) { console.log(`  Failed: ${res.status}`); continue; }
      const data = await res.json();
      const rows = data.response?.rows || [];

      for (const row of rows) {
        const entry = {
          id: row.id,
          title: row.title || '',
          date: row.freetext?.dated?.[0]?.content || '',
          type: row.objectType || '',
          medium: row.freetext?.medium?.[0]?.content || '',
          credit: row.freetext?.creditLine?.[0]?.content || '',
          description: row.descriptiveNonRepeating?.description?.[0] || '',
          online_media: row.descriptiveNonRepeating?.online_media?.media || [],
          guid: row.guid || '',
        };
        items.push(entry);
        const file = path.join(outputDir, `si_${row.id.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
        fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`  Saved ${items.length} items`);
  return items.length;
}

async function fetchRijksmuseum() {
  const outputDir = path.join(BASE_DIR, 'rijksmuseum');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('\n--- Rijksmuseum (CC0) ---');

  const apiKey = 'SbG8QL50';
  const types = ['schilderij', 'prent', 'foto', 'geschiedenis'];
  const items = [];

  for (const t of types) {
    const url = `https://www.rijksmuseum.nl/api/en/collection?key=${apiKey}&format=json&type=${t}&ps=15&p=1`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) { console.log(`  Failed: ${res.status}`); continue; }
      const data = await res.json();
      const arts = data.artObjects || [];

      for (const art of arts) {
        const entry = {
          objectNumber: art.objectNumber,
          title: art.title || '',
          longTitle: art.longTitle || '',
          principalMaker: art.principalMaker || '',
          dating: art.dating || {},
          materials: art.materials || [],
          techniques: art.techniques || [],
          categories: art.categories || [],
          webImage: art.webImage || {},
          links: art.links || {},
        };
        items.push(entry);
        const file = path.join(outputDir, `rm_${art.objectNumber.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
        fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`  Saved ${items.length} items`);
  return items.length;
}

async function main() {
  console.log('=== Museum Collection Fetcher ===\n');
  const total = await fetchMetMuseum() + await fetchSmithsonian() + await fetchRijksmuseum();
  console.log(`\n=== Done: ${total} items cataloged across 3 museums ===`);
}

main().catch(console.error);
