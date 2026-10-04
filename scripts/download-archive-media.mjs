#!/usr/bin/env node
// Download actual media files from archive.org metadata catalog
// Usage: node scripts/download-archive-media.mjs [--category <name>] [--limit <n>]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'archive-org-media-manifest.json');
const DOWNLOAD_DIR = path.join(__dirname, '..', '10-audio-music', 'downloads');

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function parseArgs() {
  const args = process.argv.slice(2);
  let category = null;
  let limit = 5;
  let maxSizeMB = 100; // Skip files larger than this

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) category = args[++i];
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i]);
    if (args[i] === '--max-size' && args[i + 1]) maxSizeMB = parseInt(args[++i]);
  }

  return { category, limit, maxSizeMB };
}

async function downloadFile(url, dest, maxSizeBytes) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`    Failed: ${res.status}`);
      return false;
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      console.log(`    Skipping (${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB > ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB limit)`);
      return false;
    }

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    console.log(`    Saved: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
    return true;
  } catch (e) {
    console.log(`    Error: ${e.message}`);
    return false;
  }
}

async function main() {
  const { category, limit, maxSizeMB } = parseArgs();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!fs.existsSync(MANIFEST_FILE)) {
    console.log('No manifest found. Run fetch-archive-media.mjs first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));

  const categories = category
    ? [[category, manifest.categories[category]]]
    : Object.entries(manifest.categories);

  let downloaded = 0;
  let skipped = 0;

  console.log(`=== Archive.org Media Downloader ===`);
  console.log(`Max file size: ${maxSizeMB}MB`);
  console.log(`Target: ${category || 'all categories'}\n`);

  for (const [catName, catData] of categories) {
    if (!catData?.items) continue;
    console.log(`\n--- ${catName} (${catData.items.length} items) ---`);

    for (const item of catData.items) {
      if (downloaded >= limit && category) break;

      const itemDir = path.join(DOWNLOAD_DIR, catName, item.identifier);
      fs.mkdirSync(itemDir, { recursive: true });

      // Load full metadata
      const metaPath = path.join(__dirname, '..', '10-audio-music', catName, item.identifier + '.json');
      if (!fs.existsSync(metaPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      for (const file of (meta.files || []).slice(0, 2)) {
        if (downloaded >= limit && category) break;

        const dest = path.join(itemDir, file.name);
        if (fs.existsSync(dest)) {
          console.log(`  Skipping existing: ${file.name}`);
          continue;
        }

        // Check file size from metadata
        if (file.size && file.size > maxSizeBytes) {
          console.log(`  Skipping ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
          skipped++;
          continue;
        }

        console.log(`  Downloading: ${file.name}`);
        const success = await downloadFile(file.download_url, dest, maxSizeBytes);
        if (success) downloaded++;
        else skipped++;

        // Rate limit courtesy
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  console.log(`\n=== Downloaded: ${downloaded} | Skipped: ${skipped} ===`);
  console.log(`Files saved to: ${DOWNLOAD_DIR}`);
}

main().catch(console.error);
