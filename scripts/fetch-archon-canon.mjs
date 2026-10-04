#!/usr/bin/env node
// fetch-archon-canon.mjs — the works the Fold's archon card quotes, in the
// language they were written in AND a public-domain English translation, so
// every line the card shows is read out of bytes in this corpus rather than
// typed from memory.
//
// User direction (2026-09-16), on the card that read "Wanted: Grímnismál, the
// ravens' stanza … asked — nothing answered": "be sure all the priors are
// loaded for stuff like this, and also, use better quotes than this." The card
// (the-fold's archon-canon.js) now quotes each archon's own source, and its
// test reads every quoted line back out of the files this script writes.
//
//   node scripts/fetch-archon-canon.mjs            # fetch what is missing
//   node scripts/fetch-archon-canon.mjs --only eddukvaedi
//
// WHAT IS FETCHED, AND FROM WHERE (every host was checked live before it was
// written here — see manifests/archon-canon-manifest.json for the run):
//   originals
//     old-norse-originals/eddukvaedi.txt      the Poetic Edda, 46 poems, from
//                                             heimskringla.no (Guðni Jónsson's
//                                             normalized text)
//     old-norse-originals/snorra-edda.txt     Snorri's Edda, Icelandic Wikisource
//     greek-originals/hippocrates-aphorisms.txt   Greek Wikisource
//     german-originals/ranke-geschichten-…-1824.txt  the 1824 first edition,
//                                             machine OCR of the Bayerische
//                                             Staatsbibliothek scan (archive.org)
//   an English original
//     05-academic-papers/open-access-books/ashby/…  Ashby 1956, the Principia
//                                             Cybernetica PDF, which carries the
//                                             Estate's non-profit permission
//   translations (11-multi-language/translations-en/)
//     Bellows 1923 (Poetic Edda), Anderson 1880 (Younger Edda), Myers 1874
//     (Pindar), Stewart & Long 1880 (Plutarch's Lives I), Jowett (Sophist),
//     Spillan (Livy I–VIII) — Project Gutenberg; Adams 1849 (Hippocrates II),
//     Stcherbatsky 1927 (Nāgārjuna I and XXV), Ashworth 1887 (Ranke) —
//     archive.org OCR. Each declares `translation_of:` — the corpus path of
//     the original it renders — so a pair is a fact in the document's own
//     papers, not a convention a reader has to know.
//
// WHAT IS NOT FETCHED, AND WHY
//   Kelsen's Reine Rechtslehre (1934/1960) is under copyright (he died 1973).
//   The card quotes the precedence rule his archon applies in its oldest
//   written form instead — the Twelve Tables' "whatever the people ordered
//   last", as Livy reports it — and says so on the card.
//   The DTA transcription of Ranke's 1824 preface sits behind a JavaScript
//   bot check; this script does not get past such checks. The BSB scan's OCR
//   is used instead, as OCR, with its errors kept (LP1: the source is never
//   replaced by a reading — the card declares the OCR corrections it applies
//   when it quotes, in the-fold's archon-canon.js).
//
// ALREADY IN THE CORPUS (read by the card, verified present, never rewritten
// here): plato-republic.txt, plato-sophist.txt, pindar-pythian-odes.txt,
// plutarch-life-of-solon.txt, nagarjuna-mulamadhyamakakarika.txt,
// livy-history.txt, and Jowett's Republic (pg55201).
//
// A work already on disk is never overwritten: its bytes are the source.
// Delete the file to fetch it again.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UA = 'live_priors corpus builder (educational corpus)';

async function getText(url, { retries = 4, timeoutMs = 180000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 429) { await sleep(8000 * (attempt + 1)); continue; }
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(2500 * (attempt + 1));
  }
  return null;
}

