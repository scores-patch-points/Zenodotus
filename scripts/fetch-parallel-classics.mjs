#!/usr/bin/env node
// Parallel classics fetcher — same public-domain work, independently
// translated into several languages, for direct cross-language comparison
// ("Rosetta Stone" style) rather than the one-original-language texts that
// make up most of live_priors. Added 2026-09-09 alongside the Concepticon
// pull, extending 11-multi-language/ (which already carries one hand-built
// example of this shape: war-and-peace/, en+ru+fr).
//
// EVERY (title, lang) -> Gutenberg id pair below was resolved live against
// the Gutendex API (gutendex.com, a maintained index of Project Gutenberg's
// own catalog metadata) and spot-checked, not typed from memory. This
// matters here specifically: `digested/CORPUS-INTEGRITY-FINDING.md`
// documents that every one of the 20 hand-typed ids in
// `fetch-gutenberg-non-en.mjs` turned out to name the wrong book, or the
// right book in the wrong language, once the downloaded bytes were actually
// read — the ids were plausible-looking guesses, never verified against a
// catalog. This script does not repeat that: `verifyIdentity()` below reads
// each download's own declared Project Gutenberg header (or, for older
// etexts without one, its opening text) and REFUSES to save anything whose
// content doesn't match the author/title it was fetched for. A refusal is
// recorded in the manifest with what was actually found, never silently
// dropped and never silently saved under the wrong label.
//
//   node scripts/fetch-parallel-classics.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, '11-multi-language', 'parallel-classics');

// Each edition's `id` was found via, e.g.:
//   curl -s "https://gutendex.com/books/?search=<title>&languages=<lang>"
// and its author field checked against `authorMatch` before being listed
// here. That is a pre-check on the catalog metadata, not a substitute for
// `verifyIdentity()`, which checks the actual downloaded bytes.
const WORKS = [
  {
    slug: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    authorMatch: 'carroll',
    titleKeyword: 'alice',
    editions: [
      { lang: 'en', id: 11 },
      { lang: 'de', id: 19778 },
      { lang: 'fr', id: 55456 },
      { lang: 'it', id: 28371 },
    ],
  },
  {
    slug: 'pinocchio',
    title: 'The Adventures of Pinocchio',
    authorMatch: 'collodi',
    titleKeyword: 'pinocchio',
    editions: [
      // pg19517, the first id found for this title, turned out on inspection
      // to be a LibriVox AUDIO edition whose "text/plain" file is a chapter
      // timing index, not the novel (3,556 words vs. this one's 43,211) —
      // same defect class as pg20972 below, caught here by comparing word
      // counts across language editions rather than trusting the format
      // label alone.
      { lang: 'it', id: 52484, note: 'original: Le avventure di Pinocchio: Storia di un burattino' },
      { lang: 'en', id: 500 },
      { lang: 'fi', id: 53077 },
    ],
  },
  {
    slug: 'grimms-fairy-tales',
    title: "Grimms' Fairy Tales",
    authorMatch: 'grimm',
    titleKeyword: null, // translated titles vary too widely ("Märchen", "Contes", "meséi"); author field carries the check
    editions: [
      { lang: 'en', id: 2591 },
      { lang: 'de', id: 77905, note: 'Deutsche Märchen gesammelt durch die Brüder Grimm' },
      { lang: 'fr', id: 12250, note: 'Contes choisis de la famille — a selection, not the complete collection' },
      { lang: 'hu', id: 40088 },
      { lang: 'fi', id: 45046 },
    ],
  },
  {
    slug: 'robinson-crusoe',
    title: 'Robinson Crusoe',
    authorMatch: 'defoe',
    titleKeyword: 'robinson',
    editions: [
      { lang: 'en', id: 521 },
      { lang: 'fr', id: 38705, note: 'part 1 of 2' },
      { lang: 'nl', id: 41427, note: 'part 1 of 2' },
      { lang: 'fi', id: 48387 },
      { lang: 'de', id: 60344 },
    ],
  },
  {
    slug: 'gullivers-travels',
    title: "Gulliver's Travels",
    authorMatch: 'swift',
    titleKeyword: 'gulliver',
    editions: [
      { lang: 'en', id: 829 },
      { lang: 'fr', id: 17640 },
      { lang: 'it', id: 61179 },
      { lang: 'nl', id: 37442 },
      { lang: 'fi', id: 44892 },
      { lang: 'hu', id: 76042 },
    ],
  },
  {
    slug: 'faust-part-1',
    title: 'Faust, Part 1',
    authorMatch: 'goethe',
    titleKeyword: 'faust',
    editions: [
      { lang: 'de', id: 2229, note: 'original: Der Tragödie erster Teil' },
      { lang: 'en', id: 3023 },
      { lang: 'fr', id: 54202 },
      { lang: 'es', id: 68566, note: 'Fausto: Primera parte' },
      { lang: 'nl', id: 67276 },
    ],
  },
  {
    slug: 'perraults-fairy-tales',
    title: "Perrault's Fairy Tales",
    authorMatch: 'perrault',
    titleKeyword: null, // translated titles ("Gänsemütterchens Märchen", "Hanhiemon satuja") don't share a keyword
    editions: [
      // pg20972, the canonical PG id for the French original (Histoires ou
      // Contes du temps passé avec des moralités), is a LibriVox AUDIO
      // edition on Gutenberg — its only "text/plain" format is a readme
      // about the recording, not the book. No other id found for the
      // complete French original with real body text (pg33931 is a
      // bilingual en/fr dual-text edition, pg17098 is a single tale) — see
      // manifest `rejected` / README for this gap, left open rather than
      // forced.
      { lang: 'en', id: 17208, note: 'The Tales of Mother Goose: As First Collected by Charles Perrault' },
      { lang: 'de', id: 42900 },
      { lang: 'fi', id: 48713 },
    ],
  },
];

