#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '03-oer-textbooks', 'libretexts');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const LIBRARIES = [
  { name: 'mathematics', url: 'https://math.libretexts.org/api/v2/courses' },
  { name: 'physics', url: 'https://phys.libretexts.org/api/v2/courses' },
  { name: 'chemistry', url: 'https://chem.libretexts.org/api/v2/courses' },
  { name: 'biology', url: 'https://bio.libretexts.org/api/v2/courses' },
  { name: 'humanities', url: 'https://human.libretexts.org/api/v2/courses' },
  { name: 'social-sciences', url: 'https://socialsci.libretexts.org/api/v2/courses' },
  { name: 'engineering', url: 'https://eng.libretexts.org/api/v2/courses' },
  { name: 'computer-science', url: 'https://cs.libretexts.org/api/v2/courses' },
  { name: 'business', url: 'https://biz.libretexts.org/api/v2/courses' },
  { name: 'medicine', url: 'https://med.libretexts.org/api/v2/courses' },
];

async function fetchPages(baseApi, libraryName) {
  const items = [];
  try {
    const res = await fetch(baseApi, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return items;
    const data = await res.json();
    const courses = Array.isArray(data) ? data : (data.data || []);

    for (const course of courses.slice(0, 10)) {
      const entry = {
        library: libraryName,
        id: course.id || '',
        title: course.title || course.name || '',
        description: (course.description || '').substring(0, 300),
        url: course.url || '',
      };
      items.push(entry);
    }
  } catch (e) {}
  return items;
}

async function main() {
  console.log('=== LibreTexts Fetcher ===\n');
  const manifest = {
    source: 'LibreTexts',
    url: 'https://libretexts.org',
    license: 'CC BY / mixed',
    fetched_at: new Date().toISOString(),
    libraries: {},
  };

  for (const lib of LIBRARIES) {
    console.log(`\n--- ${lib.name} ---`);
    const items = await fetchPages(lib.url, lib.name);
    console.log(`  ${items.length} courses`);

    const libDir = path.join(OUTPUT_DIR, lib.name);
    fs.mkdirSync(libDir, { recursive: true });

    for (const item of items) {
      const safeName = (item.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
      const file = path.join(libDir, `${safeName}.json`);
      fs.writeFileSync(file, JSON.stringify(item, null, 2), 'utf8');
    }

    manifest.libraries[lib.name] = { count: items.length };
    await new Promise(r => setTimeout(r, 300));
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'libretexts-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  let total = 0;
  for (const lib of Object.values(manifest.libraries)) total += lib.count;
  console.log(`\n=== Done: ${total} courses cataloged across ${Object.keys(manifest.libraries).length} libraries ===`);
}

main().catch(console.error);
