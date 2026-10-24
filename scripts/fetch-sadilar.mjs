#!/usr/bin/env node
// fetch-sadilar.mjs — South African language text corpora from the SADiLaR Language Resource Repository
// (repo.sadilar.org, DSpace 7.6), for the Africa language gap in GAP-SOURCES-PLAN.md (host approved 2026-10-24).
// Follows GAP-INGEST-SPEC.md.
//
// Terms read 2026-10-24 (full summaries go into the manifest's terms_read):
//   - https://repo.sadilar.org/robots.txt: DSpace default; disallows /search, /admin, /processes, /submit,
//     /workspaceitems, /profile, /workflowitems and a list of named site-copier bots. It does not disallow the
//     REST API (/server/api) or OAI-PMH (/server/oai), which are what this fetcher uses. No Crawl-delay.
//   - The repository has no site-wide terms page (/info/end-user-agreement answers 404). Each item carries its own
//     licence in dc.rights.license; that statement governs the item, and it is copied into every document.
// Selection (mechanical, from the OAI-PMH `dim` metadata, never a hand list): dc.media.type = Text; a monolingual
// running-text corpus (NCHLT text corpora, genre-classification corpora, Autshumato monolingual corpora, AST text
// corpora); an open licence (CC BY / CC BY-SA; any NC or ND term rejects); not English (the gap is African
// languages); the item's access status is open.access and the bitstream downloads without login. Annotated,
// parallel, lexicon, speech and tool items are listed under `rejected` with the reason.
// Documents: a corpus file whose holder marks document boundaries is split on them; otherwise the file is one
// document with `floor_exempt: corpus file`. Text only: audio and other non-text members of a zip are not kept.
// Pace: 3 s between requests. Cache: $ZENODOTUS_CACHE/sadilar (default ~/.cache/zenodotus-fetch/sadilar);
// the fetcher is resumable (cached responses are reused, downloads are checked against the holder's MD5).
// Caps: 450 MB of text written in total; no single document over 90 MB (GitHub's 100 MB file limit). What a cap
// stops is recorded in the manifest's `gaps` as `capped`, with what remains.
//
//   node scripts/fetch-sadilar.mjs --plan     (metadata only: lists what would be pulled)
//   node scripts/fetch-sadilar.mjs            (pull; resumable)

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { countWords, sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLL = '11-multi-language/sadilar';
const OUT = path.join(ROOT, COLL);
const MANIFEST = path.join(ROOT, 'manifests', 'sadilar-manifest.json');
const HOST = 'https://repo.sadilar.org';
const UA = 'Zenodotus live_priors corpus builder (non-commercial research)';
const PACE_MS = 3000;
const CAP_TOTAL = 450 * 1024 * 1024;
const CAP_DOC = 90 * 1024 * 1024;
const CACHE = path.join(process.env.ZENODOTUS_CACHE || path.join(os.homedir(), '.cache', 'zenodotus-fetch'), 'sadilar');
const PLAN = process.argv.includes('--plan');
const TODAY = new Date().toISOString().slice(0, 10);

// ISO 639-3 (as the repository declares it) -> ISO 639-1 where one exists (spec: 639-1, else 639-3)
const ISO1 = { afr: 'af', nbl: 'nr', nso: 'nso', sot: 'st', ssw: 'ss', tsn: 'tn', tso: 'ts', ven: 've', xho: 'xh', zul: 'zu', eng: 'en' };
// language names as the repository spells them in dc.languages, for items whose dc.language.iso is empty
const NAME3 = [[/afrikaans/i, 'afr'], [/ndebele/i, 'nbl'], [/sepedi|sesotho sa leboa|northern sotho/i, 'nso'], [/^sesotho$|southern sotho/i, 'sot'],
  [/siswati|swati/i, 'ssw'], [/setswana|tswana/i, 'tsn'], [/xitsonga|tsonga/i, 'tso'], [/tshiven/i, 'ven'], [/xhosa/i, 'xho'], [/zulu/i, 'zul'], [/english/i, 'eng']];

fs.mkdirSync(CACHE, { recursive: true });
let lastRequest = 0;
async function pace() { const wait = lastRequest + PACE_MS - Date.now(); if (wait > 0) await sleep(wait); lastRequest = Date.now(); }
const cacheFile = (url) => path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex').slice(0, 16) + '-' + url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80));

/** GET text with a cache; null on a non-200. */
async function getText(url) {
  const f = cacheFile(url);
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  for (let attempt = 0; attempt < 3; attempt++) {
    await pace();
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
      if (r.status === 404 || r.status === 401 || r.status === 403) return null;
      if (!r.ok) continue;
      const t = await r.text();
      fs.writeFileSync(f, t);
      return t;
    } catch { /* retry */ }
  }
  return null;
}
const getJson = async (url) => { const t = await getText(url); try { return t ? JSON.parse(t) : null; } catch { return null; } };

