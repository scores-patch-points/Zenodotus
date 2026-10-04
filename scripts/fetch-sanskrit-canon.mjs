#!/usr/bin/env node
// Fetch the Sanskrit originals of the St. John's Eastern Classics canon — India
// tradition — from GRETIL (Göttingen Register of Electronic Texts in Indian
// Languages). GRETIL serves IAST transliteration (Unicode Roman diacritics),
// not Devanagari; its plaintext transformations carry a documented header and
// a `# Text` marker where the actual text begins. Every file is read as a
// document; nothing here is executed.
//
//   node scripts/fetch-sanskrit-canon.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GRETIL = 'https://gretil.sub.uni-goettingen.de';

// Output layout:
//   14-holy-texts/upanishads/         principal Upaniṣads
//   14-holy-texts/bhagavad-gita/      Bhagavadgītā
//   11-multi-language/sanskrit-originals/  everything else (Veda, epics, sūtras, Kālidāsa)
const UPANISHADS_DIR = path.join(ROOT, '14-holy-texts', 'upanishads');
const GITA_DIR = path.join(ROOT, '14-holy-texts', 'bhagavad-gita');
const OTHER_DIR = path.join(ROOT, '11-multi-language', 'sanskrit-originals');

// Every URL was verified HTTP 200 on 2026-09-13. `bare` marks texts without a
// commentary; the rest carry Śaṅkara's bhāṣya or another commentary as noted.
const UPANISHADS = [
  { slug: 'isa', title: 'Īśā Upaniṣad (Īśāvāsya, Kāṇva recension)', url: '/gretil/corpustei/transformations/plaintext/sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.txt', note: 'with commentary' },
  { slug: 'katha', title: 'Kaṭha Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_kathopaniSad.txt', note: 'bare, Olivelle ed.' },
  { slug: 'kena', title: 'Kena Upaniṣad (not on GRETIL — restricted TITUS only)', url: null, note: 'UNAVAILABLE on GRETIL' },
  { slug: 'mandukya', title: 'Māṇḍūkya Upaniṣad with Gauḍapāda Kārikā', url: '/gretil/corpustei/transformations/plaintext/sa_mANDUkyopaniSad-comm.txt', note: 'with commentary' },
  { slug: 'mandukya-bare', title: 'Māṇḍūkya Upaniṣad (bare)', url: '/gretil/corpustei/transformations/plaintext/sa_mANDUkyopaniSad-alt.txt', note: 'bare' },
  { slug: 'aitareya', title: 'Aitareya Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_aitareyopaniSad-comm.txt', note: 'with commentary' },
  { slug: 'brihadaranyaka', title: 'Bṛhadāraṇyaka Upaniṣad (Kāṇva)', url: '/gretil/corpustei/transformations/plaintext/sa_bRhadAraNyakopaniSadkANva-recension-comm.txt', note: 'with commentary, adhyāyas 1–6' },
  { slug: 'chandogya', title: 'Chāndogya Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_chAndogyopaniSad-comm.txt', note: 'with commentary' },
  { slug: 'taittiriya', title: 'Taittirīya Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_taittirIyopaniSad-zaMkarabhASya.txt', note: 'with Śaṅkara bhāṣya' },
  { slug: 'prashna', title: 'Praśna Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_praznopaniSad-comm.txt', note: 'with commentary' },
  { slug: 'shvetashvatara', title: 'Śvetāśvatara Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_zvetAzvataropaniSad.txt', note: 'bare' },
  { slug: 'kaivalya', title: 'Kaivalya Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_kaivalyopaniSad.txt', note: 'Atharvaṇa, bare' },
  { slug: 'garbha', title: 'Garbha Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_garbhopaniSad.txt', note: 'Atharvaṇa, bare' },
  { slug: 'nada-bindu', title: 'Nādabindu Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_nAdabindUpaniSad.txt', note: 'Atharvaṇa, bare' },
  { slug: 'brahma-bindu', title: 'Brahmabindu Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_brahmabindUpaniSad.txt', note: 'Atharvaṇa, bare' },
  { slug: 'shiva-samkalpa', title: 'Śivaṃsaṅkalpa Upaniṣad', url: '/gretil/corpustei/transformations/plaintext/sa_zivasaMkalpopaniSad.txt', note: 'bare' },
];

