#!/usr/bin/env node
// fetch-archon-originals.mjs — pull the ARCHON COMPENDIUM's source works into
// the corpus, in the ACTUAL MODALITY OF THE SOURCES: each work in its original
// language, read through each language's own Wikisource (MediaWiki parse API)
// or GRETIL / Gutenberg plaintext — never an English translation standing in
// for the source. This is the source half of the compendium (eoreader7's
// native/organs/archon-compendium.js): where a compendium entry quotes a
// public-domain archon, that archon's OWN bytes now sit beside it, so the
// credit line points at real corpus addresses rather than a bare citation.
//
// User direction (2026-09-15): "get all that we can" for the compendium's
// missing PD works, "in the actual modality of the sources". The FILM and
// AUDIO archons (Eastwood, Kubrick, Murch, Terry Gross) are deliberately NOT
// pulled — their modality is film/radio, which the corpus does not hold as
// original text; that is named future work, not silently absent. Modern
// archons whose works are still under copyright (Wigmore, Meyer, Shklovsky,
// Clark, Roberts, Partee, Berge, Tarski, Koopman, Hubel, Koestler, Vonnegut,
// Saltzer, Popper, Goffman, Levinas, Bourdieu) are FAIR-USE ONLY: the
// compendium carries a short credited phrase, and the corpus correctly does
// NOT hold their full texts. Ancient and pre-1929 works are public domain and
// ARE pulled here.
//
//   node scripts/fetch-archon-originals.mjs
//
// Each site is one block; a work is either a single page (`page`) or a run of
// subpages (`prefix`, enumerated live with list=allpages and concatenated).
// Output lands in the existing `11-multi-language/<lang>-originals/` dirs (a
// new `chinese-originals/`, `french-originals/`, `german-originals/` join the
// greek/latin/arabic/sanskrit ones already there). The 600-word floor and the
// provenance frontmatter follow the arabic-originals fetcher exactly.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UA = 'live_priors corpus builder (educational corpus)';

// ── Chinese Wikisource (zh.wikisource.org) — new chinese-originals dir ────
const ZH = {
  key: 'chinese', api: 'https://zh.wikisource.org/w/api.php', format: 'Literary Chinese',
  dir: path.join(ROOT, '11-multi-language', 'chinese-originals'),
  works: [
    // Sima Qian — Shiji (Records of the Grand Historian), c. 94 BCE. The bare
    // prefix '史記' (no trailing slash) string-matches other editors' entire
    // separate editions (史記三家註, 史記正義, 史記集解, 史記索隱) as well as the
    // base text's own subpages — the slash scopes it to just 史記/卷NNN etc.
    { slug: 'shiji', title: '司馬遷，史記 (Sima Qian, Records of the Grand Historian)', prefix: '史記/' },
    // Mozi — the Mohist canon, 4th–3rd c. BCE. Same trailing-slash fix: bare
    // '墨子' also matches the 四部叢刊本/四庫全書本 scan editions and the Qing
    // commentary 墨子閒詁.
    { slug: 'mozi', title: '墨子 (Mozi)', prefix: '墨子/' },
    // Xunzi — the Confucian philosopher of the rectification of names
    { slug: 'xunzi', title: '荀子 (Xunzi)', prefix: '荀子/' },
    // Xu Shen — Shuowen Jiezi, the first dictionary, c. 100 CE
    { slug: 'shuowen-jiezi', title: '許慎，說文解字 (Xu Shen, Shuowen Jiezi)', prefix: '說文解字/' },
    // Li Shizhen — Bencao Gangmu, the compendium of materia medica, 1578.
    // Slash-scoped to the one base-text edition; the 四庫全書本 scan edition,
    // 本草綱目拾遺 (a different, later supplement) and 本草綱目別名錄 (an index)
    // are separate root titles the slash now excludes.
    { slug: 'bencao-gangmu', title: '李時珍，本草綱目 (Li Shizhen, Bencao Gangmu)', prefix: '本草綱目/' },
    // Liu Hui's 3rd-c. commentary edition of the Nine Chapters — the 四部叢刊本
    // scan, named explicitly so it can't also catch unrelated pages that merely
    // start with the same four characters.
    { slug: 'jiuzhang-suanshu', title: '九章算術 (Nine Chapters on the Mathematical Art)', prefix: '九章算術 (四部叢刊本)/' },
    // Dai Zhen — the evidential-research (kaozheng) scholar, 18th c. Targeted
    // directly at his central work rather than a name-prefix: his Collected
    // Works (四部叢刊本) are mostly untranscribed page shells on Wikisource, and
    // a bare '戴震' prefix pulls those empty stubs in alongside the real text.
    { slug: 'dai-zhen', title: '戴震，孟子字義疏證 (Dai Zhen, An Evidential Commentary on the Meaning of Terms in the Mencius)', page: '孟子字義疏證' },
  ],
};

