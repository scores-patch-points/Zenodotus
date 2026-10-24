// Shared helpers for the first-person gap pulls from the Library of Congress
// and DocSouth (GAP-INGEST-SPEC.md, hosts approved 2026-10-24):
//   fetch-federal-writers-life-histories.mjs, fetch-slave-narratives-loc.mjs,
//   fetch-docsouth-slave-narratives.mjs, fetch-chronicling-america.mjs
//
// - politeGet: the spec's User-Agent, requests serialised per "pace group" and
//   spaced by that group's interval. Every *.loc.gov host (www, tile) shares ONE
//   group: the Library's legal notice (https://www.loc.gov/legal/) recommends
//   "no more than 10 requests per minute to our applications, regardless of the
//   number of machines", so all LoC requests together are spaced 6 s apart
//   (also above robots.txt's Crawl-Delay: 5 and under the API's 20/min limit).
// - a block (HTTP 429, or an HTML challenge page where JSON was asked for)
//   throws BlockedError: the fetchers stop and record it, never work around it.
// - a gzip cache outside the repo (~/.cache/zenodotus/<collection>/), so a
//   rerun resumes without re-requesting anything already received.
// - frontmatter written as YAML whose string values are JSON-quoted when needed.

import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

export const UA = 'Zenodotus live_priors corpus builder (non-commercial research)';
export const today = () => new Date().toISOString().slice(0, 10);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export class BlockedError extends Error {}

const GROUP_GAP = { loc: 6000, docsouth: 3000 };
const groupOf = (host) => (/(^|\.)loc\.gov$/.test(host) ? 'loc' : /docsouth\.unc\.edu$/.test(host) ? 'docsouth' : host);
const lastHit = new Map();
const chain = new Map();
let requestCount = 0;
export const requestsMade = () => requestCount;

/**
 * GET through the pace group of the URL's host. Returns { status, buf, type, url }.
 * `expect: 'json'` turns an HTML answer (a challenge or CAPTCHA page) into a BlockedError.
 */
export function politeGet(url, { expect = null, timeoutMs = 120000, retries = 2 } = {}) {
  const group = groupOf(new URL(url).host);
  const prev = chain.get(group) || Promise.resolve();
  const run = prev.then(async () => {
    let last = { status: 0, error: 'not attempted', url };
    for (let attempt = 0; attempt <= retries; attempt++) {
      const gap = (GROUP_GAP[group] ?? 3000) * (attempt ? 2 ** attempt : 1);
      const wait = (lastHit.get(group) || 0) + gap - Date.now();
      if (wait > 0) await sleep(wait);
      lastHit.set(group, Date.now());
      requestCount++;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': UA }, redirect: 'follow' });
        const buf = Buffer.from(await res.arrayBuffer());
        const type = res.headers.get('content-type') || '';
        last = { status: res.status, buf, type, url: res.url };
        if (res.status === 429) throw new BlockedError(`HTTP 429 from ${new URL(url).host}`);
        const head = buf.slice(0, 600).toString('utf8');
        if (expect === 'json' && /text\/html/.test(type) && /Just a moment|captcha|challenge/i.test(head))
          throw new BlockedError(`challenge page from ${new URL(url).host} (HTTP ${res.status})`);
        if (res.status >= 500) continue;
        return last;
      } catch (e) {
        if (e instanceof BlockedError) throw e;
        last = { status: 0, error: String(e?.cause?.code || e?.message || e), url };
      }
    }
    return last;
  });
  chain.set(group, run.catch(() => {}));
  return run;
}

export async function getJson(url, opts = {}) {
  const r = await politeGet(url, { expect: 'json', ...opts });
  if (r.status !== 200 || !r.buf) return { ...r, json: null };
  try {
    return { ...r, json: JSON.parse(r.buf.toString('utf8')) };
  } catch {
    return { ...r, json: null };
  }
}

// ------------------------------------------------------------------ cache --

export function cacheDir(collection) {
  const base = process.env.ZENODOTUS_CACHE || path.join(os.homedir(), '.cache', 'zenodotus');
  const dir = path.join(base, collection);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const cachePath = (dir, key) => path.join(dir, key.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200) + '.gz');
export function cacheGet(dir, key) {
  const p = cachePath(dir, key);
  if (!fs.existsSync(p)) return null;
  try { return zlib.gunzipSync(fs.readFileSync(p)); } catch { return null; }
}
export function cachePut(dir, key, buf) {
  fs.writeFileSync(cachePath(dir, key), zlib.gzipSync(buf));
}
/** GET through the cache; only a 200 body is kept. JSON is parsed when `json` is set. */
export async function cachedGet(dir, key, url, { json = false, ...opts } = {}) {
  const hit = cacheGet(dir, key);
  if (hit) {
    if (!json) return { status: 200, buf: hit, cached: true, url };
    try { return { status: 200, buf: hit, cached: true, url, json: JSON.parse(hit.toString('utf8')) }; } catch { /* refetch */ }
  }
  const r = json ? await getJson(url, opts) : await politeGet(url, opts);
  if (r.status === 200 && r.buf && (!json || r.json)) cachePut(dir, key, r.buf);
  return r;
}

// ----------------------------------------------------------- frontmatter --

export const yamlValue = (v) => {
  if (v == null || v === '') return 'unknown';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return /[:#\n\r\t"'\[\]{},&*!|>%@`\\]|^[\s?-]|\s$|^(yes|no|on|off|true|false|null|~)$/i.test(s) || /^[\d.:+-]+$/.test(s) ? JSON.stringify(s) : s;
};
export const frontmatter = (head) => ['---', ...Object.entries(head).map(([k, v]) => `${k}: ${yamlValue(v)}`), '---', ''].join('\n');

export function slug(s, max = 60) {
  return (
    String(s || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/, '') || 'untitled'
  );
}

/** Manifest kept on disk between runs: earlier rows survive a rerun. */
export function loadManifest(file, base) {
  let m = { ...base, terms_read: base.terms_read || [], pulled: [], rejected: [], gaps: [] };
  if (fs.existsSync(file)) {
    try {
      const old = JSON.parse(fs.readFileSync(file, 'utf8'));
      m.pulled = old.pulled || [];
    } catch { /* start fresh */ }
  }
  return m;
}
export function saveManifest(file, m) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(m, null, 2));
  fs.renameSync(file + '.tmp', file);
}

/** Bytes on disk under a folder (recursive). */
export function folderBytes(dir) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? folderBytes(p) : fs.statSync(p).size;
  }
  return n;
}
