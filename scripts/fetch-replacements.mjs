#!/usr/bin/env node
// Replacements for the priors removed by the 600-word floor.
//
// The pruned documents were fragments of things that exist in full: single
// verses instead of books, paper abstracts instead of papers, one-chapter
// excerpts instead of works. Where the full text is reachable, this fetcher
// pulls it, so each category ends up with fewer, longer, more complete priors
// rather than simply fewer priors.
//
//   node scripts/fetch-replacements.mjs                 # everything
//   node scripts/fetch-replacements.mjs --only scripture,literature
//
// Sections:
//   scripture   whole books of the Tanakh, Greek NT, Qur'an and Pali canon
//   literature  complete public-domain works (Project Gutenberg via GITenberg)
//   academic    open-licensed scholarly books, chapter by chapter
//   code-docs   substantive documentation from the mirrored source repositories
//
// Everything here is public domain or openly licensed; the licence is recorded
// per section in manifests/replacements-manifest.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get, getBounded, mapPool, wordsIn, MIN_WORDS, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'replacements-manifest.json');
const RAW = 'https://raw.githubusercontent.com';
const CONCURRENCY = 12;

function writeDoc(relDir, name, text) {
  const words = wordsIn(text);
  if (words < MIN_WORDS) return null;
  const dir = path.join(ROOT, relDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, text, 'utf8');
  return { file: path.relative(ROOT, file), words, chars: text.length };
}

function report(label, kept, attempted) {
  console.log(`  ${label.padEnd(34)} ${String(kept).padStart(4)} kept / ${attempted} fetched`);
}

// ------------------------------------------------------------------ scripture

// Westminster Leningrad Codex, book by book. The corpus previously held Sefaria
// section extracts of a few dozen words each.
const TANAKH_BOOKS = [
  ['Gen', 'Genesis'], ['Exod', 'Exodus'], ['Lev', 'Leviticus'], ['Num', 'Numbers'],
  ['Deut', 'Deuteronomy'], ['Josh', 'Joshua'], ['Judg', 'Judges'], ['Ruth', 'Ruth'],
  ['1Sam', '1 Samuel'], ['2Sam', '2 Samuel'], ['1Kgs', '1 Kings'], ['2Kgs', '2 Kings'],
  ['1Chr', '1 Chronicles'], ['2Chr', '2 Chronicles'], ['Ezra', 'Ezra'], ['Neh', 'Nehemiah'],
  ['Esth', 'Esther'], ['Job', 'Job'], ['Ps', 'Psalms'], ['Prov', 'Proverbs'],
  ['Eccl', 'Ecclesiastes'], ['Song', 'Song of Songs'], ['Isa', 'Isaiah'], ['Jer', 'Jeremiah'],
  ['Lam', 'Lamentations'], ['Ezek', 'Ezekiel'], ['Dan', 'Daniel'], ['Hos', 'Hosea'],
  ['Joel', 'Joel'], ['Amos', 'Amos'], ['Obad', 'Obadiah'], ['Jonah', 'Jonah'],
  ['Mic', 'Micah'], ['Nah', 'Nahum'], ['Hab', 'Habakkuk'], ['Zeph', 'Zephaniah'],
  ['Hag', 'Haggai'], ['Zech', 'Zechariah'], ['Mal', 'Malachi'],
];

// MorphGNT file stems: canonical order, 61 (Matthew) through 87 (Revelation).
const GNT_BOOKS = [
  ['61-Mt', 'Matthew'], ['62-Mk', 'Mark'], ['63-Lk', 'Luke'], ['64-Jn', 'John'],
  ['65-Ac', 'Acts'], ['66-Ro', 'Romans'], ['67-1Co', '1 Corinthians'], ['68-2Co', '2 Corinthians'],
  ['69-Ga', 'Galatians'], ['70-Eph', 'Ephesians'], ['71-Php', 'Philippians'], ['72-Col', 'Colossians'],
  ['73-1Th', '1 Thessalonians'], ['74-2Th', '2 Thessalonians'], ['75-1Ti', '1 Timothy'],
  ['76-2Ti', '2 Timothy'], ['77-Tit', 'Titus'], ['78-Phm', 'Philemon'], ['79-Heb', 'Hebrews'],
  ['80-Jas', 'James'], ['81-1Pe', '1 Peter'], ['82-2Pe', '2 Peter'], ['83-1Jn', '1 John'],
  ['84-2Jn', '2 John'], ['85-3Jn', '3 John'], ['86-Jud', 'Jude'], ['87-Re', 'Revelation'],
];