const BHAGAVAD_GITA = [
  { slug: 'bhagavad-gita', title: 'Bhagavadgītā (Mahābhārata VI, extract, Tokunaga ed.)', url: '/gretil/1_sanskr/2_epic/mbh/ext/bhgce__u.htm', note: 'bare Gītā, htm' },
];

const OTHER = [
  { slug: 'rigveda', title: 'Ṛgveda Saṃhitā (Aufrecht ed.)', url: '/gretil/corpustei/transformations/plaintext/sa_Rgveda-edAufrecht.txt', note: 'full text, IAST' },
  { slug: 'mahabharata-book1', title: 'Mahābhārata 1: Ādiparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_01_u.htm', note: 'Tokunaga/Smith, unaccented' },
  { slug: 'mahabharata-book2', title: 'Mahābhārata 2: Sabhāparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_02_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book3', title: 'Mahābhārata 3: Āraṇyakaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_03_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book4', title: 'Mahābhārata 4: Virāṭaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_04_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book5', title: 'Mahābhārata 5: Udyogaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_05_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book6', title: 'Mahābhārata 6: Bhīṣmaparvan (incl. Gītā)', url: '/gretil/1_sanskr/2_epic/mbh/mbh_06_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book7', title: 'Mahābhārata 7: Droṇaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_07_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book8', title: 'Mahābhārata 8: Karṇaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_08_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book9', title: 'Mahābhārata 9: Śalyaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_09_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book10', title: 'Mahābhārata 10: Sauptikaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_10_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book11', title: 'Mahābhārata 11: Strīparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_11_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book12', title: 'Mahābhārata 12: Śāntiparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_12_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book13', title: 'Mahābhārata 13: Anuśāsanaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_13_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book14', title: 'Mahābhārata 14: Āśvamedhikaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_14_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book15', title: 'Mahābhārata 15: Āśramavāsikaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_15_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book16', title: 'Mahābhārata 16: Mausalaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_16_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book17', title: 'Mahābhārata 17: Mahāprasthānikaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_17_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'mahabharata-book18', title: 'Mahābhārata 18: Svargārohaṇaparvan', url: '/gretil/1_sanskr/2_epic/mbh/mbh_18_u.htm', note: 'Tokunaga/Smith' },
  { slug: 'ramayana', title: 'Vālmīki Rāmāyaṇa', url: '/gretil/corpustei/transformations/plaintext/sa_rAmAyaNa.txt', note: 'full text' },
  { slug: 'yoga-sutras', title: 'Patañjali Yoga Sūtras', url: '/gretil/corpustei/transformations/plaintext/sa_pataJjali-yogasUtra.txt', note: 'bare mūla' },
  { slug: 'yoga-sutras-bhasya', title: 'Patañjali Yoga Sūtras with Vyāsa bhāṣya', url: '/gretil/corpustei/transformations/plaintext/sa_pataJjali-yogasUtra-with-bhASya.txt', note: 'with commentary' },
  { slug: 'nyaya-sutras', title: 'Gautama Nyāya Sūtras', url: '/gretil/corpustei/transformations/plaintext/sa_gautama-nyAyasUtra.txt', note: 'bare mūla' },
  { slug: 'vaisheshika-sutras', title: 'Kaṇāda Vaiśeṣika Sūtras', url: '/gretil/corpustei/transformations/plaintext/sa_kaNAda-vaizeSikasUtra.txt', note: 'bare mūla' },
  { slug: 'samkhya-karika', title: 'Īśvarakṛṣṇa Sāṃkhya Kārikā', url: '/gretil/corpustei/transformations/plaintext/sa_IzvarakRSNa-sAMkhyakArikA.txt', note: 'bare' },
  { slug: 'shakuntala', title: 'Kālidāsa Abhijñānaśākuntala', url: '/gretil/corpustei/transformations/plaintext/sa_kAlidAsa-abhijJAnazakuntala.txt', note: 'full play' },
  { slug: 'kumarasambhava', title: 'Kālidāsa Kumārasambhava', url: '/gretil/corpustei/transformations/plaintext/sa_kAlidAsa-kumArasaMbhava.txt', note: 'full poem' },
  { slug: 'meghaduta', title: 'Kālidāsa Meghadūta', url: '/gretil/corpustei/transformations/plaintext/sa_kAlidAsa-meghadUta.txt', note: 'full poem' },
  { slug: 'raghuvamsha', title: 'Kālidāsa Raghuvaṃśa', url: '/gretil/corpustei/transformations/plaintext/sa_kAlidAsa-raghuvaMza.txt', note: 'full poem' },
  { slug: 'lotus-sutra', title: 'Saddharmapuṇḍarīka Sūtra (Lotus Sūtra)', url: '/gretil/corpustei/transformations/plaintext/sa_saddharmapuNDarIkasUtra.txt', note: 'full sūtra' },
];

/**
 * Clean a GRETIL plaintext file: strip the generated header (up to `# Text`)
 * and any trailing footers, leaving the text itself. For .htm sources, strip
 * tags and the page chrome first.
 */
function cleanGretil(raw, url) {
  let text = raw;
  if (/\.htm/i.test(url)) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z#0-9]+;/g, ' ');
  }
  const textMarker = text.indexOf('# Text');
  if (textMarker !== -1) {
    const afterMarker = text.indexOf('\n', textMarker);
    if (afterMarker !== -1) text = text.slice(afterMarker + 1);
  }
  // Drop known GRETIL footers
  text = text.replace(/GRETIL[^\n]*\n-{2,}[\s\S]*$/i, '');
  text = text.replace(/\n-{2,}\n[\s\S]*?http:\/\/gretil/i, '');
  return text.trim();
}

