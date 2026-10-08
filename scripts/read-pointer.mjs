#!/usr/bin/env node
// scripts/read-pointer.mjs — read a pointed-at source ON DEMAND.
//
// The corpus vends open/PD sources and points at the rest (see
// pointers/README.md). This resolver reads a pointer from
// pointers/pointers.json, fetches its recipe into the non-distributed local
// cache .pointer-cache/ (git-ignored), anchors it (url, bytes, sha256), and
// prints it. Nothing it fetches is ever committed or served — the copy exists
// only on this machine, for reading.
//
//   node scripts/read-pointer.mjs --list
//   node scripts/read-pointer.mjs ugarit-baal-cycle        # fetch if needed, then read
//   node scripts/read-pointer.mjs --fetch pyramid-texts-sethe
//   node scripts/read-pointer.mjs --verify zohar-aramaic   # re-fetch, compare sha256
//   node scripts/read-pointer.mjs --meta ugarit-baal-cycle  # provenance only

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REGISTRY = path.join(ROOT, 'pointers', 'pointers.json');
const CACHE = path.join(ROOT, '.pointer-cache');
const UA = 'live_priors pointer reader (local, non-distributed)';

function load() {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  return reg.pointers || [];
}

function curl(url, { maxBytes = 200 * 1024 * 1024, timeout = 90 } = {}) {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-skL', '--compressed', '-m', String(timeout), '-A', UA, '--globoff', url], { maxBuffer: maxBytes }, (e, stdout) => (e ? reject(e) : resolve(stdout)));
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function jsonPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const WAYBACK = 'https://web.archive.org/web/';

/** rewrite a live URL to a raw Wayback snapshot (latest, or recipe.timestamp) */
function viaWayback(url, ts) {
  const stamp = ts ? String(ts) : '2';
  return `${WAYBACK}${stamp}id_/${url}`;
}

/** fetch one URL, applying the recipe's transform (retries w/ backoff) */
async function fetchOne(url, recipe) {
  const target = (recipe.kind === 'wayback' || recipe.kind === 'wayback-index')
    ? viaWayback(url, recipe.timestamp) : url;
  let body = null, lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { body = await curl(target); break; }
    catch (e) { lastErr = e; await sleep(3000 * (attempt + 1)); }
  }
  if (body == null) throw lastErr || new Error('fetch failed');
  let text = body;
  if (recipe.jsonPath) {
    try { text = JSON.stringify(jsonPath(JSON.parse(body), recipe.jsonPath), null, 0); }
    catch { text = body; }
  } else if (recipe.stripHtml !== false) {
    text = stripHtml(body);
  }
  return { text, bytes: body.length, url };
}

/** enumerate sub-page URLs from an index page (for multi-page works) */
async function enumerateIndex(indexUrl, recipe) {
  const body = await curl(viaWayback(indexUrl, recipe.timestamp));
  const re = new RegExp(recipe.linkPattern, 'gi');
  const base = indexUrl.replace(/[^/]*$/, '');
  const urls = new Set();
  for (const m of body.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!re.test(href)) { re.lastIndex = 0; continue; }
    re.lastIndex = 0;
    if (recipe.exclude && new RegExp(recipe.exclude, 'i').test(href)) continue;
    const abs = href.startsWith('http') ? href : new URL(href, base).href;
    urls.add(abs);
  }
  let list = [...urls];
  if (recipe.max) list = list.slice(0, recipe.max);
  return list;
}

async function fetchPointer(ptr) {
  const recipe = ptr.recipe || {};
  const parts = [];
  const sources = [];

  if (recipe.kind === 'wayback-index') {
    process.stderr.write(`  indexing ${recipe.index} ... `);
    const pages = await enumerateIndex(recipe.index, recipe);
    process.stderr.write(`${pages.length} pages\n`);
    for (const u of pages) {
      process.stderr.write(`    ${u} ... `);
      try {
        const { text, bytes } = await fetchOne(u, recipe);
        sources.push({ url: u, bytes });
        parts.push(`## ${u}\n\n${text}`);
        process.stderr.write(`${bytes} bytes\n`);
      } catch (e) { process.stderr.write(`FAILED ${e.message}\n`); }
      await sleep(recipe.delayMs || 1500); // be polite to archive.org
    }
    return { text: parts.join('\n\n' + '─'.repeat(60) + '\n\n'), sources };
  }

  for (const url of recipe.urls || []) {
    process.stderr.write(`  fetching ${url} ... `);
    try {
      const { text, bytes } = await fetchOne(url, recipe);
      sources.push({ url, bytes });
      parts.push(text);
      process.stderr.write(`${bytes} bytes\n`);
    } catch (e) { process.stderr.write(`FAILED: ${e.message}\n`); }
  }
  return { text: parts.join('\n\n' + '─'.repeat(60) + '\n\n'), sources };
}

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function metaPath(id) { return path.join(CACHE, `${id}.meta.json`); }
function cachePath(id) { return path.join(CACHE, `${id}.txt`); }