async function fetchTanakh() {
  const docs = await mapPool(TANAKH_BOOKS, CONCURRENCY, async ([abbr, name]) => {
    const xml = await get(`${RAW}/openscriptures/morphhb/master/wlc/${abbr}.xml`);
    if (!xml) return null;
    // OSIS marks each verse with osisID="Book.Chapter.Verse"; <w> elements hold
    // the pointed consonantal text with morphology slashes to drop.
    const verses = [];
    const re = /<verse osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g;
    let m;
    while ((m = re.exec(xml))) {
      const words = [...m[2].matchAll(/<w[^>]*>([\s\S]*?)<\/w>/g)].map(w =>
        w[1].replace(/<[^>]+>/g, '').replace(/\//g, '').trim(),
      );
      if (words.length) verses.push(`${m[1]} ${words.join(' ')}`);
    }
    if (!verses.length) return null;
    const text =
      `${name} (${abbr})\nWestminster Leningrad Codex — Hebrew Bible\n` +
      `Source: Open Scriptures Hebrew Bible (openscriptures/morphhb)\n` +
      `Rights: public domain\n\n${verses.join('\n')}\n`;
    const saved = writeDoc('14-holy-texts/wlc-tanakh', `${abbr}.txt`, text);
    return saved && { book: name, abbr, ...saved };
  });
  const kept = docs.filter(Boolean);
  report('Tanakh (WLC, whole books)', kept.length, TANAKH_BOOKS.length);
  return {
    collection: 'Westminster Leningrad Codex',
    institution: 'Open Scriptures / Westminster Hebrew Institute',
    licence: 'Public domain',
    documents: kept,
  };
}

async function fetchGreekNT() {
  const docs = await mapPool(GNT_BOOKS, CONCURRENCY, async ([stem, name]) => {
    const raw = await get(`${RAW}/morphgnt/sblgnt/master/${stem}-morphgnt.txt`);
    if (!raw) return null;
    // Columns: book/chapter/verse, part of speech, parsing, word (with
    // punctuation), word (bare), normalised, lemma. Column 4 is running text.
    const byVerse = new Map();
    for (const line of raw.split('\n')) {
      const cols = line.split(' ');
      if (cols.length < 5) continue;
      const ref = cols[0];
      byVerse.set(ref, (byVerse.get(ref) || '') + cols[3] + ' ');
    }
    if (!byVerse.size) return null;
    const body = [...byVerse]
      .map(([ref, text]) => `${ref.slice(0, 2)}:${Number(ref.slice(2, 4))}:${Number(ref.slice(4))} ${text.trim()}`)
      .join('\n');
    const text =
      `${name}\nSBL Greek New Testament (MorphGNT)\n` +
      `Source: morphgnt/sblgnt\nRights: CC BY-SA 3.0 (MorphGNT annotation); SBLGNT text free for non-commercial and scholarly use\n\n${body}\n`;
    const saved = writeDoc('14-holy-texts/sblgnt-books', `${stem}.txt`, text);
    return saved && { book: name, stem, ...saved };
  });
  const kept = docs.filter(Boolean);
  report('Greek NT (SBLGNT, whole books)', kept.length, GNT_BOOKS.length);
  return {
    collection: 'SBL Greek New Testament',
    institution: 'Society of Biblical Literature / MorphGNT',
    licence: 'CC BY-SA 3.0 (morphological annotation)',
    documents: kept,
  };
}

async function fetchQuranSuras() {
  const suras = Array.from({ length: 114 }, (_, i) => i + 1);
  const docs = await mapPool(suras, CONCURRENCY, async n => {
    const body = await get(`${RAW}/risan/quran-json/main/dist/chapters/en/${n}.json`);
    if (!body) return null;
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return null;
    }
    const lines = [
      `Sura ${data.id}: ${data.transliteration} (${data.name}) — "${data.translation}"`,
      `Revelation type: ${data.type}; verses: ${data.total_verses}`,
      'Source: risan/quran-json (Tanzil Qur’an text, Sahih International translation)',
      'Rights: public domain / freely redistributable',
      '',
    ];
    for (const v of data.verses || []) {
      lines.push(`[${data.id}:${v.id}] ${v.text}`);
      if (v.transliteration) lines.push(`    ${v.transliteration}`);
      if (v.translation) lines.push(`    ${v.translation}`);
    }
    // Short suras cannot clear the floor even with text, transliteration and
    // translation together; writeDoc drops them.
    const saved = writeDoc(
      '14-holy-texts/quran-suras',
      `sura-${String(data.id).padStart(3, '0')}-${slugify(data.transliteration, 40)}.txt`,
      lines.join('\n') + '\n',
    );
    return saved && { sura: data.id, name: data.transliteration, ...saved };
  });
  const kept = docs.filter(Boolean);
  report('Qur’an (per sura, trilingual)', kept.length, suras.length);
  return {
    collection: 'Qur’an by sura (Arabic, transliteration, English)',
    institution: 'Tanzil project / risan.quran-json',
    licence: 'Public domain / freely redistributable',
    documents: kept,
  };
}

