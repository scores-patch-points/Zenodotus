#!/usr/bin/env node
// scripts/fetch-trial-exhibits.mjs — WORKPLACE WRITING MADE PUBLIC BY A TRIAL OR AN INQUIRY, from two holders other than UCSF (the owner, 2026-11-28: "Find others").
// Companion of scripts/fetch-industry-documents.mjs (whose text host refused this client). Same reason: the corpus's only workplace writing was ten Enron mailboxes of 1998-2002.
//
// SOURCES (each a public index page that links PDFs):
//   doj-google-2020   https://www.justice.gov/atr/us-and-plaintiff-states-v-google-llc-2020-trial-exhibits   technology, internal email and decks, 2000s-2020s (search trial)
//   doj-google-2023   https://www.justice.gov/atr/us-and-plaintiff-states-v-google-llc-2023-trial-exhibits   technology, advertising (ad tech trial)
//   fcic-letters      https://fcic-static.law.stanford.edu/NARA.FCIC.2016-03-11/Response%20Letters%20SCREENED/   law firms writing for banks to a federal commission, 2010-2011
//   fcic-interviews   https://fcic-static.law.stanford.edu/NARA.FCIC.2016-03-11/SCREENED%20Interviews/           commission staff memoranda for the record of interviews, finance, 2010
// NOT TAKEN: U.S. v. Microsoft exhibits (www.justice.gov/atr/us-v-microsoft-corporation-browser-and-middleware-trial-exhibits, 1990s software): four sampled PDFs are page images with no text
//   layer; the corpus has no OCR step, so they are a typed gap (`no_text_layer`), not a pull.
// TERMS READ (GAP-INGEST-SPEC), 2026-11-28: see `terms_read` below. In short: both robots files allow these paths; DOJ says its own information is public domain "unless otherwise indicated" and
//   that it posts third-party documents under legal requirement; a trial exhibit is a third party's document, so the licence of each exhibit is NOT established and the files say so.
// CAP: --per documents per source (default 12), spread across the index, at most 3 MB each. Pace 3 s. Resumable. A PDF with no text layer is rejected, never guessed at.
// PRIVACY: real people's working correspondence, public by court order or federal release. Read as language documents; every file carries a privacy_note.
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-trial-exhibits.mjs [--per 12] [--only doj-google-2020]
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import os from 'os'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), UA = 'Zenodotus live_priors corpus builder (non-commercial research)';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; }, PER = Number(arg('per', 12)), ONLY = arg('only', null), MAX_BYTES = 3e6;
const BASE = '25-industry-discovery', MANIFEST = path.join(ROOT, 'manifests', 'trial-exhibits-manifest.json');
const LEHMAN = 'Lehman Brothers Holdings Inc. Chapter 11 Examiner\'s Report (A. R. Valukas, Jenner & Block, 2010), cited documents as hosted at Stanford (J. Bulow)', W3C = 'W3C public mailing list archives';
const DOJ = 'U.S. Department of Justice, Antitrust Division', FCIC = 'Financial Crisis Inquiry Commission records released by the National Archives (2016-03-11), hosted by Stanford Law School';
const SOURCES = [
  { key: 'doj-google-2020', dir: 'doj-antitrust/google-2020', holder: DOJ, industry: 'technology', index: 'https://www.justice.gov/atr/us-and-plaintiff-states-v-google-llc-2020-trial-exhibits', keep: (h) => h.includes('/media/') || h.includes('/d9/'), date: 'unknown (exhibit of a 2023 trial; the document is older)', kind: 'trial exhibit' },
  { key: 'doj-google-2023', dir: 'doj-antitrust/google-2023', holder: DOJ, industry: 'technology-advertising', index: 'https://www.justice.gov/atr/us-and-plaintiff-states-v-google-llc-2023-trial-exhibits', keep: (h) => h.includes('/media/') || h.includes('/d9/'), date: 'unknown (exhibit of a 2024 trial; the document is older)', kind: 'trial exhibit' },
  { key: 'fcic-letters', dir: 'fcic/response-letters', holder: FCIC, industry: 'finance-legal', index: 'https://fcic-static.law.stanford.edu/NARA.FCIC.2016-03-11/Response%20Letters%20SCREENED/', keep: (h) => h.endsWith('.pdf'), date: null, kind: 'letter to the commission' },
  { key: 'fcic-interviews', dir: 'fcic/interviews', holder: FCIC, industry: 'finance', index: 'https://fcic-static.law.stanford.edu/NARA.FCIC.2016-03-11/SCREENED%20Interviews/', keep: (h) => h.endsWith('.pdf'), date: null, kind: 'memorandum for the record' },
  ...['DEBTORS', 'JPMORGAN', 'ERNST & YOUNG', 'FRBNY', 'CITIGROUP', 'BARCLAYS'].map((d) => ({ key: `lehman-${d.toLowerCase().replaceAll(' & ', '-')}`, dir: `lehman-examiner/${d.toLowerCase().replaceAll(' & ', '-')}`, holder: LEHMAN, industry: 'finance', per: 6,
    index: `https://web.stanford.edu/~jbulow/Lehmandocs/docs/${encodeURIComponent(d)}/`, keep: (h) => h.endsWith('.pdf'), date: 'unknown (cited in the examiner\'s report of 2010-03-11; the document is older)', kind: 'exhibit cited in a bankruptcy examiner\'s report' })),
  ...['1991', '1993', '1995JanFeb', '1998JanFeb', '2001JanFeb', '2004JanFeb', '2008Jan', '2013Oct'].map((y) => ({ key: `w3c-www-talk-${y}`, dir: `w3c-lists/www-talk/${y}`, holder: W3C, industry: 'software-standards', per: 5, html: true,
    index: `https://lists.w3.org/Archives/Public/www-talk/${y}/`, keep: (h) => h.length === 9 && h.endsWith('.html') && h[0] === '0', date: y.slice(0, 4), dateBasis: 'holder archive folder', kind: 'public mailing-list message' })),
].filter((s) => !ONLY || s.key === ONLY || s.key.startsWith(ONLY));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) { await sleep(3000); const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); return { status: r.status, url: r.url, type: r.headers.get('content-type') ?? '', buf: Buffer.from(await r.arrayBuffer()) }; }
// the index is an HTML file: anchors are read as markup (a file format), not as language
const anchors = (html) => [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)</g)].map((x) => ({ href: x[1].replaceAll('&amp;', '&'), label: x[2].trim() })); // regex-ok: HTML anchor markup of an index page, a file format
const metaRefresh = (html) => html.match(/http-equiv="refresh"\s+content="0;url='([^']+)'/)?.[1] ?? null; // regex-ok: the holder's HTML redirect stub, a file format
const leadingDate = (name) => { const d = name.match(/^(\d{4})[ -](\d{1,2})[ -](\d{1,2})/); return d ? `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}` : null; }; // regex-ok: a date prefix in the holder's file name, an id
const pdfText = (buf) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'zex-')), 'x.pdf'); fs.writeFileSync(f, buf); try { return execFileSync('pdftotext', ['-layout', f, '-'], { maxBuffer: 64e6 }).toString('utf8'); } catch { return null; } };
const htmlText = (html) => { const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? null; if (!pre) return null; // regex-ok: the archive's HTML message markup, a file format
  return pre.replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&'); }; // regex-ok: HTML tags and entities, a file format
// DECLARED DIAL (not a measured threshold): a text layer is kept when at least 0.6 of its whitespace tokens are letters only, bar edge punctuation. Reason: some holders' OCR is unreadable noise
// (sampled: a Lehman board letter came out as "LE~=~i=:.:~~~"), and noise is not a language document. Every rejection is listed with its share, so the dial can be re-drawn from the record.
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase(), EDGE = '.,;:!?()"\'';
const letterShare = (text) => { const t = text.split('\n').join(' ').split(' ').filter(Boolean); if (!t.length) return 0; return t.filter((w) => { const core = [...w].filter((c, i, a) => !((i === 0 || i === a.length - 1) && EDGE.includes(c))); return core.length && core.every(isLetter); }).length / t.length; };
const m = { source: 'DOJ Antitrust Division trial exhibits; FCIC records (NARA release at Stanford Law School)', license: 'not established per document: see terms_read', fetched_at: new Date().toISOString(), cap: { per_source: PER, max_bytes: MAX_BYTES },
  terms_read: [
    { url: 'https://www.justice.gov/robots.txt', read: '2026-11-28', summary: 'disallows /core/, /profiles/, /admin/, /search/, /user/ and a few README files; /atr/ and /d9/ are not disallowed' },
    { url: 'https://www.justice.gov/legalpolicies', read: '2026-11-28', summary: 'information on DOJ sites is public domain unless otherwise indicated; where another source is indicated, permission is from that source; DOJ posts third-party documents when a legal requirement makes it, and disclaims their content. A trial exhibit is a third party\'s document: public record of the trial, copyright not waived by DOJ. Nothing forbids automated download.' },
    { url: 'https://fcic-static.law.stanford.edu/robots.txt', read: '2026-11-28', summary: 'User-agent: *, Disallow: (empty). The folder is the National Archives release of 2016-03-11; staff memoranda are federal works; letters are by outside counsel, copyright not stated. The NARA finding aid in the folder was not read.' },
    { url: 'https://web.stanford.edu/robots.txt', read: '2026-11-28', summary: 'disallows four unrelated paths; /~jbulow/Lehmandocs/ is not disallowed. The page states no terms. The documents were made public with the examiner\'s report by order of the bankruptcy court; they are third parties\' documents, copyright not stated.' },
    { url: 'https://lists.w3.org/robots.txt', read: '2026-11-28', summary: 'disallows /Archives/Group, Member, Team, Board, */mboxes/ and /admin/; /Archives/Public/ HTML pages are not disallowed (the mbox files are, and are not fetched). Messages are their authors\'; W3C\'s archive policy page was not read.' },
    { url: 'https://foia.state.gov/robots.txt', read: '2026-11-28', summary: 'User-agent: *, Disallow: / : everything is disallowed. NOT FETCHED.' },
    { url: 'https://www.climatefiles.com/robots.txt', read: '2026-11-28', summary: 'Crawl-delay 10, nothing disallowed; pages say "Copyright Climate Files. All rights reserved"; the source PDFs sit on s3.documentcloud.org, a host not approved. NOT PULLED; the collection index is a pointer.' },
  ], pulled: [], rejected: [], gaps: [{ gap: 'no_text_layer', source: 'U.S. v. Microsoft trial exhibits (justice.gov)', why: 'exhibits 1, 20, 300 and 1000 are page images; no OCR step in this corpus' },
    { gap: 'robots_disallow_all', source: 'State Department FOIA reading room (foia.state.gov)', why: 'robots.txt disallows everything; not fetched' },
    { gap: 'not_pulled_rights_and_host', source: 'Climate Files (www.climatefiles.com/collection-index/: about 430 oil-industry documents, 1950s-2010s)', why: 'site text is all rights reserved; PDFs are on s3.documentcloud.org, not an approved host' },
    { gap: 'no_public_bulk_route', source: 'ToxicDocs (www.toxicdocs.org)', why: 'a script application with login; no documented API or terms page found; not probed further' },
    { gap: 'host_down', source: 'Project Gutenberg business-letter manuals (#7309, #56911, #38235, #22222)', why: '503 "down for maintenance" on every try on 2026-11-28' }] };
if (fs.existsSync(MANIFEST)) { const old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); m.pulled = old.pulled ?? []; m.rejected = old.rejected ?? []; }   // resumable: earlier pulls stay listed
const have = new Set([...m.pulled.map((p) => p.source_url), ...m.rejected.map((p) => p.url)]);
for (const s of SOURCES) {
  const idx = await get(s.index); if (idx.status !== 200) { m.gaps.push({ gap: 'index_refused', source: s.key, status: idx.status }); continue; }
  const seen = new Set(), links = anchors(idx.buf.toString('utf8')).filter((a) => s.keep(a.href) && a.label && !seen.has(a.href) && seen.add(a.href));
  const n = Math.min(s.per ?? PER, links.length), pick = Array.from({ length: n }, (_, i) => links[Math.floor((i * links.length) / n)]);
  console.log(`${s.key}: ${links.length} linked documents; taking ${pick.length}`);
  for (const a of pick) {
    const url = new URL(a.href, s.index).href; if (have.has(url)) continue;
    let r = await get(url); const stub = r.type.includes('html') ? metaRefresh(r.buf.toString('utf8')) : null; if (stub) r = await get(stub);
    if (r.status !== 200) { m.rejected.push({ url, why: `status ${r.status}` }); continue; }
    if (r.buf.length > MAX_BYTES) { m.rejected.push({ url, why: `over the ${MAX_BYTES} byte cap (${r.buf.length})` }); continue; }
    if (!s.html && r.buf.subarray(0, 4).toString() !== '%PDF') { m.rejected.push({ url, why: `not a PDF (${r.type})` }); continue; }
    const text = s.html ? htmlText(r.buf.toString('utf8')) : pdfText(r.buf), words = text ? text.split('\n').join(' ').split(' ').filter(Boolean).length : 0;
    if (words < 40) { m.rejected.push({ url, label: a.label, why: 'no_text_layer: the PDF is page images (or pdftotext is absent); not OCRed' }); continue; }
    const share = Math.round(letterShare(text) * 100) / 100; if (share < 0.6) { m.rejected.push({ url, label: a.label, why: `unreadable_text_layer: letter-only token share ${share} is under the declared dial 0.6` }); continue; }
    const id = crypto.createHash('sha256').update(url).digest('hex').slice(0, 12), dir = path.join(ROOT, BASE, s.dir), file = path.join(dir, `${id}.txt`);
    const head = { title: a.label, author: 'unknown', collection: `${BASE}/${s.dir}`, source: s.holder, source_url: url, retrieved: new Date().toISOString().slice(0, 10), sha256: crypto.createHash('sha256').update(r.buf).digest('hex'), received_format: s.html ? 'html' : 'pdf',
      license: 'not established: see manifests/trial-exhibits-manifest.json terms_read', license_url: s.holder === DOJ ? 'https://www.justice.gov/legalpolicies' : 'unknown', letter_token_share: share, license_tier: 'unknown', language: 'en', language_basis: 'holder (a United States proceeding); not detected', date: s.date ?? leadingDate(a.label) ?? 'unknown', date_basis: s.dateBasis ?? (s.date ? 'none' : 'holder file name'),
      place_by: 'unknown', translation_of: 'none', industry: s.industry, document_kind: s.kind, conversion: s.html ? 'the <pre> body of the archive page, tags and entities removed' : 'pdftotext -layout; the text layer is the holder\'s (born digital or the holder\'s own OCR), unchecked',
      privacy_note: 'working correspondence or interview record of named individuals, public by court order or federal release; read as a language document', words, ...(words < 600 ? { floor_exempt: 'a complete exhibit, letter or memorandum as the holder publishes it' } : {}) };
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, Object.entries(head).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n' + text); m.pulled.push({ file: path.relative(ROOT, file), ...head }); have.add(url);
  }
}
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + '\n');
console.log(`pulled ${m.pulled.length}, rejected ${m.rejected.length}, gaps ${m.gaps.length}`);
