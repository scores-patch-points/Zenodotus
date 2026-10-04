#!/usr/bin/env node
// Fetch metadata and sample files from major open-source code repositories
// Source: raw.githubusercontent.com (confirmed reachable)
// License: Various OSI-approved licenses

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '09-source-code');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'source-code-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const REPOS = [
  { owner: 'torvalds', repo: 'linux', lang: 'C', license: 'GPL-2.0', paradigm: 'systems/kernel' },
  { owner: 'sqlite', repo: 'sqlite', lang: 'C', license: 'Public Domain', paradigm: 'database' },
  { owner: 'python', repo: 'cpython', lang: 'C+Python', license: 'PSF', paradigm: 'runtime' },
  { owner: 'rust-lang', repo: 'rust', lang: 'Rust', license: 'MIT/Apache-2.0', paradigm: 'systems' },
  { owner: 'golang', repo: 'go', lang: 'Go', license: 'BSD-3-Clause', paradigm: 'systems' },
  { owner: 'microsoft', repo: 'TypeScript', lang: 'TypeScript', license: 'Apache-2.0', paradigm: 'compiler' },
  { owner: 'apache', repo: 'spark', lang: 'Scala', license: 'Apache-2.0', paradigm: 'big-data' },
  { owner: 'pallets', repo: 'flask', lang: 'Python', license: 'BSD-3-Clause', paradigm: 'web' },
  { owner: 'ggerganov', repo: 'llama.cpp', lang: 'C++', license: 'MIT', paradigm: 'ML' },
  { owner: 'racket', repo: 'racket', lang: 'Racket', license: 'MIT/Apache-2.0', paradigm: 'functional' },
  { owner: 'ghc', repo: 'ghc', lang: 'Haskell', license: 'BSD-3-Clause', paradigm: 'compiler' },
  { owner: 'postgres', repo: 'postgres', lang: 'C', license: 'PostgreSQL', paradigm: 'database' },
  { owner: 'denoland', repo: 'deno', lang: 'Rust+TS', license: 'MIT', paradigm: 'runtime' },
  { owner: 'BurntSushi', repo: 'ripgrep', lang: 'Rust', license: 'MIT', paradigm: 'CLI' },
  { owner: 'sharkdp', repo: 'bat', lang: 'Rust', license: 'MIT/Apache-2.0', paradigm: 'CLI' },
  { owner: 'tiangolo', repo: 'fastapi', lang: 'Python', license: 'MIT', paradigm: 'web' },
  { owner: 'astral-sh', repo: 'ruff', lang: 'Rust', license: 'MIT', paradigm: 'tooling' },
  { owner: 'rails', repo: 'rails', lang: 'Ruby', license: 'MIT', paradigm: 'web' },
  { owner: 'ziglang', repo: 'zig', lang: 'Zig', license: 'MIT', paradigm: 'systems' },
  { owner: 'godotengine', repo: 'godot', lang: 'C++', license: 'MIT', paradigm: 'game-engine' },
];

