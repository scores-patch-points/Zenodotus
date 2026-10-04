#!/usr/bin/env node
// pronunciation-compare.mjs — the COMPARATIVE layer over PronunciationPrior@1.
//
// The WAV is the ground; a comparison is a PROJECTION. You cannot diff two
// raw WAVs and learn how far apart two pronunciations are — raw audio
// compares speakers and recording conditions, not phonemes. So this layer
// projects each pronunciation into a shared space and measures distance
// there. Three pieces, named so each can be doubted separately:
//
//   1. SEGMENTATION — IPA -> a sequence of phone tokens (a base symbol plus
//      its combining modifiers). Language-neutral by construction: every
//      language's IPA is segmented by the same rule.
//
//   2. A SHARED FEATURE SPACE — each phone -> articulatory features (class,
//      place, manner, voicing; height, backness, rounding). This is the one
//      place a hand table is unavoidable, and it is disclosed as RECEIVED
//      (the descriptive tradition's IPA chart), not derived. A phone outside
//      the table is a TYPED GAP: it is distance 1 from every other phone
//      except itself, and it is COUNTED, never silently treated as equal.
//
//   3. DISTANCE — phones differ by weighted feature mismatch; sequences
//      differ by edit distance with that substitution cost. Nothing here
//      claims a phoneme is "the same" across languages; it measures how far
//      apart two phones are in the shared space, and the caller decides what
//      counts as close.
//
// THE MEANING ALIGNMENT. A pronunciation distance is only a comparative when
// the two sides MEAN the same thing. The UDHR gives that for free: Article N
// is the same proposition in all six languages, so comparing the phonology of
// Article N across languages compares like with like. articlePhones() builds
// that aligned sequence from the corpus + the manifest; the article number is
// the alignment, and it is disclosed, never inferred.
//
// WHAT THIS IS NOT. It is not a claim that espeak-ng's French is French. It
// measures the SHAPE of what one engine produced for six languages — and
// because it is ONE engine, the differences are phonetic, not a voice's
// quirks (the point that makes synthesized audio the honest comparison
// substrate, recorded in the builder header).
//
// CLI:
//   node scripts/pronunciation-compare.mjs matrix
//   node scripts/pronunciation-compare.mjs inventory <lang>
//   node scripts/pronunciation-compare.mjs compare <langA> <wordA> <langB> <wordB>
//   node scripts/pronunciation-compare.mjs articles <N>
// Import:
//   import { phonesOf, phoneDistance, wordDistance, inventoryOf, matrix } from "./pronunciation-compare.mjs";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { manifestOf } from "./pronunciation.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = "/Users/mlacy/Documents/3.0/live_priors/06-government-legal/un-udhr";