async function fetchPaliSuttas() {
  // The long and middle-length discourse collections; the short-collection
  // suttas are mostly a few dozen words and would not clear the floor.
  const refs = [
    ...Array.from({ length: 34 }, (_, i) => ['dn', `dn${i + 1}`]),
    ...Array.from({ length: 152 }, (_, i) => ['mn', `mn${i + 1}`]),
  ];
  const docs = await mapPool(refs, CONCURRENCY, async ([nikaya, id]) => {
    const [pali, english] = await Promise.all([
      get(`${RAW}/suttacentral/bilara-data/published/root/pli/ms/sutta/${nikaya}/${id}_root-pli-ms.json`),
      get(`${RAW}/suttacentral/bilara-data/published/translation/en/sujato/sutta/${nikaya}/${id}_translation-en-sujato.json`),
    ]);
    if (!pali && !english) return null;
    const parse = s => {
      try {
        return s ? JSON.parse(s) : {};
      } catch {
        return {};
      }
    };
    const p = parse(pali);
    const e = parse(english);
    const segments = [...new Set([...Object.keys(p), ...Object.keys(e)])].sort();
    if (!segments.length) return null;
    const lines = [
      `${id.toUpperCase()} — ${(e[segments[0]] || '').trim() || id.toUpperCase()}`,
      'Pali canon, root text (Mahāsaṅgīti edition) with English translation by Bhikkhu Sujato',
      'Source: suttacentral/bilara-data',
      'Rights: CC0 1.0 (public domain dedication)',
      '',
    ];
    for (const seg of segments) {
      if (p[seg]) lines.push(p[seg].trim());
      if (e[seg]) lines.push(`    ${e[seg].trim()}`);
    }
    const saved = writeDoc('14-holy-texts/pali-suttas', `${id}.txt`, lines.join('\n') + '\n');
    return saved && { sutta: id.toUpperCase(), ...saved };
  });
  const kept = docs.filter(Boolean);
  report('Pali suttas (DN + MN)', kept.length, refs.length);
  return {
    collection: 'Pali canon: Dīgha and Majjhima Nikāya',
    institution: 'SuttaCentral',
    licence: 'CC0 1.0',
    documents: kept,
  };
}

// ----------------------------------------------------------------- literature

