#!/usr/bin/env node
// Fetch the pre-CE (BCE) Ancient Greek original texts missing from the Greek
// holdings: Hesiod, the Homeric Hymns, Xenophon, Euclid's Elements, and the
// Septuagint (Rahlfs) — the Greek Old Testament of the 3rd–1st c. BCE — from
// Greek Wikisource (el.wikisource.org) through the MediaWiki parse API. The
// pre-0 Greek territory on Wikisource (the corpus already held Homer, the
// tragedians, Herodotus, Thucydides, Plato, Aristotle) was the surface; this
// fills the canonical holes inside it.
//
//   node scripts/fetch-greek-bce.mjs
//   node scripts/fetch-greek-bce.mjs --only hesiod-theogony,lxx-genesis

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'greek-originals');
const API = 'https://el.wikisource.org/w/api.php';

const WORKS = [
  // Hesiod — Theogony and Works and Days (c. 700 BCE)
  { slug: 'hesiod-theogony', title: 'Ἡσίοδος, Θεογονία (Theogony, Ancient Greek)', page: 'Θεογονία' },
  { slug: 'hesiod-works-and-days', title: 'Ἡσίοδος, Ἔργα καὶ Ἡμέραι (Works and Days, Ancient Greek)', page: 'Έργα και ημέραι' },

  // Homeric Hymns — one short hymn per page; aggregated into the corpus the
  // way Sappho's fragments are, so the collection clears the 600-word floor
  // while every hymn is preserved whole.
  { slug: 'homeric-hymns', title: 'Ὁμηρικοὶ Ὕμνοι (Homeric Hymns, Ancient Greek)', prefix: 'Ομηρικοί Ύμνοι/' },

  // Xenophon — Anabasis, 7 books (c. 370 BCE)
  { slug: 'xenophon-anabasis', title: 'Ξενοφῶν, Κύρου Ἀνάβασις (Anabasis, Ancient Greek)', prefix: 'Κύρου Ανάβασις/' },

  // Euclid — Elements, the 13-book pre-0 math canon (c. 300 BCE)
  { slug: 'euclid-elements', title: 'Εὐκλείδης, Στοιχεῖα (Elements, Ancient Greek)', prefix: 'Στοιχεία/' },

  // Septuagint (Rahlfs) — the Greek Old Testament, 3rd–1st c. BCE. Slugs are
  // derived BY LIVE ENUMERATION of Wikisource's own category
  // "Παλαιά Διαθήκη (Rahlfs)" at fetch time (see main()), never typed from
  // memory — the first version of this list typed book names by hand and got
  // matches wrong (LP1: a label is not a source). The Psalms are per-psalm
  // subpages and aggregate into one document.
];

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(params, retries = 4) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'live_priors corpus builder (educational corpus)' } });
      if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(2000);
  }
  return null;
}

async function parsePage(page) {
  const data = await apiGet({ action: 'parse', page, prop: 'text', redirects: '1' });
  const html = data?.parse?.text?.['*'];
  if (!html) {
    // one more patient pass — Wikisource rate-limits the parse action hard
    for (let i = 0; i < 4; i++) {
      await sleep(12000 * (i + 1));
      const again = await apiGet({ action: 'parse', page, prop: 'text', redirects: '1' });
      if (again?.parse?.text?.['*']) return cleanHtml(again.parse.text['*']) || null;
    }
    return null;
  }
  const text = cleanHtml(html);
  return text.length ? text : null;
}

async function subpages(prefix) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const data = await apiGet({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
    if (data) return (data.query?.allpages || []).map(p => p.title);
    await sleep(8000 * (attempt + 1));
  }
  return null;
}

