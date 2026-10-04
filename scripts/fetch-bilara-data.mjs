#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '16-organic-community', 'bilara-data');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchGithubRepo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function fetchRepoContents(owner, repo, treePath = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${treePath}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

async function fetchRawContent(owner, repo, filePath, ref = 'main') {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.text();
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== SuttaCentral bilara-data Fetcher ===\n');
  const manifest = {
    source: 'SuttaCentral bilara-data',
    url: 'https://github.com/suttacentral/bilara-data',
    license: 'CC0',
    fetched_at: new Date().toISOString(),
    files: [],
  };

  const repo = await fetchGithubRepo('suttacentral', 'bilara-data');
  if (repo) {
    console.log(`Repo: ${repo.full_name} (${repo.default_branch || 'main'})`);
    manifest.repo = {
      name: repo.full_name,
      default_branch: repo.default_branch,
      description: repo.description,
      size_kb: repo.size,
      stars: repo.stargazers_count,
    };
  }

  const root = await fetchRepoContents('suttacentral', 'bilara-data', '');
  console.log(`Root contents: ${root.length} entries`);

  const dirs = root.filter(e => e.type === 'directory').map(e => e.name);
  console.log(`Subdirectories: ${dirs.join(', ')}`);

  const translationDir = root.find(e => e.name === 'translated' || e.name === 'root');
  if (translationDir) {
    const sub = await fetchRepoContents('suttacentral', 'bilara-data', translationDir.name);
    const subDirs = sub.filter(e => e.type === 'directory').map(e => e.name);
    console.log(`\n${translationDir.name}/ contents: ${subDirs.slice(0, 20).join(', ')}...`);

    let fetched = 0;
    for (const subDir of subDirs.slice(0, 5)) {
      const files = await fetchRepoContents('suttacentral', 'bilara-data', `${translationDir.name}/${subDir}`);
      const textFiles = files.filter(e => e.name.endsWith('.json') || e.name.endsWith('.csv')).slice(0, 10);

      for (const f of textFiles) {
        const content = await fetchRawContent('suttacentral', 'bilara-data', f.path);
        if (content && content.length > 50) {
          const outFile = path.join(OUTPUT_DIR, f.path.replace(/\//g, '_'));
          fs.writeFileSync(outFile, content, 'utf8');
          manifest.files.push({
            path: f.path,
            chars: content.length,
            file: path.relative(path.join(__dirname, '..'), outFile),
          });
          fetched++;
        }
        await new Promise(r => setTimeout(r, 300));
      }
      console.log(`  ${subDir}: ${textFiles.length} files fetched`);
    }
    console.log(`Total files: ${fetched}`);
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'suttacentral-bilara-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.files.length} files fetched ===`);
}

main().catch(console.error);
