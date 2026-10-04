#!/usr/bin/env node
// build-pronunciation-prior.mjs — PronunciationPrior@1: a SOUND-FIRST
// pronunciation dictionary for the languages the Rosetta actually reads.
//
// The representation question, settled as a design decision (user
// direction, 2026-09-22): store the WAV of the sound, not a transcription.
// ARPAbet is English-shaped and IPA is a European linguist's projection —
// both are interpretations of a sound, and this repo's own discipline is
// that the surface is the exact bytes. For pronunciation, the exact bytes
// ARE the sound. So the prior stores, per surface word: the synthesized
// WAV (sha256-pinned), the espeak-ng IPA the same engine derives (kept as
// a DERIVED annotation, never the record), and the full recipe that
// produced the bytes.
//
// THE REPO'S OWN LAW, APPLIED (lang-registry.mjs:9-10): "bytes are
// committed only where something reads them; otherwise the recipe plus the
// source address plus its sha256 IS the artifact." So:
//   - the MANIFEST is committed (word -> {ipa, sha256, voice, engine,
//     license}) — it is the recipe;
//   - the WAV BYTES resolve into a gitignored cache
//     (derived-priors/pronunciation-priors/cache/<lang>/<sha256>.wav),
//     synthesized on demand by the lookup API and pinned by sha256 so a
//     later synthesis is verifiable.
// A fresh checkout reads the manifest and synthesizes the cache back —
// deterministic, reproducible, no vendored megabytes.
//
// WHY ESpeak-NG. It is the one synthesis engine whose phoneme tables ship
// open and per-language for every Rosetta language (en-us, fr, es, ru, ar,
// cmn) and it emits both WAV bytes and IPA for the same word from the same
// engine — the transcription and the sound cannot drift apart because the
// engine is the source of both. It is GPL-3.0; the license is carried in
// every manifest and disclosed, never silent.
//
// WHY THE UDHR TEXTS ARE THE WORD LIST. The Rosetta (native/eval/lavar/
// udhr-rosetta.mjs) reads exactly these six texts; this dictionary is
// coverage for THAT reading, so the word list is the distinct surface
// forms those texts actually present — the same "a prior with no consumer
// is not coverage" rule (POLICIES.md LP10) that gates every other derived
// prior here. Chinese (cmn_hans) has no whitespace segmentation; its unit
// is the clause, and that is disclosed per entry.
//
// RUN. Requires espeak-ng on PATH (or ESpeakNG=/abs/path).
//   node scripts/build-pronunciation-prior.mjs           # all six
//   node scripts/build-pronunciation-prior.mjs eng spa   # a subset
//
// The word list is read from the Rosetta's own corpus directory
// (live_priors/06-government-legal/un-udhr/), the same CORPUS constant
// udhr-rosetta.mjs reads.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "pronunciation-priors");
const CACHE_DIR = path.join(OUT_DIR, "cache");
const CORPUS = "/Users/mlacy/Documents/3.0/live_priors/06-government-legal/un-udhr";

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const espeak = () => process.env.ESpeakNG || (() => { try { return execFileSync("which", ["espeak-ng"], { encoding: "utf8" }).trim(); } catch { return null; } })();

// The six Rosetta languages (udhr-rosetta.mjs LANGUAGES minus ell, which
// the reading corroborates as a seventh — the requested scope is the six).
// voice: the espeak-ng voice; file: the corpus text it reads; unit:
// "word" for whitespace languages, "clause" for cmn_hans (no whitespace
// segmentation — disclosed per entry).
export const LANGUAGES = {
  eng: { voice: "en-us", file: "udhr-eng.txt", unit: "word", note: "English, the reading's reference language" },
  fra: { voice: "fr", file: "udhr-fra.txt", unit: "word", note: "French, the reading's corroborating pair" },
  spa: { voice: "es", file: "udhr-spa.txt", unit: "word", note: "Spanish" },
  rus: { voice: "ru", file: "udhr-rus.txt", unit: "word", note: "Russian" },
  arb: { voice: "ar", file: "udhr-arb.txt", unit: "word", note: "Arabic (Modern Standard)" },
  cmn_hans: { voice: "cmn", file: "udhr-cmn_hans.txt", unit: "clause", note: "Mandarin Simplified — no whitespace segmentation, unit is the clause" },
};

