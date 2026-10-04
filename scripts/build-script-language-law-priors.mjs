#!/usr/bin/env node
// build-script-language-law-priors.mjs — LanguageLawPrior@1 for four
// non-Western, non-tree-sitter languages, each fetched from its OWN engine:
//   なでしこ Nadesiko (日本語)   — core/src/nako_reserved_words.mts
//   எழில் Ezhil (தமிழ்)         — ezhil/ezhil_scanner.py
//   قلب Qalb (العربية)          — peg/qlb.peg (a Lisp — no reserved words)
//   아희 Aheui (한글)            — jsaheui.js (the Hangul opcode table)
// Each extractor is small and disclosed: it reads the language's own keyword
// table / grammar, never hand-types it. The point beside the Python/Wenyan/
// tree-sitter priors: the "engine defines the law" mechanism is script-
// agnostic all the way to RTL Arabic and the Hangul syllabary.
//
// RUN. Needs network. `node scripts/build-script-language-law-priors.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "code-priors");

const SOURCES = {
  nadesiko: {
    name: "なでしこ (Nadesiko)",
    script: "日本語",
    url: "https://raw.githubusercontent.com/kujirahand/nadesiko3/master/core/src/nako_reserved_words.mts",
    repo: "https://github.com/kujirahand/nadesiko3",
  },
  ezhil: {
    name: "எழில் (Ezhil)",
    script: "தமிழ்",
    url: "https://raw.githubusercontent.com/Ezhil-Language-Foundation/Ezhil-Lang/main/ezhil/ezhil_scanner.py",
    repo: "https://github.com/Ezhil-Language-Foundation/Ezhil-Lang",
  },
  qalb: {
    name: "قلب (Qalb)",
    script: "العربية",
    url: "https://raw.githubusercontent.com/nasser/---/master/peg/qlb.peg",
    repo: "https://github.com/nasser/---",
  },
  aheui: {
    name: "아희 (Aheui)",
    script: "한글",
    url: "https://raw.githubusercontent.com/aheui/jsaheui/gh-pages/jsaheui.js",
    repo: "https://github.com/aheui/jsaheui",
  },
};

// ── per-language extractors ────────────────────────────────────────────────

function nadesiko(src) {
  const keywords = [];
  const re = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g;
  let m;
  while ((m = re.exec(src))) keywords.push({ keyword: m[1], tokenType: m[2] });
  return {
    keywords: keywords.map((k) => k.keyword),
    keywordTable: Object.fromEntries(keywords.map((k) => [k.keyword, k.tokenType])),
    tokenTypes: [...new Set(keywords.map((k) => k.tokenType))].sort(),
  };
}

function ezhil(src) {
  const keywords = [];
  const re = /chunks == "([^"]+)":\s*\n\s*tval = .*?EzhilToken\.(\w+)/g;
  let m;
  while ((m = re.exec(src))) keywords.push({ keyword: m[1], tokenType: m[2] });
  const alphabet = [];
  const alphaMatch = /TALETTERS = '([^']*)'/.exec(src);
  if (alphaMatch) alphabet.push(...alphaMatch[1].split("|").filter((c) => c.length === 1));
  return {
    keywords: keywords.map((k) => k.keyword),
    keywordTable: Object.fromEntries(keywords.map((k) => [k.keyword, k.tokenType])),
    tokenTypes: [...new Set(keywords.map((k) => k.tokenType))].sort(),
    alphabet,
  };
}

function qalb(src) {
  const alphabet = [];
  const hrf = /hrf\s*=\s*\n\s*((?:[^]*?))?\n\s*rqm/.exec(src);
  const hrfBody = hrf ? hrf[1] : src;
  const letterRe = /"([^"]*)"/g;
  let m;
  while ((m = letterRe.exec(hrfBody))) if (m[1]) alphabet.push(m[1]);
  const numerals = [];
  const digitRe = /(wahad|tnein|tlateh|arbaa|khamseh|sitteh|sabaa|tmaneh|tisaa|siffr)\s*=\s*"([^"]*)"/g;
  while ((m = digitRe.exec(src))) numerals.push(m[2]);
  return {
    keywords: [], // a Lisp: no reserved words — symbols are defined, not reserved
    alphabet,
    numerals,
    grammar: ["list = '(' content ')'", "symbol", "string", "number"],
    note: "Qalb is a Lisp dialect: S-expressions over the Arabic alphabet with Arabic-Indic numerals (٠–٩). There is NO reserved-word law — the built-ins are the .qlb library symbols, not keywords.",
  };
}

function aheui(src) {
  const direction = [];
  const dirRe = /case\s+(\d+):\s*dx=[^;]+;\s*dy=[^;]+;\s*break;\s*\/\/(\S)/g;
  let m;
  while ((m = dirRe.exec(src))) direction.push({ jamo: m[2], index: Number(m[1]) });
  const ops = [];
  const opRe = /case\s+(\d+):[^\n]*?\/\/(\S)/g;
  while ((m = opRe.exec(src))) ops.push({ jamo: m[2], index: Number(m[1]) });
  return {
    keywords: [], // no keywords — the program IS Hangul syllables
    direction,
    operations: ops,
    note: "Aheui's law is the Hangul syllabary itself: the vowel (중성) sets the cursor direction, the final consonant (종성) selects the operation (add/subtract/multiply/divide/print/input/…). Extracted from the interpreter's opcode table. There are no keywords; every valid Hangul syllable is an instruction.",
  };
}

async function build(lang, spec) {
  const res = await fetch(spec.url);
  if (!res.ok) return { lang, error: `fetch ${res.status}` };
  const src = await res.text();
  const e = { nadesiko, ezhil, qalb, aheui }[lang](src);

  const out = {
    schema: "LanguageLawPrior@1",
    language: lang,
    languageName: spec.name,
    script: spec.script,
    giver: {
      resource: `${spec.name}'s own interpreter/grammar source`,
      engine: { source: spec.url, repo: spec.repo },
      note: `Fetched from the language's own engine (keyword table / grammar / opcode table), never hand-typed. This is the non-Western proof that LanguageLawPrior@1 is script-agnostic: the keywords are ${spec.script}, and the mechanism that derives them is identical to the Latin-script languages.`,
    },
    lexical: {
      keywords: e.keywords ?? [],
      ...(e.keywordTable ? { keywordTable: e.keywordTable } : {}),
      ...(e.alphabet ? { alphabet: e.alphabet } : {}),
      ...(e.numerals ? { numerals: e.numerals } : {}),
      ...(e.tokenTypes ? { tokenTypes: e.tokenTypes } : {}),
    },
    grammar: {
      ...(e.direction ? { direction: e.direction } : {}),
      ...(e.operations ? { operations: e.operations } : {}),
      ...(e.grammar ? { structure: e.grammar } : {}),
    },
    ...(e.note ? { note: e.note } : {}),
    counts: {
      keywords: (e.keywords ?? []).length,
      ...(e.alphabet ? { alphabet: e.alphabet.length } : {}),
      ...(e.numerals ? { numerals: e.numerals.length } : {}),
      ...(e.direction ? { directions: e.direction.length } : {}),
      ...(e.operations ? { operations: e.operations.length } : {}),
    },
    builtAt: new Date().toISOString(),
  };
  const file = path.join(OUT_DIR, `${lang}-language-law-prior-v1.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  return { lang, counts: out.counts, file };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [lang, spec] of Object.entries(SOURCES)) {
    const r = await build(lang, spec);
    console.log(`${lang.padEnd(9)} ${r.error ? "ERROR " + r.error : JSON.stringify(r.counts)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