/**
 * Resolve the real plain-text download URL via Gutendex's per-book format
 * list rather than guessing a cache path — Gutenberg serves different ids
 * from different paths (`/cache/epub/{id}/pg{id}.txt` for most, but
 * `/files/{id}/{id}.txt` for others), and some ids' only "text/plain" format
 * is a LibriVox readme, not the book. Falls back to the two common guessed
 * paths if the Gutendex lookup itself fails (e.g. Gutendex is down).
 */
async function resolveTextUrl(id) {
  try {
    const res = await fetch(`https://gutendex.com/books/${id}/`);
    if (res.ok) {
      const meta = await res.json();
      const plainUrls = Object.entries(meta.formats || {})
        .filter(([k]) => k.startsWith('text/plain'))
        .map(([, v]) => v)
        .filter(u => !/-readme\.txt$/i.test(u));
      if (plainUrls.length) return plainUrls[0];
      return null; // book has no real plain-text edition — don't guess
    }
  } catch {
    /* fall through to guessed paths */
  }
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
}

async function fetchGutenbergText(id) {
  const url = await resolveTextUrl(id);
  if (!url) return null;
  for (const candidate of [url, `https://www.gutenberg.org/cache/epub/${id}/pg${id}-0.txt`]) {
    try {
      const res = await fetch(candidate);
      if (res.ok) return await res.text();
    } catch {
      /* try next url */
    }
  }
  return null;
}

function stripHeaderFooter(text) {
  let start = text.indexOf('*** START OF');
  if (start === -1) start = text.indexOf('*END THE SMALL PRINT');
  if (start !== -1) {
    const nl = text.indexOf('\n', start);
    if (nl !== -1) text = text.slice(nl + 1);
  }
  let end = text.indexOf('*** END OF');
  if (end === -1) end = text.indexOf('End of the Project Gutenberg');
  if (end !== -1) text = text.slice(0, end);
  return text.trim();
}