// Tokenizers. Whitespace languages: letter/mark/number runs with internal
// hyphens and apostrophes, lowercased (Latin/Cyrillic only — Arabic has no
// case; lowercasing Arabic would mangle it). Chinese: Han runs split on
// punctuation — the clause is the pronunciation unit for a tonal language
// (tone sandhi needs context, a single character is not the sound).
const TOKEN = /[\p{L}\p{M}\p{N}]+(?:[’'·-][\p{L}\p{M}\p{N}]+)*/gu;
const PUNCT = /[，。、；：！？（）\s]+/u;
const HAN = /[\p{Script=Han}]+/gu;

export function wordListFor(lang, text) {
  if (LANGUAGES[lang].unit === "clause") {
    return [...new Set(text.split(PUNCT).map((s) => s.replace(/[\s]+/g, "").trim()).filter((s) => HAN.test(s)))];
  }
  const toks = [...text.matchAll(TOKEN)].map((m) => (lang === "arb" ? m[0] : m[0].toLowerCase()));
  return [...new Set(toks)].filter((t) => t.length > 0 && !/^\d+$/.test(t));
}

// The 6-line OHCHR header precedes every UDHR text, byte-identical across
// all six Rosetta files (verified 2026-09-22): English title, Language,
// Adopted, Publisher, blank, English title again. The NATIVE title line
// after it ("Всеобщая декларация прав человека", "世界人权宣言", ...) is real
// material in the language — kept, never stripped.
const HEADER_LINES = 6;
function bodyOnly(text) {
  const lines = text.split("\n");
  let i = Math.min(HEADER_LINES, lines.length);
  while (i < lines.length && !lines[i].trim()) i++; // leading blanks after the header
  return lines.slice(i).join("\n");
}

export function synthesize(lang, word, { espeakBin } = {}) {
  const bin = espeakBin ?? espeak();
  if (!bin) return { refused: { type: "espeak_ng_unavailable", detail: "no espeak-ng binary on PATH; set ESpeakNG=/abs/path/espeak-ng" } };
  const { voice } = LANGUAGES[lang];
  // ALWAYS write the WAV to a real file (never `-w -`, which this build
  // ignores) — a file target also suppresses audible output, so a build
  // never speaks through the machine's speakers. IPA is read from stdout,
  // which is clean when the WAV goes to a file.
  const tmp = path.join(process.env.TMPDIR ?? "/tmp", `er7-pron-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  let wav, ipa;
  try {
    execFileSync(bin, ["-v", voice, "-w", tmp, word], { maxBuffer: 1 * 1024 * 1024 });
    wav = fs.readFileSync(tmp);
    ipa = execFileSync(bin, ["-v", voice, "--ipa", "-w", tmp, word], { encoding: "utf8", maxBuffer: 1 * 1024 * 1024 }).trim();
  } catch (e) {
    return { refused: { type: "synthesis_failed", detail: `${bin} -v ${voice} ${JSON.stringify(word)}: ${e.message}`, word } };
  } finally {
    try { fs.rmSync(tmp, { force: true }); } catch {}
  }
  const hash = sha256(wav);
  if (!sniffWav(wav)) return { refused: { type: "not_wav", detail: `${bin} produced non-RIFF bytes for ${JSON.stringify(word)}`, word } };
  return { wav, hash, ipa: ipa || null, bytes: wav.length };
}

// Minimal RIFF sniff — the repo's own wav.js (native/adapters/audio/wav.js)
// is the decoder; this is only a sanity check that synthesis made audio.
function sniffWav(bytes) {
  return bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
}

export function cachePath(lang, hash) {
  return path.join(CACHE_DIR, lang, `${hash}.wav`);
}

export function buildFor(lang, { espeakBin, log = () => {} } = {}) {
  const cfg = LANGUAGES[lang];
  const file = path.join(CORPUS, cfg.file);
  if (!fs.existsSync(file)) return { refused: { type: "no_corpus_file", detail: `${file} missing` } };
  const text = bodyOnly(fs.readFileSync(file, "utf8"));
  const words = wordListFor(lang, text);
  const entries = {};
  const counts = { words: words.length, synthesized: 0, refused: 0, bytes: 0 };
  const refusals = [];
  for (const w of words) {
    const r = synthesize(lang, w, { espeakBin });
    if (r.refused) { counts.refused++; refusals.push({ word: w, refused: r.refused }); continue; }
    fs.mkdirSync(path.dirname(cachePath(lang, r.hash)), { recursive: true });
    fs.writeFileSync(cachePath(lang, r.hash), r.wav);
    entries[w] = {
      ipa: r.ipa,
      sha256: r.hash,
      bytes: r.bytes,
      source: { kind: "synthesized", engine: "espeak-ng", voice: cfg.voice },
      unit: cfg.unit,
    };
    counts.synthesized++;
    counts.bytes += r.bytes;
  }
  const artifact = {
    schema: "PronunciationPrior@1",
    language: lang,
    giver: {
      engine: "espeak-ng",
      engineLicense: "GPL-3.0-or-later",
      engineUrl: "https://github.com/espeak-ng/espeak-ng",
      voice: cfg.voice,
      corpus: path.relative(ROOT, file),
      note: cfg.note,
      recipe: `${espeakBin ?? "espeak-ng"} -v ${cfg.voice} <word> -w -  -> WAV (sha256-pinned); --ipa -> derived annotation. The WAV is the surface; the IPA is a derived annotation beside it, never the record.`,
      unit: cfg.unit,
    },
    counts,
    words: entries,
    refusals,
    builtAt: new Date().toISOString(),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `pronunciation-${lang}.json`), JSON.stringify(artifact, null, 1));
  log(`PronunciationPrior@1[${lang}] ${counts.words} words, ${counts.synthesized} synthesized, ${counts.refused} refused, ${(counts.bytes / 1024).toFixed(0)}KB wav`);
  return { artifact, counts, refusals };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const langs = want.length ? want : Object.keys(LANGUAGES);
  for (const lang of langs) {
    if (!LANGUAGES[lang]) { console.error(`unknown language "${lang}" — known: ${Object.keys(LANGUAGES).join(", ")}`); process.exit(1); }
    const r = buildFor(lang, { log: (m) => console.log("  " + m) });
    if (r.refused) console.error(`${lang}: REFUSED ${r.refused.type} — ${r.refused.detail}`);
  }
}