// ---- 1. segmentation ------------------------------------------------------
// A phone is a base symbol followed by any combining diacritics and the
// length/palatalization/pharyngealization modifier letters espeak-ng emits.
// Stress marks (ˈ ˌ) and syllable dots (.) are PROSODY, not phones — kept
// separate so a caller can ignore or use them, never silently mixed in.
const STRESS = new Set(["ˈ", "ˌ"]);
const SYLLABLE = new Set(["."]);
const MODIFIER = new Set(["ʲ", "ˤ", "ˠ", "ʷ", "ʰ", "˞", "˥", "˦", "˧", "˨", "˩", "ː", "ˑ", "̩", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
// espeak-ng's non-phone artifacts: `-` is a syllable-continuation mark,
// `"` a soft-sign residue in Russian, `(en)`/`(cmn)` language-switch
// annotations. All prosody/annotation, NOT phones — skipped at segment time
// so an inventory never counts them as unknown phones.
const ESpeakNG_ARTIFACT = new Set(["-", '"']);
export function phonesOf(ipa) {
  const s = String(ipa ?? "");
  const out = [];
  for (const ch of s.normalize("NFC")) {
    if (ch === " " || ch === "\t") continue;
    if (STRESS.has(ch) || SYLLABLE.has(ch) || ESpeakNG_ARTIFACT.has(ch)) continue;
    if (ch === "(" || ch === ")") continue; // language-switch annotations (en)...(cmn)
    const combining = /[\u0300-\u036f]/.test(ch) || MODIFIER.has(ch);
    if (combining && out.length) out[out.length - 1].modifiers.push(ch);
    else out.push({ phone: ch, modifiers: [] });
  }
  return out.map((p) => ({ phone: p.phone, modifiers: p.modifiers.join("") }));
}

// ---- 2. the received feature table ---------------------------------------
// class V/C; for C: place, manner, voice; for V: height, back, round. A
// missing row is a typed gap. Kept compact on purpose: it covers exactly the
// phones the six manifests produce (72 base symbols, measured) plus the
// common IPA neighbours, so a new language's phone is a COUNTED gap, never a
// silent zero-distance.
const C = (place, manner, voice) => ({ class: "C", place, manner, voice });
const V = (height, back, round) => ({ class: "V", height, back, round });
export const FEATURES = {
  // plosives
  p: C("bilabial", "plosive", "vl"), b: C("bilabial", "plosive", "vd"),
  t: C("alveolar", "plosive", "vl"), d: C("alveolar", "plosive", "vd"),
  ʈ: C("retroflex", "plosive", "vl"), ɖ: C("retroflex", "plosive", "vd"),
  c: C("palatal", "plosive", "vl"), ɟ: C("palatal", "plosive", "vd"),
  k: C("velar", "plosive", "vl"), ɡ: C("velar", "plosive", "vd"),
  q: C("uvular", "plosive", "vl"), ɢ: C("uvular", "plosive", "vd"),
  ʔ: C("glottal", "plosive", "vl"),
  // nasals
  m: C("bilabial", "nasal", "vd"), ɱ: C("labiodental", "nasal", "vd"),
  n: C("alveolar", "nasal", "vd"), ɳ: C("retroflex", "nasal", "vd"),
  ɲ: C("palatal", "nasal", "vd"), ŋ: C("velar", "nasal", "vd"), ɴ: C("uvular", "nasal", "vd"),
  // fricatives
  ɸ: C("bilabial", "fricative", "vl"), β: C("bilabial", "fricative", "vd"),
  f: C("labiodental", "fricative", "vl"), v: C("labiodental", "fricative", "vd"),
  θ: C("dental", "fricative", "vl"), ð: C("dental", "fricative", "vd"),
  s: C("alveolar", "fricative", "vl"), z: C("alveolar", "fricative", "vd"),
  ʃ: C("postalveolar", "fricative", "vl"), ʒ: C("postalveolar", "fricative", "vd"),
  ʂ: C("retroflex", "fricative", "vl"), ʐ: C("retroflex", "fricative", "vd"),
  ɕ: C("alveolopalatal", "fricative", "vl"), ʑ: C("alveolopalatal", "fricative", "vd"),
  ç: C("palatal", "fricative", "vl"), ʝ: C("palatal", "fricative", "vd"),
  x: C("velar", "fricative", "vl"), ɣ: C("velar", "fricative", "vd"),
  χ: C("uvular", "fricative", "vl"), ʁ: C("uvular", "fricative", "vd"),
  ħ: C("pharyngeal", "fricative", "vl"), ʕ: C("pharyngeal", "fricative", "vd"),
  h: C("glottal", "fricative", "vl"), ɦ: C("glottal", "fricative", "vd"),
  // approximants / liquids / rhotics
  ʋ: C("labiodental", "approximant", "vd"), ɹ: C("alveolar", "approximant", "vd"),
  ɻ: C("retroflex", "approximant", "vd"), j: C("palatal", "approximant", "vd"),
  ɰ: C("velar", "approximant", "vd"), w: C("labiovelar", "approximant", "vd"),
  l: C("alveolar", "lateral", "vd"), ɭ: C("retroflex", "lateral", "vd"),
  ʎ: C("palatal", "lateral", "vd"), ʟ: C("velar", "lateral", "vd"),
  ɾ: C("alveolar", "tap", "vd"), ɽ: C("retroflex", "tap", "vd"),
  r: C("alveolar", "trill", "vd"), ʀ: C("uvular", "trill", "vd"),
  // vowels
  i: V("close", "front", "unrounded"), y: V("close", "front", "rounded"),
  ɨ: V("close", "central", "unrounded"), ʉ: V("close", "central", "rounded"),
  ɯ: V("close", "back", "unrounded"), u: V("close", "back", "rounded"),
  ɪ: V("nearclose", "nearfront", "unrounded"), ʏ: V("nearclose", "nearfront", "rounded"),
  ʊ: V("nearclose", "nearback", "rounded"), ᵻ: V("nearclose", "central", "unrounded"),
  e: V("closemid", "front", "unrounded"), ø: V("closemid", "front", "rounded"),
  ɘ: V("closemid", "central", "unrounded"), ɵ: V("closemid", "central", "rounded"),
  ɤ: V("closemid", "back", "unrounded"), o: V("closemid", "back", "rounded"),
  ə: V("mid", "central", "unrounded"), ɚ: V("mid", "central", "unrounded"),
  ɛ: V("openmid", "front", "unrounded"), œ: V("openmid", "front", "rounded"),
  ɜ: V("openmid", "central", "unrounded"), ɞ: V("openmid", "central", "rounded"),
  ʌ: V("openmid", "back", "unrounded"), ɔ: V("openmid", "back", "rounded"),
  æ: V("nearopen", "front", "unrounded"), ɐ: V("nearopen", "central", "unrounded"),
  a: V("open", "front", "unrounded"), ɶ: V("open", "front", "rounded"),
  ɑ: V("open", "back", "unrounded"), ɒ: V("open", "back", "rounded"),
};

const VOWEL_HEIGHT = ["close", "nearclose", "closemid", "mid", "openmid", "nearopen", "open"];
const VOWEL_BACK = ["front", "nearfront", "central", "nearback", "back"];
const PLACE = ["bilabial", "labiodental", "dental", "alveolar", "postalveolar", "alveolopalatal", "retroflex", "palatal", "velar", "labiovelar", "uvular", "pharyngeal", "glottal"];
const MANNER = ["plosive", "nasal", "fricative", "affricate", "approximant", "tap", "trill", "lateral"];

const idx = (list, v) => { const i = list.indexOf(v); return i < 0 ? null : i / Math.max(1, list.length - 1); };
const scalar = (a, b) => (a == null || b == null ? 1 : Math.abs(a - b));

/** phoneDistance(a, b) -> [0, 1]. Same symbol 0; unknown phone 1; a vowel vs
 *  a consonant 1; otherwise a weighted feature mismatch. Modifiers (length,
 *  palatalization) add a small disclosed penalty, never flip the class. */
export function phoneDistance(a, b) {
  const pa = a.phone ?? a, pb = b.phone ?? b;
  if (pa === pb) return (a.modifiers ?? "") === (b.modifiers ?? "") ? 0 : 0.1;
  const fa = FEATURES[pa], fb = FEATURES[pb];
  if (!fa || !fb) return 1; // typed gap: unknown phone is maximally far, and counted
  if (fa.class !== fb.class) return 1;
  let d;
  if (fa.class === "C") {
    // Exact mismatches weighted; place/manner closeness SOFTENS the binary
    // mismatch (a velar is nearer an alveolar than a bilabial is), but the
    // voicing difference is never wiped out by a place match — t~d keeps its
    // 0.3 from the voicing term, t~k its place-proximity.
    const place = fa.place === fb.place ? 0 : scalar(idx(PLACE, fa.place), idx(PLACE, fb.place));
    const manner = fa.manner === fb.manner ? 0 : scalar(idx(MANNER, fa.manner), idx(MANNER, fb.manner));
    d = 0.4 * place + 0.3 * manner + 0.3 * (fa.voice === fb.voice ? 0 : 1);
  } else {
    d = 0.4 * scalar(idx(VOWEL_HEIGHT, fa.height), idx(VOWEL_HEIGHT, fb.height))
      + 0.4 * scalar(idx(VOWEL_BACK, fa.back), idx(VOWEL_BACK, fb.back))
      + 0.2 * (fa.round === fb.round ? 0 : 1);
  }
  return Number(d.toFixed(4));
}

export const isKnownPhone = (p) => !!FEATURES[p.phone ?? p];

// ---- 3. sequence distance -------------------------------------------------
/** wordDistance(ipaA, ipaB) -> { distance, gapPhones, phonesA, phonesB }.
 *  Edit distance (insert/delete 1, substitute phoneDistance) normalized by
 *  the longer sequence. gapPhones counts phones outside FEATURES on either
 *  side, so a caller can tell a real measurement from a gappy one. */
export function wordDistance(ipaA, ipaB) {
  const A = phonesOf(ipaA), B = phonesOf(ipaB);
  const n = A.length, m = B.length;
  if (!n && !m) return { distance: 0, gapPhones: 0, phonesA: 0, phonesB: 0 };
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + phoneDistance(A[i - 1], B[j - 1]));
  }
  const gapPhones = [...A, ...B].filter((p) => !isKnownPhone(p)).length;
  return { distance: Number((dp[n][m] / Math.max(n, m)).toFixed(4)), gapPhones, phonesA: n, phonesB: m };
}

