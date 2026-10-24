#!/usr/bin/env node
// fetch-nupepa-hawaii.mjs — the Hawaiian-language newspapers of GAP-SOURCES-PLAN.md #8, for
// 11-multi-language/nupepa-hawaii/. Hosts approved 2026-10-24: nupepa.org (Hoʻolaupaʻi), ulukau.org (Ka Haka ʻUla O
// Keʻelikōlani College of Hawaiian Language, UH Hilo, with ALU LIKE, Inc.), papakilodatabase.com (OHA).
//
// Terms-first gate (GAP-INGEST-SPEC.md). This script reads each host's robots.txt and terms, and writes
// manifests/nupepa-hawaii-manifest.json with what it found. It pulls nothing. On 2026-10-24:
//   - nupepa.org and papakilodatabase.com answer every request, robots.txt included, with a Cloudflare JavaScript
//     challenge (403 "Just a moment..."). Their terms and guidance cannot be read; the spec forbids working around it.
//   - ulukau.org has no robots.txt (404). Its Terms of Use (updated 21 August 2018) allow personal use only: no
//     commercial use, no copying to any other website, and no reproduction, distribution or derivative works without
//     the copyright owner's prior written consent ("All Rights Reserved"). That forbids reuse in a corpus, so nothing is
//     pulled; Ulukau's newspaper collection links to nupepa.org in any case.
// When a holder grants written permission, the pull stage is still to be written: issues before 1929 (US public domain
// by age), the holder's own terms on scans, OCR and crowd corrections recorded per document, cap 300 MB, 3 s pacing.
//
//   node scripts/fetch-nupepa-hawaii.mjs        (5 requests, 3 s apart; rewrites the manifest)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sleep } from './lib/corpus-util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'Zenodotus live_priors corpus builder (non-commercial research)' };
const PACE = 3000;

async function probe(url) {
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const body = await r.text();
    let blocked = null;
    if (/_Incapsula_Resource|Incapsula incident/.test(body)) blocked = 'Imperva Incapsula bot challenge';
    else if (r.headers.get('x-amzn-waf-action')) blocked = `AWS WAF ${r.headers.get('x-amzn-waf-action')}`;
    else if (r.status === 403 && /Just a moment|challenge-platform/.test(body)) blocked = 'Cloudflare JavaScript challenge';
    else if (r.status === 403) blocked = 'HTTP 403 Forbidden';
    return { url, final_url: r.url, http_status: r.status, bytes: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex'), blocked, body };
  } catch (e) { return { url, http_status: 0, blocked: `network error: ${e.message}`, body: '' }; }
}
const rec = ({ body, ...p }, summary) => ({ ...p, date: new Date().toISOString().slice(0, 10), summary });
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');

async function main() {
  const terms = [], rejected = [], gaps = [];
  for (const host of ['nupepa.org', 'papakilodatabase.com']) {
    const p = await probe(`https://${host}/robots.txt`); await sleep(PACE);
    terms.push(rec(p, p.blocked ? `robots.txt, terms and cultural guidance not readable: ${p.blocked}` : `READABLE NOW: ${p.body.replace(/\s+/g, ' ').slice(0, 300)}`));
    rejected.push({ host, reason: p.blocked ? `${p.blocked} on every request; terms unreadable; the spec forbids working around a block` : 'gate changed: read the terms by hand before any pull' });
  }
  const robots = await probe('https://www.ulukau.org/robots.txt'); await sleep(PACE);
  terms.push(rec(robots, robots.http_status === 404 ? 'no robots.txt (404)' : `robots.txt: ${robots.body.replace(/\s+/g, ' ').slice(0, 300)}`));
  const copy = await probe('https://www.ulukau.org/php-include/disclaimer.php?subpage=copyright&l=en&subpage_heading=Copyright'); await sleep(PACE);
  const ct = plain(copy.body || '');
  const forbids = /may not be used for commercial purposes or copied to any other website/.test(ct) && /without the prior written consent/.test(ct);
  terms.push(rec(copy, forbids
    ? 'Terms of Use (updated August 21, 2018): personal use only; no commercial use; no copying to any other website; no reproduction, distribution, transmission, display or derivative works without the prior written consent of the copyright owner. Website copyright: Ka Haka ʻUla O Keʻelikōlani College of Hawaiian Language and ALU LIKE, Inc.; other Ulukau sites as shown on them; "All Rights Reserved". Users must determine copyright themselves.'
    : `wording changed or unreadable (${copy.blocked || copy.http_status}): read by hand`));
  const about = await probe('https://www.ulukau.org/php-include/disclaimer.php?subpage=about&l=en&subpage_heading=About');
  const purpose = (plain(about.body || '').match(/The purpose of Ulukau[^.]*\./) || [])[0];
  terms.push(rec(about, purpose ? `cultural guidance (stated purpose): ${purpose.trim()} No separate cultural-protocol page was found on the pages read.` : 'about page unreadable or changed'));
  rejected.push({ host: 'ulukau.org', reason: forbids ? 'terms forbid reproduction, distribution and copying to any other website without prior written consent (personal use only)' : 'terms changed: read by hand' });
  gaps.push({ type: 'blocked', what_remains: 'Hawaiian-language newspapers 1834–1928 (nupepa.org, papakilodatabase.com)', reason: 'Cloudflare challenge; terms unreadable' });
  gaps.push({ type: 'terms-forbid', what_remains: 'Ulukau collections', reason: 'personal use only without written consent from the holders' });

  const manifest = {
    source: 'Hawaiian-language newspapers: nupepa.org (Hoʻolaupaʻi), ulukau.org (Ka Haka ʻUla O Keʻelikōlani, UH Hilo; ALU LIKE, Inc.), papakilodatabase.com (Office of Hawaiian Affairs)',
    license: 'not pulled. Pre-1929 issues are public domain in the US by age, but Ulukau reserves all rights in its site content and allows personal use only; scans, OCR text and crowd corrections may carry the holders\' own terms. Tier: none assigned (not vendorable without written consent).',
    fetched_at: new Date().toISOString(), terms_read: terms, pulled: [], rejected, gaps,
  };
  fs.writeFileSync(path.join(ROOT, 'manifests', 'nupepa-hawaii-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const t of terms) console.log(`${t.http_status} ${t.url}\n   ${t.summary}`);
  console.log(`\npulled 0; rejected ${rejected.length} hosts; manifest written`);
}
main();