// GITenberg republishes Project Gutenberg texts one repository per work, named
// {Title}_{Gutenberg id}. Titles already present under 01-literature-books/
// gutenberg/ are deliberately not repeated here.
const GITENBERG_WORKS = [
  'War-and-Peace_2600', 'Ulysses_4300', 'Dracula_345', 'Great-Expectations_1400',
  'The-Odyssey_1727', 'Jane-Eyre--An-Autobiography_1260', 'Wuthering-Heights_768',
  'The-Count-of-Monte-Cristo_1184', 'Crime-and-Punishment_2554', 'Anna-Karenina_1399',
  'The-Brothers-Karamazov_28054', 'Middlemarch_145', 'David-Copperfield_766',
  'Emma_158', 'Sense-and-Sensibility_161', 'The-Time-Machine_35',
  'The-War-of-the-Worlds_36', 'Treasure-Island_120', 'The-Jungle-Book_236',
  'Heart-of-Darkness_219', 'Walden--and-On-The-Duty-Of-Civil-Disobedience_205',
  'The-Prince_1232', 'An-Inquiry-into-the-Nature-and-Causes-of-the-Wealth-of-Nations_3300',
  'Common-Sense_147', 'The-Federalist-Papers_1404', 'Gulliver-s-Travels_829',
  'The-Life-and-Adventures-of-Robinson-Crusoe_521', 'The-Call-of-the-Wild_215',
  'Little-Women_514', 'Anne-of-Green-Gables_45', 'The-Wonderful-Wizard-of-Oz_55',
  'Metamorphosis_5200', 'The-Souls-of-Black-Folk_408', 'The-Interesting-Narrative-of-the-Life-of-Olaudah-Equiano_15399',
  'Narrative-of-the-Life-of-Frederick-Douglass-an-American-Slave_23',
  'The-Kama-Sutra-of-Vatsyayana_27827', 'Beowulf_16328', 'The-Canterbury-Tales-and-Other-Poems_2383',
  'Paradise-Lost_26', 'The-Adventures-of-Huckleberry-Finn_76',
];
const LITERATURE_TARGET = 20;
const LITERATURE_MAX_BYTES = 1_200_000;

async function fetchLiterature() {
  const kept = [];
  for (let i = 0; i < GITENBERG_WORKS.length && kept.length < LITERATURE_TARGET; i += 8) {
    const batch = GITENBERG_WORKS.slice(i, i + 8);
    const results = await mapPool(batch, 8, async repo => {
      const id = repo.slice(repo.lastIndexOf('_') + 1);
      const res = await getBounded(`${RAW}/GITenberg/${repo}/master/${id}.txt`, LITERATURE_MAX_BYTES);
      if (!res || res.oversize || !res.text) return null;
      return { repo, id, text: res.text };
    });
    for (const r of results) {
      if (!r || kept.length >= LITERATURE_TARGET) continue;
      const title = r.repo.slice(0, r.repo.lastIndexOf('_')).replace(/-/g, ' ').trim();
      const saved = writeDoc('01-literature-books/gitenberg', `pg${r.id}_${slugify(title, 60)}.txt`, r.text);
      if (saved) kept.push({ title, gutenberg_id: r.id, ...saved });
    }
  }
  report('Complete works (GITenberg)', kept.length, GITENBERG_WORKS.length);
  return {
    collection: 'Project Gutenberg complete works',
    institution: 'Project Gutenberg, republished by GITenberg',
    licence: 'Public domain',
    documents: kept,
  };
}

// ------------------------------------------------------------------- academic