// ---- inventory + language distance ---------------------------------------
/** inventoryOf(lang) -> { phones: {phone: count}, unknown: {phone: count},
 *  size } over the committed manifest. Unknown phones are kept and counted,
 *  never dropped — an inventory that hid its gaps would overstate coverage. */
export function inventoryOf(lang, manifest = manifestOf(lang)) {
  if (!manifest) return null;
  const phones = {}, unknown = {};
  for (const e of Object.values(manifest.words)) {
    for (const p of phonesOf(e.ipa ?? "")) {
      (isKnownPhone(p) ? phones : unknown)[p.phone] = ((isKnownPhone(p) ? phones : unknown)[p.phone] ?? 0) + 1;
    }
  }
  return { phones, unknown, size: Object.keys(phones).length, unknownSize: Object.keys(unknown).length };
}

/** inventoryDistance(langA, langB) -> a [0,1] distance over the SHARED feature
 *  space: for every phone in the union of the two inventories, its nearest
 *  neighbour in the other inventory; averaged. 0 = every phone has a near
 *  twin; 1 = no phone is closer than maximally far. This is the language-level
 *  comparative — it does not need a word list, only each language's inventory. */
export function inventoryDistance(langA, langB) {
  const ia = inventoryOf(langA), ib = inventoryOf(langB);
  if (!ia || !ib) return null;
  const oneWay = (from, into) => {
    const intoList = Object.keys(into.phones);
    let sum = 0;
    for (const p of Object.keys(from.phones)) {
      let best = 1;
      for (const q of intoList) best = Math.min(best, phoneDistance(p, q));
      sum += best;
    }
    return sum / Math.max(1, Object.keys(from.phones).length);
  };
  const d = (oneWay(ia, ib) + oneWay(ib, ia)) / 2;
  return Number(d.toFixed(4));
}

