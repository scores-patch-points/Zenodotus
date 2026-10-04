#!/usr/bin/env node
// Fetch audio/video from Internet Archive with working queries
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', '10-audio-music');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'archive-org-media-manifest.json');

fs.mkdirSync(BASE_DIR, { recursive: true });

const SEARCH_API = 'https://archive.org/advancedsearch.php';

const CATEGORIES = [
  { name: 'classical-music', query: 'collection:audio AND (subject:"classical" OR subject:"symphony" OR subject:"orchestra")', dir: 'classical-music', limit: 15 },
  { name: 'jazz', query: 'collection:audio AND (subject:"jazz" OR subject:"blues")', dir: 'jazz', limit: 15 },
  { name: 'folk-world', query: 'collection:audio AND (subject:"folk" OR subject:"world music" OR subject:"traditional")', dir: 'folk-world', limit: 15 },
  { name: 'live-music-archive', query: 'collection:etree', dir: 'live-music-archive', limit: 15 },
  { name: '78rpm', query: 'collection:georgeblood', dir: '78rpm', limit: 15 },
  { name: 'great-78', query: 'collection:78rpm', dir: 'great-78', limit: 15 },
  { name: 'public-domain-films', query: 'collection:prelinger AND mediatype:movies', dir: 'public-domain-films', limit: 15 },
  { name: 'gov-docs-films', query: 'collection:govdocs AND mediatype:movies', dir: 'gov-docs-films', limit: 10 },
  { name: 'independent-films', query: 'collection:opensource_movies', dir: 'independent-films', limit: 10 },
  { name: 'educational-films', query: 'collection:prelinger AND mediatype:movies', dir: 'educational-films', limit: 10 },
  { name: 'spoken-word', query: 'collection:audio AND (subject:"poetry" OR subject:"lecture" OR subject:"speech")', dir: 'spoken-word', limit: 15 },
  { name: 'netlabel-electronic', query: 'collection:netlabels', dir: 'netlabel-electronic', limit: 15 },
  { name: 'grateful-dead', query: 'collection:GratefulDead', dir: 'grateful-dead', limit: 10 },
  { name: 'nasa-media', query: 'collection:nasa', dir: 'nasa-media', limit: 10 },
  { name: 'smithsonian', query: 'collection:smithsonian', dir: 'smithsonian', limit: 10 },
  { name: 'music-archive-global', query: 'collection:audio AND (subject:"india" OR subject:"africa" OR subject:"middle east" OR subject:"asia")', dir: 'global-music', limit: 15 },
];

async function searchArchive(query, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    fl: 'identifier,title,creator,date,subject,licenseurl,mediatype,collection',
    rows: limit,
    sort: '-downloads',
    output: 'json',
  });

  const url = `${SEARCH_API}?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.response?.docs || [];
  } catch (e) {
    return [];
  }
}

async function fetchItemMetadata(identifier) {
  const url = `https://archive.org/metadata/${identifier}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

function getDownloadUrl(identifier, filename) {
  return `https://archive.org/download/${identifier}/${encodeURIComponent(filename)}`;
}

async function main() {
  console.log('=== Internet Archive Media Fetcher ===\n');
  const manifest = {
    source: 'Internet Archive (archive.org)',
    url: 'https://archive.org',
    fetched_at: new Date().toISOString(),
    categories: {},
    note: 'Metadata catalog with download URLs. Use download-archive-media.mjs to fetch actual files.',
  };

  for (const cat of CATEGORIES) {
    console.log(`\n--- ${cat.name} ---`);
    const catDir = path.join(BASE_DIR, cat.dir);
    fs.mkdirSync(catDir, { recursive: true });

    console.log(`  Query: ${cat.query.substring(0, 80)}...`);
    const results = await searchArchive(cat.query, cat.limit);

    if (!results || results.length === 0) {
      console.log(`  No results`);
      manifest.categories[cat.name] = { query: cat.query, count: 0 };
      continue;
    }

    console.log(`  Found ${results.length} items`);
    const items = [];

    for (const item of results) {
      console.log(`  ${item.title?.substring(0, 60) || item.identifier} (${item.mediatype})`);

      const meta = await fetchItemMetadata(item.identifier);
      const files = meta?.files || [];
      const mediaFiles = files.filter(f =>
        f.format?.match(/\.(mp3|ogg|flac|wav|m4a|mp4|mkv|avi|webm)$/i) ||
        f.format?.match(/^(MP3|Ogg Vorbis|FLAC|WAV|MPEG-4|Matroska|AVI|WebM)/i)
      ).slice(0, 3);

      const itemEntry = {
        identifier: item.identifier,
        title: item.title || '',
        creator: item.creator || '',
        date: item.date || '',
        subjects: item.subject || [],
        license: item.licenseurl || 'unknown',
        mediatype: item.mediatype,
        collection: item.collection || [],
        download_url: `https://archive.org/details/${item.identifier}`,
        files: mediaFiles.map(f => ({
          name: f.name,
          format: f.format,
          size: f.size,
          download_url: getDownloadUrl(item.identifier, f.name),
        })),
      };

      const metaFile = path.join(catDir, `${item.identifier}.json`);
      fs.writeFileSync(metaFile, JSON.stringify(itemEntry, null, 2), 'utf8');
      items.push({
        identifier: item.identifier,
        title: (item.title || '').substring(0, 80),
        file: path.relative(path.join(__dirname, '..'), metaFile),
        media_files: mediaFiles.length,
      });

      await new Promise(r => setTimeout(r, 200));
    }

    manifest.categories[cat.name] = {
      query: cat.query,
      count: items.length,
      items,
    };
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  let totalItems = 0;
  for (const [_, cat] of Object.entries(manifest.categories)) {
    totalItems += cat.count || 0;
  }
  console.log(`\n=== Done: ${totalItems} items cataloged across ${Object.keys(manifest.categories).length} categories ===`);
}

main().catch(console.error);
