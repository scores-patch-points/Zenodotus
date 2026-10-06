#!/usr/bin/env node
// scripts/fetch-first-person-voices.mjs — the public-domain testimony of the
// people the corpus was about, now speaking for themselves.
//
// This closes the gap the fold perspective extraction measured: women
// (750 documents about), indigenous peoples (480 about), the formerly
// enslaved (297 about), trans people (nearly unmentioned) — at near-zero
// first-person voice. Every work below is public domain; each is fetched with
// provenance frontmatter, in the author's own language, and nothing is typed
// from memory.
//
//   node scripts/fetch-first-person-voices.mjs [--limit N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '20-first-person-voices');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) eo-corpus/1.0';

const WORKS = [
  { file: 'wollstonecraft-vindication.txt', title: 'A Vindication of the Rights of Woman', author: 'Mary Wollstonecraft', year: '1792', lang: 'English', url: 'https://www.gutenberg.org/ebooks/16199.txt.utf-8', source: 'Project Gutenberg #16199' },
  { file: 'equiano-narrative.txt', title: 'The Interesting Narrative of the Life of Olaudah Equiano', author: 'Olaudah Equiano', year: '1789', lang: 'English', url: 'https://www.gutenberg.org/ebooks/15399.txt.utf-8', source: 'Project Gutenberg #15399' },
  { file: 'douglass-narrative.txt', title: 'Narrative of the Life of Frederick Douglass', author: 'Frederick Douglass', year: '1845', lang: 'English', url: 'https://www.gutenberg.org/ebooks/23.txt.utf-8', source: 'Project Gutenberg #23' },
  { file: 'douglass-my-bondage.txt', title: 'My Bondage and My Freedom', author: 'Frederick Douglass', year: '1855', lang: 'English', url: 'https://www.gutenberg.org/ebooks/10431.txt.utf-8', source: 'Project Gutenberg #10431' },
  { file: 'jacobs-incidents.txt', title: 'Incidents in the Life of a Slave Girl', author: 'Harriet Jacobs (ed. Lydia Maria Child)', year: '1861', lang: 'English', url: 'https://www.gutenberg.org/ebooks/11030.txt.utf-8', source: 'Project Gutenberg #11030' },
  { file: 'zitkala-american-indian-stories.txt', title: 'American Indian Stories', author: 'Zitkala-Ša (Gertrude Simmons Bonnin)', year: '1921', lang: 'English', url: 'https://www.gutenberg.org/ebooks/10376.txt.utf-8', source: 'Project Gutenberg #10376' },
  { file: 'eastman-indian-boyhood.txt', title: 'Indian Boyhood', author: 'Charles A. Eastman (Ohiyesa)', year: '1902', lang: 'English', url: 'https://www.gutenberg.org/ebooks/337.txt.utf-8', source: 'Project Gutenberg #337' },
  { file: 'hirschfeld-transvestites.txt', title: 'Die Transvestiten: eine Untersuchung über den erotischen Verkleidungstrieb', author: 'Magnus Hirschfeld', year: '1910', lang: 'German (original)', url: 'https://archive.org/download/hirschfeld-1910/Die%20Transvestiten_%20eine%20Untersuchung%20%C3%BCber%20den%20erotischen%20Verkleidungstrieb%20mit%20umfangreichem%20casuistischen%20und%20historischen%20Material_djvu.txt', source: 'archive.org hirschfeld-1910 (1910 original)' },
  { file: 'woolf-room-of-ones-own.txt', title: "A Room of One's Own", author: 'Virginia Woolf', year: '1929', lang: 'English', url: 'https://archive.org/download/virginia-woolf-a-room-of-ones-own/Virginia_Woolf_-_A_Room_of_Ones_Own_djvu.txt', source: 'archive.org virginia-woolf-a-room-of-ones-own (Hogarth 1929)' },
  { file: 'hurston-how-it-feels-to-be-colored-me.txt', title: 'How It Feels to Be Colored Me', author: 'Zora Neale Hurston', year: '1928', lang: 'English', url: 'https://www.gutenberg.org/ebooks/73549.txt.utf-8', source: 'Project Gutenberg #73549' },
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Strip the Gutenberg/IA banner and trailer down to the work itself; keep the
// first "***" to "***" START..END block where spotted, else the whole body.
function clean(text, file) {
  let t = text;
  if (file === 'hirschfeld-transvestites.txt') {
    // IA djvu.txt: strip leading OCR noise, keep the book
    const start = t.search(/VORWORT|Vorwort|Einleitung|TRANSWESTITEN/i);
    if (start > -1) t = t.slice(Math.max(0, start - 200));
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }
  const startM = t.match(/\*\*\* START OF .*? \*\*\*/s);
  const endM = t.match(/\*\*\* END OF .*? \*\*\*/s);
  if (startM && endM) t = t.slice(startM.index + startM[0].length, endM.index);
  else if (startM) t = t.slice(startM.index + startM[0].length);
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
  let done = 0;
  for (const w of WORKS) {
    if (done >= limit) break;
    const out = path.join(OUT_DIR, w.file);
    if (fs.existsSync(out)) { console.log(`skip ${w.file}`); continue; }
    try {
      const raw = await fetchText(w.url);
      const body = clean(raw, w.file);
      const fm = [
        '---',
        `title: ${w.title}`,
        `author: ${w.author}`,
        `year: ${w.year}`,
        `language: ${w.lang}`,
        `collection: 20-first-person-voices`,
        `source: ${w.source}`,
        `source_url: ${w.url}`,
        'license: public domain',
        'perspective: the author\'s own first person',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(out, fm + '\n' + body + '\n');
      console.log(`  ${w.file}: ${body.length} chars`);
    } catch (e) {
      console.error(`  ${w.file}: ${e.message}`);
    }
    done++;
  }
}

main().catch(console.error);