export function matrix(langs) {
  const out = {};
  for (const a of langs) { out[a] = {}; for (const b of langs) out[a][b] = a === b ? 0 : inventoryDistance(a, b); }
  return out;
}

// ---- the meaning alignment: the same UDHR article across languages --------
// Heading patterns per language, read off the corpus (same source the Rosetta
// reads). Article N is the alignment key.
const ARTICLE_HEADING = {
  eng: /^\s*Article\s+(\d+)\s*$/i,
  fra: /^\s*Article\s+(\d+|premier|première)\s*$/i,
  spa: /^\s*Art[ií]culo\s+(\d+)\s*$/i,
  rus: /^\s*Статья\s+(\d+)\s*$/i,
  arb: /^\s*المادة\s+(\d+)\s*$/i,
  cmn_hans: /^\s*第([一二三四五六七八九十]+)条\s*$/i,
};
const CORPUS_FILE = { eng: "udhr-eng.txt", fra: "udhr-fra.txt", spa: "udhr-spa.txt", rus: "udhr-rus.txt", arb: "udhr-arb.txt", cmn_hans: "udhr-cmn_hans.txt" };
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cnNum = (s) => (s === "十" ? 10 : s.length === 1 ? CN[s] : /^十/.test(s) ? 10 + (CN[s[1]] ?? 0) : /十$/.test(s) ? (CN[s[0]] ?? 0) * 10 : null);

/** articlesOf(lang) -> { N: text } split on the language's own heading. */
export function articlesOf(lang) {
  const file = path.join(CORPUS, CORPUS_FILE[lang]);
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const re = ARTICLE_HEADING[lang];
  const out = {}; let cur = null, buf = [];
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      if (cur != null) out[cur] = buf.join("\n");
      const raw = m[1]; cur = lang === "cmn_hans" ? cnNum(raw) : /^\d+$/.test(raw) ? Number(raw) : 1;
      buf = [];
    } else if (cur != null) buf.push(line);
  }
  if (cur != null) out[cur] = buf.join("\n");
  return out;
}

