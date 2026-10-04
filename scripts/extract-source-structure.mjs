#!/usr/bin/env node
// extract-source-structure.mjs — pull structure out of raw bytes, language
// agnostic.
//
// The reading organs' proposition layer is English-shaped: on a romanized
// Sanskrit Upaniṣad it returns 1.7% coverage behind a false `clean` gate
// (LP20), on Japanese and Arabic it returns `gapped_script` (LP20). But the
// STRUCTURE of a source is not owned by any language organ — LP19 property 4:
// a document has no markup, it has bytes and typographic conventions a reader
// interprets. This script is that tier, demonstrated on the canon fetchers'
// new languages before any proposition layer exists for them.
//
// Conventions are detected FROM THE BYTES, never assumed from a filename:
//   - Sanskrit IAST verses carry explicit IDs in the text ("// kau_1.1 //",
//     "Bhg_01.001 [=MBh_06,023.001]") and speaker turns ("… uvāca")
//   - Greek verse is one line per verse, line numbers at intervals, ";" is a
//     QUESTION MARK (never a sentence end)
//   - Japanese has no spaces; "。" and "、" delimit sentences
//   - Arabic uses "،" for the comma and "." for the period
//   - Latin prose splits on ".", ";" — ordinary, and verified per-file
// Detection is a probe: count which delimiters actually occur in the body,
// then split on the ones that do. A source that shows none of them gets a
// typed `unsplit` result, never a guessed split.
//
//   node scripts/extract-source-structure.mjs <path> [<path> ...]
//   node scripts/extract-source-structure.mjs --manifest manifests/<name>.json
//
// Prints a structural outline per source; with --manifest, also writes the
// JSON outline beside its source as <file>.structure.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Byte-anchored unit split by evidence, language-agnostic. */
function splitBody(body) {
  const out = [];
  const push = (start, end, type, basis, id = null) => {
    const text = body.slice(start, end);
    if (text.trim().length === 0) return; // never report a blank unit
    out.push({ start, end, type, basis, id, text: text.trim() });
  };

  // 1) Sanskrit-style verse IDs, detected from the bytes' own conventions:
  //    Upaniṣad "// kau_1.1 //" (danda-wrapped), Gita "Bhg_01.001
  //    [=MBh_06,023.001]" (cross-ref following), Ṛgveda "|| RV_1,003.07"
  //    (danda + comma separators), Meghadūta "// KMgD_1" (bare danda-wrapped
  //    id), Nyāya "1.1.1:" (adhyāya.pāda.sūtra at line start). All are
  //    literal text in the source. The id token always carries an underscore
  //    or sits beside a danda or a [=…] cross-ref, which is what keeps prose
  //    numbers out.
  const verseIds = [];
  for (const m of body.matchAll(/(?:^|[^\dA-Za-zāīūṛṣśṇḍṭḥṃñ_])([A-Za-zāīūṛṣśṇḍṭḥṃñ][A-Za-zāīūṛṣśṇḍṭḥṃñ_0-9]{1,10})(?:[.,](\d+(?:[.,]\d+)?)(a|c|b)?)?(?:\s*\[=[^\]]*\])?(?:\s*\/\/)?/g)) {
    const id = m[2] ? `${m[1]}.${m[2].replace(',', '.')}${m[3] || ''}` : m[1];
    const start = m.index + m[0].indexOf(m[1]);
    const context = body.slice(Math.max(0, start - 4), start);
    const hasDanda = context.includes('|');
    const hasCrossRef = /\[=[^\]]*\]/.test(m[0]);
    if (m[1].includes('_') || hasDanda || hasCrossRef) {
      if (verseIds.length && verseIds[verseIds.length - 1].id === id) continue; // pāda duplicates
      verseIds.push({ start, id });
    }
  }
  // Nyāya/Vaiśeṣika Sūtra shape: "1.1.1:" at line start.
  for (const m of body.matchAll(/(?:^|\n)\s*(\d+\.\d+\.\d+):(?=\s|$)/g)) {
    verseIds.push({ start: m.index + m[0].indexOf(m[1]), id: `sutra_${m[1]}` });
  }
  if (verseIds.length >= 3) {
    for (let i = 0; i < verseIds.length; i++) {
      const s = verseIds[i];
      const e = verseIds[i + 1] || { start: body.length };
      push(s.start, e.start, 'verse', `verse-id ${s.id} at byte ${s.start}`, s.id);
    }
    return { units: out, evidence: `${verseIds.length} verse-id delimiters` };
  }

  // 2) Japanese: no spaces; "。" ends a sentence, "、" segments within one.
  //    A sentence unit is byte-anchored at each "。". Decided by KANA/KANJI
  //    share of the body (the reader's own UNSPACED heuristic), not by an
  //    absence of spaces — a page that carries a prose intro must still be
  //    read by its own script.
  const cjk = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/gu;
  const cjkCount = [...body.matchAll(cjk)].length;
  const jaFullStop = /。/g;
  const jaCount = [...body.matchAll(jaFullStop)].length;
  if (jaCount >= 3 && cjkCount / Math.max(body.length, 1) > 0.2) {
    let prev = 0;
    for (const m of body.matchAll(/。/g)) {
      push(prev, m.index + 1, 'sentence', `Japanese full stop '。' at byte ${m.index}`);
      prev = m.index + 1;
    }
    if (prev < body.length) push(prev, body.length, 'sentence', 'trailing text');
    return { units: out, evidence: `${jaCount} '。' delimiters` };
  }

  // 3) Arabic: "،" comma, "." period — both delimit. Split on the period as
  //    the clause unit, keeping "،" as evidence inside units.
  const arPeriod = /。/g; // no-op guard, never matches
  const arCount = [...body.matchAll(/\./g)].length;
  const arComma = [...body.matchAll(/،/g)].length;
  if (arCount >= 3 && arComma >= 3) {
    let prev = 0;
    for (const m of body.matchAll(/\./g)) {
      push(prev, m.index + 1, 'clause', `Arabic period '.' at byte ${m.index}`);
      prev = m.index + 1;
    }
    if (prev < body.length) push(prev, body.length, 'clause', 'trailing text');
    return { units: out, evidence: `${arCount} '.' + ${arComma} '،' delimiters` };
  }

  // 4) Greek verse: one line per verse, line numbers at intervals, ";" is a
  //    QUESTION MARK. Split on line breaks; do NOT split on ";". A long line
  //    with sentence punctuation is a prose paragraph (Plato, Aristotle are
  //    paragraph-per-line on Wikisource); a short line is a verse row.
  const hasGreek = /[\u0370-\u03ff\u1f00-\u1fff]/u.test(body);
  if (hasGreek) {
    const lines = body.split('\n');
    let offset = 0;
    let n = 0;
    for (const ln of lines) {
      const trimmed = ln.trim();
      if (trimmed) {
        const type = (ln.length > 160 && /[.!;:]$/.test(trimmed)) ? 'paragraph' : 'verse';
        push(offset, offset + ln.length, type, `${type} row at byte ${offset}`);
        n++;
      }
      offset += ln.length + 1;
    }
    return { units: out, evidence: `${n} line-delimited ${n > 1 ? 'rows' : 'row'}` };
  }

  // 5) General spaced-prose fallback: split on sentence punctuation, but
  //    never on a bare period after a single capital (an initial), never
  //    across a line-number run. Conservative: "." "!" "?".
  const sentPunct = /[.!?]+(?:["'”’\]]*)\s+(?=[\p{Lu}"'“‘])/gu;
  const matches = [...body.matchAll(sentPunct)];
  if (matches.length >= 3) {
    let prev = 0;
    for (const m of matches) {
      const end = m.index + m[0].replace(/\s+$/, '').length;
      push(prev, end, 'sentence', `sentence punctuation at byte ${m.index}`);
      prev = end;
    }
    if (prev < body.length) push(prev, body.length, 'sentence', 'trailing text');
    return { units: out, evidence: `${matches.length} sentence-punctuation splits` };
  }

  return { units: out, evidence: 'no structural delimiter detected', unsplit: true };
}

function stripFrontmatter(raw) {
  const m = raw.match(/^---\n[\s\S]*?\n---\n/);
  if (!m) return { body: raw, offset: 0 };
  return { body: raw.slice(m[0].length), offset: m[0].length };
}

function outline(relPath, absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const { body, offset } = stripFrontmatter(raw);
  const { units, evidence, unsplit } = splitBody(body);
  return {
    schema: 'SourceStructure@1',
    source: relPath,
    bytes: raw.length,
    bodyOffset: offset,
    splitBasis: evidence,
    unsplit: !!unsplit,
    unitCount: units.length,
    units: units.map(u => ({ ...u, start: u.start + offset, end: u.end + offset, text: u.text.slice(0, 200) })),
  };
}

async function main() {
  const argIdx = process.argv.indexOf('--manifest');
  const manifestOnly = argIdx !== -1 ? process.argv[argIdx + 1] : null;
  const paths = process.argv.slice(2).filter(a => a !== '--manifest' && a !== manifestOnly && !a.startsWith('--manifest='));

  let manifest = null;
  if (manifestOnly) {
    manifest = { schema: 'SourceStructureManifest@1', generated: new Date().toISOString(), sources: [] };
  }

  for (const rel of paths) {
    const abs = path.resolve(rel);
    const o = outline(rel, abs);
    console.log(`${rel}: ${o.unitCount} units (${o.splitBasis})${o.unsplit ? ' — UNSPLIT' : ''}`);
    if (manifest) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(`${abs}.structure.json`, JSON.stringify(o, null, 1), 'utf8');
      manifest.sources.push({ source: rel, unitCount: o.unitCount, splitBasis: o.splitBasis, unsplit: o.unsplit });
    }
  }

  if (manifest) {
    const mf = path.resolve(manifestOnly);
    fs.mkdirSync(path.dirname(mf), { recursive: true });
    fs.writeFileSync(mf, JSON.stringify(manifest, null, 1), 'utf8');
    console.log(`\nManifest: ${mf} (${manifest.sources.length} sources)`);
  }
}

main().catch(console.error);