// ── Arabic Wikisource (ar.wikisource.org) ──────────────────────────────────
const AR = {
  key: 'arabic', api: 'https://ar.wikisource.org/w/api.php', format: 'Classical Arabic',
  dir: path.join(ROOT, '11-multi-language', 'arabic-originals'),
  works: [
    // Ibn al-Nadim — Kitab al-Fihrist, the addressed catalogue, 987 CE
    { slug: 'ibn-al-nadim-fihrist', title: 'ابن النديم، الفهرست (Ibn al-Nadim, The Fihrist)', prefix: 'الفهرست/' },
    // Ibn al-Haytham (Alhazen) — Kitab al-Manazir, the Book of Optics, 11th c.
    // The work's real title on ar.wikisource is كتاب المناظر ("Book of..."); a
    // prefix of just المناظر ("...Optics") drops the first word and instead
    // string-matches المناظرة ("the debate") pages — an unrelated word that
    // merely starts with the same letters — while missing the real chapters
    // entirely (the 8 "parts" the old prefix pulled were tiny redirect stubs
    // that only resolved to real text because the API followed the redirect).
    { slug: 'ibn-al-haytham-manazir', title: 'ابن الهيثم، كتاب المناظر (Ibn al-Haytham, Book of Optics)', prefix: 'كتاب المناظر' },
    // al-Bukhari — Sahih al-Bukhari, the canonical hadith collection, 9th c.
    { slug: 'sahih-al-bukhari', title: 'البخاري، صحيح البخاري (al-Bukhari, Sahih)', prefix: 'صحيح البخاري/' },
    // Scheherazade — One Thousand and One Nights (the Arabic Nights)
    { slug: 'alf-layla-wa-layla', title: 'ألف ليلة وليلة (One Thousand and One Nights)', prefix: 'ألف ليلة وليلة/' },
  ],
};

// ── Greek Wikisource (el.wikisource.org) ───────────────────────────────────
const EL = {
  key: 'greek', api: 'https://el.wikisource.org/w/api.php', format: 'Ancient Greek',
  dir: path.join(ROOT, '11-multi-language', 'greek-originals'),
  works: [
    // Dionysius Thrax — Tekhne Grammatike, the first systematic grammar
    { slug: 'thrax-tekhne-grammatike', title: 'Διονύσιος ὁ Θρᾷξ, Τέχνη Γραμματική (Dionysius Thrax, The Art of Grammar)', page: 'Τέχνη Γραμματική' },
    // Solon's own elegies survive only as scattered quotations in later authors
    // (Plutarch, Diogenes Laërtius, the Athenaion Politeia) — no Wikisource
    // page assembles them alone. This is Plutarch's Life of Solon, which does
    // quote a good number of Solon's actual verses verbatim; renamed and
    // re-attributed to Plutarch as the immediate source rather than mislabeled
    // as Solon's own text (LP1: the source is never replaced by a reading).
    { slug: 'plutarch-life-of-solon', title: "Πλούταρχος, Βίοι Παράλληλοι/Σόλων (Plutarch, Life of Solon — quotes Solon's own verses)", page: 'Βίοι Παράλληλοι/Σόλων' },
  ],
};

// ── Latin Wikisource (la.wikisource.org) ───────────────────────────────────
const LA = {
  key: 'latin', api: 'https://la.wikisource.org/w/api.php', format: 'Latin',
  dir: path.join(ROOT, '11-multi-language', 'latin-originals'),
  works: [
    // Martial — the Epigrams, the anti-plagiarism archon's own work. A bare
    // 'Epigrammata' prefix string-matches every other poet's own Epigrammata
    // page (Ausonius, Ennius, Damasus, Cyprianus, …) — 19 unrelated root pages
    // were slipping in alongside Martial's own 14 books; the full disambiguated
    // title scopes it to just his.
    { slug: 'martial-epigrammata', title: 'M. Valerius Martialis, Epigrammata (Martial, Epigrams)', prefix: 'Epigrammata (Martialis)/' },
    // The Liber de Spectaculis (on the games) is catalogued under its own
    // title, separate from the numbered books above.
    { slug: 'martial-liber-spectaculorum', title: 'M. Valerius Martialis, Liber spectaculorum (Martial, On the Games)', page: 'Liber spectaculorum (Epigrammaton liber)' },
  ],
};