const TOKEN = /[\p{L}\p{M}\p{N}]+(?:[’'·-][\p{L}\p{M}\p{N}]+)*/gu;
const CLAUSE_PUNCT = /[，。、；：！？（）\s]+/u;
const HAN = /[\p{Script=Han}]+/gu;
/** articlePhones(lang, N) -> the concatenated phone sequence of Article N,
 *  every word looked up in that language's own manifest. Words the manifest
 *  does not carry are COUNTED (missing), never substituted. cmn_hans
 *  manifests are keyed by CLAUSE (no whitespace segmentation), so its
 *  article is split on the same clause punctuation the builder used. */
export function articlePhones(lang, N, manifest = manifestOf(lang)) {
  const arts = articlesOf(lang);
  if (!arts || !(N in arts)) return { refused: { type: "no_article", detail: `${lang} Article ${N} not found` } };
  if (!manifest) return { refused: { type: "no_manifest", detail: lang } };
  const units = lang === "cmn_hans"
    ? arts[N].split(CLAUSE_PUNCT).map((s) => s.replace(/\s+/g, "").trim()).filter((s) => HAN.test(s))
    : [...arts[N].matchAll(TOKEN)].map((m) => (lang === "arb" ? m[0] : m[0].toLowerCase()));
  const phones = []; let missing = 0, words = 0;
  for (const w of units) {
    words++;
    const e = manifest.words[w];
    if (!e) { missing++; continue; }
    for (const p of phonesOf(e.ipa ?? "")) phones.push(p);
  }
  return { phones, words, missing, coverage: Number(((words - missing) / Math.max(1, words)).toFixed(3)) };
}

/** articleDistance(langA, langB, N) — the same article, two languages, the
 *  distance between their phone sequences in the shared feature space. */
export function articleDistance(langA, langB, N) {
  const a = articlePhones(langA, N), b = articlePhones(langB, N);
  if (a.refused) return a;
  if (b.refused) return b;
  const ia = a.phones.map((p) => p.phone + p.modifiers).join(" ");
  const ib = b.phones.map((p) => p.phone + p.modifiers).join(" ");
  return { article: N, a: langA, b: langB, ...wordDistance(ia, ib), coverageA: a.coverage, coverageB: b.coverage };
}

// ---- CLI ------------------------------------------------------------------
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [cmd, ...rest] = process.argv.slice(2);
  const LANGS = ["eng", "fra", "spa", "rus", "arb", "cmn_hans"];
  if (cmd === "inventory") {
    for (const lang of rest.length ? rest : LANGS) {
      const inv = inventoryOf(lang);
      if (!inv) { console.log(`${lang}: no manifest`); continue; }
      console.log(`${lang}: ${inv.size} known phones, ${inv.unknownSize} unknown${inv.unknownSize ? ` (${Object.keys(inv.unknown).join(" ")})` : ""}`);
    }
  } else if (cmd === "matrix") {
    const langs = rest.length ? rest : LANGS;
    const m = matrix(langs);
    const w = 9;
    console.log("inventory distance (0 = near-identical phone inventories)\n" + " ".repeat(w) + langs.map((l) => l.padStart(w)).join(""));
    for (const a of langs) console.log(a.padEnd(w) + langs.map((b) => (m[a][b] == null ? "—" : m[a][b].toFixed(3)).padStart(w)).join(""));
  } else if (cmd === "compare") {
    const [la, wa, lb, wb] = rest;
    const ma = manifestOf(la), mb = manifestOf(lb);
    const ea = ma?.words[wa], eb = mb?.words[wb];
    if (!ea || !eb) { console.error("both words must be in their language's manifest"); process.exit(1); }
    console.log(`${la}/${wa} [${ea.ipa}]  vs  ${lb}/${wb} [${eb.ipa}]`);
    console.log(JSON.stringify(wordDistance(ea.ipa, eb.ipa)));
  } else if (cmd === "articles") {
    const N = Number(rest[0] ?? 1);
    console.log(`Article ${N}, phone-sequence distance across the six (one engine, so differences are phonetic):`);
    for (let i = 0; i < LANGS.length; i++) for (let j = i + 1; j < LANGS.length; j++) {
      const d = articleDistance(LANGS[i], LANGS[j], N);
      if (d.refused) continue;
      console.log(`  ${LANGS[i]}–${LANGS[j]}: ${d.distance}  (coverage ${d.coverageA}/${d.coverageB})`);
    }
  } else {
    console.log("usage: node scripts/pronunciation-compare.mjs matrix|inventory <lang>|compare <lA> <wA> <lB> <wB>|articles <N>");
  }
}