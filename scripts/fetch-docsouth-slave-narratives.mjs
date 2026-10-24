#!/usr/bin/env node
// fetch-docsouth-slave-narratives.mjs — "North American Slave Narratives" from
// Documenting the American South (DocSouth), University Library, UNC-Chapel Hill.
// GAP-INGEST-SPEC.md; host approved 2026-10-24: docsouth.unc.edu only.
//
// HOST AND METHOD. One bulk file, not a crawl: DocSouth Data's package
// https://docsouth.unc.edu/full-text/na-slave-narratives.zip (BagIt; data/texts
// plain text, data/xml TEI, data/toc.csv). It is downloaded once into the cache
// (~/.cache/zenodotus/docsouth-slave-narratives/) and unzipped into its own
// fresh folder there; nothing in it is executed.
//
// TERMS READ (2026-10-24):
//   robots.txt — only Googlebot/GoogleOther are kept off /neh/chronbio.html/*.
//   https://docsouth.unc.edu/docsouthdata/ — "made the texts, encoding, and
//     metadata in DocSouth Data available for use without restriction ...
//     Please consider crediting the University of North Carolina at Chapel Hill".
//   data/readme.txt in the package — CC BY 4.0 for the texts, encoding and
//     metadata, crediting the University Library at UNC-Chapel Hill; the one
//     exception is "Fields's Observation", which "has no known rights".
//   The per-text TEI headers (2001-era) carry an older availability statement
//     (free use by individuals for research, teaching and personal use, with the
//     statement kept); the package's later CC BY statement is recorded as the
//     licence, and the TEI statement is kept in each row as `tei_availability`.
//   The FAQ's link to UNC's general copyright page lives on library.unc.edu,
//     outside the approved hosts, and was not read.
//
// DEDUPE. Titles Zenodotus already holds in 20-first-person-voices/ or
// 21-anti-colonial/ (same author and same title, any edition, or a narrative
// printed whole inside a held work) are skipped. The table HELD below was built
// by matching author surnames and title words against both folders' headers and
// then reading each pair (2026-10-24); every skip names the held file.
//
// CLAIMS. voice comes from the TEI header's own LCSH headings only:
//   - first-person: the TEI author is the work's only personal-name subject heading;
//   - mixed: the headings name the author and other people;
//   - about: the headings name someone other than the author;
//   - unknown: no personal-name heading.
// The measured first-person pronoun share is recorded (first_person_share) and decides nothing.
//   - perspective_by "enslaved or formerly enslaved (author)" only where a
//     heading begins "Slaves' writings" (LCSH: writings by slaves).
//
// CAP: 150 MB for the collection folder (the package holds about 135 MB of text
// and XML, of which the plain text is under half). Rerun:
//   node scripts/fetch-docsouth-slave-narratives.mjs        (resumable; rewrites nothing already written)

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { wordsIn } from './lib/corpus-util.mjs';
import { politeGet, cacheDir, sha256, today, frontmatter, loadManifest, saveManifest, folderBytes } from './lib/gap-pull-common.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLL = '20-first-person-voices/docsouth-slave-narratives';
const OUT = path.join(ROOT, COLL);
const MANIFEST = path.join(ROOT, 'manifests', 'docsouth-slave-narratives-manifest.json');
const ZIP_URL = 'https://docsouth.unc.edu/full-text/na-slave-narratives.zip';
const CAP_BYTES = 150 * 1024 * 1024;

const LICENSE = 'CC BY 4.0 (DocSouth Data readme: "the texts, encoding, and metadata available in Open DocSouth are made available for use under the terms of a Creative Commons Attribution License (CC BY 4.0)"); the underlying works are public domain in the US by date of publication';
const LICENSE_URL = 'https://docsouth.unc.edu/docsouthdata/';
const ATTRIBUTION = 'Documenting the American South, University Library, The University of North Carolina at Chapel Hill';