async function fetchRaw(url) {
  const full = GRETIL + url;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(full, { headers: { 'User-Agent': 'live_priors corpus builder' } });
      if (res.ok) return await res.text();
    } catch { /* retry */ }
    await sleep(800);
  }
  return null;
}

async function pull(entry, outDir, manifest, collection) {
  if (!entry.url) {
    console.log(`  ${entry.slug}: ${entry.note}`);
    manifest.skipped.push({ slug: entry.slug, title: entry.title, note: entry.note });
    return;
  }
  process.stdout.write(`  ${entry.slug}... `);
  const raw = await fetchRaw(entry.url);
  if (!raw) {
    console.log('FETCH FAILED');
    manifest.rejected.push({ slug: entry.slug, title: entry.title, reason: 'fetch_failed', url: entry.url });
    return;
  }
  const cleaned = cleanGretil(raw, entry.url);
  const words = wordsIn(cleaned);
  if (words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: entry.slug, title: entry.title, reason: 'under_600_words', words, url: entry.url });
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${entry.slug}.txt`);
  const header = [
    '---',
    `title: ${entry.title}`,
    `collection: ${collection}`,
    `note: ${entry.note || ''}`,
    `source: GRETIL (Göttingen Register of Electronic Texts in Indian Languages)`,
    `source_url: ${GRETIL + entry.url}`,
    `format: IAST transliteration`,
    `license: GRETIL e-text, research use; see header of source file`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + cleaned + '\n', 'utf8');
  manifest.pulled.push({ slug: entry.slug, title: entry.title, words, url: entry.url, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words)`);
  await sleep(400);
}

async function main() {
  console.log('=== Sanskrit Canon Fetcher (GRETIL) ===\n');
  const manifest = {
    source: 'GRETIL (gretil.sub.uni-goettingen.de)',
    license: 'GRETIL e-texts; every file carries the source licence in its header',
    format: 'IAST transliteration (Unicode Roman diacritics) — GRETIL hosts no Devanagari',
    fetched_at: new Date().toISOString(),
    pulled: [],
    skipped: [],
    rejected: [],
  };

  console.log('Upaniṣads →', path.relative(ROOT, UPANISHADS_DIR));
  for (const u of UPANISHADS) await pull(u, UPANISHADS_DIR, manifest, '14-holy-texts/upanishads');

  console.log('\nBhagavadgītā →', path.relative(ROOT, GITA_DIR));
  for (const g of BHAGAVAD_GITA) await pull(g, GITA_DIR, manifest, '14-holy-texts/bhagavad-gita');

  console.log('\nOther Sanskrit originals →', path.relative(ROOT, OTHER_DIR));
  for (const o of OTHER) await pull(o, OTHER_DIR, manifest, '11-multi-language/sanskrit-originals');

  const manifestFile = path.join(ROOT, 'manifests', 'sanskrit-canon-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.skipped.length} skipped, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);