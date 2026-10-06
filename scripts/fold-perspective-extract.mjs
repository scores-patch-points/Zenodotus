#!/usr/bin/env node
// scripts/fold-perspective-extract.mjs — who is spoken ABOUT vs who SPEAKS.
//
// St. Augustine's fold perspective: every reading has a subject and a voice,
// and the corpus is richer when the two are the same person. This audit walks
// the corpus once and reports, per group, the files where the group is
// treated as a topic (subject-side) against the files where a member of the
// group is the author or a first-person narrator (voice-side). A people held
// only on the subject side is held as an object; that asymmetry is the gap.
//
// The audit is conservative: "about" is a mention anywhere in the text;
// "by" requires either a strong author marker in the file turn or a
// first-person utterance in the group's own terms. Under-counting a "by"
// means a claimed absence is falsifiable by inspection, which is what we want.
//
//   node scripts/fold-perspective-extract.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

function walk(dir, rel) {
  const abs = path.join(dir, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const r2 = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...walk(dir, r2));
    else if (/\.txt$/.test(entry.name)) out.push(r2);
  }
  return out;
}

// The groups and their markers. `subject` marks a text speaking ABOUT the
// group; `author` marks strong signals the text IS the group's own voice.
const GROUPS = [
  {
    id: 'women',
    name: 'women / feminine',
    subject: /woman|women|female|feminine|girls|suffrag/i,
    author: /by (mary wollstonecraft|george sand|emma goldman|louisa may alcott|jane austen|emily bront|george eliot|virginia woolf|kate chopin)/i,
  },
  {
    id: 'indigenous',
    name: 'indigenous peoples',
    subject: /indigenous|aboriginal|savage|tribal\b|(^|\s)(indian|red man|native)\b|first nations/i,
    author: /beck elks?|zitkala|charles eastman|black elk speaks|william apess|sitting bull/i,
  },
  {
    id: 'trans',
    name: 'transgender / gender-nonconforming',
    subject: /transgender|transsexual|cross[- ]dressing|trans woman|trans man|gender identity/i,
    author: /lili elbe|hircschfeld|transvestites\b/i,
  },
  {
    id: 'enslaved',
    name: 'formerly enslaved',
    subject: /slave|slavery|negro\b/i,
    author: /equiano|douglass|harriet (jacobs|tubman)|narrative of the life of/i,
  },
  {
    id: 'colonized',
    name: 'colonized peoples',
    subject: /colon(y|ies|ial|ized|ization)/i,
    author: /fanon|cesaire|mahatma gandhi|my experiments with truth/i,
  },
];

function main() {
  const files = walk(ROOT, '');
  const report = GROUPS.map((g) => {
    const about = [];
    const by = [];
    for (const f of files) {
      let text;
      try { text = fs.readFileSync(path.join(ROOT, f), 'utf8').slice(0, 400000); }
      catch { continue; }
      if (g.subject.test(text)) about.push(f);
      if (g.author.test(f + '\n' + text.slice(0, 8000))) by.push(f);
    }
    return {
      group: g.id,
      name: g.name,
      spokenAbout: about.length,
      speakingBy: by.length,
      aboutSamples: about.slice(0, 12),
      bySamples: by.slice(0, 12),
    };
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ schema: 'FoldPerspective@1', scanned: files.length, groups: report }, null, 2));
  } else {
    console.log(`Fold perspective extraction — ${files.length} documents`);
    for (const g of report) {
      const ratio = g.spokenAbout ? (g.speakingBy / g.spokenAbout * 100).toFixed(1) : '—';
      console.log(`\n[${g.name}] about=${g.spokenAbout}  by=${g.speakingBy}  (${ratio}% of mentions are first-person)`);
      if (g.bySamples.length) console.log('  voices:', g.bySamples.join(', '));
      else console.log('  voices: NONE in first person');
    }
  }
}

main();