async function fetchRaw(owner, repo, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  try {
    const res = await fetch(url);
    if (res.ok) return res.text();
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchRepoMeta(owner, repo) {
  // Fetch README and LICENSE
  const readme = await fetchRaw(owner, repo, 'main', 'README.md')
    || await fetchRaw(owner, repo, 'master', 'README.md');
  const license = await fetchRaw(owner, repo, 'main', 'LICENSE')
    || await fetchRaw(owner, repo, 'master', 'LICENSE');
  return { readme, license };
}

async function main() {
  console.log('=== Source Code Repository Fetcher ===\n');
  const manifest = {
    source: 'Open Source Code Repositories',
    fetched_at: new Date().toISOString(),
    repos: [],
  };

  for (const repo of REPOS) {
    console.log(`\n${repo.owner}/${repo.repo} (${repo.lang}, ${repo.license})`);
    const repoDir = path.join(OUTPUT_DIR, `${repo.owner}_${repo.repo}`);
    fs.mkdirSync(repoDir, { recursive: true });

    const entry = {
      owner: repo.owner,
      repo: repo.repo,
      lang: repo.lang,
      license: repo.license,
      paradigm: repo.paradigm,
      github_url: `https://github.com/${repo.owner}/${repo.repo}`,
      raw_base: `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}`,
      files: [],
    };

    // Fetch README and LICENSE
    const meta = await fetchRepoMeta(repo.owner, repo.repo);
    if (meta.readme) {
      const file = path.join(repoDir, 'README.md');
      fs.writeFileSync(file, meta.readme, 'utf8');
      entry.files.push({
        path: 'README.md',
        chars: meta.readme.length,
        local: path.relative(path.join(__dirname, '..'), file),
      });
      console.log(`  README: ${meta.readme.length} chars`);
    }
    if (meta.license) {
      const file = path.join(repoDir, 'LICENSE');
      fs.writeFileSync(file, meta.license, 'utf8');
      entry.files.push({
        path: 'LICENSE',
        chars: meta.license.length,
        local: path.relative(path.join(__dirname, '..'), file),
      });
      console.log(`  LICENSE: ${meta.license.length} chars`);
    }

    // Fetch a few representative source files per repo
    const sampleFiles = getSampleFiles(repo);
    for (const sf of sampleFiles) {
      const content = await fetchRaw(repo.owner, repo.repo, sf.branch, sf.path);
      if (content) {
        const localPath = sf.path.replace(/\//g, '_');
        const file = path.join(repoDir, localPath);
        fs.writeFileSync(file, content, 'utf8');
        entry.files.push({
          path: sf.path,
          chars: content.length,
          local: path.relative(path.join(__dirname, '..'), file),
        });
        console.log(`  ${sf.path}: ${content.length} chars`);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    manifest.repos.push(entry);
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.repos.length} repos processed ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

function getSampleFiles(repo) {
  const { owner, repo: name } = repo;
  const samples = {
    'linux': [
      { branch: 'master', path: 'Makefile' },
      { branch: 'master', path: 'init/main.c' },
      { branch: 'master', path: 'kernel/sched/core.c' },
    ],
    'sqlite': [
      { branch: 'main', path: 'src/sqlite.h.in' },
      { branch: 'main', path: 'src/shell.c.in' },
    ],
    'cpython': [
      { branch: 'main', path: 'README.rst' },
      { branch: 'main', path: 'Python/ceval.c' },
      { branch: 'main', path: 'Lib/typing.py' },
    ],
    'rust': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'compiler/rustc/Cargo.toml' },
    ],
    'go': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'src/runtime/proc.go' },
    ],
    'TypeScript': [
      { branch: 'main', path: 'README.md' },
      { branch: 'main', path: 'src/compiler/scanner.ts' },
    ],
    'spark': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'core/src/main/scala/org/apache/spark/SparkContext.scala' },
    ],
    'flask': [
      { branch: 'main', path: 'src/flask/__init__.py' },
      { branch: 'main', path: 'src/flask/app.py' },
    ],
    'llama.cpp': [
      { branch: 'master', path: 'llama.cpp' },
      { branch: 'master', path: 'ggml.c' },
    ],
    'racket': [
      { branch: 'master', path: 'README.md' },
    ],
    'ghc': [
      { branch: 'master', path: 'README.md' },
    ],
    'postgres': [
      { branch: 'master', path: 'README' },
      { branch: 'master', path: 'src/backend/postmaster/postmaster.c' },
    ],
    'deno': [
      { branch: 'main', path: 'README.md' },
      { branch: 'main', path: 'runtime/main.rs' },
    ],
    'ripgrep': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'crates/core/worker.rs' },
    ],
    'bat': [
      { branch: 'master', path: 'README.md' },
    ],
    'fastapi': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'fastapi/applications.py' },
    ],
    'ruff': [
      { branch: 'main', path: 'README.md' },
    ],
    'rails': [
      { branch: 'main', path: 'README.md' },
      { branch: 'main', path: 'railties/lib/rails/application.rb' },
    ],
    'zig': [
      { branch: 'master', path: 'README.md' },
    ],
    'godot': [
      { branch: 'master', path: 'README.md' },
      { branch: 'master', path: 'main/main.cpp' },
    ],
  };

  return samples[name] || [{ branch: 'main', path: 'README.md' }];
}

main().catch(console.error);