const CS = '21-anti-colonial/colonial-studies/';
const FPV = '20-first-person-voices/';
// DocSouth file stem -> [held file, why it is the same title]
const HELD = {
  'fpn-ball-ball': [CS + '40760-Ball-Fifty-Years-in-Chains-or-the-Life-of-an-.txt', 'same author and title'],
  'fpn-brownw-brown': [FPV + 'gutenberg/w-w-brown-black-15132.txt', 'same narrative (1849 London edition of the 1847 Narrative of William W. Brown)'],
  'neh-brown47-brown47': [FPV + 'gutenberg/w-w-brown-black-15132.txt', 'same author and title'],
  'fpn-bruce-bruce': [CS + '57625-Bruce-The-New-Man-Twenty-nine-years-a-slave-tw.txt', 'same author and title'],
  'fpn-burton-burton': [CS + '17864-Burton-Memories-of-Childhood-s-Slavery-Days.txt', 'same author and title'],
  'fpn-grandy-grandy': [CS + '15036-Grandy-Narrative-of-the-Life-of-Moses-Grandy-La.txt', 'same author and title'],
  'fpn-hughes-hughes': [CS + '10431-Hughes-Thirty-Years-a-Slave-From-Bondage-to-Fre.txt', 'same author and title'],
  'fpn-jacobs-jacobs': [FPV + 'jacobs-incidents.txt', 'same author and title'],
  'fpn-mason-mason': [CS + '48263-Mason-Life-of-Isaac-Mason-as-a-Slave.txt', 'same author and title'],
  'fpn-northup-northup': [FPV + 'gutenberg/northup-black-45631.txt', 'same author and title'],
  'fpn-steward-steward': [CS + '11137-Steward-Twenty-Two-Years-a-Slave-and-Forty-Years.txt', 'same author and title'],
  'fpn-washington-washing': [CS + '2376-Washington-Up-from-Slavery-An-Autobiography.txt', 'same author and title'],
  'nc-omarsaid-omarsaid': [CS + '63635-Said-Translation-of-the-Life-of-Omar-ibn-Said.txt', 'same work (Omar ibn Said\'s 1831 autobiography), another English translation'],
  'neh-bayley-bayley': [CS + '65027-Bayley-A-narrative-of-some-remarkable-incidents.txt', 'same author and title'],
  'neh-bibb-bibb': [CS + '15398-Bibb-Narrative-of-the-Life-and-Adventures-of-.txt', 'same author and title'],
  'neh-black-black': [CS + '65033-Black-The-Life-and-Sufferings-of-Leonard-Black.txt', 'same author and title'],
  'neh-boxbrown-boxbrown': [CS + '64992-Brown-Narrative-of-Henry-Box-Brown-Who-Escaped.txt', 'same author and title (1849 Boston edition)'],
  'neh-bradford-bradford': [CS + '57821-Bradford-Scenes-in-the-Life-of-Harriet-Tubman.txt', 'same author and title'],
  'neh-harriet-harriet': [CS + '9999-Bradford-Harriet-the-Moses-of-Her-People.txt', 'same author and title'],
  'neh-brown80-brown80': [CS + '59114-Brown-My-Southern-Home-Or-the-South-and-Its-Pe.txt', 'same author and title'],
  'neh-browne-browne': [CS + '55813-Browne-Autobiography-of-a-Female-Slave.txt', 'same author and title'],
  'neh-chesnutt-chesnutt': [CS + '10986-Chesnutt-Frederick-Douglass-A-Biography.txt', 'same author and title'],
  'neh-craft-craft': [CS + '585-Craft-Running-a-Thousand-Miles-for-Freedom-Or-.txt', 'same author and title'],
  'neh-davisn-davis': [CS + '20005-Davis-A-Narrative-of-the-Life-of-Rev-Noah-Davi.txt', 'same author and title'],
  'neh-delaney-delaney': [CS + '17820-Delaney-From-the-Darkness-Cometh-the-Light-or-St.txt', 'same author and title'],
  'neh-doug1906-doug1906': [CS + '69692-Washington-Frederick-Douglass.txt', 'same author and title'],
  'neh-dougl92-dougl92': [CS + '71893-Douglass-Life-and-times-of-Frederick-Douglass.txt', 'same author and title (1892 edition)'],
  'neh-douglasslife-douglass': [CS + '71893-Douglass-Life-and-times-of-Frederick-Douglass.txt', 'same author and title (1881 edition)'],
  'neh-douglass-douglass': [FPV + 'douglass-narrative.txt', 'same author and title'],
  'neh-douglass55-douglass55': [FPV + 'douglass-my-bondage.txt', 'same author and title'],
  'neh-drumgoold-drumgoold': [CS + '17871-Drumgoold-A-Slave-Girl-s-Story-Being-an-Autobiogra.txt', 'same author and title'],
  'neh-eliza1-eliza1': [CS + '17826-Old-Elizabeth-Memoir-of-Old-Elizabeth-A-Coloured-Woman.txt', 'same title'],
  'neh-equiano1-equiano1': [FPV + 'equiano-narrative.txt', 'same author and title (volume 1)'],
  'neh-equiano2-equiano2': [FPV + 'equiano-narrative.txt', 'same author and title (volume 2)'],
  'neh-floyd-floyd': [CS + '65081-Floyd-Life-of-Charles-T-Walker-D-D-The-Black-S.txt', 'same author and title'],
  'neh-greenjd-greenjd': [CS + '15128-Green-Narrative-of-the-Life-of-J-D-Green-a-Run.txt', 'same author and title'],
  'neh-gronniosaw-gronnios': [FPV + 'gutenberg/gap-gronniosaw-15042.txt', 'same author and title'],
  'neh-henson49-henson49': [CS + '53609-Henson-The-Life-of-Josiah-Henson-Formerly-a-Sla.txt', 'same author and title'],
  'neh-henson58-henson58': [CS + '49129-Henson-Father-Henson-s-Story-of-His-Own-Life-Tr.txt', 'same author and title'],
  'neh-jacksonm-jackson': [CS + '17827-Thompson-The-Story-of-Mattie-J-Jackson-Her-Parent.txt', 'same title'],
  'neh-keckley-keckley': [FPV + 'gutenberg/keckley-black-woman-24968.txt', 'same author and title'],
  'neh-lanelunsford-lane': [CS + '15118-Lane-The-Narrative-of-Lunsford-Lane-Formerly-.txt', 'same author and title'],
  'neh-lester-lester': [CS + '61074-Wheeler-Chains-and-Freedom-or-The-Life-and-Adven.txt', 'same title'],
  'neh-mars-mars': [CS + '65456-Mars-Life-of-James-Mars-a-Slave-Born-and-Sold.txt', 'same author and title'],
  'neh-mars64-mars64': [CS + '65456-Mars-Life-of-James-Mars-a-Slave-Born-and-Sold.txt', 'same author and title (1864 edition)'],
  'neh-penning49-penning49': [CS + '15130-Pennington-The-Fugitive-Blacksmith-or-Events-in-the.txt', 'same author and title'],
  'neh-prince-prince': [FPV + 'gutenberg/prince-caribbean-woman-17851.txt', 'same author and title'],
  'neh-sancho1-sancho1': [CS + '66908-Sancho-Letters-of-the-Late-Ignatius-Sancho-an-A.txt', 'same author and title (volume 1)'],
  'neh-sancho2-sancho2': [CS + '66908-Sancho-Letters-of-the-Late-Ignatius-Sancho-an-A.txt', 'same author and title (volume 2)'],
  'neh-stroyer85-stroyer85': [CS + '15096-Stroyer-My-Life-In-The-South.txt', 'same author and title'],
  'neh-thompsch-thompsch': [CS + '9941-Thompson-Biography-of-a-Slave-Being-the-Experienc.txt', 'same author and title'],
  'neh-thompson-thompson': [CS + '70985-Thompson-The-life-of-John-Thompson-a-fugitive-sla.txt', 'same author and title'],
  'neh-truth50-truth50': [FPV + 'gutenberg/truth-black-woman-1674.txt', 'same title (1850 edition)'],
  'neh-truth75-truth75': [FPV + 'gutenberg/truth-black-woman-1674.txt', 'same title (1875 edition, with the Book of Life)'],
  'neh-truth84-truth84': [FPV + 'gutenberg/truth-black-woman-1674.txt', 'same title (1884 edition, with the Book of Life)'],
  'neh-turner-turner': ['21-anti-colonial/african-american-turner-15333.txt', 'same title'],
  'neh-venture-venture': [CS + '10075-Smith-A-Narrative-of-the-Life-and-Adventures-o.txt', 'same author and title (1798 edition)'],
  'neh-venture2-venture2': [CS + '10075-Smith-A-Narrative-of-the-Life-and-Adventures-o.txt', 'same author and title (later edition)'],
  'neh-watson-watson': [CS + '69372-Watson-Narrative-of-Henry-Watson-a-fugitive-sla.txt', 'same author and title'],
  'neh-boen-boen': [CS + '69889-Anonymous-Anecdotes-and-memoirs-of-William-Boen-a-.txt', 'same title'],
  'neh-carolinatwin-carolinatwin': [CS + '73204-Anonymous-Biographical-sketch-of-Millie-Christine-.txt', 'same title'],
  'neh-cugoano-cugoano': ['21-anti-colonial/african-cugoano.txt', 'narrative printed whole inside the held Thoughts and Sentiments on the Evil of Slavery (1787)'],
  'neh-stedman-stedman': [CS + '69441-Stedman-Narrative-of-a-five-years-expedition-aga.txt', 'extract from the held Stedman Narrative (also 65715)'],
};
// Held title, different text: kept, and listed here so the choice is visible.
const KEPT_EDITIONS = {
  'neh-brownbox-brownbox': 'Narrative of the Life of Henry Box Brown, Written by Himself (Manchester, 1851): a different text from the held 1849 Boston narrative written from his statement',
  'neh-stroyer-stroyer': 'Sketches of My Life in the South, Part I (1879): an earlier, shorter version of the held My Life in the South (1885)',
  'neh-henson-henson': "Uncle Tom's Story of His Life (1876): a later revision of Henson's autobiography; the 1849 and 1858 versions are held",
};
const RIGHTS_EXCEPTION = { 'neh-fields-fields': 'the DocSouth Data readme excepts "Fields\'s Observation" from its CC BY licence ("no known rights"); a 1980 journal publication' };