// ── French Wikisource (fr.wikisource.org) — new french-originals dir ───────
const FR = {
  key: 'french', api: 'https://fr.wikisource.org/w/api.php', format: 'French',
  dir: path.join(ROOT, '11-multi-language', 'french-originals'),
  works: [
    // Brillat-Savarin — Physiologie du goût, 1825
    { slug: 'brillat-savarin-physiologie-du-gout', title: 'Brillat-Savarin, Physiologie du goût (The Physiology of Taste)', prefix: 'Physiologie du goût/' },
  ],
};

// ── German Wikisource (de.wikisource.org) — new german-originals dir ───────
const DE = {
  key: 'german', api: 'https://de.wikisource.org/w/api.php', format: 'German',
  dir: path.join(ROOT, '11-multi-language', 'german-originals'),
  works: [
    // Frege — Begriffsschrift (1879) is not transcribed on de.wikisource at
    // all (confirmed missingtitle, not a fetch failure), and neither is Über
    // Sinn und Bedeutung or Die Grundlagen der Arithmetik. Ueber Begriff und
    // Gegenstand (1892) is the one Frege essay that IS there — same concern
    // (what a name refers to; the concept/object distinction underlies both
    // scoped-kind.js and aliases.js) — named for what it actually is rather
    // than left pointing at a page that doesn't exist.
    { slug: 'frege-ueber-begriff-und-gegenstand', title: 'Gottlob Frege, Ueber Begriff und Gegenstand (1892)', page: 'Ueber Begriff und Gegenstand' },
  ],
};

const SITES = [ZH, AR, EL, LA, FR, DE];

function cleanHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection|mw-pt-)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(api, params, retries = 6) {
  const url = `${api}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await sleep(9000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
      const t = await res.text();
      if (!t.trim().startsWith('{')) { await sleep(4000); continue; }
    } catch { /* retry */ }
    await sleep(2500);
  }
  return null;
}

async function parsePage(api, page) {
  const data = await apiGet(api, { action: 'parse', page, prop: 'text', redirects: '1' });
  const html = data?.parse?.text?.['*'];
  if (!html) return null;
  const text = cleanHtml(html);
  return text.length ? text : null;
}

async function subpages(api, prefix) {
  // Paginated: a work with more than 500 subpages (Shiji sits right at the
  // edge) would otherwise be silently truncated with no warning.
  const out = [];
  let params = { action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' };
  for (;;) {
    const data = await apiGet(api, params);
    if (!data) break;
    out.push(...(data.query?.allpages || []).map(p => p.title));
    if (!data.continue) break;
    params = { ...params, ...data.continue };
    await sleep(300);
  }
  return out.sort();
}

async function pull(site, work, manifest) {
  process.stdout.write(`  ${site.key}/${work.slug}... `);
  let parts = [];
  if (work.page) {
    const t = await parsePage(site.api, work.page);
    if (t) parts = [{ title: work.page, text: t }];
    await sleep(900);
  } else {
    const skip = new Set(work.skip ?? []);
    const all = await subpages(site.api, work.prefix);
    const titles = all.filter(t => !skip.has(t));
    if (!titles.length) {
      const t = await parsePage(site.api, work.prefix.replace(/\/$/, ''));
      if (t) { parts = [{ title: work.prefix.replace(/\/$/, ''), text: t }]; }
      else {
        console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
        manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
        return;
      }
    } else {
      for (const title of titles) {
        const t = await parsePage(site.api, title);
        if (t) parts.push({ title, text: t });
        await sleep(800);
      }
    }
  }

  // Some titles resolve (after redirects) to identical text — a subpage that
  // is itself just a redirect stub, or two names for the same page. Dedupe by
  // content rather than hand-maintaining a skip list per work.
  const byHash = new Map();
  const deduped = [];
  for (const p of parts) {
    const h = crypto.createHash('sha1').update(p.text.trim()).digest('hex');
    if (byHash.has(h)) {
      console.log(`    (skip "${p.title}" — identical to "${byHash.get(h)}")`);
      continue;
    }
    byHash.set(h, p.title);
    deduped.push(p);
  }
  parts = deduped;

  const body = parts.map(p => `${p.title}\n\n${p.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(body);
  if (!parts.length || words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(site.dir, { recursive: true });
  const file = path.join(site.dir, `${work.slug}.txt`);
  const sourceRef = work.page
    ? `https://${site.api.replace('https://', '').replace('/w/api.php', '')}/wiki/${encodeURIComponent(work.page)}`
    : `https://${site.api.replace('https://', '').replace('/w/api.php', '')}/wiki/${encodeURIComponent(work.prefix)}`;
  const header = [
    '---',
    `title: ${work.title}`,
    `collection: 11-multi-language/${site.key}-originals`,
    `source: ${work.page ? 'Wikisource page' : 'Wikisource subpages'} (${site.api.replace('/w/api.php', '')})`,
    `source_url: ${sourceRef}`,
    `format: ${site.format}`,
    `license: public domain`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} part${parts.length > 1 ? 's' : ''})`);
}

// ── GRETIL Sanskrit (public-domain IAST plaintext) ─────────────────────────
const GRETIL = 'https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext';
const GRETIL_DIR = path.join(ROOT, '11-multi-language', 'sanskrit-originals');
const GRETIL_WORKS = [
  // Nagarjuna — Mulamadhyamakakarika (Fundamental Verses on the Middle Way)
  { slug: 'nagarjuna-mulamadhyamakakarika', title: 'नागार्जुन, मूलमध्यमककारिका (Nāgārjuna, Mūlamadhyamakakārikā)', url: `${GRETIL}/sa_nAgArjuna-mUlamadhyamakakArikA.txt` },
  // Panini — Ashtadhyayi, the complete grammar of Sanskrit
  { slug: 'panini-ashtadhyayi', title: 'पाणिनि, अष्टाध्यायी (Pāṇini, Aṣṭādhyāyī)', url: `${GRETIL}/sa_pANini-aSTAdhyAyI.txt` },
  // Jaimini — Mimamsa Sutras, the systematizer of obligation
  { slug: 'jaimini-mimamsa-sutra', title: 'जैमिनि, मीमांसासूत्र (Jaimini, Mīmāṃsāsūtra)', url: `${GRETIL}/sa_jaimini-mImAMsAsUtra.txt` },
  // Bharata — Natyasastra, the treatise on dramaturgy and rasa
  { slug: 'bharata-natyasastra', title: 'भरत, नाट्यशास्त्र (Bharata, Nāṭyaśāstra)', url: `${GRETIL}/sa_bharata-nATyazAstra-1-1618-303335-37.txt` },
  // Brahmagupta — Brahmasphutasiddhanta, 628 CE (the rules of zero)
  { slug: 'brahmagupta-brahmasphutasiddhanta', title: 'ब्रह्मगुप्त, ब्राह्मस्फुटसिद्धान्त (Brahmagupta, Brāhmasphuṭasiddhānta)', url: `${GRETIL}/sa_brahmagupta-brAhmasphuTasiddhAnta.txt` },
];

async function pullGretil(work, manifest) {
  process.stdout.write(`  sanskrit/${work.slug}... `);
  try {
    const res = await fetch(work.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log(`HTTP ${res.status}`); manifest.rejected.push({ slug: work.slug, title: work.title, reason: `http_${res.status}` }); return; }
    let text = await res.text();
    // GRETIL documents carry a header and a `# Text` marker where the text begins.
    const marker = text.indexOf('# Text');
    if (marker >= 0) text = text.slice(marker + 6);
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/^\s*[-=]{4,}\s*$/gm, '')
      .trim();
    const words = wordsIn(text);
    if (words < 600) { console.log(`too short (${words} words)`); manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words }); return; }
    fs.mkdirSync(GRETIL_DIR, { recursive: true });
    const file = path.join(GRETIL_DIR, `${work.slug}.txt`);
    const header = [
      '---',
      `title: ${work.title}`,
      `collection: 11-multi-language/sanskrit-originals`,
      `source: GRETIL (Göttingen Register of Electronic Texts in Indian Languages)`,
      `source_url: ${work.url}`,
      `format: Sanskrit (IAST transliteration)`,
      `license: public domain (original); electronic text under GRETIL's own terms`,
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(file, header + text + '\n', 'utf8');
    manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: 1, file: path.relative(ROOT, file) });
    console.log(`ok (${words} words)`);
  } catch (e) {
    console.log(`ERROR ${e.message}`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: e.message });
  }
}