function readMeta(id) {
  try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')); } catch { return null; }
}

async function ensure(ptr, { force = false } = {}) {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!force && fs.existsSync(cachePath(ptr.id))) {
    const meta = readMeta(ptr.id);
    return { text: fs.readFileSync(cachePath(ptr.id), 'utf8'), meta, cached: true };
  }
  const { text, sources } = await fetchPointer(ptr);
  if (!text.trim()) throw new Error('empty fetch — pointer recipe resolved nothing');
  const min = ptr.expected?.minBytes ?? 0;
  if (text.length < min) {
    process.stderr.write(`  WARNING: fetched ${text.length} bytes, below expected minBytes ${min}\n`);
  }
  const meta = {
    id: ptr.id,
    title: ptr.title,
    author: ptr.author,
    rights: ptr.rights,
    vendorable: ptr.vendorable,
    fetched_at: new Date().toISOString(),
    bytes: text.length,
    sha256: sha256(text),
    sources,
    recipe: ptr.recipe,
  };
  fs.writeFileSync(cachePath(ptr.id), text, 'utf8');
  fs.writeFileSync(metaPath(ptr.id), JSON.stringify(meta, null, 2), 'utf8');
  return { text, meta, cached: false };
}

async function main() {
  const args = process.argv.slice(2);
  const pointers = load();

  if (!args.length || args.includes('--list')) {
    console.log(`Pointers — sources cited but not held (${pointers.length}). Fetched on demand into .pointer-cache/ (git-ignored).\n`);
    for (const p of pointers) {
      const cached = fs.existsSync(cachePath(p.id)) ? ' [cached]' : '';
      const persp = p.perspective ? ` «${p.perspective}»` : '';
      console.log(`  ${p.id}${cached}${persp}`);
      console.log(`      ${p.title}`);
      console.log(`      rights=${p.rights} vendorable=${p.vendorable}`);
    }
    const byPersp = {};
    for (const p of pointers) if (p.perspective) (byPersp[p.perspective] ??= []).push(p.id);
    console.log(`\nperspectives covered by pointers: ${Object.keys(byPersp).length}`);
    for (const [k, v] of Object.entries(byPersp)) console.log(`  ${k}: ${v.length}`);
    console.log(`\nusage: node scripts/read-pointer.mjs <id> | --fetch <id> | --verify <id> | --meta <id>`);
    return;
  }

  const mode = args[0].startsWith('--') ? args[0] : '--read';
  const id = args[0].startsWith('--') ? args[1] : args[0];
  const ptr = pointers.find(p => p.id === id);
  if (!ptr) {
    console.error(`no such pointer: ${id}`);
    console.error(`known: ${pointers.map(p => p.id).join(', ')}`);
    process.exit(1);
  }

  if (mode === '--meta') {
    const meta = readMeta(id);
    console.log(JSON.stringify(meta || { id, cached: false, note: 'not yet fetched' }, null, 2));
    return;
  }

  if (mode === '--verify') {
    const before = readMeta(id);
    const { meta, cached } = await ensure(ptr, { force: true });
    const same = before && before.sha256 === meta.sha256;
    console.log(JSON.stringify({ id, cached_before: !!before, refetched: !cached, sha256_before: before?.sha256 || null, sha256_now: meta.sha256, unchanged: same }, null, 2));
    process.exit(same ? 0 : 3);
  }

  if (mode === '--fetch') {
    if (fs.existsSync(cachePath(id)) && !args.includes('--force')) {
      console.log(`already cached: ${path.relative(ROOT, cachePath(id))} (use --force to refetch)`);
      return;
    }
    const { meta } = await ensure(ptr, { force: true });
    console.log(`fetched ${meta.bytes} bytes → ${path.relative(ROOT, metaPath(id))}`);
    return;
  }

  // --read
  const { text, meta, cached } = await ensure(ptr, { force: args.includes('--force') });
  const header = [
    `# ${meta.title}`,
    `# author:   ${meta.author}`,
    `# rights:   ${meta.rights}${meta.vendorable ? ' (vendorable — should be held, not pointed at)' : ' (pointer-only)'}`,
    `# source:   ${meta.sources.map(s => s.url).join('\n#           ')}`,
    `# fetched:  ${meta.fetched_at}${cached ? '  [from local cache]' : ''}`,
    `# bytes:    ${meta.bytes}   sha256: ${meta.sha256}`,
    '#',
    `# ${ptr.why_pointer}`,
    ''.replace('_', ''),
  ].join('\n');
  console.log(header);
  console.log(text);
}

main().catch(e => { console.error(e.message); process.exit(1); });