const csvRows = (t) => { const out = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i];
  if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
  else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
  if (f || row.length) { row.push(f); out.push(row); } return out; };
const ent = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();

function teiHeader(xml) {
  const head = xml.split('</teiHeader>')[0];
  const titleStmt = (head.match(/<titleStmt>([\s\S]*?)<\/titleStmt>/) || [])[1] || '';
  const author = ent((titleStmt.match(/<author>([\s\S]*?)<\/author>/) || [])[1] || '');
  const lang = (head.match(/<language id="([a-z]+)"/) || [])[1] || '';
  const kw = ((head.match(/<keywords[^>]*>([\s\S]*?)<\/keywords>/) || [])[1] || '').match(/<item>([\s\S]*?)<\/item>/g) || [];
  const subjects = kw.map((k) => ent(k.replace(/<\/?item>/g, '')).replace(/\.$/, ''));
  const avail = ent((head.match(/<availability[^>]*>([\s\S]*?)<\/availability>/) || [])[1] || '');
  const src = (head.match(/<sourceDesc>([\s\S]*?)<\/sourceDesc>/) || [])[1] || '';
  const pubPlace = ent((src.match(/<pubPlace>([\s\S]*?)<\/pubPlace>/) || [])[1] || '').replace(/[:,;]\s*$/, '');
  return { author, lang, subjects, avail, pubPlace };
}

