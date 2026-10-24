#!/usr/bin/env node
// fetch-tamil-originals.mjs — the Tamil e-texts of Project Madurai (www.projectmadurai.org), as their Unicode/UTF-8
// HTML versions, for the South Asia language gap in GAP-SOURCES-PLAN.md (host approved 2026-10-24).
// Follows GAP-INGEST-SPEC.md.
//
// Terms read 2026-10-24 (full summaries go into the manifest's terms_read):
//   - https://www.projectmadurai.org/robots.txt: everything allowed except /dpmm/forum/; no Crawl-delay.
//   - Home page: "Distribution of the etext collections of Project Madurai by third parties is permitted, provided the
//     header page containing the Project Logo and credit acknowledgements are kept intact. Please contact the Project
//     Coordinators before online distribution." Downloads are free for personal use.
//   - Each e-text's header: "You are welcome to freely distribute this file, provided this header page is kept intact."
//   - FAQ 3.3: every work is either public domain (about 75 years after the author's life) or released with the
//     author's consent.
//   So: local copies only, the header kept inside the text exactly as received, and no online redistribution
//   (which includes pushing this folder to a public repository) until the coordinators are contacted. The terms
//   are not an open licence, so license_tier is `nc` (the more restrictive tier; the manifest says why).
// Source list: the catalogue table at /pmworks.html (work no., title, author, genre, PDF and Unicode links); one
// document per Unicode file (a file can hold several catalogue titles, e.g. pmuni0002 holds four Auvaiyar works).
// Conversion: HTML to plain text on the way in, line breaks kept; the sha256 is of the HTML bytes as received.
// Pace: 3 s between requests. Cache: $ZENODOTUS_CACHE/tamil-originals (default ~/.cache/zenodotus-fetch/...).
// Cap: 400 MB of text written; a cap stop is recorded in the manifest's `gaps` as `capped`, with what remains.
//
//   node scripts/fetch-tamil-originals.mjs              (resumable; cached pages are not re-fetched)
//   node scripts/fetch-tamil-originals.mjs --limit 5    (first five files only, for a check)

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { countWords, sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLL = '11-multi-language/tamil-originals';
const OUT = path.join(ROOT, COLL);
const MANIFEST = path.join(ROOT, 'manifests', 'tamil-originals-manifest.json');
const HOST = 'https://www.projectmadurai.org';
const UA = 'Zenodotus live_priors corpus builder (non-commercial research)';
const PACE_MS = 3000;
const CAP_TOTAL = 400 * 1024 * 1024;
const CACHE = path.join(process.env.ZENODOTUS_CACHE || path.join(os.homedir(), '.cache', 'zenodotus-fetch'), 'tamil-originals');
const LIMIT = process.argv.includes('--limit') ? +process.argv[process.argv.indexOf('--limit') + 1] : Infinity;
const TODAY = new Date().toISOString().slice(0, 10);
const LICENSE = 'Project Madurai e-text terms: "You are welcome to freely distribute this file, provided this header page is kept intact." (e-text header); "Distribution of the etext collections of Project Madurai by third parties is permitted, provided the header page containing the Project Logo and credit acknowledgements are kept intact. Please contact the Project Coordinators before online distribution." (home page)';

fs.mkdirSync(CACHE, { recursive: true });
let lastRequest = 0;
async function pace() { const w = lastRequest + PACE_MS - Date.now(); if (w > 0) await sleep(w); lastRequest = Date.now(); }
const cacheFile = (url) => path.join(CACHE, url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'index');

/** GET bytes with a cache; null on a non-200. */
async function getBytes(url) {
  const f = cacheFile(url);
  if (fs.existsSync(f)) return fs.readFileSync(f);
  for (let attempt = 0; attempt < 3; attempt++) {
    await pace();
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(f, b);
      return b;
    } catch { /* retry */ }
  }
  return null;
}

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", copy: '©', reg: '®', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', zwj: '‍', zwnj: '‌', shy: '' };
const unent = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const strip = (s) => unent(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** HTML to plain text, keeping line structure (the poetry is line-broken with <br>). */
function htmlToText(html) {
  // raw newlines in HTML are whitespace; line breaks come from the markup (text inside <pre> keeps its own)
  const pres = [];
  let t = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, x) => `\u0000${pres.push(x) - 1}\u0000`).replace(/[ \t]*\r?\n[ \t]*/g, ' ')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => '\n' + pres[+i] + '\n')
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi, '[$1]')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|tr|li|ul|ol|table|center|blockquote|pre|title)>/gi, '\n').replace(/<(p|hr|h[1-6]|li|tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  t = unent(t).replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim() + '\n';
}

const yaml = (v) => (v == null || v === '' ? 'unknown' : /[:#\n"'{}\[\],&*!|>%@`]|^\s|\s$|^-/.test(String(v)) ? JSON.stringify(String(v)) : String(v));
const slug = (s, n = 50) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n);

/** Statements of date the e-text itself makes, with their evidence; never inferred. */
function statedDates(text) {
  const head = text.slice(0, 6000);
  const out = [];
  const pats = [
    [/(?:written|composed)\s+(?:in|during|around|about|circa|c\.)\s+[^.\n]{0,40}?\b((?:1[0-9]|20)\d\d|\d{1,2}(?:st|nd|rd|th)\s+century(?:\s+(?:AD|CE|BC|BCE))?)/i, 'composition'],
    [/(?:first\s+(?:published|edition)|first\s+print(?:ed|ing))[^.\n]{0,30}?\b(1[7-9]\d\d|20[0-2]\d)\b/i, 'first-publication'],
    [/(?:முதற்|முதல்)\s*(?:ப்)?பதிப்பு[^\n]{0,30}?\b(1[7-9]\d\d|20[0-2]\d)\b/, 'first-publication'],
  ];
  for (const [re, kind] of pats) { const m = head.match(re); if (m) out.push({ kind, value: m[1], evidence: m[0].replace(/\s+/g, ' ').trim(), at: m.index }); }
  return out;
}

async function main() {
  console.log('=== Project Madurai Tamil e-texts (UTF-8) ===');
  const today = TODAY;
  const manifest = {
    source: 'Project Madurai (www.projectmadurai.org)',
    license: LICENSE,
    license_tier: 'nc',
    license_tier_basis: 'Not an open licence: free distribution only with the header page kept intact, downloads described as for personal use, and the coordinators ask to be contacted before online distribution. The spec keeps non-open terms apart, so the more restrictive tier (nc) is used for every e-text, including classical works whose underlying text is public domain by age.',
    distribution_note: 'Local copies only. Contact the Project Madurai coordinators (pmadurai AT gmail DOT com) before any online redistribution, which includes pushing this folder to a public repository.',
    fetched_at: new Date().toISOString(),
    terms_read: [
      { url: `${HOST}/robots.txt`, date: today, summary: 'All user agents may fetch everything except /dpmm/forum/; no Crawl-delay; sitemap at /sitemap.xml.' },
      { url: `${HOST}/`, date: today, summary: 'Project Madurai is an open, voluntary initiative publishing free e-texts of Tamil literature; anyone may download a copy for personal use free of charge. Third parties may distribute the e-texts provided the header page with the project logo and credit acknowledgements is kept intact, and are asked to contact the Project Coordinators before online distribution.' },
      { url: `${HOST}/faq.html`, date: today, summary: 'FAQ 1.6: the e-texts belong to everyone, with no single owner; the project is neither commercial nor governmental. FAQ 3.3: works are public domain (about 75 years after the author\'s life) or added with the author\'s consent; some recent works were released by their authors and some were placed in the public domain by the Tamil Nadu government. FAQ 1.7: earlier TSCII e-texts were converted to Unicode/UTF-8. Last updated 2009.' },
      { url: `${HOST}/pm_etexts/utf8/pmuni0001.html`, date: today, summary: 'Each e-text opens with a header page (logo image, credits, preparation notes, "© Project Madurai <years>") that says: you are welcome to freely distribute this file, provided this header page is kept intact. The HTML source also carries comments such as "Copyright (c) 2000 All Rights Reserved"; these are recorded per document as received_html_comments.' },
    ],
    pulled: [], rejected: [], gaps: [],
  };
  const cat = await getBytes(`${HOST}/pmworks.html`);
  if (!cat) throw new Error('catalogue /pmworks.html not reachable');
  const catHtml = cat.toString('utf8');
  const files = new Map();
  for (const r of catHtml.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
    const td = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (td.length < 6) continue;
    const row = { work_no: strip(td[0]), title: strip(td[1]), author: strip(td[2]), genre: strip(td[3]), pdf: [...td[4].matchAll(/href="([^"]+)"/g)].map((m) => HOST + m[1]) };
    for (const m of td[5].matchAll(/href="(\/pm_etexts\/utf8\/[^"]+\.html)"/g)) {
      if (!files.has(m[1])) files.set(m[1], []);
      files.get(m[1]).push(row);
    }
  }
  console.log(`catalogue: ${files.size} Unicode files`);
  fs.rmSync(OUT, { recursive: true, force: true }); // this fetcher's own folder: a rerun rewrites it whole (pages come from the cache)
  fs.mkdirSync(OUT, { recursive: true });
  let written = 0, i = 0;
  const remaining = [];
  for (const [rel, rows] of files) {
    if (++i > LIMIT) break;
    const url = HOST + rel;
    const base = path.basename(rel, '.html');
    if (written >= CAP_TOTAL) { remaining.push(url); continue; }
    const buf = await getBytes(url);
    if (!buf) { manifest.rejected.push({ url, titles: rows.map((r) => r.title), reason: 'fetch failed (404 or error)' }); continue; }
    const html = buf.toString('utf8');
    if ((html.match(/�/g) || []).length > 20) { manifest.rejected.push({ url, titles: rows.map((r) => r.title), reason: 'not valid UTF-8 as received' }); continue; }
    const text = htmlToText(html);
    const words = countWords(text);
    if (!words) { manifest.rejected.push({ url, titles: rows.map((r) => r.title), reason: 'no text' }); continue; }
    const htmlTitle = strip((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1]);
    const htmlLang = (html.match(/<html[^>]*\blang="([^"]+)"/i) || [, ''])[1];
    const comments = [...html.slice(0, 2000).matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim()).filter(Boolean);
    const tamil = (text.match(/[஀-௿]/g) || []).length, latin = (text.match(/[A-Za-z]/g) || []).length;
    const tamilShare = tamil / Math.max(1, tamil + latin);
    // Tamil originals only: an e-text whose letters are mostly not Tamil script is one of Project Madurai's English
    // translations or English studies (their titles say so); it is listed, not written into this folder.
    if (tamilShare < 0.2) { manifest.rejected.push({ url, titles: rows.map((r) => r.title), title_html: htmlTitle, reason: `not a Tamil-script text: Tamil letters are ${(100 * tamilShare).toFixed(0)}% of letters (the e-text's title: "${htmlTitle}"); an English translation or study, outside tamil-originals` }); continue; }
    const language = 'ta', script = 'Taml';
    const language_basis = `declared-by-source (Project Madurai Tamil e-text; html lang="${htmlLang || 'none'}"; Tamil letters are ${(100 * tamilShare).toFixed(0)}% of letters)`;
    const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))];
    const dates = statedDates(text);
    const comp = dates.find((d) => d.kind === 'composition');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const head = {
      title: uniq('title').join(' / '),
      title_html: htmlTitle || 'unknown',
      author: uniq('author').join(' / ') || 'unknown',
      author_basis: 'Project Madurai catalogue (pmworks.html)',
      collection: COLL,
      source: 'Project Madurai',
      source_url: url,
      catalogue_url: `${HOST}/pmworks.html`,
      work_no: uniq('work_no').join(', '),
      genre: uniq('genre').join(' / ') || 'unknown',
      genre_basis: 'Project Madurai catalogue',
      pdf_url: [...new Set(rows.flatMap((r) => r.pdf))].join(' ') || 'none listed',
      retrieved: today,
      sha256: sha,
      received_format: 'html',
      received_html_comments: comments.join(' | ') || 'none',
      license: LICENSE,
      license_url: `${HOST}/`,
      license_tier: 'nc',
      license_tier_basis: 'distribution terms are not an open licence (header must stay intact; contact before online distribution); the more restrictive tier is used',
      attribution: 'Project Madurai, https://www.projectmadurai.org/ — the e-text header page (credits) is kept intact at the top of the text',
      distribution_note: 'local copy only; contact the Project Madurai coordinators before any online redistribution',
      language,
      language_basis,
      script,
      date: comp ? comp.value : 'unknown',
      date_basis: comp ? `stated-in-text: "${comp.evidence}" at char ${comp.at}` : 'unknown (no composition date stated in the first 6,000 characters of the e-text, by the patterns in statedDates())',
      print_edition_stated: dates.filter((d) => d.kind === 'first-publication').map((d) => `${d.value} ("${d.evidence}" at char ${d.at})`).join('; ') || 'none',
      place_by: 'unknown', place_about: 'unknown',
      perspective_by: 'unknown', perspective_about: 'unknown',
      voice: 'unknown',
      voice_basis: 'not decided (literary, devotional or didactic work; the catalogue gives a genre, not a voice)',
      translation_of: 'unknown',
      cultural_note: 'none', privacy_note: 'none',
      words,
    };
    if (words < 600) head.floor_exempt = 'short work the holder publishes as a complete e-text';
    const file = path.join(OUT, `${base}${slug(htmlTitle) ? '-' + slug(htmlTitle) : ''}.txt`);
    const front = ['---', ...Object.entries(head).map(([k, v]) => `${k}: ${yaml(v)}`), '---', ''].join('\n');
    fs.writeFileSync(file, front + text, 'utf8');
    written += Buffer.byteLength(text);
    manifest.pulled.push({ file: path.relative(ROOT, file), url, sha256: sha, ...head });
    if (manifest.pulled.length % 25 === 0) console.log(`  ${manifest.pulled.length} written, ${(written / 1e6).toFixed(1)} MB`);
  }
  if (remaining.length) manifest.gaps.push({ type: 'capped', cap: '400 MB of text', remains: remaining });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), [
    '# Project Madurai Tamil e-texts: attribution and distribution terms', '',
    'The texts in this folder are the Unicode (UTF-8) e-texts of **Project Madurai** (https://www.projectmadurai.org/), an open,',
    'voluntary initiative that prepares electronic texts of Tamil literary works and distributes them free on the Internet.',
    'Fetched by `scripts/fetch-tamil-originals.mjs`; manifest `manifests/tamil-originals-manifest.json`. Generated by the fetcher; do not edit by hand.', '',
    '## The holder\'s terms', '',
    '- Each e-text\'s header page says: *"You are welcome to freely distribute this file, provided this header page is kept intact."*',
    '  The header (credits, preparers, "© Project Madurai" line) is kept, as received, at the top of every text here.',
    '  The project logo on that page is an image and appears in the text only as its alt text, `[pm logo]`.',
    '- The home page says third parties may distribute the e-texts provided the header page with the project logo and credit',
    '  acknowledgements is kept intact, and asks: *"Please contact the Project Coordinators before online distribution."*',
    '- FAQ 3.3: the works are public domain (about 75 years after the author\'s life) or added with their authors\' consent.', '',
    '## What this means here', '',
    '- **Local copies only.** These files are kept for non-commercial research on this machine. Before any online',
    '  redistribution, including pushing this folder to a public repository, contact the Project Madurai coordinators',
    '  (pmadurai AT gmail DOT com). That contact has not been made.',
    '- **Tier:** `nc` (kept apart from open material), because the terms are not an open licence.',
    '- **What was changed:** each HTML e-text was converted to plain text on the way in (line breaks kept, markup removed);',
    '  `sha256` is of the HTML as received, and the HTML comments of the received file are recorded as `received_html_comments`.', '',
    'Credit: Project Madurai and the volunteers named in each e-text\'s header.', '',
  ].join('\n'));
  console.log(`=== done: ${manifest.pulled.length} e-texts, ${(written / 1e6).toFixed(1)} MB; ${manifest.rejected.length} rejected; ${remaining.length} capped ===`);
}
main().catch((e) => { console.error(e); process.exit(1); });
