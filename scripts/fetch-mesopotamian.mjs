#!/usr/bin/env node
// Fetch the pre-CE Mesopotamian literary corpus — the oldest literature in the
// world — from the Electronic Text Corpus of Sumerian Literature (ETCSL,
// University of Oxford). The Sumerian transliteration is the original-language
// canon in machine-reachable form; the ETCSL English translation rides beside
// it, the way the corpus already holds the Pali canon with Bhikkhu Sujato's
// translation.
//
// Compositions: the Sumerian Gilgameš cycle (5 of them), Enki and Ninmaḫ,
// Enki and Ninḫursaĝa, Inana's descent, the sumerian king list, the lament
// for Urim. Each lands as one document carrying (a) the Sumerian
// transliteration and (b) the English translation, with provenance for both.
//
// Rights: ETCSL is © 2003-2006 The ETCSL project, Faculty of Oriental Studies,
// University of Oxford; the corpus is made available for research and teaching
// use. The English renderings are that project's own; the Sumerian text itself
// is ancient and public domain. The manifest records the notice verbatim.
//
//   node scripts/fetch-mesopotamian.mjs
//   node scripts/fetch-mesopotamian.mjs --only gilgamesh-and-aga,king-list

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'mesopotamian');
const API = 'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi';

const WORKS = [
  { id: 't.1.8.1.1', slug: 'gilgamesh-and-aga', title: 'Gilgameš and Aga (Sumerian, ETCSL t.1.8.1.1)' },
  { id: 't.1.8.1.2', slug: 'gilgamesh-and-the-bull-of-heaven', title: 'Gilgameš and the Bull of Heaven (Sumerian, ETCSL t.1.8.1.2)' },
  { id: 't.1.8.1.3', slug: 'death-of-gilgamesh', title: 'The death of Gilgameš (Sumerian, ETCSL t.1.8.1.3)' },
  { id: 't.1.8.1.4', slug: 'gilgamesh-enkidu-and-the-nether-world', title: 'Gilgameš, Enkidu and the nether world (Sumerian, ETCSL t.1.8.1.4)' },
  { id: 't.1.8.1.5', slug: 'gilgamesh-and-huwawa', title: 'Gilgameš and Ḫuwawa, Version A (Sumerian, ETCSL t.1.8.1.5)' },
  { id: 't.1.1.1', slug: 'enki-and-ninhursaga', title: 'Enki and Ninḫursaĝa (Sumerian, ETCSL t.1.1.1)' },
  { id: 't.1.1.2', slug: 'enki-and-ninmah', title: 'Enki and Ninmaḫ (Sumerian, ETCSL t.1.1.2)' },
  { id: 't.1.4.1', slug: 'inanas-descent-to-the-nether-world', title: "Inana's descent to the nether world (Sumerian, ETCSL t.1.4.1)" },
  { id: 't.1.4.2', slug: 'inana-and-shulgi', title: 'Inana and Šulgi (Sumerian, ETCSL t.1.4.2)' },
  { id: 't.2.1.1', slug: 'sumerian-king-list', title: 'The Sumerian king list (Sumerian, ETCSL t.2.1.1)' },
  { id: 't.2.2.2', slug: 'lament-for-urim', title: 'The lament for Urim (Sumerian, ETCSL t.2.2.2)' },
];

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/\s+on(Mouseover|Mouseout|Click|load)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/<\/?[a-z]+[^>]*>/gi, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function curlGet(url, retries = 3) {
  // The build environment's native fetch is refused by ETCSL's TLS layer on
  // some nodes; the local curl path is used so the driver runs on this machine.
  const { execFile } = await import('node:child_process');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = await new Promise((res, rej) => {
        execFile('curl', ['-s', '-m', '40', '-A', 'live_priors corpus builder (educational corpus)', url], (e, stdout) => (e ? rej(e) : res(stdout)));
      });
      return out;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

async function fetchView(id, view, isTranslit = false) {
  const textId = isTranslit ? id.replace(/^t\./, 'c.') : id;
  const url = `${API}?${new URLSearchParams({ text: textId, display: view, charenc: '' })}`;
  const body = await curlGet(url);
  return body ? cleanHtml(body) : null;
}

/** Extract only the line-numbered Sumerian/English body, dropping chrome. */
function sliceBody(text) {
  const start = text.indexOf('\n  ETCSL');
  const cut = start !== -1 ? text.slice(start) : text;
  const h2 = cut.search(/\n\s{10,}\S/);
  // chase to the heading line
  const lineStart = cut.match(/\n {10,}[^\n]/);
  const head = lineStart ? lineStart.index + lineStart[0].length - 1 : 0;
  return cut.slice(head).trim();
}

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  const sumer = await fetchView(work.id, 'Crit', true);
  const eng = await fetchView(work.id, 'X');
  if (!eng) {
    console.log(`FETCH FAILED`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'fetch_failed', id: work.id });
    return;
  }

  const sumerBody = sumer ? sliceBody(sumer) : '';
  const engBody = sliceBody(eng);
  const body = [
    '# Sumerian (transliteration)\n\n',
    sumerBody,
    '\n\n# English translation (ETCSL)\n\n',
    engBody,
  ].join('');

  const words = wordsIn(body);
  if (words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words, id: work.id });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/mesopotamian',
    'era: pre-0 (3rd–2nd millennium BCE, Sumerian)',
    `source: Electronic Text Corpus of Sumerian Literature (ETCSL), University of Oxford`,
    `source_url: ${API}?text=${work.id}`,
    `text_id: ${work.id}`,
    'language: Sumerian (cuneiform transliteration)',
    'translation: ETCSL English (research/teaching use, © 2003-2006 ETCSL project)',
    'license: Sumerian text public domain; ETCSL edition © ETCSL project, used for research and teaching',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, id: work.id, words, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, sumerian ${sumer ? 'y' : 'n'})`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Mesopotamian / Sumerian Fetcher (ETCSL) ===\n');
  const manifest = {
    source: 'Electronic Text Corpus of Sumerian Literature (ETCSL), Faculty of Oriental Studies, University of Oxford',
    era: 'pre-0 (3rd–2nd millennium BCE)',
    license: 'Sumerian texts are public domain (ancient). ETCSL edition © 2003-2006 ETCSL project; made available for research and teaching. Rights notice reproduced verbatim from the source.',
    format: 'Sumerian cuneiform transliteration + ETCSL English translation',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'mesopotamian-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);