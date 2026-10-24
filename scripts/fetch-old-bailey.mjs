#!/usr/bin/env node
// fetch-old-bailey.mjs — the Proceedings of the Old Bailey, 1674–1913 (GAP-SOURCES-PLAN.md #13), for
// 20-first-person-voices/old-bailey/. One document per sessions paper, with every trial id kept inside the text.
//
// Hosts. www.oldbaileyonline.org (approved 2026-10-24) answered every request from the corpus User-Agent with
// "403 Forbidden", robots.txt included, so the gate recorded in the manifest stopped there. The coordinator then
// approved www.dhi.ac.uk (the University of Sheffield's Digital Humanities Institute), which serves the project's own
// bulk XML release at /san/data/oldbailey/oldbailey.zip (326 MB), linked as "Download the data" from
// https://www.dhi.ac.uk/projects/old-bailey/.
// Terms read 2026-10-24: dhi.ac.uk robots.txt allows all paths but /wp-admin/, Crawl-delay 2. The data landing page
// (/data/oldbailey) answers 403 to the corpus User-Agent, so the licence was read from the release itself:
// licence.txt and _README.pdf inside the zip state CC BY-NC 4.0 ("All Old Bailey Online data is released under a
// Creative Commons Attribution-NonCommercial 4.0 International Licence"). Tier: nc. A Hugging Face card claiming
// CC BY 4.0 is contradicted by the holder's own statement. This script checks licence.txt on every run and stops if
// it no longer says CC BY-NC 4.0.
//
// Conversion: TEI XML to plain text. <interp>, <join> and <xptr> are data, not text, and are dropped; each <div1> opens
// with a marker line "[<type> <id>]" (trialAccount, frontMatter, punishmentSummary, ...) so trial ids stay inside the
// text; <note> text (the transcribers' bracketed notes) is kept; <lb/>, which in this data marks a word split
// across a line end (the hyphen already dropped), is joined. Standpoints are recorded only as the data's own fields
// give them: for each defendant (persName type="defendantName") its gender, age and occupation (an occupation <interp>,
// or an <rs type="occupation"> joined to that person by <join result="persNameOccupation">); for witnesses (persName
// type="witnessName", tagged in part 2 only) a count by gender. Nothing is inferred.
//
// Cap 600 MB of written files. Sessions are taken in bit-reversed (van der Corput) order over the chronological list,
// so whatever the cap leaves out is spread evenly across 1674–1913 rather than cut off at one end; the remainder is
// recorded as a `capped` gap with every session id it leaves out.
//
//   node scripts/fetch-old-bailey.mjs [--cache DIR] [--cap-mb 600]
//   (resumable: the zip is fetched with curl -C - into the cache and reused; documents are rewritten deterministically)
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLL = '20-first-person-voices/old-bailey';
const OUT = path.join(ROOT, COLL);
const MANIFEST = path.join(ROOT, 'manifests', 'old-bailey-manifest.json');
const UA_STR = 'Zenodotus live_priors corpus builder (non-commercial research)';
const UA = { 'User-Agent': UA_STR };
const ZIP_URL = 'https://www.dhi.ac.uk/san/data/oldbailey/oldbailey.zip';
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const CACHE = arg('--cache', path.join(os.tmpdir(), 'zenodotus-old-bailey'));
const CAP = Number(arg('--cap-mb', 600)) * 1e6;
const today = new Date().toISOString().slice(0, 10);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const yaml = (v) => (v == null ? 'unknown' : /[:#\n"'{}[\],&*!|>%@`]|^\s|\s$|^-/.test(String(v)) ? JSON.stringify(String(v)) : String(v));

async function probe(url, method = 'GET') {
  try {
    const r = await fetch(url, { method, headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const body = method === 'HEAD' ? '' : await r.text();
    return { url, http_status: r.status, bytes: Number(r.headers.get('content-length') || Buffer.byteLength(body)), last_modified: r.headers.get('last-modified') || undefined, body };
  } catch (e) { return { url, http_status: 0, error: e.message, body: '' }; }
}

// ---- TEI to text -------------------------------------------------------------------------------------------------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([A-Za-z]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const PARA = ' ';

function teiToText(xml) {
  let s = xml.replace(/<\?xml[^>]*\?>/, '')
    .replace(/<interp\b[^>]*\/>/g, '').replace(/<join\b[^>]*\/>/g, '').replace(/<xptr\b[^>]*\/>/g, '').replace(/<link\b[^>]*\/>/g, '')
    .replace(/\s*<\/(persName|rs|placeName|hi)>\s*(?=[,.;:!?)])/g, '')             // markup indentation before punctuation
    .replace(/<div1\b[^>]*>/g, (t) => { const a = attrs(t); return `${PARA}[${a.type || 'div1'} ${a.id || ''}]${PARA}`; })
    .replace(/<lb\b[^>]*\/>/g, '')                                                   // <lb/> marks a word split at a line end
    .replace(/<\/?p\b[^>]*>|<\/div1>/g, PARA)
    .replace(/<[^>]+>/g, ' ');
  s = decode(s).replace(/[ \t\r\n]+/g, ' ');
  return s.split(PARA).map((l) => l.trim()).filter(Boolean).join('\n');
}

// ---- standpoints as the data's own fields give them --------------------------------------------------------------
function trialsOf(xml) {
  const trials = [];
  for (const m of xml.matchAll(/<div1\b([^>]*)>([\s\S]*?)<\/div1>/g)) {
    const a = attrs(m[1]); if (a.type !== 'trialAccount') continue;
    const body = m[2], occLabel = new Map(), occOf = new Map(), defendants = [], witness_gender = {};
    for (const r of body.matchAll(/<rs\b([^>]*)>([\s\S]*?)<\/rs>/g)) { const ra = attrs(r[1]); if (ra.type === 'occupation' && ra.id) occLabel.set(ra.id, decode(r[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()); }
    for (const j of body.matchAll(/<join\b([^>]*)\/>/g)) { const ja = attrs(j[1]); if (ja.result === 'persNameOccupation') { const [p, l] = (ja.targets || '').split(/\s+/); if (occLabel.has(l)) occOf.set(p, occLabel.get(l)); } }
    for (const p of body.matchAll(/<persName\b([^>]*)>([\s\S]*?)<\/persName>/g)) {
      const pa = attrs(p[1]); if (pa.type !== 'defendantName' && pa.type !== 'witnessName') continue;
      const f = {}; for (const i of p[2].matchAll(/<interp\b([^>]*)\/>/g)) { const ia = attrs(i[1]); if (ia.inst === pa.id && ['gender', 'age', 'occupation'].includes(ia.type)) f[ia.type] = decode(ia.value); }
      if (pa.type === 'witnessName') { const g = f.gender || 'not tagged'; witness_gender[g] = (witness_gender[g] || 0) + 1; continue; }
      const occ = f.occupation ?? occOf.get(pa.id);
      defendants.push({ id: pa.id, ...(f.gender ? { gender: f.gender } : {}), ...(f.age ? { age: f.age } : {}), ...(occ ? { occupation: occ } : {}) });
    }
    trials.push({ id: a.id, defendants, ...(Object.keys(witness_gender).length ? { witness_gender } : {}) });
  }
  return trials;
}

// ---- dictionary coverage (language claim) ------------------------------------------------------------------------
const DICT_PATH = '/usr/share/dict/words';
const DICT = fs.existsSync(DICT_PATH) ? new Set(fs.readFileSync(DICT_PATH, 'utf8').split('\n').map((w) => w.toLowerCase())) : null;
function coverage(text) {
  if (!DICT) return null; let n = 0, hit = 0;
  for (const m of text.matchAll(/[A-Za-z]{2,}/g)) { n++; if (DICT.has(m[0].toLowerCase())) hit++; }
  return n ? hit / n : null;
}

function vanDerCorput(n) {
  const bits = Math.ceil(Math.log2(Math.max(2, n))), out = [];
  for (let i = 0; i < 1 << bits; i++) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); if (r < n) out.push(r); }
  return out;
}

async function main() {
  const preview = arg('--preview', null);   // --preview <session id>: print one converted session from the cache and exit
  if (preview) {
    const xml = fs.readFileSync(path.join(CACHE, 'x', 'sessionsPapers', `${preview}.xml`), 'utf8'), text = teiToText(xml);
    console.log(text.slice(0, 4000)); console.log('...\n', JSON.stringify(trialsOf(xml).slice(0, 6), null, 1), '\nwords', wordsIn(text), 'coverage', coverage(text));
    return;
  }
  const manifest =fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { terms_read: [], rejected: [], gaps: [] };
  const addTerm = (t) => { if (!manifest.terms_read.some((x) => x.url === t.url && x.date === today)) manifest.terms_read.push({ ...t, date: today }); };

  // 1. terms first (robots.txt, the project page that links the data, the landing page, the file)
  const robots = await probe('https://www.dhi.ac.uk/robots.txt'); await sleep(3000);
  addTerm({ url: robots.url, http_status: robots.http_status, sha256: sha256(robots.body), summary: `robots.txt: ${robots.body.replace(/\s+/g, ' ').trim().slice(0, 300)}` });
  const proj = await probe('https://www.dhi.ac.uk/projects/old-bailey/'); await sleep(3000);
  addTerm({ url: proj.url, http_status: proj.http_status, sha256: sha256(proj.body), summary: `project page; links "Download the data" to https://www.dhi.ac.uk/data/oldbailey: ${/data\/oldbailey/.test(proj.body) && /Download the data/.test(proj.body) ? 'yes' : 'not found'}. No licence statement on this page.` });
  const land = await probe('https://www.dhi.ac.uk/data/oldbailey'); await sleep(3000);
  addTerm({ url: land.url, http_status: land.http_status, sha256: sha256(land.body), summary: land.http_status === 403 ? 'data landing page answers 403 Forbidden to the corpus User-Agent (same Apache/2.4.29 signature as www.oldbaileyonline.org); the licence was read from the release itself (below)' : 'landing page readable now: read it by hand' });
  const head = await probe(ZIP_URL, 'HEAD');
  if (head.http_status !== 200) { console.error(`zip not available: ${head.http_status} ${head.error || ''}`); process.exit(1); }

  // 2. the release (resumable)
  fs.mkdirSync(CACHE, { recursive: true });
  const zip = path.join(CACHE, 'oldbailey.zip');
  if (!fs.existsSync(zip) || fs.statSync(zip).size !== head.bytes) {
    console.log(`downloading ${ZIP_URL} (${(head.bytes / 1e6).toFixed(0)} MB) to ${zip}`);
    execFileSync('curl', ['-sS', '-C', '-', '-A', UA_STR, '-o', zip, ZIP_URL], { stdio: 'inherit' });
  }
  const zipSha = sha256(fs.readFileSync(zip));

  // 3. the holder's own licence statement, checked every run
  const licence = execFileSync('unzip', ['-p', zip, 'licence.txt']).toString('utf8').trim();
  if (!/Creative Commons Attribution-NonCommercial 4\.0 International License/.test(licence)) { console.error('licence.txt no longer states CC BY-NC 4.0: stop and read it by hand'); process.exit(1); }
  addTerm({ url: `${ZIP_URL}#licence.txt`, http_status: 200, sha256: sha256(licence), summary: `licence.txt in the release: "${licence}"` });
  fs.writeFileSync(path.join(CACHE, 'README.pdf'), execFileSync('unzip', ['-p', zip, '_README.pdf'], { maxBuffer: 1 << 26 }));
  const readme = execFileSync('pdftotext', ['-q', path.join(CACHE, 'README.pdf'), '-'], { maxBuffer: 1 << 26 }).toString('utf8');
  const version = (readme.match(/current version of the website and its data is ([\d.]+ \([^)]+\))/) || [])[1] || 'unknown';
  addTerm({ url: `${ZIP_URL}#_README.pdf`, http_status: 200, sha256: sha256(readme), summary: `_README.pdf (Sharon Howard, March 2017): all Old Bailey Online data is released under CC BY-NC 4.0; the project's reading of "commercial" normally excludes academic research outputs; the project encourages research and re-use; citation should name Old Bailey Online, http://www.oldbaileyonline.org, the data version and item ids, and new public data should carry the statement quoted in ATTRIBUTION.md. Data version stated: ${version}. A Hugging Face card claiming CC BY 4.0 is contradicted by this statement; the holder's statement governs (tier nc).` });

  // 4. sessions papers
  const X = path.join(CACHE, 'x');
  if (!fs.existsSync(path.join(X, 'sessionsPapers'))) execFileSync('unzip', ['-o', '-q', zip, 'sessionsPapers/*.xml', '-d', X]);
  const files = fs.readdirSync(path.join(X, 'sessionsPapers')).filter((f) => /^\d{8}[A-Z]?\.xml$/.test(f)).sort();
  const order = vanDerCorput(files.length).map((i) => files[i]);
  fs.mkdirSync(OUT, { recursive: true });
  const attribution = `This work builds on Old Bailey Online that is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License (Old Bailey Online, http://www.oldbaileyonline.org, data version ${version}).`;
  const pulled = [], left = []; let total = 0;
  for (const f of order) {
    const buf = fs.readFileSync(path.join(X, 'sessionsPapers', f)), xml = buf.toString('utf8');
    const id = f.replace(/\.xml$/, ''), d = id.slice(0, 8);
    const text = teiToText(xml), trials = trialsOf(xml), words = wordsIn(text);
    const front = (xml.match(/<div1\b[^>]*type="frontMatter"[^>]*>([\s\S]*?)<\/div1>/) || [])[1];
    const frontText = front ? teiToText(`<p>${front}</p>`) : '';
    const firstLine = frontText.split('\n')[0] || '';
    const title = firstLine ? (firstLine.length > 200 ? firstLine.slice(0, 200).replace(/\s+\S*$/, '') + ' …' : firstLine) : `Old Bailey Proceedings, sessions paper ${id}`;
    const ob = frontText.match(/Old[\s-]*Bailey|Central Criminal Court/i), ldn = frontText.match(/London/i);
    const cov = coverage(text);
    const gender = {}; for (const t of trials) for (const x of t.defendants) gender[x.gender || 'not tagged'] = (gender[x.gender || 'not tagged'] || 0) + 1;
    const head = {
      title, title_basis: firstLine ? 'title page: the first front-matter paragraph, cut at 200 characters' : 'no front matter; constructed from the session id',
      author: 'unknown', collection: COLL, source: 'Old Bailey Online (The Digital Humanities Institute, University of Sheffield)',
      source_url: `https://www.oldbaileyonline.org/browse.jsp?name=${id}`, source_url_basis: 'built by the rule in the release README; not resolved (the site answered 403 to the corpus client)',
      received_from: `${ZIP_URL} member sessionsPapers/${f}`, retrieved: today, sha256: sha256(buf), received_format: 'xml',
      license: licence, license_url: 'https://creativecommons.org/licenses/by-nc/4.0/', license_tier: 'nc', attribution: `${attribution} Session ${id}.`,
      language: cov != null && cov >= 0.5 ? 'en' : 'unknown', language_basis: 'dictionary-coverage',
      language_evidence: cov != null ? `${cov.toFixed(3)} of alphabetic tokens are entries in ${DICT_PATH} (Webster's 2nd)` : 'no dictionary on this machine',
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, date_basis: 'source-metadata (the session id, which the release README defines as the opening day on the title page)',
      place_by: 'unknown', place_about: ob && ldn ? 'the Old Bailey sessions, London' : 'unknown',
      place_about_basis: ob && ldn ? `stated-in-text: "${ob[0]}" and "${ldn[0]}" in the front matter` : 'not stated in the front matter',
      perspective_by: 'unknown', perspective_by_basis: 'many speakers; each defendant\'s gender, age and occupation as the data\'s own fields give them are in the manifest row (trials[].defendants)',
      perspective_about: 'unknown', voice: 'mixed', voice_basis: 'reported proceedings that quote witnesses\' testimony verbatim (the brief\'s classification, 2026-10-24); not decided per trial',
      translation_of: 'none', cultural_note: 'none', privacy_note: 'none (the release flags none)',
      words, trial_count: trials.length, defendants_by_gender: Object.entries(gender).map(([g, n]) => `${g} ${n}`).join('; ') || 'none tagged',
      ...(words < 600 ? { floor_exempt: 'a complete sessions paper as the holder publishes it' } : {}),
    };
    const doc = ['---', ...Object.entries(head).map(([k, v]) => `${k}: ${yaml(v)}`), '---', ''].join('\n') + text + '\n';
    const bytes = Buffer.byteLength(doc);
    if (total + bytes > CAP) { left.push(id); continue; }
    const file = path.join(OUT, `old-bailey-${id}.txt`);
    fs.writeFileSync(file, doc, 'utf8'); total += bytes;
    pulled.push({ file: path.relative(ROOT, file), url: head.source_url, ...head, trials });
  }
  pulled.sort((a, b) => a.file.localeCompare(b.file));
  // remove documents written by an earlier run that the cap now leaves out
  for (const id of left) { const p = path.join(OUT, `old-bailey-${id}.txt`); if (fs.existsSync(p)) fs.unlinkSync(p); }

  fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), `# Old Bailey Online: the Proceedings of the Old Bailey, 1674–1913

Source: Old Bailey Online (www.oldbaileyonline.org), Tim Hitchcock, Robert Shoemaker, Clive Emsley, Sharon Howard,
Jamie McLaughlin et al. Data release: ${ZIP_URL}, published by The Digital Humanities Institute, University of
Sheffield (data version ${version}, per the release README by Sharon Howard, March 2017). Retrieved ${today}.

Licence (licence.txt in the release, verbatim):

> ${licence}

**Non-commercial (tier nc).** These documents are kept apart from public-domain and openly licensed material. The project's
own reading of "commercial" normally excludes academic research outputs; ask oldbailey@sheffield.ac.uk if in doubt.

Required notice for any public reuse (the README's suggested statement):

> This work builds on Old Bailey Online that is licensed under a Creative Commons Attribution-NonCommercial 4.0
> International License. Permissions beyond the scope of this license may be available at
> https://www.oldbaileyonline.org/static/Legal-info.jsp.

Citations should name Old Bailey Online, http://www.oldbaileyonline.org, the data version, and the session or trial id
(each document names its session id; trial ids appear in the text as \`[trialAccount t…]\` lines).

Changes made: the TEI XML was converted to plain text. Interpretive tags (\`<interp>\`, \`<join>\`) and page links (\`<xptr>\`)
were dropped from the text; defendants' gender, age and occupation as tagged are kept in manifests/old-bailey-manifest.json.
`);

  manifest.source = 'The Proceedings of the Old Bailey, 1674–1913: Old Bailey Online XML release, via www.dhi.ac.uk';
  manifest.license = `${licence} (licence.txt in the release; tier nc)`;
  manifest.fetched_at = new Date().toISOString();
  manifest.release = { url: ZIP_URL, bytes: head.bytes, last_modified: head.last_modified, sha256: zipSha, data_version: version, sessions_in_release: files.length };
  manifest.pulled = pulled;   // the gate run pulled nothing; a rerun replaces the set it wrote
  manifest.gaps = (manifest.gaps || []).filter((g) => !(g.type === 'capped' && g.source === 'dhi-release'));
  if (left.length) manifest.gaps.push({ type: 'capped', source: 'dhi-release', cap_mb: CAP / 1e6, what_remains: `${left.length} of ${files.length} sessions papers, spread across 1674–1913 by the bit-reversed order`, session_ids: left.sort() });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
  const nTrials = pulled.reduce((a, p) => a + p.trial_count, 0);
  console.log(`pulled ${pulled.length} sessions papers (${nTrials} trials), ${(total / 1e6).toFixed(1)} MB; left by the cap: ${left.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