async function pull(work, manifest) {
  const existing = path.join(OUT, `${work.slug}.txt`);
  if (fs.existsSync(existing)) {
    const words = wordsIn(`---\ntitle: ${work.title}\n---\n\n` + fs.readFileSync(existing, 'utf8'));
    manifest.pulled.push({ slug: work.slug, title: work.title, words, reused: true, file: path.relative(ROOT, existing) });
    console.log(`  ${work.slug}... reused (${words} words)`);
    return;
  }
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.page) {
    const t = await parsePage(work.page);
    if (t) parts = [{ title: work.page, text: t }];
    else {
      console.log(`PAGE MISSING`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'page_missing', page: work.page });
      return;
    }
    await sleep(600);
  } else {
    const titles = await subpages(work.prefix);
    if (!titles) {
      console.log(`RATE-LIMITED, skipping`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'rate_limited', prefix: work.prefix });
      return;
    }
    if (!titles.length) {
      console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
      return;
    }
    for (const title of titles) {
      const t = await parsePage(title);
      if (t) parts.push({ title, text: t });
      await sleep(450);
    }
  }

  const body = parts.map(p => `${p.title}\n\n${p.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(body);
  if (!parts.length || words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const sourceRef = (work.page ? [work.page] : [work.prefix])
    .map(p => `https://el.wikisource.org/wiki/${encodeURIComponent(p)}`).join(' ');
  const header = [
    '---',
    `title: ${work.title}`,
    'collection: 11-multi-language/greek-originals',
    'era: pre-0 (BCE, Septuagint 3rd–1st c. BCE)',
    `source: Greek Wikisource (el.wikisource.org)`,
    `source_url: ${sourceRef}`,
    'format: Ancient Greek (polytonic)',
    'license: public domain',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} parts)`);
}

/** The Septuagint books, enumerated LIVE from Wikisource's own Rahlfs
 *  category — never typed from memory. Books whose page name is the whole
 *  book (e.g. "Γένεσις (Rahlfs)") become page-fetches; "Ψαλμοί του Δαβίδ
 *  (Rahlfs)" aggregates its per-psalm subpages. */
async function enumerateSeptuagint() {
  const CAT = 'Παλαιά Διαθήκη (Rahlfs)';
  const pages = [];
  let next = null;
  for (let pass = 0; pass < 3; pass++) {
    const params = {
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: `Category:${CAT}`,
      cmtype: 'page',
      cmlimit: '500',
    };
    if (next) params.cmcontinue = next;
    const data = await apiGet(params);
    if (!data) break;
    pages.push(...(data.query?.categorymembers || []).map(m => m.title));
    next = data.continue?.['cmcontinue'] ?? null;
    if (!next) break;
    await sleep(3000);
  }
  const slugify = t => t
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['ʼ]/g, '')
    .replace(/Α|Ά|Ἀ|Ἁ/gi, '')
    // map the LXX Greek names to canonical English book slugs
    .replace('Γένεσις (Rahlfs)', 'g')
    .replace('Έξοδος (Rahlfs)', 'g')
    .replace('Λευιτικόν (Rahlfs)', 'g');
  const slugMap = {
    'Γένεσις (Rahlfs)': 'genesis',
    'Έξοδος (Rahlfs)': 'exodus',
    'Λευιτικόν (Rahlfs)': 'leviticus',
    'Αριθμοί (Rahlfs)': 'numbers',
    'Δευτερονόμιον (Rahlfs)': 'deuteronomy',
    'Ιησούς του Ναυή (Αλεξανδρινός Κώδικας) (Rahlfs)': 'joshua-alexandrinus',
    'Ιησούς του Ναυή (Βατικανός Κώδικας) (Rahlfs)': 'joshua-vaticanus',
    'Κριταί (Αλεξανδρινός Κώδικας) (Rahlfs)': 'judges-alexandrinus',
    'Κριταί (Βατικανός Κώδικας) (Rahlfs)': 'judges-vaticanus',
    'Ρουθ (Rahlfs)': 'ruth',
    'Βασιλειών Α\' (Rahlfs)': '1basileion',
    'Βασιλειών Β\' (Rahlfs)': '2basileion',
    'Βασιλειών Γ\' (Rahlfs)': '1basileion',
    'Βασιλειών Δ\' (Rahlfs)': '2basileion',
    'Παραλειπομένων Α\' (Rahlfs)': '1paraleipomena',
    'Παραλειπομένων Β\' (Rahlfs)': '2paraleipomena',
    'Έσδρας Α\' (Rahlfs)': '1esdras',
    'Έσδρας Β\' (Rahlfs)': '2esdras',
    'Εσθήρ (Rahlfs)': 'esther',
    'Ιουδίθ (Rahlfs)': 'judith',
    'Τωβίας (Βατικανός και Αλεξανδρινός Κώδικες) (Rahlfs)': 'tobit',
    'Τωβίας (Σιναΐτικος Κώδικας) (Rahlfs)': 'tobit-sinaiticus',
    'Μακκαβαίων Α\' (Rahlfs)': '1maccabees',
    'Μακκαβαίων Β\' (Rahlfs)': '2maccabees',
    'Μακκαβαίων Γ\' (Rahlfs)': '3maccabees',
    'Μακκαβαίων Δ\' (Rahlfs)': '4maccabees',
    'Ψαλμοί του Δαβίδ (Rahlfs)': 'psalms',
    'Ψαλμοί του Δαυίδ (Rahlfs)': 'psalms-tav',
    'Ψαλμοί τω Δαυίδ (Rahlfs)': 'psalms-b',
    'Ψαλμοί Σαλωμώντος (Rahlfs)': 'psalms-solomon',
    'Ωδαί (Rahlfs)': 'odae',
    'Παροιμίαι (Rahlfs)': 'proverbs',
    'Εκκλησιαστής (Rahlfs)': 'ecclesiastes',
    'Άσμα Ασμάτων (Rahlfs)': 'song-of-songs',
    'Ιώβ (Rahlfs)': 'job',
    'Σοφία Σαλωμώντος (Rahlfs)': 'wisdom',
    'Σοφία Σιράχ (Rahlfs)': 'sirach',
    'Ωσηέ (Rahlfs)': 'hosea',
    'Αμώς (Rahlfs)': 'amos',
    'Μιχαίας (Rahlfs)': 'micah',
    'Ιωήλ (Rahlfs)': 'joel',
    'Αβδίας (Rahlfs)': 'obadiah',
    'Ιωνάς (Rahlfs)': 'jonah',
    'Ναούμ (Rahlfs)': 'nahum',
    'Αμβακούμ (Rahlfs)': 'habakkuk',
    'Σοφονίας (Rahlfs)': 'zephaniah',
    'Αγγαίος (Rahlfs)': 'haggai',
    'Ζαχαρίας (Rahlfs)': 'zechariah',
    'Μαλαχίας (Rahlfs)': 'malachi',
    'Ησαΐας (Rahlfs)': 'isaiah',
    'Ιερεμίας (Rahlfs)': 'jeremiah',
    'Θρήνοι Ιερεμίου (Rahlfs)': 'lamentations',
    'Επιστολή Ιερεμίου (Rahlfs)': 'epistle-jeremiah',
    'Ιεζεκιήλ (Rahlfs)': 'ezekiel',
    'Δανιήλ (Ο\') (Rahlfs)': 'daniel-o',
    'Δανιήλ (Θεοδοτίων) (Rahlfs)': 'daniel-theodotion',
    'Σουσάννα (Ο\') (Rahlfs)': 'susanna-o',
    'Σουσάννα (Θεοδοτίων) (Rahlfs)': 'susanna-theodotion',
    'Βηλ και Δράκων (Ο\') (Rahlfs)': 'bel-o',
    'Βηλ και Δράκων (Θεοδοτίων) (Rahlfs)': 'bel-theodotion',
    'Βαρούχ (Rahlfs)': 'baruch',
  };
  const works = [];
  for (const title of pages) {
    const slug = slugMap[title];
    if (!slug) continue;
    if (title === 'Ψαλμοί του Δαβίδ (Rahlfs)') {
      works.push({ slug: 'lxx-psalms', title: 'Ψαλμοὶ (Septuagint, Rahlfs)', prefix: title, era: 'pre-0 (BCE, Septuagint 3rd–1st c. BCE)' });
    } else {
      works.push({ slug: `lxx-${slug}`, title: `${title} (Septuagint, Rahlfs)`, page: title, era: 'pre-0 (BCE, Septuagint 3rd–1st c. BCE)' });
    }
  }
  return works;
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Greek BCE Fetcher (el.wikisource.org) ===\n');
  const manifest = {
    source: 'Greek Wikisource (el.wikisource.org) via the MediaWiki parse API',
    era: 'pre-0 (BCE, incl. Septuagint Rahlfs 3rd–1st c. BCE)',
    license: 'Public domain',
    format: 'Ancient Greek, polytonic',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  const works = [...WORKS, ...(await enumerateSeptuagint())];

  for (const w of works) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'greek-bce-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);