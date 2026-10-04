#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '16-organic-community', 'storyweaver');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchStoryweaver() {
  const baseUrl = 'https://www.storyweaver.org.in/api/v2/stories';
  const languages = ['en', 'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'pa', 'or', 'ur'];
  const items = [];

  for (const lang of languages) {
    const url = `${baseUrl}?language=${lang}&per_page=15&page=1`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'live_priors corpus builder',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) { console.log(`  ${lang}: ${res.status}`); continue; }
      const data = await res.json();
      const stories = data.stories || data.data || data || [];

      for (const story of (Array.isArray(stories) ? stories : [])) {
        const entry = {
          id: story.id || '',
          title: story.title || '',
          language: lang,
          level: story.reading_level || story.level || '',
          author: story.author?.name || story.author_name || '',
          illustrator: story.illustrator?.name || '',
          synopsis: (story.synopsis || '').substring(0, 300),
          tags: story.tags || [],
          url: `https://www.storyweaver.org.in/stories/${story.id || story.slug || ''}`,
          pages_count: story.pages_count || story.page_count || 0,
          created_at: story.created_at || '',
        };
        items.push(entry);
        const safeName = `${lang}_${(story.id || story.title || 'unknown').toString().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50)}`;
        const file = path.join(OUTPUT_DIR, `${safeName}.json`);
        fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
      }
      console.log(`  ${lang}: ${Array.isArray(stories) ? stories.length : 0} stories`);
    } catch (e) {
      console.log(`  ${lang}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return items.length;
}

async function main() {
  console.log('=== StoryWeaver Fetcher ===\n');
  const count = await fetchStoryweaver();
  const manifest = {
    source: 'StoryWeaver',
    url: 'https://www.storyweaver.org.in',
    license: 'CC BY 4.0',
    fetched_at: new Date().toISOString(),
    total_items: count,
  };
  const manifestFile = path.join(__dirname, '..', 'manifests', 'storyweaver-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${count} stories cataloged ===`);
}

main().catch(console.error);
