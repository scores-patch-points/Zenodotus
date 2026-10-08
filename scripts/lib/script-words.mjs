// scripts/lib/script-words.mjs — comprehension for scripts the capitalisation
// mechanism cannot see.
//
// The reading organs' surface mechanism reads CAPITALISATION, so a caseless
// script (Han, Kana, Arabic, Hebrew, Thai, …) is a disclosed gap (surfaces.js
// `scriptCoverage`, II.13). The constitution's own remedy is "a per-script
// prior with its own giver and an invariance fixture" — NOT a generic
// substitute. This module is that remedy, and the GIVER is each language's
// own POS prior: its `forms` are the token inventory a human-annotated UD
// treebank (or UniMorph) actually produced, i.e. the language's own
// tokenisation, not a heuristic we invented.
//
//   segmentByPrior(text, prior) -> [{ form, pos, count }]  (segmentation + tag)
//   scriptOf(text)              -> dominant Unicode script name
//   readingFor(text, prior)     -> { script, tokens, matched, coverage, giver }
//
// Spaced scripts (Arabic, Hebrew, IAST, Cyrillic, Greek) split on Unicode
// word boundaries (UAX #29). Unspaced scripts (Han, Kana, Thai, Khmer, Lao,
// Myanmar) use LONGEST-MATCH against the prior's own form vocabulary — the
// token inventory supplies the word boundaries.

// Unicode script ranges, by codepoint. Longest-first order matters for the
// unspaced longest-match, but detection just counts.
const RANGES = [
  ['Han', /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/],
  ['Kana', /[\u3040-\u30ff]/],
  ['Hangul', /[\u1100-\u11ff\uac00-\ud7af]/],
  ['Arabic', /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/],
  ['Hebrew', /[\u0590-\u05ff]/],
  ['Thai', /[\u0e00-\u0e7f]/],
  ['Khmer', /[\u1780-\u17ff]/],
  ['Lao', /[\u0e80-\u0eff]/],
  ['Myanmar', /[\u1000-\u109f]/],
  ['Devanagari', /[\u0900-\u097f]/],
  ['Bengali', /[\u0980-\u09ff]/],
  ['Tamil', /[\u0b80-\u0bff]/],
  ['Telugu', /[\u0c00-\u0c7f]/],
  ['Cyrillic', /[\u0400-\u04ff]/],
  ['Greek', /[\u0370-\u03ff\u1f00-\u1fff]/],
  ['Latin', /[A-Za-z\u00c0-\u024f]/],
];
const UNSPACED = new Set(['Han', 'Kana', 'Hangul', 'Thai', 'Khmer', 'Lao', 'Myanmar']);

/** Dominant script of a text, by codepoint count. */
export function scriptOf(text) {
  const counts = new Map();
  for (const ch of String(text ?? '')) {
    for (const [name, re] of RANGES) {
      if (re.test(ch)) { counts.set(name, (counts.get(name) || 0) + 1); break; }
    }
  }
  let best = 'Unknown', n = 0;
  for (const [k, v] of counts) if (v > n) { best = k; n = v; }
  return best;
}

/** A prior's form vocabulary as a Set, for longest-match. */
function vocabOf(prior) {
  const forms = prior?.forms || {};
  return { forms, has: (s) => Object.prototype.hasOwnProperty.call(forms, s) };
}

/** The majority POS tag recorded for a form in the prior. */
function tagOf(forms, form) {
  const cell = forms[form];
  if (!cell) return null;
  let best = null, n = -1;
  for (const [pos, c] of Object.entries(cell)) if (c > n) { n = c; best = pos; }
  return best;
}

/**
 * Segment text and tag each token from a POSPrior@1.
 * Returns { tokens: [{form, pos, count}], matched, total, giver, script }.
 */
export function readingFor(text, prior) {
  const script = scriptOf(text);
  const { forms, has } = vocabOf(prior);
  const tokens = [];
  let matched = 0, total = 0;

  if (UNSPACED.has(script)) {
    // longest-match (maximal munch) against the prior's own vocabulary
    const s = String(text ?? '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
    const runs = s.split(' ');
    const MAXW = 8;
    for (const run of runs) {
      if (!run) continue;
      let i = 0;
      while (i < run.length) {
        let hit = null, w = 0;
        for (let l = Math.min(MAXW, run.length - i); l >= 1; l--) {
          const cand = run.slice(i, i + l);
          if (has(cand)) { hit = cand; w = l; break; }
        }
        total += 1;
        if (hit) { matched += 1; tokens.push({ form: hit, pos: tagOf(forms, hit) }); i += w; }
        else { tokens.push({ form: run[i], pos: null }); i += 1; } // an OOV single codepoint, typed by leaving pos null
      }
    }
  } else {
    // spaced script: UAX #29-ish word boundaries (letters/numbers runs)
    const words = String(text ?? '').match(/[\p{L}\p{N}\p{M}]+/gu) || [];
    for (const w of words) {
      total += 1;
      if (has(w)) { matched += 1; tokens.push({ form: w, pos: tagOf(forms, w) }); }
      else {
        // tolerate Arabic/Hebrew clitics: try stripping a leading 1–2 char prefix
        let bare = null;
        for (let l = 1; l <= 2 && !bare; l++) {
          const sub = w.slice(l);
          if (sub.length >= 2 && has(sub)) bare = sub;
        }
        if (bare) { matched += 0.5; tokens.push({ form: bare, pos: tagOf(forms, bare), cliticStripped: true }); }
        else tokens.push({ form: w, pos: null });
      }
    }
  }
  return {
    script,
    tokens,
    matched,
    total,
    coverage: total === 0 ? 0 : matched / total,
    giver: prior?.provenance?.giver || prior?.provenance?.source || 'POSPrior@1',
  };
}
