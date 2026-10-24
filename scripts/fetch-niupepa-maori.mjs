#!/usr/bin/env node
// fetch-niupepa-maori.mjs — the Māori-language newspapers (Niupepa, 1842–1932) of GAP-SOURCES-PLAN.md #7, for
// 11-multi-language/niupepa-maori/. Hosts approved 2026-10-24: paperspast.natlib.govt.nz, api.digitalnz.org; then
// (second approval, same day) natlib.govt.nz and catalogue.data.govt.nz for the "Papers Past Open Data" release, and
// nzdl.org (University of Waikato's Niupepa collection) as the fallback.
//
// Terms-first gate (GAP-INGEST-SPEC.md). This script reads each host's robots.txt and terms or dataset page and APPENDS
// what it found to manifests/niupepa-maori-manifest.json (terms_read, rejected and gaps are never overwritten). It
// pulls nothing. On 2026-10-24:
//   - paperspast.natlib.govt.nz: robots.txt allows all bots but PetalBot; every other page, the copyright page
//     included, answers with an Imperva Incapsula bot challenge. Terms and Māori cultural guidance unreadable.
//   - api.digitalnz.org: answers without a key, but its terms (digitalnz.org) sit behind an AWS WAF challenge, and its
//     "Māori Niupepa Collection" is metadata only (no text; landing pages on nzdl.org).
//   - catalogue.data.govt.nz: robots.txt allows the dataset pages (Crawl-Delay 10; /api/ disallowed), but the
//     papers-past-open-data page answers with an Imperva "Pardon Our Interruption" bot challenge, so the dataset's
//     licence, its CSV title listing and its download links cannot be read.
//   - natlib.govt.nz: robots.txt disallows /files among others; the blog post announcing the release, and the home
//     page, answer with an Imperva Incapsula bot challenge.
//   - nzdl.org: robots.txt and every page answer with a Cloudflare JavaScript challenge.
// The spec forbids working around a challenge, so whether the open data holds any Māori-language title is unknown.
// When a route opens, the pull stage is still to be written: issues before 1904 (the open data covers titles before
// 1905), ALTO text to one document per issue, tier from the dataset's own licence, cap 300 MB, polite pacing.
//
//   node scripts/fetch-niupepa-maori.mjs        (about 9 requests, 3 s apart, 10 s on catalogue.data.govt.nz)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'manifests', 'niupepa-maori-manifest.json');
const UA = { 'User-Agent': 'Zenodotus live_priors corpus builder (non-commercial research)' };

async function probe(url) {
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const body = await r.text();
    let blocked = null;
    if (/_Incapsula_Resource|Incapsula incident/.test(body)) blocked = 'Imperva Incapsula bot challenge';
    else if (/Pardon Our Interruption/.test(body)) blocked = 'Imperva "Pardon Our Interruption" bot challenge';
    else if (r.headers.get('x-amzn-waf-action')) blocked = `AWS WAF ${r.headers.get('x-amzn-waf-action')}`;
    else if (r.status === 403 && /Just a moment|challenge-platform/.test(body)) blocked = 'Cloudflare JavaScript challenge';
    else if (r.status === 403) blocked = 'HTTP 403 Forbidden';
    return { url, final_url: r.url, http_status: r.status, bytes: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex'), blocked, body };
  } catch (e) { return { url, http_status: 0, blocked: `network error: ${e.message}`, body: '' }; }
}
const rec = ({ body, ...p }, summary) => ({ ...p, date: new Date().toISOString().slice(0, 10), summary });
const robotsLine = (p) => (p.blocked ? `not readable: ${p.blocked}` : `robots.txt read: ${p.body.replace(/\s+/g, ' ').trim().slice(0, 300)}`);