/** Download a bitstream to the cache with curl (resumable), checking the holder's MD5. */
async function download(url, name, md5) {
  const dir = path.join(CACHE, 'bitstreams'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, name.replace(/[^A-Za-z0-9._-]+/g, '_'));
  const ok = () => fs.existsSync(f) && (!md5 || crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex') === md5);
  if (ok()) return f;
  for (let attempt = 0; attempt < 3; attempt++) {
    await pace();
    try { execFileSync('curl', ['-sSL', '--fail', '-C', '-', '-m', '3600', '-A', UA, '-o', f, url], { stdio: 'ignore' }); } catch { /* retry */ }
    if (ok()) return f;
    if (fs.existsSync(f) && attempt === 1) fs.rmSync(f); // a corrupt partial: restart from zero once
  }
  return null;
}

// ---------- OAI-PMH harvest (bulk metadata, preferred to crawling) ----------
async function harvest() {
  const recs = [];
  let url = `${HOST}/server/oai/request?verb=ListRecords&metadataPrefix=dim`;
  while (url) {
    const xml = await getText(url);
    if (!xml) throw new Error('OAI harvest failed at ' + url);
    for (const r of xml.match(/<record>[\s\S]*?<\/record>/g) || []) {
      const d = { oai: (r.match(/<identifier>([^<]+)/) || [])[1], deleted: /status="deleted"/.test(r) };
      for (const m of r.matchAll(/<dim:field mdschema="(\w+)" element="(\w+)"(?: qualifier="(\w+)")?[^>]*>([\s\S]*?)<\/dim:field>/g)) {
        const k = `${m[1]}.${m[2]}${m[3] ? '.' + m[3] : ''}`;
        (d[k] ||= []).push(unescapeXml(m[4]).trim());
      }
      recs.push(d);
    }
    const tok = (xml.match(/<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/) || [])[1];
    url = tok ? `${HOST}/server/oai/request?verb=ListRecords&resumptionToken=${encodeURIComponent(tok)}` : null;
  }
  return recs;
}
function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
const one = (d, k) => (d[k] || [])[0] || '';
const all = (d, k) => d[k] || [];

// ---------- selection ----------
const OPEN = /Creative Commons Attribution(?:[- ]ShareAlike)? (?:2\.5|3\.0|4\.0)|\bCC[- ]?BY(?:[- ]SA)?\b|Attribution(?:-ShareAlike)? 4\.0 International/i;
const RESTRICT = /non-?commercial|no-?deriv|\bNC\b|\bND\b|by-nc|by-nd|research only|all rights reserved|^none$|^tbc$|not applicable/i;
function classify(d) {
  const title = one(d, 'dc.title'), cat = all(d, 'dc.media.category').join('; '), lic = all(d, 'dc.rights.license').join('; ');
  const hay = `${title} ${cat}`;
  if (d.deleted) return 'deleted record';
  if (!all(d, 'dc.media.type').includes('Text')) return null; // not text: outside this pull, not listed
  if (!/monolingual|genre classification|text corp/i.test(hay)) {
    if (/parallel|aligned|bilingual|multilingual/i.test(hay)) return 'parallel or multilingual aligned corpus (not monolingual running text)';
    return null; // tools, embeddings, models, lexica: not text corpora, not listed
  }
  if (/lexic|dictionary|word ?list|data set|dataset/i.test(hay)) return 'lexicon or data set (not running text)';
  if (/named entity|phrase chunk|\bPOS\b|treebank|lemma/i.test(title) || (/annotated/i.test(cat) && !/unannotated/i.test(cat))) return 'annotated corpus (token-per-line annotation, not running text)';
  if (/speech|spoken|signed/i.test(title) && !/text corpus/i.test(title)) return 'speech or sign corpus';
  if (!lic) return 'no licence stated in the record';
  if (RESTRICT.test(lic)) return `licence not open: ${lic.slice(0, 120)}`;
  if (!OPEN.test(lic)) return `licence not recognised as open: ${lic.slice(0, 120)}`;
  const langs = langsOf(d);
  if (langs.length === 1 && langs[0] === 'eng') return 'English: outside the African-language gap this pull answers (open licence; available if wanted)';
  if (langs.length !== 1) return `not a single declared language (${langs.join(',') || 'none'})`;
  return 'select';
}
function langsOf(d) {
  const iso = all(d, 'dc.language.iso').filter(Boolean);
  if (iso.length) return [...new Set(iso)];
  const out = new Set();
  for (const n of all(d, 'dc.languages')) for (const [re, c] of NAME3) if (re.test(n)) { out.add(c); break; }
  return [...out];
}
function licenseUrl(d) {
  const uri = one(d, 'dc.rights.uri');
  if (uri) return uri;
  const m = all(d, 'dc.rights.license').join(' ').match(/https?:\/\/\S+/);
  if (m) return m[0].replace(/[).,;]+$/, '');
  const lic = all(d, 'dc.rights.license').join(' ');
  if (/2\.5 South Africa/i.test(lic)) return 'https://creativecommons.org/licenses/by/2.5/za/legalcode';
  if (/4\.0/.test(lic) && /share/i.test(lic)) return 'https://creativecommons.org/licenses/by-sa/4.0/';
  if (/4\.0/.test(lic)) return 'https://creativecommons.org/licenses/by/4.0/';
  return 'unknown';
}
function spdx(lic) {
  if (/2\.5 South Africa/i.test(lic)) return 'CC-BY-2.5-ZA';
  if (/3\.0/.test(lic) && /South Africa|\bZA\b/i.test(lic)) return 'CC-BY-3.0-ZA';
  if (/3\.0/.test(lic)) return 'CC-BY-3.0';
  if (/share/i.test(lic) && /4\.0/.test(lic)) return 'CC-BY-SA-4.0';
  if (/4\.0/.test(lic)) return 'CC-BY-4.0';
  return 'unknown';
}

