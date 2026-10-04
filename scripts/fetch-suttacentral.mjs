#!/usr/bin/env node
// Fetch Pali Canon texts from SuttaCentral API (updated API format)
// Source: https://suttacentral.net/api
// License: CC0 (translations by Bhikkhu Sujato)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '14-holy-texts', 'suttacentral');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'suttacentral-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'https://suttacentral.net/api';

const NIKAYAS = {
  dn: { name: 'Digha Nikaya', label: 'Long Discourses' },
  mn: { name: 'Majjhima Nikaya', label: 'Middle Length Discourses' },
  sn: { name: 'Samyutta Nikaya', label: 'Connected Discourses' },
  an: { name: 'Anguttara Nikaya', label: 'Numerical Discourses' },
};

// Key suttas to fetch (representative from each nikaya)
const KEY_SUTTAS = [
  // DN
  'dn1', 'dn2', 'dn9', 'dn11', 'dn16', 'dn22', 'dn31',
  // MN
  'mn1', 'mn10', 'mn28', 'mn39', 'mn63', 'mn118', 'mn131',
  // SN
  'sn12.2', 'sn22.59', 'sn35.28', 'sn45.8', 'sn56.11',
  // AN
  'an3.65', 'an4.77', 'an5.57', 'an6.63', 'an10.176',
  // KN
  'dhp', 'snp1.1', 'snp1.2', 'snp1.3', 'snp1.4', 'snp1.5',
  'ud1.1', 'iti1', 'iti2', 'vv1.1', 'pv1.1',
  'thag1.1', 'thig1.1',
];

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// /api/suttas/{uid}/en no longer inlines segment text — `segmented` is just a
// boolean flag now, and `bilara_translated_text`/`translation` are metadata
// (uid, lang, author, title, previous/next pointers), not content. Fetching
// those `object`-typed fields with Object.values().join('\n') used to produce
// "[object Object]" for the `previous`/`next` pointers rather than an error,
// so the corpus silently filled with author-name text instead of suttas. The
// actual segment-keyed text lives at /api/bilarasuttas/{uid}/{author}.
async function fetchSuttaMeta(uid) {
  return fetchJSON(`${BASE_URL}/suttas/${uid}/en`);
}

async function fetchBilaraText(uid, author) {
  return fetchJSON(`${BASE_URL}/bilarasuttas/${uid}/${author}`);
}

// Prefer Sujato's CC0 translation (the license this corpus is scoped to);
// fall back to whichever translator SuttaCentral actually has for this uid.
function pickAuthor(candidateAuthors) {
  if (!candidateAuthors || !candidateAuthors.length) return null;
  return candidateAuthors.includes('sujato') ? 'sujato' : candidateAuthors[0];
}

function extractTranslation(bilara) {
  if (!bilara || !bilara.translation_text) return '';
  return Object.values(bilara.translation_text).join('\n');
}

async function main() {
  console.log('=== SuttaCentral Pali Canon Fetcher (Updated API) ===\n');
  const manifest = {
    source: 'SuttaCentral',
    url: 'https://suttacentral.net',
    api: 'https://suttacentral.net/api/suttas/',
    license: 'CC0 (Sujato translations)',
    fetched_at: new Date().toISOString(),
    texts: [],
  };

  for (const uid of KEY_SUTTAS) {
    console.log(`Fetching ${uid}...`);
    const meta = await fetchSuttaMeta(uid);
    if (!meta) {
      console.log(`  Failed`);
      await new Promise(r => setTimeout(r, 300));
      continue;
    }
    const author = pickAuthor(meta.candidate_authors);
    if (!author) {
      console.log(`  No translator available`);
      await new Promise(r => setTimeout(r, 300));
      continue;
    }
    const bilara = await fetchBilaraText(uid, author);
    const text = extractTranslation(bilara);
    if (text && text.length > 50) {
      const title = meta.translation?.title || meta.suttaplex?.title || uid;
      const file = path.join(OUTPUT_DIR, `${uid.replace(/\./g, '_')}_en.txt`);
      fs.writeFileSync(file, text, 'utf8');
      manifest.texts.push({
        uid,
        title,
        author,
        chars: text.length,
        file: path.relative(path.join(__dirname, '..'), file),
      });
      console.log(`  Saved: ${text.length} chars (${author})`);
    } else {
      console.log(`  No translation text found`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.texts.length} texts fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