// ── Gutenberg (English PD) — Strunk, The Elements of Style 1918 ────────────
async function pullGutenbergStrunk(manifest) {
  process.stdout.write('  english/strunk-elements-of-style... ');
  const url = 'https://www.gutenberg.org/cache/epub/37134/pg37134.txt';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log(`HTTP ${res.status}`); manifest.rejected.push({ slug: 'strunk-elements-of-style', title: 'The Elements of Style', reason: `http_${res.status}` }); return; }
    let text = await res.text();
    let start = text.indexOf('*** START OF');
    if (start === -1) start = text.indexOf('*END THE SMALL PRINT');
    if (start !== -1) { const nl = text.indexOf('\n', start); if (nl !== -1) text = text.slice(nl + 1); }
    let end = text.indexOf('*** END OF');
    if (end !== -1) text = text.slice(0, end);
    const words = wordsIn(text);
    if (words < 600) { console.log(`too short (${words} words)`); manifest.rejected.push({ slug: 'strunk-elements-of-style', title: 'The Elements of Style', reason: 'under_600_words', words }); return; }
    const dir = path.join(ROOT, '01-literature-books', 'gutenberg');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'pg37134_The_Elements_of_Style.txt');
    const header = [
      '---',
      `title: William Strunk Jr., The Elements of Style (1918)`,
      `collection: 01-literature-books/gutenberg`,
      `source: Project Gutenberg`,
      `source_url: https://www.gutenberg.org/ebooks/37134`,
      `format: English`,
      `license: public domain (US, pre-1929)`,
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(file, header + text.trim() + '\n', 'utf8');
    manifest.pulled.push({ slug: 'strunk-elements-of-style', title: 'The Elements of Style (1918)', words, parts: 1, file: path.relative(ROOT, file) });
    console.log(`ok (${words} words)`);
  } catch (e) {
    console.log(`ERROR ${e.message}`);
    manifest.rejected.push({ slug: 'strunk-elements-of-style', title: 'The Elements of Style', reason: e.message });
  }
}

async function main() {
  // Resumable: --only <siteKey>/<slug> pulls a single work so a rate-limit
  // stall on one giant work (Shiji's 500 subpages) never blocks the rest.
  // Site keys: chinese, arabic, greek, latin, french, german, sanskrit,
  // english. E.g. `--only arabic/sahih-al-bukhari` or `--only sanskrit/panini-ashtadhyayi`.
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const only = onlyArg ? { site: onlyArg.split('/')[0], slug: onlyArg.split('/')[1] } : null;

  console.log('=== Archon Originals Fetcher (the compendium\'s sources, in their own languages) ===\n');
  const manifest = {
    source: 'Wikisource (zh/ar/el/la/fr/de) + GRETIL + Project Gutenberg',
    license: 'public domain originals (pre-1929 / ancient); fair-use archons are NOT fetched (short credited phrases only)',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  const want = (site, slug) => !only || (site === only.site && slug === only.slug);

  for (const site of SITES) {
    console.log(`\n-- ${site.key} Wikisource --`);
    for (const w of site.works) if (want(site.key, w.slug)) await pull(site, w, manifest);
  }

  console.log('\n-- GRETIL Sanskrit --');
  for (const w of GRETIL_WORKS) if (want('sanskrit', w.slug)) await pullGretil(w, manifest);

  console.log('\n-- Project Gutenberg --');
  if (!only || (only.site === 'english' && only.slug === 'strunk-elements-of-style')) await pullGutenbergStrunk(manifest);

  // A --only run covers one work; merge into whatever the manifest already
  // recorded (by slug) instead of clobbering every other run's history.
  const manifestFile = path.join(ROOT, 'manifests', 'archon-originals-manifest.json');
  let prior = { pulled: [], rejected: [] };
  try { prior = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* first run */ }
  const mergeBySlug = (older, newer) => {
    const bySlug = new Map(older.map(e => [e.slug, e]));
    for (const e of newer) bySlug.set(e.slug, e);
    return [...bySlug.values()];
  };
  const merged = {
    ...manifest,
    pulled: mergeBySlug(prior.pulled ?? [], manifest.pulled),
    rejected: mergeBySlug(prior.rejected ?? [], manifest.rejected).filter(
      r => !manifest.pulled.some(p => p.slug === r.slug)
    ),
  };
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected this run (${merged.pulled.length} total pulled across all runs) ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);