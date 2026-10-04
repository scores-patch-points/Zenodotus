#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '16-organic-community', 'african-storybook');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchAfricanStorybook() {
  const baseUrl = 'https://www.africanstorybook.org/api';
  const items = [];

  const endpoints = [
    { name: 'recent', url: `${baseUrl}/stories?per_page=30&page=1` },
    { name: 'english', url: `${baseUrl}/stories?language=en&per_page=20` },
    { name: 'swahili', url: `${baseUrl}/stories?language=sw&per_page=15` },
    { name: 'zulu', url: `${baseUrl}/stories?language=zu&per_page=15` },
    { name: 'hausa', url: `${baseUrl}/stories?language=ha&per_page=15` },
    { name: 'amharic', url: `${baseUrl}/stories?language=am&per_page=15` },
    { name: 'yoruba', url: `${baseUrl}/stories?language=yo&per_page=10` },
    { name: 'igbo', url: `${baseUrl}/stories?language=ig&per_page=10` },
    { name: 'somali', url: `${baseUrl}/stories?language=so&per_page=10` },
    { name: 'french', url: `${baseUrl}/stories?language=fr&per_page=15` },
    { name: 'portuguese', url: `${baseUrl}/stories?language=pt&per_page=15` },
    { name: 'arabic', url: `${baseUrl}/stories?language=ar&per_page=15` },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        headers: {
          'User-Agent': 'live_priors corpus builder',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) { console.log(`  ${ep.name}: ${res.status}`); continue; }
      const data = await res.json();
      const stories = data.data || data.stories || (Array.isArray(data) ? data : []);

      for (const story of stories) {
        const entry = {
          id: story.id || '',
          title: story.title || '',
          language: story.language?.name || story.language || '',
          level: story.level || '',
          author: story.author || '',
          synopsis: (story.synopsis || story.description || '').substring(0, 300),
          themes: story.themes || [],
          url: `https://www.africanstorybook.org/${story.slug || story.id || ''}`,
          source: ep.name,
        };
        items.push(entry);
        const safeName = `${ep.name}_${(story.id || story.title || 'unknown').toString().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50)}`;
        const file = path.join(OUTPUT_DIR, `${safeName}.json`);
        fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
      }
      console.log(`  ${ep.name}: ${stories.length} stories`);
    } catch (e) {
      console.log(`  ${ep.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return items.length;
}

async function main() {
  console.log('=== African Storybook Fetcher ===\n');
  const count = await fetchAfricanStorybook();
  const manifest = {
    source: 'African Storybook',
    url: 'https://www.africanstorybook.org',
    license: 'CC BY / CC',
    fetched_at: new Date().toISOString(),
    total_items: count,
  };
  const manifestFile = path.join(__dirname, '..', 'manifests', 'african-storybook-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${count} stories cataloged ===`);
}

main().catch(console.error);