// Personal-name headings. The author's own heading is found by matching the TEI
// author's surname and first initial; another person's heading must look like a
// name ("Surname, Forename" with a date, a parenthesis, an initial or two forenames),
// so inverted topical headings such as "Sermons, American" do not count.
const commaHeads = (subjects) => subjects.filter((s) => /^[A-Z][\p{L}'’.-]+, [A-Z]/u.test(s) && !/^Slaves'/.test(s)).map((s) => s.split(' -- ')[0]);
const looksPersonal = (h) => { const rest = h.split(',').slice(1).join(',').trim(); return /\d|\(/.test(rest) || /\b[A-Z]\.?$/.test(rest) || rest.split(/\s+/).length >= 2; };
// The heading's surname must be a word of the author string (inverted "Surname,
// Forename" or direct "Forename Surname, dates" order) and its first forename
// initial must start some other word of the author string.
function samePerson(author, heading) {
  const sur = norm(heading.split(',')[0]);
  const words = norm(author.replace(/\d[\d?-]*/g, ' ')).split(' ').filter(Boolean);
  if (!sur || !words.length) return false;
  const surWords = sur.split(' ');
  const at = words.findIndex((w, i) => surWords.every((sw, k) => words[i + k] === sw));
  if (at < 0) return false;
  const rest = words.filter((w, i) => i < at || i >= at + surWords.length);
  const hf = (norm((heading.split(',')[1] || '').trim()).split(' ')[0] || '')[0];
  return !hf || !rest.length || rest.some((w) => w[0] === hf);
}

// First-person share: first-person pronouns over first- plus third-person singular
// pronouns in the received text. Recorded as first_person_share; it decides nothing.
export function fpShare(text) {
  const a = (text.match(/\b(I|me|my|mine|myself|I'm|I've|I'd|I'll|we|us|our|ours|ourselves)\b/g) || []).length;
  const b = (text.match(/\b(he|him|his|himself|she|her|hers|herself)\b/gi) || []).length;
  return a + b ? +(a / (a + b)).toFixed(3) : null;
}

// voice from the holder's own metadata only (the TEI header's LCSH headings).
function voiceOf(teiAuthor, subjects) {
  const heads = commaHeads(subjects);
  const own = teiAuthor ? heads.find((p) => samePerson(teiAuthor, p)) : null;
  const others = heads.filter((p) => p !== own && looksPersonal(p));
  const who = others.slice(0, 3).map((p) => `"${p}"`).join(', ');
  if (own && !others.length) return ['first-person', `source-metadata: the TEI author ("${teiAuthor}") is the work's only personal-name subject heading ("${own}"): an account of the author's own life`];
  if (own) return ['mixed', `source-metadata: the subject headings name the TEI author ("${own}") and others (${who})`];
  if (others.length) return ['about', `source-metadata: the subject heading names ${who}, not the TEI author ("${teiAuthor || 'none'}")`];
  return ['unknown', 'no personal-name subject heading in the DocSouth TEI header'];
}

async function main() {
  const date = today();
  const CACHE = cacheDir('docsouth-slave-narratives');
  const zip = path.join(CACHE, 'na-slave-narratives.zip');
  const manifest = loadManifest(MANIFEST, {
    source: 'Documenting the American South (DocSouth), University Library, UNC-Chapel Hill: North American Slave Narratives (DocSouth Data package)',
    license: LICENSE,
    fetched_at: new Date().toISOString(),
    terms_read: [
      { url: 'https://docsouth.unc.edu/robots.txt', date, summary: 'Only Googlebot and GoogleOther are disallowed, and only from /neh/chronbio.html/*. Nothing restricts this pull.' },
      { url: 'https://docsouth.unc.edu/docsouthdata/', date, summary: 'DocSouth Data offers whole-collection zip packages for text mining. Copyright statement: the University Library has made the texts, encoding and metadata available for use without restriction; the user decides legality of reuse; please consider crediting UNC-Chapel Hill.' },
      { url: ZIP_URL + ' (data/readme.txt)', date, summary: 'Texts, encoding and metadata are CC BY 4.0, crediting the University Library at UNC-Chapel Hill; the exception is "Fields\'s Observation", which has no known rights. Texts were transcribed and corrected by people, not uncorrected OCR. Plain texts include paratext (title pages, appendices).' },
      { url: 'https://docsouth.unc.edu/support/faq/', date, summary: 'Permission questions are referred to "Copyright for University Libraries\' Digital Collections" on library.unc.edu, which is outside the approved hosts and was not read. The site is marked "Archived as of 3/30/26".' },
      { url: 'TEI headers in data/xml (2001-era)', date, summary: 'Each text\'s header carries an older availability statement: property of UNC-Chapel Hill, free use by individuals for research, teaching and personal use with the statement kept. Superseded for this package by the readme\'s CC BY 4.0 statement; kept per row as tei_availability.' },
    ],
  });
  manifest.fetched_at = new Date().toISOString();

  if (!fs.existsSync(zip)) {
    const r = await politeGet(ZIP_URL);
    if (r.status !== 200 || !r.buf) throw new Error(`zip download failed: HTTP ${r.status} ${r.error || ''}`);
    fs.writeFileSync(zip, r.buf);
  }
  const zipBuf = fs.readFileSync(zip);
  const zipSha = sha256(zipBuf);
  const unz = path.join(CACHE, 'unzipped');
  if (!fs.existsSync(path.join(unz, 'na-slave-narratives', 'data', 'toc.csv'))) {
    fs.rmSync(unz, { recursive: true, force: true });
    fs.mkdirSync(unz, { recursive: true });
    execFileSync('unzip', ['-q', zip, '-d', unz]);
  }
  const DATA = path.join(unz, 'na-slave-narratives', 'data');
  const rows = csvRows(fs.readFileSync(path.join(DATA, 'toc.csv'), 'utf8'));
  const hdr = rows[0];
  const recs = rows.slice(1).filter((r) => r.length >= 5).map((r) => Object.fromEntries(hdr.map((h, i) => [h, r[i] || ''])));
  console.log(`DocSouth toc: ${recs.length} items; package sha256 ${zipSha.slice(0, 16)}…`);

  fs.mkdirSync(OUT, { recursive: true });
  const done = new Set(manifest.pulled.map((p) => p.docsouth_id));
  for (const rec of recs) {
    const stem = rec.Filename.replace(/\.xml$/, '');
    const title = ent(rec.Title);
    if (HELD[stem] && !fs.existsSync(path.join(ROOT, HELD[stem][0]))) console.warn(`  ! ${stem}: listed held file is missing (${HELD[stem][0]}); pulling it`);
    if (HELD[stem] && fs.existsSync(path.join(ROOT, HELD[stem][0]))) { manifest.rejected.push({ docsouth_id: stem, title, reason: 'duplicate: already held', held_file: HELD[stem][0], basis: HELD[stem][1] }); continue; }
    if (RIGHTS_EXCEPTION[stem]) { manifest.rejected.push({ docsouth_id: stem, title, reason: 'rights: ' + RIGHTS_EXCEPTION[stem] }); continue; }
    if (done.has(stem)) continue;
    if (folderBytes(OUT) > CAP_BYTES) { manifest.gaps.push({ type: 'capped', cap_mb: CAP_BYTES / 1048576, remaining_from: stem }); break; }
    const txtPath = path.join(DATA, 'texts', stem + '.txt');
    if (!fs.existsSync(txtPath)) { manifest.rejected.push({ docsouth_id: stem, title, reason: 'no plain text in the package' }); continue; }
    const buf = fs.readFileSync(txtPath);
    const text = buf.toString('utf8');
    const words = wordsIn(text);
    const xmlPath = path.join(DATA, 'xml', stem + '.xml');
    const tei = fs.existsSync(xmlPath) ? teiHeader(fs.readFileSync(xmlPath, 'utf8')) : { author: '', lang: '', subjects: [], avail: '', pubPlace: '' };
    const share = fpShare(text);
    const [voice, voiceBasis] = voiceOf(tei.author || ent(rec.Author), tei.subjects);
    const slaveWriting = tei.subjects.find((s) => /^Slaves' writings/.test(s));
    const yr = (rec.Date.match(/(1[5-9]\d\d)/) || [])[1];
    const head = {
      title,
      author: ent(rec.Author) || 'unknown',
      author_tei: tei.author || 'unknown',
      collection: COLL,
      source: 'Documenting the American South (DocSouth), University Library, UNC-Chapel Hill: North American Slave Narratives',
      source_url: rec.URL || 'unknown',
      text_url: rec['URL(text-only)'] || 'unknown',
      package_url: ZIP_URL,
      package_sha256: zipSha,
      docsouth_id: stem,
      retrieved: date,
      sha256: sha256(buf),
      received_format: 'txt',
      license: LICENSE,
      license_url: LICENSE_URL,
      license_tier: 'open',
      attribution: ATTRIBUTION,
      language: tei.lang === 'eng' || !tei.lang ? 'en' : tei.lang,
      language_basis: tei.lang ? 'declared-by-source (TEI langUsage)' : 'catalog (DocSouth North American Slave Narratives: narratives published in English)',
      date: yr || 'unknown',
      date_basis: yr ? `source-metadata (DocSouth toc date "${rec.Date.trim()}")` : `unknown (DocSouth toc date "${rec.Date.trim()}")`,
      place_of_publication: tei.pubPlace || 'unknown',
      place_by: 'unknown',
      place_by_basis: 'not stated in the metadata read; the text may state it',
      place_about: 'unknown',
      perspective_by: slaveWriting ? 'enslaved or formerly enslaved (author)' : 'unknown',
      perspective_by_basis: slaveWriting ? `source-metadata (DocSouth TEI LCSH heading "${slaveWriting}": writings by slaves)` : 'not declared by the source metadata',
      perspective_about: 'unknown',
      voice,
      voice_basis: voiceBasis,
      first_person_share: share ?? 'unknown',
      subjects_lcsh: tei.subjects,
      translation_of: 'none stated',
      cultural_note: 'none',
      privacy_note: 'none',
      tei_availability: tei.avail || 'none',
      edition_note: KEPT_EDITIONS[stem] || 'none',
      words,
    };
    if (words < 600) head.floor_exempt = 'a complete item as the holder publishes it (pamphlet, broadside or short narrative)';
    const file = path.join(OUT, `${stem}.txt`);
    fs.writeFileSync(file, frontmatter(head) + text, 'utf8');
    manifest.pulled.push({ file: path.relative(ROOT, file), url: head.source_url, ...head });
    console.log(`  ✓ ${stem} (${words} w, ${voice})`);
  }
  manifest.gaps.push({ type: 'not-in-package', note: 'DocSouth\'s web edition also has page images; only the package\'s transcribed text was taken.' });
  saveManifest(MANIFEST, manifest);
  const years = manifest.pulled.map((p) => +p.date).filter((y) => y > 0);
  writeAttribution(Math.min(...years), Math.max(...years));
  const mb = (folderBytes(OUT) / 1048576).toFixed(1);
  console.log(`\ndone: ${manifest.pulled.length} pulled, ${manifest.rejected.length} skipped/rejected, ${mb} MB in ${COLL}`);
}

function writeAttribution(y0, y1) {
  fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), `# Attribution — DocSouth: North American Slave Narratives

Texts in this folder come from **Documenting the American South (DocSouth)**, University Library, The University of North Carolina at Chapel Hill, through its DocSouth Data package for the *North American Slave Narratives* collection (<${ZIP_URL}>, retrieved ${today()}).

The holder's notice (DocSouth Data readme): the texts, encoding and metadata are made available under the Creative Commons Attribution 4.0 licence (CC BY 4.0, <http://creativecommons.org/licenses/by/4.0/>). Users may copy, share, adapt and republish them, crediting **the University Library at the University of North Carolina at Chapel Hill** for making this material available. The DocSouth Data page (<${LICENSE_URL}>) adds that the material is available for use without restriction and asks users to consider crediting UNC-Chapel Hill.

Suggested credit: *Documenting the American South, University Library, The University of North Carolina at Chapel Hill.*

The works in this folder carry publication dates from ${y0} to ${y1} (DocSouth's own dates; some are approximate), so they are in the public domain in the United States. "Fields's Observation", which the holder excepts from its licence, is not included. Each file's frontmatter keeps the older availability statement from its TEI header as \`tei_availability\`.
`, 'utf8');
}

main().catch((e) => { console.error(e); process.exit(1); });