async function main() {
  const m = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { terms_read: [], pulled: [], rejected: [], gaps: [] };
  const terms = [], rejected = [], gaps = [];

  // route 1: Papers Past pages and the DigitalNZ API
  const ppRobots = await probe('https://paperspast.natlib.govt.nz/robots.txt'); await sleep(3000);
  terms.push(rec(ppRobots, robotsLine(ppRobots)));
  const ppCopy = await probe('https://paperspast.natlib.govt.nz/copyright'); await sleep(3000);
  terms.push(rec(ppCopy, ppCopy.blocked ? `copyright page and Māori cultural guidance not readable: ${ppCopy.blocked}` : 'READABLE NOW: read this page and the Māori content guidance by hand'));
  const dnzTerms = await probe('https://digitalnz.org/about/terms-of-use'); await sleep(3000);
  terms.push(rec(dnzTerms, dnzTerms.blocked ? `DigitalNZ terms of use not readable: ${dnzTerms.blocked}` : 'READABLE NOW: read the DigitalNZ terms by hand'));
  const api = await probe('https://api.digitalnz.org/v3/records.json?and[primary_collection][]=M%C4%81ori+Niupepa+Collection&per_page=1&facets=year&facets_per_page=200'); await sleep(3000);
  let pre1904 = null;
  if (!api.blocked && api.http_status === 200) {
    const s = JSON.parse(api.body).search, r0 = s.results?.[0] || {};
    pre1904 = Object.entries(s.facets?.year || {}).filter(([y]) => +y < 1904).reduce((a, [, n]) => a + n, 0);
    terms.push(rec(api, `answers without an API key. "Māori Niupepa Collection": ${s.result_count} issue records, ${pre1904} dated before 1904; content partner ${r0.display_content_partner}; sample record ${r0.id} fulltext=${r0.fulltext ? 'present' : 'none'}, landing host ${r0.landing_url ? new URL(r0.landing_url).host : 'none'}.`));
  } else terms.push(rec(api, `API not usable: ${api.blocked || api.http_status}`));
  rejected.push({ host: 'paperspast.natlib.govt.nz', reason: `bot challenge on every page but robots.txt (${ppCopy.blocked || 'see terms_read'})` });
  rejected.push({ host: 'api.digitalnz.org', reason: `terms unreadable (${dnzTerms.blocked || 'see terms_read'}); the Niupepa records hold metadata only, no text` });

  // route 2: Papers Past Open Data (catalogue.data.govt.nz, natlib.govt.nz)
  const cdRobots = await probe('https://catalogue.data.govt.nz/robots.txt'); await sleep(10000);
  terms.push(rec(cdRobots, robotsLine(cdRobots)));
  const cdSet = await probe('https://catalogue.data.govt.nz/dataset/papers-past-open-data'); await sleep(3000);
  terms.push(rec(cdSet, cdSet.blocked ? `dataset page (licence, CSV title listing, download links) not readable: ${cdSet.blocked}. The CKAN API that would give the same metadata is disallowed by robots.txt (/api/).` : 'READABLE NOW: read the licence and the CSV listing by hand'));
  const nlRobots = await probe('https://natlib.govt.nz/robots.txt'); await sleep(3000);
  terms.push(rec(nlRobots, robotsLine(nlRobots)));
  const nlBlog = await probe('https://natlib.govt.nz/blog/posts/papers-past-data-has-been-set-free'); await sleep(3000);
  terms.push(rec(nlBlog, nlBlog.blocked ? `release announcement not readable: ${nlBlog.blocked}; the Māori-content guidance on natlib.govt.nz is behind the same challenge` : 'READABLE NOW: read the post by hand'));
  rejected.push({ host: 'catalogue.data.govt.nz', reason: `dataset page behind a bot challenge (${cdSet.blocked || 'see terms_read'}); /api/ disallowed by robots.txt` });
  rejected.push({ host: 'natlib.govt.nz', reason: `bot challenge (${nlBlog.blocked || 'see terms_read'}); /files disallowed by robots.txt; the release's download links and licence cannot be read` });
  gaps.push({ type: 'blocked', what_remains: 'Papers Past Open Data (METS/ALTO for 117 titles before 1905): whether any Māori-language title is included is unknown', reason: 'dataset page and announcement behind bot challenges' });

  // route 3 (fallback): nzdl.org, University of Waikato's Niupepa collection
  const nz = await probe('https://www.nzdl.org/robots.txt');
  terms.push(rec(nz, nz.blocked ? `robots.txt, terms and every page not readable: ${nz.blocked}` : robotsLine(nz)));
  rejected.push({ host: 'nzdl.org', reason: `${nz.blocked || 'see terms_read'} on every request; terms unreadable` });
  gaps.push({ type: 'blocked', what_remains: `${pre1904 ?? 'unknown number of'} Niupepa issues dated 1842–1903 (DigitalNZ issue count) on every approved route`, reason: 'all five approved hosts challenge or refuse an automated client, or hold no text' });
  gaps.push({ type: 'terms-unreadable', what_remains: 'Papers Past copyright and Māori content guidance; DigitalNZ terms; Papers Past Open Data licence; nzdl.org terms', reason: 'challenge pages served to automated clients' });

  // append, never overwrite
  const key = (x) => JSON.stringify([x.url, x.date]);
  const seen = new Set(m.terms_read.map(key));
  for (const t of terms) if (!seen.has(key(t))) m.terms_read.push(t);
  for (const r of rejected) { const i = m.rejected.findIndex((x) => x.host === r.host); if (i < 0) m.rejected.push(r); else if (m.rejected[i].reason !== r.reason) m.rejected[i].reason_history = [...(m.rejected[i].reason_history || []), r.reason]; }
  for (const g of gaps) if (!m.gaps.some((x) => x.type === g.type && x.what_remains === g.what_remains)) m.gaps.push(g);
  m.source = 'Niupepa, Māori-language newspapers 1842–1932: Papers Past, DigitalNZ, Papers Past Open Data (National Library of New Zealand), nzdl.org (University of Waikato)';
  m.fetched_at = new Date().toISOString();
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  for (const t of terms) console.log(`${t.http_status} ${t.url}\n   ${t.summary}`);
  console.log(`\npulled 0; manifest has ${m.terms_read.length} terms_read, ${m.rejected.length} rejected hosts, ${m.gaps.length} gaps`);
}
main();
