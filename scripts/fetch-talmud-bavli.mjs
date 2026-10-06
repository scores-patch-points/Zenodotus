#!/usr/bin/env node
// Fetch the Babylonian Talmud (Bavli) in its original language — Mishnaic
// Hebrew and Aramaic — from the Sefaria Vilna text (William Davidson Edition,
// vocalized). One file per tractate, each daf concatenated and tagged, so the
// corpus holds the living words of the rabbis in the language they actually
// argued in; no translation stands in for them.
//
// Resumable: skip tractates whose output file already exists. `--limit N`
// fetches at most N tractates (useful for a first pass / testing).
//
//   node scripts/fetch-talmud-bavli.mjs [--limit 1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '14-holy-texts', 'talmud-bavli');
const API = 'https://www.sefaria.org/api/texts/';
const UA = 'eo-corpus/1.0 (slow research fetcher)';

// The 37 tractates of the Babylonian Talmud, in the traditional order.
const MESECHTOT = [
  ['Berakhot', 'ברכות'],
  ['Shabbat', 'שבת'], ['Eruvin', 'עירובין'], ['Pesachim', 'פסחים'], ['Rosh Hashanah', 'ראש השנה'],
  ['Yoma', 'יומא'], ['Sukkah', 'סוכה'], ['Beitzah', 'ביצה'], ['Taanit', 'תענית'],
  ['Megillah', 'מגילה'], ['Moed Katan', 'מועד קטן'], ['Chagigah', 'חגיגה'],
  ['Yevamot', 'יבמות'], ['Ketubot', 'כתובות'], ['Nedarim', 'נדרים'], ['Nazir', 'נזיר'],
  ['Sotah', 'סוטה'], ['Gittin', 'גיטין'], ['Kiddushin', 'קידושין'],
  ['Bava Kamma', 'בבא קמא'], ['Bava Metzia', 'בבא מציעא'], ['Bava Batra', 'בבא בתרא'],
  ['Sanhedrin', 'סנהדרין'], ['Makkot', 'מכות'], ['Shevuot', 'שבועות'],
  ['Avodah Zarah', 'עבודה זרה'], ['Horayot', 'הוריות'],
  ['Zevachim', 'זבחים'], ['Menachot', 'מנחות'], ['Chullin', 'חולין'], ['Bekhorot', 'בכורות'],
  ['Arakhin', 'ערכין'], ['Temurah', 'תמורה'], ['Keritot', 'כריתות'], ['Meilah', 'מעילה'],
  ['Tamid', 'תמיד'], ['Niddah', 'נידה'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function stripTags(he) {
  return String(he ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchDaf(ref) {
  const url = `${API}${encodeURIComponent(ref)}?version=Vilna`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) {
        const wait = 20000 + attempt * 20000;
        console.error(`    ${ref}: 429, sleeping ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) { console.error(`    ${ref}: HTTP ${res.status}`); return null; }
      const data = await res.json();
      const he = Array.isArray(data?.he) ? data.he.join(' ') : (data?.he ?? '');
      return { text: stripTags(he), next: data?.next ?? null };
    } catch (e) {
      console.error(`    ${ref}: ${e.message}`);
      await sleep(15000 * (attempt + 1));
    }
  }
}

async function fetchTractate(name, heName) {
  const out = path.join(OUT_DIR, `${slug(name)}.txt`);
  if (fs.existsSync(out)) { console.log(`skip ${name} (present)`); return null; }
  console.log(`== ${name} (${heName})`);
  const dappim = [];
  // The Vilna pagination begins at daf 2a; Sefaria's own `next` pointer tells
  // us where each daf leads, so we never hardcode a tractate's length and
  // never invent a daf past the real last one ("ends at Daf 64a").
  let ref = `${name}.2a`;
  let d = 1;
  while (ref) {
    // Sefaria's `next` pointer arrives as "Shabbat 2b"; the API expects a dot.
    ref = ref.replace(/\s+/, '.');
    const got = await fetchDaf(ref);
    if (!got) break;
    const leaf = ref.replace(/^.*?\./, '');
    if (got.text && got.text.length > 20) dappim.push(`\n### דף ${leaf} — ${name} ${leaf}\n\n${got.text}`);
    else console.error(`    ${leaf}: no text`);
    ref = got.next && got.next !== ref ? String(got.next).replace(/\s+/, '.') : null;
    if (d % 20 === 0) console.error(`  ${name}: ${d} dappim so far (at ${leaf})`);
    d++;
    if (d > 300) { console.error(`    ${name}: runaway daf walk at ${ref}`); break; }
    await sleep(1500);
  }
  if (!dappim.length) { console.error(`  ${name}: nothing fetched`); return null; }
  const fm = [
    '---',
    `title: תלמוד בבלי — מסכת ${heName} (${name})`,
    'collection: 14-holy-texts/talmud-bavli',
    'source: Sefaria Vilna (William Davidson Edition — vocalized Hebrew/Aramaic)',
    `source_url: https://www.sefaria.org/${encodeURIComponent(name)}`,
    'format: Hebrew and Aramaic (Vilna), vocalized',
    "license: per Sefaria's text license — William Davidson Talmud (CC-BY-NC, with the Vilna pagination; see https://www.sefaria.org/developers)",
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(out, fm + dappim.join('\n') + '\n');
  console.log(`  ${name}: ${dappim.length} dappim written`);
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
  let done = 0;
  for (const [name, heName] of MESECHTOT) {
    if (done >= limit) break;
    await fetchTractate(name, heName);
    done++;
    await sleep(3000);
  }
}

main().catch(console.error);