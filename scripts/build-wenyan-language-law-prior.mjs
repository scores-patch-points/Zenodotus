#!/usr/bin/env node
// build-wenyan-language-law-prior.mjs — LanguageLawPrior@1 for 文言 (Wenyan),
// the classical-Chinese programming language. Its laws live in the language's
// OWN compiler (wenyan-lang/wenyan, `src/keywords.ts` — the reserved-word
// table the parser is built from), so this script fetches that source and
// derives the prior from it, never hand-typing the keyword list. The point of
// this file beside the Python one: the "engine defines the law" mechanism is
// script-agnostic — a language whose keywords are `若`/`為是`/`加` has its
// laws fetched and indexed exactly like one whose keywords are `if`/`while`/`+`.
//
// RUN. Needs network to fetch the Wenyan source. `node scripts/build-wenyan-language-law-prior.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "code-priors");
const OUT = path.join(OUT_DIR, "wenyan-language-law-prior-v1.json");

const SRC_URL = "https://raw.githubusercontent.com/wenyan-lang/wenyan/master/src/keywords.ts";

// Token types as semantic categories, mapped to the cube's faces so the prior
// is directly consumable by the same organs as the Python one. The token-type
// strings are Wenyan's OWN (from its parser); the grouping is this build's.
const FACE_OF = {
  decl: "existence", type: "existence", name: "existence", ans: "existence",
  assgn: "existence", rassgn: "existence", discard: "existence",
  ctrl: "structure", opord: "structure", ctnr: "structure", import: "structure",
  call: "structure",
  cmp: "interpretation", op: "interpretation", lop: "interpretation",
  mod: "interpretation", not: "interpretation", expr: "interpretation",
  bool: "interpretation", print: "interpretation", take: "interpretation",
  throw: "interpretation", try: "interpretation", macro: "interpretation",
  comment: "interpretation",
};

async function main() {
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`fetch ${SRC_URL}: ${res.status}`);
  const src = await res.text();

  // Parse `KEYWORDS_DEFINE`: `  keyword: ["tokenType", valueOrUndefined],`
  // — the keyword is CJK (non-Latin), the value is Wenyan's own token type.
  const keywordRe = /^\s*([^\s:]+):\s*\["([^"]+)",\s*([^\]]*)\]\s*,?/gm;
  const keywords = {};
  let m;
  while ((m = keywordRe.exec(src))) {
    const kw = m[1].trim();
    const type = m[2];
    const raw = m[3].trim();
    const value = raw === "undefined" || raw === "" ? null : raw.replace(/^"(.*)"$/, "$1");
    keywords[kw] = { type, value };
  }

  // The numeral characters (Wenyan's NUMBER_KEYWORDS — the language's own
  // numeric lexicon, Chinese numerals + 負/·/零〇).
  const numMatch = /Array\.from\(\s*"([^"]+)"\s*\)/.exec(src);
  const numeralChars = numMatch ? [...numMatch[1]] : [];

  const byFace = { existence: [], structure: [], interpretation: [] };
  const byType = {};
  for (const [kw, rec] of Object.entries(keywords)) {
    const face = FACE_OF[rec.type] ?? "interpretation";
    byFace[face].push(kw);
    (byType[rec.type] ??= []).push(kw);
  }
  for (const k of Object.keys(byFace)) byFace[k].sort();
  for (const k of Object.keys(byType)) byType[k].sort();

  const out = {
    schema: "LanguageLawPrior@1",
    language: "wenyan",
    languageName: "文言 (Wenyan, classical Chinese)",
    giver: {
      resource: "wenyan-lang/wenyan (the Wenyan compiler's own reserved-word table)",
      engine: { source: "src/keywords.ts", url: "https://github.com/wenyan-lang/wenyan" },
      note:
        "Wenyan's reserved words, fetched from the language's own compiler source (src/keywords.ts) and grouped by the token type the parser assigns each — never hand-typed. Keywords are classical-Chinese characters (若 if, 為是 while, 加 +, 書之 print, 術 function), so this prior is the non-Western proof that the LanguageLawPrior@1 mechanism is script-agnostic: the law is fetched from the engine the same way as Python's, the tokens just are not Latin. Identifier law: the engine tokenizes CJK by its own NUMBER_KEYWORDS and keyword table, not by an [A-Za-z] rule.",
    },
    lexical: {
      keywords: Object.keys(keywords).sort(),
      numeralCharacters: numeralChars,
      keywordTable: keywords,
    },
    grammar: {
      // Wenyan's own token-type categories, each with its reserved words.
      byTokenType: byType,
      byFace,
      faceNote: "existence = declarations/types/naming; structure = control flow, import, call ordering, containers; interpretation = operators, comparison, booleans, I/O, exceptions, macros",
    },
    counts: {
      keywords: Object.keys(keywords).length,
      tokenTypes: Object.keys(byType).length,
      numeralCharacters: numeralChars.length,
      existence: byFace.existence.length,
      structure: byFace.structure.length,
      interpretation: byFace.interpretation.length,
    },
    builtAt: new Date().toISOString(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`wrote ${OUT}`);
  console.log(`keywords=${out.counts.keywords} tokenTypes=${out.counts.tokenTypes} numerals=${out.counts.numeralCharacters} faces=${out.counts.existence}/${out.counts.structure}/${out.counts.interpretation}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
