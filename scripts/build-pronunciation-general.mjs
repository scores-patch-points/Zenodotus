#!/usr/bin/env node
// build-pronunciation-general.mjs — Tadoma's vocabulary, widened past the
// UDHR. This adds SPELLINGS; it does NOT, and cannot, fix DISAMBIGUATION.
//
// build-pronunciation-prior.mjs's own header states its scope on purpose:
// "the word list is the UDHR corpus, deliberately... Broadening to a
// general word list is a real, separate, unbuilt decision." User
// direction (2026-09-22): "Expand that ability to apply to all English if
// possible." This is that decision — for BREADTH only, stated precisely
// below because a second, harder question was asked the same session and
// this file does not answer it.
//
// THE LIMIT, MEASURED, NOT ASSUMED. Every entry this script (and its
// parent) writes is `synthesize(lang, word)` on ONE ISOLATED TOKEN — no
// sentence around it. Direct test this session: `espeak-ng -v en-us
// --ipa` on the real sentences "I read the book yesterday" and "I read
// books every day" returns the IDENTICAL IPA (ɹˈiːd, "reed") for both,
// though the first should read "red" (past tense) — tense lives in the
// SENTENCE, and a bare word carries none. Every other classic English
// heteronym tried bare (lead, record, content, desert, close, tear, bow,
// wind) picks exactly one silent default reading the same way. The
// manifest's own shape — one IPA per spelling — cannot represent two
// readings even once this script widens its vocabulary; running this
// script on "read" a thousand times still writes one entry, one guess.
// A real fix needs sentence-context synthesis keyed by the actual
// grammatical reading (tense, or noun/verb stress shift), pointed at
// native/priors/parser-eng-ewt.json (a real, already-on-disk full
// dependency parser carrying tense/role PER TOKEN IN CONTEXT) rather than
// this script's own bare word list — named here as real, unbuilt work,
// not attempted by this file.
//
// REUSED, NOT DUPLICATED: `synthesize`/`cachePath`/`LANGUAGES` are
// imported from build-pronunciation-prior.mjs unmodified — the same
// espeak-ng invocation, the same sha256-pinned cache shape, the same
// PronunciationPrior@1 entry fields (ipa, sha256, bytes, source, unit).
// That file's own UDHR-scoped build is UNTOUCHED by this one.
//
// EXTENDS THE SAME MANIFEST, NEVER REPLACES IT. resolvePronunciation
// (pronunciation.mjs) reads ONE file per language (manifestPath(lang));
// a second, separate manifest would be invisible to every existing
// caller. This script reads that same committed manifest, adds only
// words not already present, and writes it back — every UDHR entry from
// the original build is preserved byte-for-byte; this can only ever grow
// coverage, never shrink or alter it.
//
// THE WORD LIST is the caller's, not this file's (P4's own discipline —
// declared, never invented here): a plain word-per-line file via --words,
// or --source <path> to derive one from a POS-prior's own `forms` keys
// (JSON: {forms: {word: {...}}}) — the same vocabulary
// adapters/text/nominal-beings.js already classifies, so a word this
// script teaches Tadoma to say is a word the reading pipeline can also
// recognize as a being. Case-folded, deduped, sorted for determinism.
//
// RUN.
//   node build-pronunciation-general.mjs --source ../../the-fold/priors-data/pos-prior-eng.json --limit 2000
//   node build-pronunciation-general.mjs --words wordlist.txt
//   --limit caps how many NEW words this run synthesizes (a real corpus
//   can be tens of thousands of words; espeak-ng is fast but not free —
//   this is a declared budget, not a hidden one). Omit for no cap.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { synthesize, cachePath, LANGUAGES } from "./build-pronunciation-prior.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "pronunciation-priors");
const manifestPath = (lang) => path.join(OUT_DIR, `pronunciation-${lang}.json`);

function parseArgs(argv) {
  const out = { lang: "eng", limit: null, words: null, source: null, log: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang") out.lang = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--words") out.words = argv[++i];
    else if (a === "--source") out.source = argv[++i];
    else if (a === "--quiet") out.log = false;
  }
  return out;
}

/** wordsFromSource(path) — a plain word list from a JSON prior's forms
 * keys (nominal-beings.js's own consumed shape) or a plain word-per-line
 * text file. Never guesses which — the caller's own extension decides. */
