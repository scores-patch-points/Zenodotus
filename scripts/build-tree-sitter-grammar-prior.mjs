#!/usr/bin/env node
// build-tree-sitter-grammar-prior.mjs — LanguageLawPrior@1 for many languages
// at once, from their tree-sitter grammars (the de-facto "syntax law as data"
// for ~100 languages). Primary source is each repo's compiled node-types.json
// (valid JSON — named node types = the open/close/nest structure, anonymous
// lowercase tokens = reserved keywords, anonymous symbol tokens = operators);
// where a repo does not commit node-types.json (the generated grammars —
// typescript, php), the grammar source is scanned heuristically as the
// disclosed fallback.
//
// RUN. Needs network. `node scripts/build-tree-sitter-grammar-prior.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "code-priors");

// language -> { nodeTypes, grammar } raw URLs. node-types.json is preferred.
const LANGUAGES = {
  c: { repo: "tree-sitter-c", dir: "" },
  cpp: { repo: "tree-sitter-cpp", dir: "" },
  java: { repo: "tree-sitter-java", dir: "" },
  javascript: { repo: "tree-sitter-javascript", dir: "" },
  go: { repo: "tree-sitter-go", dir: "" },
  rust: { repo: "tree-sitter-rust", dir: "" },
  ruby: { repo: "tree-sitter-ruby", dir: "" },
  "c-sharp": { repo: "tree-sitter-c-sharp", dir: "" },
  bash: { repo: "tree-sitter-bash", dir: "" },
  html: { repo: "tree-sitter-html", dir: "" },
  css: { repo: "tree-sitter-css", dir: "" },
  json: { repo: "tree-sitter-json", dir: "" },
  typescript: { repo: "tree-sitter-typescript", dir: "typescript", common: true },
  php: { repo: "tree-sitter-php", dir: "php", common: true },
};

const KW = /^[a-z][a-z0-9_]*$/;

function fromNodeTypes(jsonText) {
  const d = JSON.parse(jsonText);
  const nodeTypes = new Set();
  const keywords = new Set();
  const operators = new Set();
  for (const n of d) {
    const t = n.type;
    if (n.named === true) nodeTypes.add(t);
    else if (KW.test(t)) keywords.add(t);
    else operators.add(t);
  }
  return {
    source: "node-types.json",
    nodeTypes: [...nodeTypes].sort(),
    keywords: [...keywords].sort(),
    operators: [...operators].sort(),
  };
}

function fromGrammarJs(src) {
  const nodeTypes = new Set();
  const rulesMatch = /\brules:\s*\{([\s\S]*)\n\s*\}/.exec(src);
  const rulesBody = rulesMatch ? rulesMatch[1] : src;
  const ruleRe = /\n\s*([a-z_][a-z0-9_]*):\s*[$_]\s*=>/g;
  let m;
  while ((m = ruleRe.exec(rulesBody))) nodeTypes.add(m[1]);
  const keywords = new Set();
  const operators = new Set();
  const strRe = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let sm;
  while ((sm = strRe.exec(src))) {
    const s = (sm[1] ?? sm[2] ?? "").replace(/\\(['"\\])/g, "$1");
    if (!s || s.length > 24) continue;
    if (KW.test(s)) keywords.add(s);
    else if (s.length <= 8) operators.add(s);
  }
  return {
    source: "grammar.js (heuristic)",
    nodeTypes: [...nodeTypes].sort(),
    keywords: [...keywords].sort(),
    operators: [...operators].sort(),
  };
}

async function build(lang, spec) {
  const base = `https://raw.githubusercontent.com/tree-sitter/${spec.repo}/master`;
  const ntUrl = spec.common
    ? null
    : `${base}/src/node-types.json`;
  const grUrl = spec.common
    ? `${base}/common/define-grammar.js`
    : `${base}/grammar.js`;

  let extracted = null;
  if (ntUrl) {
    const r = await fetch(ntUrl);
    if (r.ok) { try { extracted = fromNodeTypes(await r.text()); } catch {} }
  }
  if (!extracted) {
    const r = await fetch(grUrl);
    if (!r.ok) return { lang, error: `fetch ${r.status} (${grUrl})` };
    extracted = fromGrammarJs(await r.text());
  }

  const out = {
    schema: "LanguageLawPrior@1",
    language: lang,
    giver: {
      resource: "tree-sitter grammar (the language's syntax law as data)",
      engine: { source: ntUrl ?? grUrl, repo: `https://github.com/tree-sitter/${spec.repo}` },
      note:
        `Derived from the language's tree-sitter grammar via ${extracted.source}. Node types are the structure (open/close/nest); anonymous lowercase tokens are the reserved keywords; anonymous symbol tokens are the operators. Where the source is grammar.js (the generated grammars), extraction is a disclosed heuristic over the source, not a parse. Semantics/type-checking stay in the language's own compiler; identifier law is Unicode XID in most of these languages, not the grammar's Latin-shaped word rule.`,
    },
    lexical: { keywords: extracted.keywords, operators: extracted.operators },
    grammar: { nodeTypes: extracted.nodeTypes },
    counts: { keywords: extracted.keywords.length, operators: extracted.operators.length, nodeTypes: extracted.nodeTypes.length },
    builtAt: new Date().toISOString(),
  };
  const file = path.join(OUT_DIR, `${lang}-language-law-prior-v1.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  return { lang, counts: out.counts, file };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const [lang, spec] of Object.entries(LANGUAGES)) {
    const r = await build(lang, spec);
    results.push(r);
    console.log(`${lang.padEnd(12)} ${r.error ? "ERROR " + r.error : `kw=${r.counts.keywords} ops=${r.counts.operators} nodes=${r.counts.nodeTypes}`}`);
  }
  console.log(`\nbuilt ${results.filter((r) => !r.error).length}/${results.length} priors under derived-priors/code-priors/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