async function getBytes(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// MediaWiki's rendered HTML → text that keeps VERSE LINES. The canon fetchers
// map every tag to a space, which is right for prose and wrong for a stanza:
// here a <br> or a block's close is a line break, so a quoted stanza reads back
// line for line.
function htmlToText(html) {
  const entities = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>\s*<\/span>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(catlinks|printfooter|noprint|ws-noexport)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    // MediaWiki writes "<br />\n": one verse line, not a blank line after it.
    .replace(/<br\s*\/?>\n?/gi, '\n')
    // heimskringla sets each verse line as its own <dd>: a line, not a paragraph.
    .replace(/<\/(dd|dt|li)>\n?/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|table|blockquote|center)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m)
    .split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parsePage(api, page) {
  const url = `${api}?${new URLSearchParams({ action: 'parse', page, prop: 'text', redirects: '1', format: 'json' })}`;
  const body = await getText(url);
  if (!body) return null;
  try {
    const html = JSON.parse(body)?.parse?.text?.['*'];
    return html ? htmlToText(html) : null;
  } catch { return null; }
}

// The index's own list: a plain link whose text IS the page title. The page
// also carries a box of links to other editions (Danish, Norwegian, Swedish
// translations' index pages), whose anchors wrap markup rather than plain
// text — a looser match took 22 of those in as if they were poems, measured
// on the first run.
async function indexLinks(api, page) {
  const url = `${api}?${new URLSearchParams({ action: 'parse', page, prop: 'text', redirects: '1', format: 'json' })}`;
  const body = await getText(url);
  const html = JSON.parse(body).parse.text['*'];
  return [...html.matchAll(/<a href="\/wiki\/[^"#]+"[^>]*title="([^"]+)"[^>]*>([^<]*)<\/a>/g)]
    .filter((m) => m[1] === m[2] && m[1] !== page)
    .map((m) => m[1]);
}

function stripGutenberg(text) {
  let body = text;
  const start = body.indexOf('*** START OF');
  if (start !== -1) { const nl = body.indexOf('\n', start); if (nl !== -1) body = body.slice(nl + 1); }
  const end = body.indexOf('*** END OF');
  if (end !== -1) body = body.slice(0, end);
  return body.trim();
}

async function archiveOcr(id) {
  const meta = JSON.parse(await getText(`https://archive.org/metadata/${id}`));
  const file = meta.files.find((f) => /_djvu\.txt$/.test(f.name));
  if (!file) throw new Error(`no OCR text in archive.org item ${id}`);
  const text = await getText(`https://archive.org/download/${id}/${encodeURIComponent(file.name)}`);
  if (!text) throw new Error(`could not read ${file.name}`);
  return text.trim();
}

const ORIGINALS = '11-multi-language';
const TRANSLATIONS = '11-multi-language/translations-en';

const WORKS = [
  // ── originals ───────────────────────────────────────────────────────────
  {
    slug: 'eddukvaedi',
    file: `${ORIGINALS}/old-norse-originals/eddukvaedi.txt`,
    title: 'Eddukvæði — Sæmundar-Edda (The Poetic Edda)',
    source: 'heimskringla.no — Eddukvæði (Sæmundar-Edda), Guðni Jónsson bjó til prentunar',
    source_url: 'https://heimskringla.no/wiki/Eddukv%C3%A6%C3%B0i',
    format: 'Old Norse (normalized orthography)',
    license: 'public domain (anonymous poems, Codex Regius and related manuscripts, 13th century); normalized text as published by heimskringla.no, which states its texts are free to use and asks that the site be credited',
    async fetch() {
      const api = 'https://heimskringla.no/api.php';
      const poems = (await indexLinks(api, 'Eddukvæði')).filter((t) => t !== 'Anker Eli Petersen');
      const parts = [];
      for (const title of poems) {
        const text = await parsePage(api, title);
        if (text) parts.push(`${title}\n\n${text}`);
        await sleep(700);
      }
      return { body: parts.join(`\n\n${'─'.repeat(60)}\n\n`), parts: parts.length };
    },
  },
  {
    slug: 'snorra-edda',
    file: `${ORIGINALS}/old-norse-originals/snorra-edda.txt`,
    title: 'Snorri Sturluson, Snorra Edda (The Prose Edda)',
    source: 'Icelandic Wikisource (is.wikisource.org), subpages of Snorra Edda',
    source_url: 'https://is.wikisource.org/wiki/Snorra_Edda',
    format: 'Old Norse (normalized orthography)',
    license: 'public domain (Snorri Sturluson, c. 1220)',
    async fetch() {
      const api = 'https://is.wikisource.org/w/api.php';
      const order = ['Prologus', 'Gylfaginning', 'Skáldskaparmál', 'Háttatal', 'Nafnaþulur', 'Skáldatal'];
      const parts = [];
      for (const sub of order) {
        const text = await parsePage(api, `Snorra Edda/${sub}`);
        if (text) parts.push(`Snorra Edda/${sub}\n\n${text}`);
        await sleep(800);
      }
      return { body: parts.join(`\n\n${'─'.repeat(60)}\n\n`), parts: parts.length };
    },
  },
  {
    slug: 'hippocrates-aphorisms',
    file: `${ORIGINALS}/greek-originals/hippocrates-aphorisms.txt`,
    title: 'Ἱπποκράτης, Ἀφορισμοί (Hippocrates, Aphorisms)',
    source: 'Greek Wikisource (el.wikisource.org), Αφορισμοί, sections Α–Η',
    source_url: 'https://el.wikisource.org/wiki/%CE%91%CF%86%CE%BF%CF%81%CE%B9%CF%83%CE%BC%CE%BF%CE%AF',
    format: 'Ancient Greek (Ionic)',
    license: 'public domain',
    async fetch() {
      const api = 'https://el.wikisource.org/w/api.php';
      // Section numerals in the book's own order — an alphabetical sort would
      // put ΣΤ (six) after Ζ (seven).
      const sections = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ', 'Ζ', 'Η'];
      const parts = [];
      for (const s of sections) {
        const text = await parsePage(api, `Αφορισμοί/${s}`);
        if (text) parts.push(`Αφορισμοί/${s}\n\n${text}`);
        await sleep(800);
      }
      return { body: parts.join(`\n\n${'─'.repeat(60)}\n\n`), parts: parts.length };
    },
  },
  {
    slug: 'ranke-geschichten-1824',
    file: `${ORIGINALS}/german-originals/ranke-geschichten-der-romanischen-und-germanischen-voelker-1824.txt`,
    title: 'Leopold Ranke, Geschichten der romanischen und germanischen Völker von 1494 bis 1535, Band 1 (1824)',
    source: 'archive.org item 10716982bsb — the Bayerische Staatsbibliothek scan of the first edition (Leipzig und Berlin: G. Reimer, 1824), machine OCR',
    source_url: 'https://archive.org/details/10716982bsb',
    format: 'German (1824, Fraktur; machine OCR — long s (ſ) as printed, OCR errors kept)',
    license: 'public domain (1824)',
    date: '1824',
    async fetch() { return { body: await archiveOcr('10716982bsb'), parts: 1 }; },
  },

  // ── an English original ─────────────────────────────────────────────────
  {
    slug: 'ashby-introduction-to-cybernetics',
    file: '05-academic-papers/open-access-books/ashby/ashby-1956-an-introduction-to-cybernetics.txt',
    title: 'W. Ross Ashby, An Introduction to Cybernetics (1956)',
    source: 'Principia Cybernetica Web — the 1999 electronic edition, text extracted from the PDF with pdftotext',
    source_url: 'https://pespmc1.vub.ac.be/books/IntroCyb.pdf',
    format: 'English',
    license: 'Copyright © 1956, 1999 by The Estate of W. Ross Ashby. Non-profit reproduction and distribution of this text for educational and research reasons is permitted providing this copyright statement is included.',
    date: '1956',
    async fetch() {
      const tmp = path.join(fs.mkdtempSync(path.join((await import('os')).tmpdir(), 'ashby-')), 'IntroCyb.pdf');
      fs.writeFileSync(tmp, await getBytes('https://pespmc1.vub.ac.be/books/IntroCyb.pdf'));
      const text = execFileSync('pdftotext', ['-enc', 'UTF-8', tmp, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
      return { body: text.replace(/\f/g, '\n').trim(), parts: 1 };
    },
  },

  // ── translations ────────────────────────────────────────────────────────
  gutenberg(73533, 'bellows-1923-the-poetic-edda', {
    title: 'The Poetic Edda, translated from the Icelandic by Henry Adams Bellows (1923)',
    translator: 'Henry Adams Bellows', date: '1923',
    translation_of: `${ORIGINALS}/old-norse-originals/eddukvaedi.txt`,
  }),
  gutenberg(18947, 'anderson-1880-the-younger-edda', {
    title: "The Younger Edda, also called Snorre's Edda, or The Prose Edda, translated by Rasmus B. Anderson (1880)",
    translator: 'Rasmus Björn Anderson', date: '1880',
    translation_of: `${ORIGINALS}/old-norse-originals/snorra-edda.txt`,
  }),
  gutenberg(10717, 'myers-1874-the-extant-odes-of-pindar', {
    title: 'The Extant Odes of Pindar, translated by Ernest Myers (1874)',
    translator: 'Ernest Myers', date: '1874',
    translation_of: `${ORIGINALS}/greek-originals/pindar-olympian-odes.txt, ${ORIGINALS}/greek-originals/pindar-pythian-odes.txt, ${ORIGINALS}/greek-originals/pindar-nemean-odes.txt, ${ORIGINALS}/greek-originals/pindar-isthmian-odes.txt`,
  }),
  gutenberg(14033, 'stewart-long-1880-plutarchs-lives-volume-1', {
    title: "Plutarch's Lives, Volume 1 (Theseus to Aemilius, including Solon), translated by Aubrey Stewart and George Long (1880)",
    translator: 'Aubrey Stewart; George Long', date: '1880',
    translation_of: `${ORIGINALS}/greek-originals/plutarch-life-of-solon.txt`,
  }),
  gutenberg(1735, 'jowett-plato-sophist', {
    title: 'Plato, Sophist, translated by Benjamin Jowett',
    translator: 'Benjamin Jowett', date: '1871',
    translation_of: `${ORIGINALS}/greek-originals/plato-sophist.txt`,
  }),
  gutenberg(19725, 'spillan-livy-history-of-rome-books-1-8', {
    title: 'Livy, The History of Rome, Books 1 to 8, translated by D. Spillan',
    translator: 'Daniel Spillan', date: '1849',
    translation_of: `${ORIGINALS}/latin-originals/livy-history.txt`,
  }),
  archive('genuineworksofhi02hippuoft', 'adams-1849-the-genuine-works-of-hippocrates-volume-2', {
    title: 'The Genuine Works of Hippocrates, Volume 2 (including the Aphorisms), translated by Francis Adams (Sydenham Society, 1849)',
    translator: 'Francis Adams', date: '1849',
    translation_of: `${ORIGINALS}/greek-originals/hippocrates-aphorisms.txt`,
  }),
  archive('Th.Stcherbatsky1927TheConceptionOfBuddhistNirvanaCANDRAKIRTIPRASNNAPADAMADHYAMAKAVRTTICHAPTERIXXV', 'stcherbatsky-1927-the-conception-of-buddhist-nirvana', {
    title: "Th. Stcherbatsky, The Conception of Buddhist Nirvana (Leningrad, 1927) — with a translation of Nāgārjuna's Mūlamadhyamakakārikā, chapters I and XXV, and Candrakīrti's commentary",
    translator: 'Theodore Stcherbatsky', date: '1927',
    translation_of: `${ORIGINALS}/sanskrit-originals/nagarjuna-mulamadhyamakakarika.txt`,
  }),
  archive('historyoflatinte01rank', 'ashworth-1887-ranke-history-of-the-latin-and-teutonic-nations', {
    title: 'Leopold von Ranke, History of the Latin and Teutonic Nations from 1494 to 1514, translated by Philip A. Ashworth (1887)',
    translator: 'Philip A. Ashworth', date: '1887',
    translation_of: `${ORIGINALS}/german-originals/ranke-geschichten-der-romanischen-und-germanischen-voelker-1824.txt`,
  }),
];

function gutenberg(id, slug, meta) {
  return {
    slug,
    file: `${TRANSLATIONS}/${slug}.txt`,
    source: `Project Gutenberg eBook #${id}`,
    source_url: `https://www.gutenberg.org/ebooks/${id}`,
    format: 'English',
    license: 'public domain (US); Project Gutenberg header and licence removed',
    ...meta,
    async fetch() {
      const text = await getText(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
      if (!text) throw new Error(`Gutenberg #${id} did not answer`);
      return { body: stripGutenberg(text), parts: 1 };
    },
  };
}

function archive(id, slug, meta) {
  return {
    slug,
    file: `${TRANSLATIONS}/${slug}.txt`,
    source: `archive.org item ${id} — machine OCR of the printed book (OCR errors kept)`,
    source_url: `https://archive.org/details/${id}`,
    format: 'English (machine OCR)',
    license: `public domain (published ${meta.date})`,
    ...meta,
    async fetch() { return { body: await archiveOcr(id), parts: 1 }; },
  };
}

const ALREADY_HERE = [
  `${ORIGINALS}/greek-originals/plato-republic.txt`,
  `${ORIGINALS}/greek-originals/plato-sophist.txt`,
  `${ORIGINALS}/greek-originals/pindar-pythian-odes.txt`,
  `${ORIGINALS}/greek-originals/plutarch-life-of-solon.txt`,
  `${ORIGINALS}/sanskrit-originals/nagarjuna-mulamadhyamakakarika.txt`,
  `${ORIGINALS}/latin-originals/livy-history.txt`,
  '01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt',
];

function header(work) {
  const keys = ['title', 'collection', 'source', 'source_url', 'format', 'license', 'translator', 'translation_of', 'date'];
  const collection = path.dirname(work.file);
  const lines = ['---'];
  for (const k of keys) {
    const v = k === 'collection' ? collection : work[k];
    if (v) lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function main() {
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
    ?? (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null);
  const manifestFile = path.join(ROOT, 'manifests', 'archon-canon-manifest.json');
  let prior = { pulled: [], rejected: [] };
  try { prior = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first run */ }
  const run = { pulled: [], kept: [], rejected: [] };

  for (const work of WORKS) {
    if (only && work.slug !== only) continue;
    const abs = path.join(ROOT, work.file);
    process.stdout.write(`  ${work.slug}… `);
    if (fs.existsSync(abs)) {
      const buf = fs.readFileSync(abs);
      run.kept.push({ slug: work.slug, file: work.file, bytes: buf.length, sha256: sha256(buf) });
      console.log('already here — kept, not re-fetched');
      continue;
    }
    try {
      const { body, parts } = await work.fetch();
      const words = wordsIn(body);
      if (words < MIN_WORDS) {
        run.rejected.push({ slug: work.slug, reason: 'under_600_words', words });
        console.log(`too short (${words} words)`);
        continue;
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const out = header(work) + body + '\n';
      fs.writeFileSync(abs, out, 'utf8');
      const buf = fs.readFileSync(abs);
      run.pulled.push({ slug: work.slug, file: work.file, words, parts, bytes: buf.length, sha256: sha256(buf), source_url: work.source_url, fetched_at: new Date().toISOString() });
      console.log(`ok (${words} words, ${parts} part${parts === 1 ? '' : 's'})`);
    } catch (e) {
      run.rejected.push({ slug: work.slug, reason: e.message });
      console.log(`FAILED — ${e.message}`);
    }
  }

  const missing = ALREADY_HERE.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) console.log(`\n  missing, expected already in the corpus: ${missing.join(', ')}`);

  const bySlug = (older, newer) => {
    const m = new Map((older ?? []).map((e) => [e.slug, e]));
    for (const e of newer) m.set(e.slug, e);
    return [...m.values()];
  };
  const manifest = {
    purpose: "the works the Fold's archon card quotes — each in its own language and a public-domain English translation (the-fold archon-canon.js reads every quoted line back out of these files)",
    pulled: bySlug(prior.pulled, run.pulled),
    rejected: bySlug(prior.rejected, run.rejected).filter((r) => !run.pulled.some((p) => p.slug === r.slug)),
    already_in_corpus: ALREADY_HERE.map((f) => ({ file: f, present: fs.existsSync(path.join(ROOT, f)) })),
    not_fetched: [
      { work: 'Hans Kelsen, Reine Rechtslehre (1934; 2nd ed. 1960)', reason: 'under copyright (Kelsen d. 1973); the card quotes the Twelve Tables via Livy 7.17.12 for the precedence rule instead, and says so' },
      { work: "Deutsches Textarchiv transcription of Ranke's 1824 preface", reason: 'behind a JavaScript bot check this script does not get past; the BSB scan OCR is used instead' },
    ],
  };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`\n  ${run.pulled.length} pulled, ${run.kept.length} kept, ${run.rejected.length} rejected — ${path.relative(ROOT, manifestFile)}`);
  if (run.rejected.length || missing.length) process.exitCode = 1;
}

main();