function normalize(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Read the download's own declared identity — the Project Gutenberg header's
 * `Title:`/`Author:` fields where present, otherwise the opening text — and
 * check it against what this edition was fetched to be. Never trusts the
 * filename or the catalog id alone; those are exactly what was wrong in
 * `digested/CORPUS-INTEGRITY-FINDING.md`.
 */
function verifyIdentity(rawText, work) {
  const head = rawText.slice(0, 4000);
  const titleMatch = head.match(/^Title:\s*(.+)$/im);
  const authorMatch = head.match(/^Author:\s*(.+)$/im);
  const declaredTitle = titleMatch?.[1]?.trim() || null;
  const declaredAuthor = authorMatch?.[1]?.trim() || null;

  const searchable = normalize(`${declaredTitle || ''} ${declaredAuthor || ''} ${declaredTitle || declaredAuthor ? '' : head}`);
  const authorOk = searchable.includes(normalize(work.authorMatch));
  const titleOk = !work.titleKeyword || searchable.includes(normalize(work.titleKeyword));

  return {
    ok: authorOk && titleOk,
    declaredTitle,
    declaredAuthor,
    authorOk,
    titleOk,
  };
}

async function main() {
  console.log('=== Parallel Classics Fetcher ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    source: 'Project Gutenberg, via Gutendex (gutendex.com) for id resolution',
    license: 'Public domain (mostly pre-1929 US; every edition here is a Gutenberg-hosted text, per fetch-gutenberg.mjs\'s existing convention for this corpus)',
    verification: 'Every download\'s own declared Title:/Author: header (or opening text, for etexts without one) is checked against the work it was fetched for before being saved. Mismatches are recorded under `rejected`, never saved.',
    fetched_at: new Date().toISOString(),
    works: [],
    rejected: [],
  };

  for (const work of WORKS) {
    console.log(`\n${work.title} (${work.authorMatch})`);
    const workEntry = { slug: work.slug, title: work.title, editions: [] };
    const workDir = path.join(OUTPUT_DIR, work.slug);

    for (const ed of work.editions) {
      process.stdout.write(`  ${ed.lang} pg${ed.id}... `);
      const raw = await fetchGutenbergText(ed.id);
      if (!raw) {
        console.log('fetch failed');
        manifest.rejected.push({ work: work.slug, lang: ed.lang, id: ed.id, reason: 'fetch_failed' });
        await sleep(400);
        continue;
      }

      const check = verifyIdentity(raw, work);
      if (!check.ok) {
        console.log(`REJECTED — declared "${check.declaredTitle || '?'}" by "${check.declaredAuthor || '?'}" (author match: ${check.authorOk}, title match: ${check.titleOk})`);
        manifest.rejected.push({
          work: work.slug, lang: ed.lang, id: ed.id, reason: 'identity_mismatch',
          declaredTitle: check.declaredTitle, declaredAuthor: check.declaredAuthor,
        });
        await sleep(400);
        continue;
      }

      const cleaned = stripHeaderFooter(raw);
      const words = wordsIn(cleaned);
      if (words < 600) {
        console.log(`too short (${words} words)`);
        manifest.rejected.push({ work: work.slug, lang: ed.lang, id: ed.id, reason: 'under_600_words', words });
        await sleep(400);
        continue;
      }

      const langDir = path.join(workDir, ed.lang);
      fs.mkdirSync(langDir, { recursive: true });
      const titleSlug = slugify(check.declaredTitle || work.title, 50);
      const file = path.join(langDir, `pg${ed.id}_${titleSlug}.txt`);
      fs.writeFileSync(file, cleaned, 'utf8');

      console.log(`ok — "${check.declaredTitle}" (${words} words)`);
      workEntry.editions.push({
        lang: ed.lang, id: ed.id, note: ed.note || null,
        declaredTitle: check.declaredTitle, declaredAuthor: check.declaredAuthor,
        words, file: path.relative(ROOT, file),
      });
      await sleep(400);
    }

    // A LibriVox audio edition's "text/plain" format can be a chapter-timing
    // index rather than the book (pg19517 was exactly this: passed identity
    // verification — its own header genuinely says "Pinocchio" / "Collodi"
    // — at 3,556 words against this same work's other editions running
    // 32,000-43,000). No fixed word-count floor catches that; comparing
    // editions of the SAME work against each other does. An edition running
    // under a quarter of this work's median is pulled back out and recorded
    // as a rejection instead of a silent stub sitting next to real text —
    // UNLESS its listing above already carries a `note` acknowledging it's
    // partial (e.g. "a selection, not the complete collection"): that's a
    // declared limitation, not a discovered defect, and this check exists
    // to catch the latter.
    if (workEntry.editions.length > 1) {
      const wordCounts = workEntry.editions.map(e => e.words).sort((a, b) => a - b);
      const median = wordCounts[Math.floor(wordCounts.length / 2)];
      const kept = [];
      for (const e of workEntry.editions) {
        if (e.words < median / 4 && !e.note) {
          console.log(`  ${e.lang} pg${e.id}... RETRACTED — ${e.words} words vs. this work's median ${median} (likely a stub, not the full text)`);
          fs.rmSync(path.join(ROOT, e.file), { force: true });
          manifest.rejected.push({
            work: work.slug, lang: e.lang, id: e.id, reason: 'length_outlier',
            declaredTitle: e.declaredTitle, declaredAuthor: e.declaredAuthor,
            words: e.words, workMedianWords: median,
          });
        } else {
          kept.push(e);
        }
      }
      workEntry.editions = kept;
    }

    if (workEntry.editions.length) manifest.works.push(workEntry);
  }

  const totalEditions = manifest.works.reduce((n, w) => n + w.editions.length, 0);
  const langCoverage = new Set(manifest.works.flatMap(w => w.editions.map(e => e.lang)));

  const readme = `# Parallel classics — same work, independently translated

Every subdirectory here is ONE public-domain work, fetched in several
languages, verified so each language edition actually carries the declared
work: \`scripts/fetch-parallel-classics.mjs\` reads each download's own
Project Gutenberg header (\`Title:\`/\`Author:\`) or opening text before
saving it, and refuses anything that doesn't match — see that script's
header comment and \`digested/CORPUS-INTEGRITY-FINDING.md\` for why this
check exists (a sibling directory, \`gutenberg-non-en/\`, has every one of
its 20 files mislabeled because no such check was run when it was built).

Unlike the rest of live_priors — where a given novel, statute or article
exists in one original language — these are meant for direct cross-language
comparison at the level of a whole work: the same events, the same
sentences in different clothing, chapter for chapter.

## Works (${manifest.works.length} works, ${totalEditions} editions, ${langCoverage.size} languages)

| Work | Author | Languages |
|---|---|---|
${manifest.works.map(w => `| ${w.title} | ${w.editions[0]?.declaredAuthor || '?'} | ${w.editions.map(e => e.lang).join(', ')} |`).join('\n')}

## Rejected

${manifest.rejected.length} candidate edition(s) were fetched but not saved,
either because the downloaded text's own declared identity didn't match what
it was fetched for, or because it fell under the corpus's 600-word floor.
Full detail in \`manifests/parallel-classics-manifest.json\` under
\`rejected\` — nothing here was silently dropped.

## License

Public domain — every edition is a Project Gutenberg-hosted text (mostly
pre-1929 US publication, per the convention already used by
\`fetch-gutenberg.mjs\` for the rest of this corpus). Gutenberg ids were
resolved live against [Gutendex](https://gutendex.com) rather than typed
from memory.
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf8');

  const manifestFile = path.join(ROOT, 'manifests', 'parallel-classics-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.works.length} works, ${totalEditions} editions across ${langCoverage.size} languages, ${manifest.rejected.length} rejected ===`);
}

main().catch(console.error);