/** Read a d2l `toc` block, which lists section stems one per line. */
function tocEntries(markdown) {
  const out = [];
  for (const block of markdown.matchAll(/```toc([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith(':')) continue;
      out.push(t);
    }
  }
  return out;
}

async function fetchAcademic() {
  const kept = [];

  // Dive into Deep Learning: index.md lists chapters, each chapter index lists
  // its sections. Two levels of table of contents, no directory listing needed.
  const d2lIndex = await get(`${RAW}/d2l-ai/d2l-en/master/index.md`);
  const chapters = d2lIndex ? tocEntries(d2lIndex).filter(e => e.endsWith('/index')) : [];
  const sectionLists = await mapPool(chapters, CONCURRENCY, async chapter => {
    const md = await get(`${RAW}/d2l-ai/d2l-en/master/${chapter}.md`);
    if (!md) return [];
    const dir = chapter.replace(/\/index$/, '');
    return tocEntries(md).map(s => `${dir}/${s}.md`);
  });
  const d2lSections = sectionLists.flat().slice(0, 70);
  const d2lDocs = await mapPool(d2lSections, CONCURRENCY, async rel => {
    const md = await get(`${RAW}/d2l-ai/d2l-en/master/${rel}`);
    if (!md) return null;
    const name = rel.replace(/^chapter_/, '').replace(/\//g, '_').replace(/\.md$/, '');
    const text = `Dive into Deep Learning — ${name}\nSource: d2l-ai/d2l-en\nRights: CC BY-SA 4.0\n\n${md}`;
    const saved = writeDoc('05-academic-papers/open-access-books/d2l', `${slugify(name, 70)}.txt`, text);
    return saved && { book: 'Dive into Deep Learning', section: name, ...saved };
  });
  kept.push(...d2lDocs.filter(Boolean));

  // Paradigms of Artificial Intelligence Programming, released by its author
  // under an MIT licence, one Markdown file per chapter.
  const paipChapters = Array.from({ length: 25 }, (_, i) => i + 1);
  const paipDocs = await mapPool(paipChapters, CONCURRENCY, async n => {
    const md = await get(`${RAW}/norvig/paip-lisp/main/docs/chapter${n}.md`);
    if (!md) return null;
    const text =
      `Paradigms of Artificial Intelligence Programming — chapter ${n}\n` +
      `Peter Norvig\nSource: norvig/paip-lisp\nRights: MIT licence\n\n${md}`;
    const saved = writeDoc('05-academic-papers/open-access-books/paip', `chapter-${String(n).padStart(2, '0')}.txt`, text);
    return saved && { book: 'Paradigms of AI Programming', section: `chapter ${n}`, ...saved };
  });
  kept.push(...paipDocs.filter(Boolean));

  report('Open-access scholarly books', kept.length, d2lSections.length + paipChapters.length);
  return {
    collection: 'Open-access scholarly books',
    institution: 'd2l.ai (CC BY-SA 4.0); Peter Norvig (MIT)',
    licence: 'CC BY-SA 4.0 / MIT',
    documents: kept,
  };
}

// ------------------------------------------------------------------ code docs

// The source-code category held mostly short project READMEs. These are the
// substantial documents from the same upstream repositories: language
// specifications, contributor guides, tutorials and design notes.
const CODE_DOCS = [
  ['09-source-code/torvalds_linux', 'torvalds/linux/master', ['Documentation/process/coding-style.rst', 'Documentation/process/submitting-patches.rst', 'Documentation/process/development-process.rst']],
  ['09-source-code/python_cpython', 'python/cpython/main', ['Doc/tutorial/introduction.rst', 'Doc/tutorial/classes.rst', 'Doc/tutorial/datastructures.rst', 'Doc/reference/datamodel.rst']],
  ['09-source-code/rust-lang_rust', 'rust-lang/rust/master', ['CONTRIBUTING.md', 'README.md', 'RELEASES.md']],
  ['09-source-code/golang_go', 'golang/go/master', ['CONTRIBUTING.md', 'doc/asm.html', 'doc/go_mem.html']],
  ['09-source-code/ziglang_zig', 'ziglang/zig/master', ['CONTRIBUTING.md', 'doc/langref.html.in']],
  ['09-source-code/ggerganov_llama.cpp', 'ggml-org/llama.cpp/master', ['CONTRIBUTING.md', 'docs/build.md', 'docs/development/HOWTO-add-model.md']],
  ['09-source-code/pallets_flask', 'pallets/flask/main', ['docs/quickstart.rst', 'docs/patterns/appfactories.rst', 'CHANGES.rst']],
  ['09-source-code/tiangolo_fastapi', 'fastapi/fastapi/master', ['docs/en/docs/tutorial/first-steps.md', 'docs/en/docs/tutorial/body.md', 'docs/en/docs/async.md']],
  ['09-source-code/microsoft_TypeScript', 'microsoft/TypeScript/main', ['CONTRIBUTING.md', 'README.md']],
  ['09-source-code/postgres_postgres', 'postgres/postgres/master', ['src/backend/access/transam/README', 'src/backend/optimizer/README', 'src/backend/storage/buffer/README']],
  ['09-source-code/racket_racket', 'racket/racket/master', ['CONTRIBUTING.md', 'README.md']],
  ['09-source-code/denoland_deno', 'denoland/deno/main', ['Releases.md', 'CONTRIBUTING.md']],
  ['09-source-code/godotengine_godot', 'godotengine/godot/master', ['CONTRIBUTING.md', 'AUTHORS.md']],
  ['09-source-code/ghc_ghc', 'ghc/ghc/master', ['README.md', 'HACKING.md', 'MAKEHELP.md']],
  ['09-source-code/BurntSushi_ripgrep', 'BurntSushi/ripgrep/master', ['GUIDE.md', 'FAQ.md', 'CHANGELOG.md']],
  ['09-source-code/sqlite_sqlite', 'sqlite/sqlite/master', ['README.md', 'doc/lemon.html']],
];
const CODE_DOC_MAX_BYTES = 900_000;

async function fetchCodeDocs() {
  const kept = [];
  for (const [outDir, repoRef, files] of CODE_DOCS) {
    const results = await mapPool(files, 6, async rel => {
      const res = await getBounded(`${RAW}/${repoRef}/${rel}`, CODE_DOC_MAX_BYTES);
      if (!res || res.oversize || !res.text) return null;
      const name = rel.replace(/\//g, '_');
      const saved = writeDoc(outDir, name.endsWith('.txt') ? name : `${name}.txt`, res.text);
      return saved && { repo: repoRef.split('/').slice(0, 2).join('/'), document: rel, ...saved };
    });
    kept.push(...results.filter(Boolean));
  }
  report('Upstream project documentation', kept.length, CODE_DOCS.reduce((n, c) => n + c[2].length, 0));
  return {
    collection: 'Upstream project documentation',
    institution: 'The respective open-source projects',
    licence: 'Per project; see each repository',
    documents: kept,
  };
}

// ------------------------------------------------------------------- assembly

const SECTIONS = {
  scripture: async () => ({
    tanakh: await fetchTanakh(),
    greek_nt: await fetchGreekNT(),
    quran: await fetchQuranSuras(),
    pali: await fetchPaliSuttas(),
  }),
  literature: async () => ({ gutenberg: await fetchLiterature() }),
  academic: async () => ({ open_access_books: await fetchAcademic() }),
  'code-docs': async () => ({ project_documentation: await fetchCodeDocs() }),
};

async function main() {
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx >= 0 ? new Set(process.argv[onlyIdx + 1].split(',')) : null;

  console.log('=== Replacement corpus fetcher ===');
  console.log(`Every document must clear ${MIN_WORDS} words.\n`);

  const previous =
    only && fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) : null;
  const manifest = {
    source: 'Replacements for pruned short priors',
    fetched_at: new Date().toISOString(),
    min_words: MIN_WORDS,
    sections: previous?.sections ?? {},
  };

  for (const [name, run] of Object.entries(SECTIONS)) {
    if (only && !only.has(name)) continue;
    console.log(`--- ${name} ---`);
    Object.assign(manifest.sections, await run());
    console.log('');
  }

  const total = Object.values(manifest.sections).reduce((n, s) => n + s.documents.length, 0);
  manifest.total_documents = total;
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`=== Done: ${total} replacement documents ===`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
