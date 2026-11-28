#!/usr/bin/env node
// scripts/fetch-industry-documents.mjs — INDUSTRY DISCOVERY DOCUMENTS: internal memos, letters and emails made public through litigation, across industries and decades.
// Why: the corpus's only workplace writing is ten Enron mailboxes of 1998-2002 (19-organic-community/enron). A register source built from them recognised Enron, not business writing
// (khora eval/codec-register, run 3). The owner asked (2026-11-28) for other industries and periods, and named discovery files as the place to look.
//
// SOURCE: UCSF Industry Documents Library (tobacco, opioids, chemical, drug, food, fossil fuel; 1940s to 2020s).
//   metadata  https://metadata.idl.ucsf.edu/solr/ltdl3/query   (answers; returns metadata only, 1000 rows a request whatever `rows` says, no facets)
//   text      https://download.industrydocuments.ucsf.edu/<i>/<d>/<x>/<y>/<id>/<id>.ocr   (path from memory, UNVERIFIED: from the session that wrote this the host answered 403 "Request blocked" to
//             every request, robots.txt included; that is the site's own refusal and this script never works around it: it records the gap and stops asking that host)
// TERMS READ (GAP-INGEST-SPEC): www.industrydocuments.ucsf.edu/robots.txt read 2026-11-28: "User-agent: * / Disallow:" (nothing disallowed). The site's Copyright & Fair Use page could NOT be read:
//   its text is served from cms.libckm.org, which the session's network did not allow. The manifest says so under terms_read. Before a bulk pull, read that page and fill it in.
// CAP: --per documents per industry-decade cell (default 3), at most 20 pages each, types memo, letter, email, availability public. Pace 3 s. Resumable: a file already written is skipped.
// PRIVACY: these are real people's working correspondence, public by court order. They are read as language documents; every file carries a privacy_note.
//   node scripts/fetch-industry-documents.mjs --dry           # metadata only: choose the sample, write the manifest's candidates, fetch no text
//   node scripts/fetch-industry-documents.mjs [--per 3]       # also fetch the text of each candidate and write the documents
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), UA = 'Zenodotus live_priors corpus builder (non-commercial research)';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; }, DRY = process.argv.includes('--dry'), PER = Number(arg('per', 3));
const COLLECTION = '25-industry-discovery/ucsf-idl', OUT = path.join(ROOT, COLLECTION), MANIFEST = path.join(ROOT, 'manifests', 'industry-documents-manifest.json');
const INDUSTRIES = ['tobacco', 'opioids', 'chemical', 'drug', 'food', 'fossil fuel'], DECADES = ['194', '195', '196', '197', '198', '199', '200', '201', '202'], TYPES = ['memo', 'letter', 'email'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) { await sleep(3000); const r = await fetch(url, { headers: { 'User-Agent': UA } }); return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) }; }
const first = (v) => (Array.isArray(v) ? v[0] : v) ?? null, list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const m = { source: 'UCSF Industry Documents Library', license: 'see terms_read: not established', fetched_at: new Date().toISOString(), cap: { per_cell: PER, max_pages: 20, types: TYPES },
  terms_read: [{ url: 'https://www.industrydocuments.ucsf.edu/robots.txt', read: '2026-11-28', summary: 'User-agent: *, Disallow: (empty): nothing is disallowed on the main site' },
    { url: 'https://www.industrydocuments.ucsf.edu/help/copyright/', read: null, summary: 'NOT READ: the page is a script application whose text is served from cms.libckm.org, which the session network did not allow. To be read before any bulk pull.' },
    { url: 'https://metadata.idl.ucsf.edu/robots.txt and https://download.industrydocuments.ucsf.edu/robots.txt', read: '2026-11-28', summary: 'both answered 403; the metadata query endpoint itself answers 200; the download host answered 403 "Request blocked" to every request' }],
  candidates: [], pulled: [], rejected: [], gaps: [] };
let textHostRefused = false;
for (const industry of INDUSTRIES) for (const dec of DECADES) {
  const q = `availability:public AND type:(${TYPES.join(' OR ')}) AND industry:"${industry}" AND documentdate:${dec}*`, r = await get(`https://metadata.idl.ucsf.edu/solr/ltdl3/query?wt=json&q=${encodeURIComponent(q)}`);
  if (r.status !== 200) { m.gaps.push({ gap: 'metadata_refused', industry, decade: `${dec}0s`, status: r.status }); continue; }
  const j = JSON.parse(r.buf.toString('utf8')), docs = (j.response?.docs ?? []).filter((d) => Number(d.pages ?? 99) <= 20 && d.id);
  if (!docs.length) { m.gaps.push({ gap: 'no_document_in_cell', industry, decade: `${dec}0s`, found: j.response?.numFound ?? 0 }); continue; }
  // a spread across the 1000 returned, not the first few (which are one box of one collection): every (n/PER)-th
  const pick = Array.from({ length: Math.min(PER, docs.length) }, (_, i) => docs[Math.floor((i * docs.length) / Math.min(PER, docs.length))]);
  console.log(`${industry} ${dec}0s: ${j.response.numFound} public memos, letters, emails; taking ${pick.length}`);
  for (const d of pick) {
    const c = { id: d.id, industry, decade: `${dec}0s`, date: d.documentdate ?? 'unknown', type: list(d.type), collection: list(d.collection), pages: d.pages ?? null, title: d.title ?? 'unknown', source_url: `https://www.industrydocuments.ucsf.edu/docs/${d.id}/` };
    m.candidates.push(c); if (DRY || textHostRefused) continue;
    const dir = path.join(OUT, industry.replace(' ', '-'), `${dec}0s`), file = path.join(dir, `${d.id}.txt`); if (fs.existsSync(file)) continue;
    const id = d.id, t = await get(`https://download.industrydocuments.ucsf.edu/${id[0]}/${id[1]}/${id[2]}/${id[3]}/${id}/${id}.ocr`);
    if (t.status !== 200) { m.gaps.push({ gap: 'text_host_refused', id, status: t.status }); if (t.status === 403) { textHostRefused = true; m.gaps.push({ gap: 'text_pull_stopped', why: 'the download host refuses this client; not worked around. Run from a network the host accepts, after reading the terms.' }); } continue; }
    const text = t.buf.toString('utf8'), words = text.split(' ').filter(Boolean).length, sha = crypto.createHash('sha256').update(t.buf).digest('hex');
    const head = { title: c.title, author: list(d.author).join('; ') || 'unknown', collection: `${COLLECTION}/${industry.replace(' ', '-')}/${dec}0s`, source: 'UCSF Industry Documents Library', source_url: c.source_url, retrieved: new Date().toISOString().slice(0, 10), sha256: sha, received_format: 'txt',
      license: 'not established: see manifest terms_read', license_url: 'https://www.industrydocuments.ucsf.edu/help/copyright/', license_tier: 'unknown', language: 'en', language_basis: 'catalog', date: c.date, date_basis: 'source-metadata', place_by: 'unknown', perspective_by: 'unknown', voice: 'unknown', voice_basis: `the holder's type label: ${c.type.join(', ')}`,
      translation_of: 'none', privacy_note: 'working correspondence of named individuals, made public through litigation; read as a language document', words, ...(words < 600 ? { floor_exempt: 'a complete memo, letter or email as the holder publishes it' } : {}) };
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, Object.entries(head).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n' + text); m.pulled.push({ file: path.relative(ROOT, file), url: c.source_url, ...head });
  }
}
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + '\n');
console.log(`candidates ${m.candidates.length}, pulled ${m.pulled.length}, gaps ${m.gaps.length}${DRY ? ' (dry run: no text fetched)' : ''}`);