// ---------- document boundaries ----------
// Each rule names the marker a holder uses; a file is split only when its own marker is found in it.
const BOUNDARIES = [
  { name: '<fn>…</fn> source-file marker (NCHLT text corpora)', re: /^<fn>\s*(.*?)\s*<\/fn>\s*$/gm },
  { name: '<doc …> element', re: /^<doc\b([^>]*)>\s*$/gm },
];
function splitDocs(text) {
  for (const b of BOUNDARIES) {
    const ms = [...text.matchAll(b.re)];
    if (ms.length < 2) continue;
    const docs = [];
    for (let i = 0; i < ms.length; i++) {
      const start = ms[i].index, end = i + 1 < ms.length ? ms[i + 1].index : text.length;
      docs.push({ label: ms[i][1].trim(), start, end });
    }
    if (ms[0].index > 0 && text.slice(0, ms[0].index).trim()) docs.unshift({ label: '(text before the first marker)', start: 0, end: ms[0].index });
    return { rule: b.name, docs };
  }
  return null;
}

const yaml = (v) => (v == null || v === '' ? 'unknown' : /[:#\n"'{}\[\],&*!|>%@`]|^\s|\s$|^-/.test(String(v)) ? JSON.stringify(String(v)) : String(v));
const slug = (s, n = 60) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n) || 'untitled';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

async function main() {
  console.log(`=== SADiLaR text corpora (${PLAN ? 'plan' : 'pull'}) ===`);
  const recs = await harvest();
  console.log(`OAI records: ${recs.length}`);
  const manifest = {
    source: 'SADiLaR Language Resource Repository (South African Centre for Digital Language Resources)',
    license: 'per item, as each record states it (CC BY 2.5 ZA, CC BY 4.0 and the like); open-licensed items only',
    fetched_at: new Date().toISOString(),
    terms_read: [
      { url: `${HOST}/robots.txt`, date: TODAY, summary: 'DSpace default robots.txt. Disallows /search, /admin/*, /processes, /submit, /workspaceitems, /profile, /workflowitems and facet links on entity pages, and blocks a list of named site-copier bots. The REST API (/server/api) and OAI-PMH (/server/oai) are not disallowed; no Crawl-delay is set. This fetcher uses only OAI-PMH, the REST item/bundle/bitstream endpoints and the bitstream content links, at one request every 3 s.' },
      { url: `${HOST}/info/end-user-agreement`, date: TODAY, summary: 'No site-wide terms page: the DSpace end-user agreement answers 404 and the home page links to none. The home page says the repository distributes SADiLaR\'s collections, data sets, tools and other language resources. Terms are therefore per item: the licence in each record\'s dc.rights.license governs it, and is copied into every document taken from it. Items whose bitstreams need a login are skipped, never worked around.' },
      { url: `${HOST}/server/oai/request?verb=Identify`, date: TODAY, summary: 'OAI-PMH 2.0 endpoint, admin contact support@sadilar.org; used as the bulk metadata route (6 ListRecords pages) instead of crawling.' },
    ],
    selection_rule: 'dc.media.type = Text; title or category names a monolingual / genre-classification / text corpus; not annotated, parallel, lexicon or speech; licence names CC BY or CC BY-SA and no NC/ND/research-only term; one declared language, not English; access status open.access.',
    pulled: [], rejected: [], gaps: [],
  };
  const selected = [];
  for (const d of recs) {
    const c = classify(d);
    if (!c) continue;
    const handle = (one(d, 'dc.identifier.uri').match(/20\.500\.12185\/[\d.]+/) || [])[0] || '';
    const row = { title: one(d, 'dc.title'), handle_url: handle ? `https://hdl.handle.net/${handle}` : 'unknown', license: all(d, 'dc.rights.license').join('; ') || 'none stated' };
    if (c === 'select') selected.push({ d, handle, ...row }); else manifest.rejected.push({ ...row, reason: c });
  }
  console.log(`selected ${selected.length}; rejected (text corpora not taken) ${manifest.rejected.length}`);
  // ---- phase 1: resolve each item, its access status and its bitstreams ----
  const plan = [];
  for (const it of selected) {
    const { d, handle } = it;
    const lang3 = langsOf(d)[0], lang = ISO1[lang3] || lang3;
    const item = await getJson(`${HOST}/server/api/pid/find?id=${handle}`);
    if (!item?.uuid) { manifest.rejected.push({ title: it.title, handle_url: it.handle_url, reason: 'handle did not resolve to an item' }); continue; }
    const access = await getJson(`${HOST}/server/api/core/items/${item.uuid}/accessStatus`);
    const bundles = await getJson(`${HOST}/server/api/core/items/${item.uuid}/bundles?embed=bitstreams&size=50`);
    const orig = (bundles?._embedded?.bundles || []).find(b => b.name === 'ORIGINAL');
    const bits = orig?._embedded?.bitstreams?._embedded?.bitstreams || [];
    if (access?.status && access.status !== 'open.access') { manifest.rejected.push({ title: it.title, handle_url: it.handle_url, reason: `access status ${access.status} (needs a login or is embargoed)` }); continue; }
    if (!bits.length) { manifest.rejected.push({ title: it.title, handle_url: it.handle_url, reason: 'no ORIGINAL bitstream' }); continue; }
    const family = /^NCHLT/i.test(it.title) ? 1 : /genre classification/i.test(it.title) ? 2 : /African Speech Technology/i.test(it.title) ? 3 : 4;
    plan.push({ it, d, handle, lang, bits, family, size: bits.reduce((a, b) => a + b.sizeBytes, 0) });
    console.log(`${it.title} [${lang}] ${it.handle_url}: ${bits.map(b => `${b.name} (${(b.sizeBytes / 1e6).toFixed(1)} MB)`).join(', ')}`);
  }
  if (PLAN) return;

  // ---- phase 2: download (cached, MD5-checked), unpack each zip into its own directory, choose members ----
  // What each family's zip holds, and what is taken (the holder's own layout, read from the files and READMEs):
  //   NCHLT: 1.Source/ (the source documents as converted to text), 2.Corpora/ (RAW and CLEAN corpus: the source
  //     documents concatenated, each opened by a <fn>name</fn> line, CLEAN after clean-up), 3.Lexica/ (word lists).
  //     Taken: the CLEAN corpus, split on its <fn> marks. Not taken: 1.Source and RAW (the same documents again,
  //     before clean-up), 3.Lexica (derived lists), the readme.
  //   Genre classification: one file per document, in folders named by genre label (and a Test/ split). All taken.
  //   AST text corpora: one file per document, in folders named by source type; the technical report is not text.
  //   Autshumato monolingual: one segment-per-line file and a README. The segment file is taken whole.
  const walkFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const group = (p, name, n, reason) => manifest.rejected.push({ title: p.it.title, handle_url: p.it.handle_url, members: name, count: n, reason });
  for (const p of plan) {
    p.files = []; p.members = [];
    for (const b of p.bits) {
      const url = b._links.content.href, md5 = b.checkSum?.checkSumAlgorithm === 'MD5' ? b.checkSum.value : null;
      if (/readme/i.test(b.name)) { group(p, b.name, 1, 'documentation file (kept in the cache only)'); continue; }
      if (!/\.(zip|txt)$/i.test(b.name)) { group(p, b.name, 1, 'bitstream is not a text file or zip'); continue; }
      const f = await download(url, `${p.handle.replace(/\//g, '_')}-${b.name}`, md5);
      if (!f) { manifest.rejected.push({ title: p.it.title, handle_url: p.it.handle_url, bitstream: b.name, url, reason: 'download failed (or needs a login)' }); continue; }
      const fb = { name: b.name, path: f, url, md5, sha256: sha(fs.readFileSync(f)) };
      p.files.push(fb);
      if (!/\.zip$/i.test(b.name)) { p.members.push({ fb, name: b.name, file: f }); continue; }
      const dir = path.join(CACHE, 'unpacked', path.basename(f).replace(/\.zip$/i, ''));
      if (!fs.existsSync(path.join(dir, '.complete'))) {
        fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
        let failed = [];
        try { execFileSync('bsdtar', ['-xf', f, '-C', dir], { stdio: ['ignore', 'ignore', 'pipe'] }); }
        catch (e) { failed = String(e.stderr || '').split('\n').filter((l) => /Can't create/.test(l)).map((l) => l.split(': Can')[0]); }
        fs.writeFileSync(path.join(dir, '.complete'), JSON.stringify(failed));
      }
      const unpackFailed = JSON.parse(fs.readFileSync(path.join(dir, '.complete'), 'utf8') || '[]');
      if (unpackFailed.length) group(p, unpackFailed.slice(0, 3).join('; ') + (unpackFailed.length > 3 ? ' ...' : ''), unpackFailed.length, 'zip member could not be unpacked (its file name is not valid UTF-8)' + (unpackFailed.every((x) => /\/1\.Source\//.test(x)) ? '; all are 1.Source files, which are not taken anyway' : ''));
      const unpacked = walkFiles(dir).filter((x) => !/\/(__MACOSX|\.complete$)|\/\._/.test(x) && !x.endsWith('/.complete'));
      const rel = (x) => path.relative(dir, x);
      const nonText = unpacked.filter((x) => !/\.(txt|text)$/i.test(x));
      if (nonText.length) group(p, nonText.map(rel).slice(0, 5).join('; ') + (nonText.length > 5 ? ' ...' : ''), nonText.length, 'not a text file (report, document, audio or spreadsheet)');
      let txt = unpacked.filter((x) => /\.(txt|text)$/i.test(x));
      const docs = txt.filter((x) => /readme|licen[cs]e/i.test(path.basename(x)));
      if (docs.length) group(p, docs.map(rel).join('; '), docs.length, 'documentation file (kept in the cache only)');
      txt = txt.filter((x) => !docs.includes(x));
      if (p.family === 1) {
        const src = txt.filter((x) => /\/1\.Source\//.test(x)), raw = txt.filter((x) => /\/2\.Corpora\/.*RAW/i.test(x)), lex = txt.filter((x) => /\/3\.Lexica\//.test(x));
        if (src.length) group(p, '1.Source/*', src.length, 'source documents before clean-up; the CLEAN corpus holds the same documents, each opened by a <fn> mark, and is what is taken');
        if (raw.length) group(p, raw.map(rel).join('; '), raw.length, 'RAW corpus: the same documents before clean-up');
        if (lex.length) group(p, lex.map(rel).join('; '), lex.length, 'word and named-entity lists derived from the corpus, not running text');
        txt = txt.filter((x) => /\/2\.Corpora\/.*CLEAN/i.test(x));
      }
      for (const x of txt.sort()) p.members.push({ fb, name: rel(x), file: x });
    }
    console.log(`ready ${p.it.title}: ${p.members.length} text member(s)`);
  }

  // ---- phase 3: superseded releases ----
  // A release is not written twice: (a) the record itself says a newer version exists and names its handle, or
  // (b) two Autshumato-family releases share language and dc.project and one states a higher dc.version. The line
  // overlap of each such pair is measured and recorded either way.
  const verNum = (d) => parseFloat((one(d, 'dc.version').match(/\d+(?:\.\d+)?/) || [0])[0]);
  const fam4 = plan.filter((p) => p.family === 4 && p.members.length);
  for (const p of fam4) {
    const desc = all(p.d, 'dc.description').join(' ');
    const m = desc.match(/newer version[\s\S]{0,200}?(20\.500\.12185\/\d+(?:\.\d+)?)/i);
    let by = m ? fam4.find((q) => q.handle === m[1]) : null, basis = m ? `the record says: "${desc.match(/NOTE:[^]*$/i)?.[0].trim().slice(0, 160) || 'newer version ' + m[1]}"` : null;
    if (!by) {
      const q = fam4.find((q) => q !== p && q.lang === p.lang && one(q.d, 'dc.project') && one(q.d, 'dc.project') === one(p.d, 'dc.project') && verNum(q.d) > verNum(p.d));
      if (q) { by = q; basis = `same language and project ("${one(p.d, 'dc.project')}"); the records state version ${one(p.d, 'dc.version')} here and ${one(q.d, 'dc.version')} in the other`; }
    }
    if (!by) continue;
    const lines = (q) => { const st = new Set(); for (const mm of q.members) for (const l of fs.readFileSync(mm.file, 'utf8').split('\n')) { const t = l.trim(); if (t) st.add(t); } return st; };
    const a = lines(p), bset = lines(by); let hit = 0; for (const l of a) if (bset.has(l)) hit++;
    p.superseded = { by: by.it.handle_url, basis, line_overlap: +(hit / Math.max(1, a.size)).toFixed(3) };
    manifest.rejected.push({ title: p.it.title, handle_url: p.it.handle_url, reason: `superseded release: ${basis}; ${(100 * hit / Math.max(1, a.size)).toFixed(1)}% of its ${a.size} distinct lines are also in ${by.it.handle_url}`, superseded_by: by.it.handle_url });
    console.log(`  superseded: ${p.it.title} (${p.handle}) by ${by.handle}; overlap ${(100 * hit / Math.max(1, a.size)).toFixed(1)}%`);
  }

  // ---- phase 4: write, NCHLT first, then genre, AST, Autshumato; smaller items first within each ----
  fs.rmSync(OUT, { recursive: true, force: true }); // this fetcher's own folder: a rerun rewrites it whole
  const usedNames = new Set();
  const underFloor = {}, itemHeaders = {};
  let written = 0;
  const capHit = [];
  for (const p of plan.filter((p) => !p.superseded).sort((a, b) => a.family - b.family || a.size - b.size)) {
    const { it, d, lang } = p;
    const creators = all(d, 'dc.contributor.author').join('; ');
    const lic = all(d, 'dc.rights.license').join('; ');
    for (const m of p.members) {
      const mb = fs.readFileSync(m.file);
      const memberSha = sha(mb);
      let text = mb.toString('utf8');
      let encoding = 'utf-8';
      if ((text.match(/�/g) || []).length > 10) { text = mb.toString('latin1'); encoding = 'latin-1 (not valid UTF-8 as received)'; }
      const split = p.family === 1 ? splitDocs(text) : null;
      let corpusHeader = null, holderAttribution = null;
      let parts = split ? split.docs : [{ label: null, start: 0, end: text.length }];
      if (split && parts[0].label === '(text before the first marker)') {
        corpusHeader = text.slice(parts[0].start, parts[0].end).trim();
        holderAttribution = (corpusHeader.match(/Attribute work to:\s*(.+)/) || [])[1]?.trim() || null;
        parts = parts.slice(1);
      }
      const segs = m.name.split('/');
      const label = p.family === 2 ? segs.slice(0, -1).filter((x) => /^(NF-|F-|DR|PR|PO|Drama|Prose|Poetry)/i.test(x) || /^Test$/i.test(x)).join('/') || segs.slice(-2, -1)[0] : p.family === 3 ? segs.slice(1, -1).join('/') : null;
      const dir = path.join(OUT, lang); fs.mkdirSync(dir, { recursive: true });
      let n = 0, made = 0;
      for (const part of parts) {
        n++;
        const body = text.slice(part.start, part.end);
        const bodyBytes = Buffer.from(body, 'utf8');
        const words = countWords(body.replace(/<fn>.*?<\/fn>/g, ' '));
        if (!words) continue;
        if (p.family !== 4 && words < 600) { const u = (underFloor[it.handle_url] ||= { title: it.title, handle_url: it.handle_url, documents: 0, words: 0 }); u.documents++; u.words += words; continue; }
        if (bodyBytes.length > CAP_DOC) { capHit.push({ title: it.title, handle_url: it.handle_url, member: m.name, part: part.label, bytes: bodyBytes.length, reason: 'one document over the 90 MB per-file cap (no boundary marks to split on)' }); continue; }
        if (written + bodyBytes.length > CAP_TOTAL) { capHit.push({ title: it.title, handle_url: it.handle_url, member: m.name, part: part.label, bytes: bodyBytes.length, reason: 'total cap of 450 MB reached' }); continue; }
        const stem = p.family === 1 ? `${slug(it.title, 40)}-${String(n).padStart(5, '0')}-${slug(part.label, 30)}` : p.members.length > 1 ? `${slug(it.title, 40)}-${slug(m.name.replace(/\.[^.]+$/, ''), 50)}` : slug(it.title, 60);
        let file = path.join(dir, `${stem}.txt`);
        for (let k = 2; usedNames.has(file); k++) file = path.join(dir, `${stem}-${k}.txt`);
        usedNames.add(file);
        const voiceAbout = p.family === 1 || p.family === 4;
        const head = {
          title: split ? `${it.title}: ${part.label}` : p.members.length > 1 ? `${it.title}: ${m.name}` : it.title,
          author: 'unknown',
          author_basis: 'the record names the corpus creators (dc.contributor.author), not the authors of the texts',
          corpus_creators: creators || 'unknown',
          collection: `${COLL}/${lang}`,
          source: `SADiLaR Language Resource Repository; publisher: ${all(d, 'dc.publisher').join('; ') || 'unknown'}`,
          source_url: it.handle_url,
          bitstream_url: m.fb.url,
          member: m.name,
          part: split ? `document ${n} of ${parts.length} in the CLEAN corpus, opened by <fn>${part.label}</fn>` : 'whole file',
          retrieved: TODAY,
          sha256: sha(bodyBytes),
          sha256_basis: split ? 'this document\'s bytes as cut from the corpus file (from its <fn> line to the next), before any conversion' : 'the file as unpacked from the bitstream',
          member_sha256: memberSha,
          bitstream_sha256: m.fb.sha256,
          bitstream_md5: m.fb.md5 || 'unknown',
          received_format: 'txt',
          received_encoding: encoding,
          license: lic,
          license_spdx: spdx(lic),
          license_url: licenseUrl(d),
          license_tier: 'open',
          attribution: holderAttribution ? `${holderAttribution} (as the corpus file asks); ${it.title}, ${it.handle_url}` : one(d, 'dc.identifier.citation') && one(d, 'dc.identifier.citation') !== 'None' ? `${creators}, "${it.title}", SADiLaR, ${it.handle_url}; cite: ${one(d, 'dc.identifier.citation')}` : `${creators || 'SADiLaR'}, "${it.title}", SADiLaR Language Resource Repository, ${it.handle_url}`,
          language: lang,
          language_basis: 'declared-by-source',
          language_declared: `${all(d, 'dc.language.iso').join(',') || '(none)'} / ${all(d, 'dc.languages').join(', ') || '(none)'}`,
          date: 'unknown',
          date_basis: 'unknown (the record gives the corpus release date only, not the date of the texts)',
          corpus_issued: one(d, 'dc.date.issued') || 'unknown',
          text_sources: all(d, 'dc.source').join('; ') || 'not stated',
          text_sources_basis: 'dc.source of the record',
          place_by: 'unknown', place_about: 'unknown',
          perspective_by: 'unknown', perspective_about: 'unknown',
          voice: voiceAbout ? 'about' : 'unknown',
          voice_basis: voiceAbout
            ? `collection brief (2026-10-24): the SADiLaR corpora are mostly government-domain text; the record says: "${(all(d, 'dc.source').join('; ') || all(d, 'dc.description').join(' ')).replace(/\s+/g, ' ').slice(0, 200)}"`
            : `not decided: the holder labels this file by ${p.family === 2 ? 'genre' : 'source type'} ("${label}"), not by voice`,
          translation_of: 'unknown',
          translation_basis: 'the record does not say which texts are translations',
          cultural_note: 'none', privacy_note: 'none',
          words,
        };
        if (label) { head[p.family === 2 ? 'genre_label' : 'source_type']= label; head[p.family === 2 ? 'genre_label_basis' : 'source_type_basis'] = `folder name in the holder's zip${p.family === 2 ? `; the record's dc.stratum: "${one(d, 'dc.stratum')}"` : ''}`; }
        if (p.family === 4) head.floor_exempt = 'corpus file';
        if (corpusHeader) itemHeaders[it.handle_url] = corpusHeader.replace(/_{5,}/g, '').replace(/\s+/g, ' ').trim();
        const front = ['---', ...Object.entries(head).map(([k, v]) => `${k}: ${yaml(v)}`), '---', ''].join('\n');
        fs.writeFileSync(file, front + body.replace(/^\s+/, '') + (body.endsWith('\n') ? '' : '\n'), 'utf8');
        written += bodyBytes.length; made++;
        manifest.pulled.push({ file: path.relative(ROOT, file), url: it.handle_url, sha256: head.sha256, ...head });
      }
      if (split || p.members.length < 5) console.log(`  ${it.title} / ${m.name}: ${split ? `${made} of ${parts.length} documents (${split.rule})` : made ? 'one document' : 'not written'}; total ${(written / 1e6).toFixed(1)} MB`);
    }
    console.log(`done ${it.title}: total ${(written / 1e6).toFixed(1)} MB`);
  }
  if (capHit.length) manifest.gaps.push({ type: 'capped', cap: '450 MB total / 90 MB per document', remains: capHit });
  const uf = Object.values(underFloor);
  if (uf.length) manifest.gaps.push({ type: 'under_floor', floor: 600, note: 'Documents the holder\'s corpus marks (NCHLT <fn> documents, genre and AST files) that have fewer than 600 words were not written: the spec exempts children\'s books and short items a holder publishes as complete, and a corpus-internal document is not declared complete by the holder. They remain in the holder\'s bitstreams (handle URLs below).', documents: uf.reduce((a, x) => a + x.documents, 0), words: uf.reduce((a, x) => a + x.words, 0), by_item: uf });
  // Claims shared by every document of one item are stated once, under items[handle_url]; each pulled row keeps
  // file, url, sha256, its item and the claims that differ between documents. Nothing is dropped: a row's full
  // header is items[row.item] merged with the row (the same claims as the file's frontmatter).
  const items = {};
  for (const u of new Set(manifest.pulled.map((r) => r.url))) {
    const rows = manifest.pulled.filter((r) => r.url === u);
    const shared = {};
    for (const [k, v] of Object.entries(rows[0])) if (!['file', 'url', 'sha256', 'title', 'words'].includes(k) && rows.every((r) => r[k] === v)) shared[k] = v;
    if (itemHeaders[u]) shared.corpus_header = itemHeaders[u];
    items[u] = shared;
    for (const r of rows) { for (const k of Object.keys(shared)) delete r[k]; r.item = u; }
  }
  manifest.row_shape = 'pulled[i] = { file, url, sha256, item, title, words, ...claims that vary }; the claims shared by all documents of an item are in items[item]. A document\'s full header = { ...items[item], ...pulled[i] }.';
  manifest.items = items;
  if (!PLAN) {
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
    const items = new Map();
    for (const r of manifest.pulled) { const p = { ...manifest.items[r.item], ...r }; const k = p.source_url; if (!items.has(k)) items.set(k, { title: p.title.split(': ')[0], creators: p.corpus_creators, license: p.license, license_url: p.license_url, attribution: p.attribution, lang: p.language, n: 0 }); items.get(k).n++; }
    const att = [
      '# SADiLaR text corpora: attribution and licence', '',
      'The texts in this folder come from the **SADiLaR Language Resource Repository** (https://repo.sadilar.org), the',
      'repository of the South African Centre for Digital Language Resources. Each item is distributed under the open licence',
      'its record states (Creative Commons Attribution 2.5 South Africa, or Creative Commons Attribution 4.0 International, and',
      'the like); each document\'s frontmatter repeats that statement, its handle URL and the citation the record asks for.',
      'Fetched by `scripts/fetch-sadilar.mjs`; manifest `manifests/sadilar-manifest.json`. Generated by the fetcher; do not edit by hand.', '',
      '- **What was changed:** the corpus files were unpacked from the zip bitstreams and, where the holder marks document',
      '  boundaries, cut on those marks; nothing else was altered. `sha256` is of each document\'s bytes as cut; `member_sha256`',
      '  and `bitstream_sha256` point back to the received file and zip. Documents under 600 words were not written',
      '  (listed in the manifest\'s gaps as under_floor); the NCHLT corpus files\' own licence header is in the manifest\'s items.',
      '- **Attribution:** credit the corpus creators and SADiLaR as below, with the licence and the handle URL.', '',
      '| Item | Language | Documents | Creators | Licence | Handle |', '|---|---|---|---|---|---|',
      ...[...items].map(([u, x]) => `| ${x.title} | ${x.lang} | ${x.n} | ${x.creators.replace(/\|/g, '/')} | [${x.license.replace(/\|/g, '/').slice(0, 90)}](${x.license_url}) | ${u} |`), '',
      '## Citations as the records give them', '',
      ...[...items].map(([u, x]) => `- ${x.attribution.replace(/\s+/g, ' ')}`), '',
      'Anyone redistributing these files must keep this notice and the licence of each item.', '',
    ];
    fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), att.join('\n'));
    console.log(`\n=== done: ${manifest.pulled.length} documents, ${(written / 1e6).toFixed(1)} MB; ${manifest.rejected.length} rejected; ${capHit.length} capped ===`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