function wordsFromSource(srcPath) {
  const raw = fs.readFileSync(srcPath, "utf8");
  if (srcPath.endsWith(".json")) {
    const j = JSON.parse(raw);
    const forms = j.forms ?? j;
    return Object.keys(forms);
  }
  return raw.split(/\s+/).map((w) => w.trim()).filter(Boolean);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const lang = opts.lang;
  if (!LANGUAGES[lang]) throw new Error(`unknown language "${lang}" — not one of ${Object.keys(LANGUAGES).join(", ")}`);

  let raw = [];
  if (opts.words) raw = wordsFromSource(opts.words);
  else if (opts.source) raw = wordsFromSource(opts.source);
  else throw new Error("declare a word source: --words <file> or --source <pos-prior.json>");

  // The SAME token discipline build-pronunciation-prior.mjs's own
  // wordListFor uses for Latin/Cyrillic script: letters/marks/numbers,
  // internal hyphen/apostrophe tolerated, lowercased, deduped, digits-only
  // dropped. Not reused directly (that function reads a CORPUS TEXT, not
  // an already-tokenized key list) but the same rule, stated once here.
  const TOKEN_OK = /^[\p{L}\p{M}][\p{L}\p{M}\p{N}''-]*$/u;
  const words = [...new Set(raw.map((w) => String(w).toLowerCase().trim()).filter((w) => w && TOKEN_OK.test(w) && !/^\d+$/.test(w)))].sort();

  const mPath = manifestPath(lang);
  const manifest = fs.existsSync(mPath) ? JSON.parse(fs.readFileSync(mPath, "utf8")) : { schema: "PronunciationPrior@1", language: lang, giver: `${LANGUAGES[lang].voice} via espeak-ng`, counts: { words: 0, synthesized: 0, refused: 0, bytes: 0 }, words: {}, refusals: [] };

  const already = new Set(Object.keys(manifest.words ?? {}));
  let toDo = words.filter((w) => !already.has(w));
  const skipped = words.length - toDo.length;
  if (Number.isFinite(opts.limit) && opts.limit > 0) toDo = toDo.slice(0, opts.limit);

  if (opts.log) console.log(`${lang}: ${words.length} distinct words from source, ${skipped} already known, ${toDo.length} to synthesize this run`);

  let synthesized = 0, refused = 0, bytes = 0;
  const t0 = Date.now();
  for (let i = 0; i < toDo.length; i++) {
    const w = toDo[i];
    const r = synthesize(lang, w);
    if (r.refused) {
      refused++;
      manifest.refusals = manifest.refusals ?? [];
      manifest.refusals.push({ word: w, refused: r.refused });
      continue;
    }
    fs.mkdirSync(path.dirname(cachePath(lang, r.hash)), { recursive: true });
    fs.writeFileSync(cachePath(lang, r.hash), r.wav);
    manifest.words[w] = { ipa: r.ipa, sha256: r.hash, bytes: r.bytes, source: { kind: "synthesized", engine: "espeak-ng", voice: LANGUAGES[lang].voice, extension: "build-pronunciation-general.mjs" }, unit: LANGUAGES[lang].unit };
    synthesized++;
    bytes += r.bytes;
    if (opts.log && (i + 1) % 200 === 0) {
      const elapsed = (Date.now() - t0) / 1000;
      console.log(`  ${i + 1}/${toDo.length} (${synthesized} ok, ${refused} refused) — ${elapsed.toFixed(0)}s elapsed, ~${(elapsed / (i + 1) * (toDo.length - i - 1)).toFixed(0)}s remaining`);
    }
  }

  manifest.counts = manifest.counts ?? { words: 0, synthesized: 0, refused: 0, bytes: 0 };
  manifest.counts.words = Object.keys(manifest.words).length;
  manifest.counts.synthesized = (manifest.counts.synthesized ?? 0) + synthesized;
  manifest.counts.refused = (manifest.counts.refused ?? 0) + refused;
  manifest.counts.bytes = (manifest.counts.bytes ?? 0) + bytes;
  manifest.extendedAt = new Date().toISOString();
  manifest.disambiguatesHeteronyms = false; // stated, not silent — see this file's own header
  fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2));

  if (opts.log) console.log(`\n${lang}: manifest now ${manifest.counts.words} total words (${synthesized} new this run, ${refused} refused this run, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
