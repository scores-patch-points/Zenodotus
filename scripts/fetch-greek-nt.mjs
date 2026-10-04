#!/usr/bin/env node
// Fetch Greek New Testament texts: SBLGNT (CC BY 4.0) and Nestle 1904 (PD)
// Sources: GitHub repos
// SBLGNT: https://github.com/LogosBible/SBLGNT
// Nestle1904: https://github.com/biblicalhumanities/Nestle1904

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '14-holy-texts');
const TMP_DIR = path.join(__dirname, '..', '.tmp-gnt');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'greek-nt-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const REPOS = {
  sblgnt: {
    url: 'https://github.com/LogosBible/SBLGNT.git',
    license: 'CC BY 4.0',
    dir: 'sblgnt',
  },
  nestle1904: {
    url: 'https://github.com/biblicalhumanities/Nestle1904.git',
    license: 'Public Domain',
    dir: 'nestle1904',
  },
};

async function cloneRepo(name, url, dir) {
  console.log(`\nCloning ${name}...`);
  const target = path.join(TMP_DIR, dir);
  if (fs.existsSync(target)) {
    console.log(`  Already exists, skipping clone`);
    return target;
  }
  try {
    execSync(`git clone --depth 1 "${url}" "${target}"`, { stdio: 'inherit' });
    return target;
  } catch (e) {
    console.log(`  Clone failed: ${e.message}`);
    return null;
  }
}

function collectTextFiles(dir, sourceName) {
  const texts = [];
  if (!fs.existsSync(dir)) return texts;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.txt') || entry.name.endsWith('.xml') || entry.name.endsWith('.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relPath = path.relative(path.join(__dirname, '..'), fullPath);
        const destDir = path.join(OUTPUT_DIR, sourceName);
        fs.mkdirSync(destDir, { recursive: true });
        const destFile = path.join(destDir, entry.name);
        fs.writeFileSync(destFile, content, 'utf8');

        texts.push({
          file: entry.name,
          source_path: relPath,
          dest_path: path.relative(path.join(__dirname, '..'), destFile),
          chars: content.length,
          type: entry.name.endsWith('.xml') ? 'xml' : entry.name.endsWith('.json') ? 'json' : 'text',
        });
      }
    }
  }

  walk(dir);
  return texts;
}

async function main() {
  console.log('=== Greek New Testament Fetcher ===\n');
  const manifest = {
    source: 'Greek New Testament',
    fetched_at: new Date().toISOString(),
    editions: {},
  };

  for (const [name, info] of Object.entries(REPOS)) {
    console.log(`\n--- ${name.toUpperCase()} (${info.license}) ---`);
    const repoDir = await cloneRepo(name, info.url, info.dir);
    if (repoDir) {
      const texts = collectTextFiles(repoDir, name);
      manifest.editions[name] = {
        license: info.license,
        url: info.url,
        text_count: texts.length,
        total_chars: texts.reduce((sum, t) => sum + t.chars, 0),
        texts: texts.map(t => ({ file: t.file, chars: t.chars, type: t.type })),
      };
      console.log(`  Collected ${texts.length} files, ${manifest.editions[name].total_chars} chars`);
    }
  }

  // Clean up temp
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (e) {}

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
