#!/usr/bin/env node
// build-code-name-prior.mjs — CodeNamePrior@1: how many DISTINCT real
// projects (09-source-code's own audited + landmark tiers) declare a given
// function/method/class name, measured from the corpus's own bytes.
//
// WHY THIS EXISTS. eoreader7's proxy can read a code workspace and wants to
// say something about it — but "what does this file declare" and "which of
// what it declares is actually distinctive" are two different questions.
// `init`, `main`, `run`, `close`, `handle`, `process` recur across nearly
// every real codebase in this corpus; a name a reader has never seen
// declared anywhere else in ~2.9MB of curl/git/postgres/linux/kubernetes/
// cpython/flask/fastapi/TypeScript source is a genuinely different signal.
// This prior is the measured "how common is this name across real code" a
// consumer needs to tell the two apart — the SAME closed-class-from-
// frequency discipline this repo already uses for English function words
// (`functionWordSet`), never a hand-typed stoplist (the user's own recorded
// objection to stop lists applies here exactly as it did there).
//
// WHAT IT DOES NOT DO. It does not build a call graph, does not resolve
// scope, does not distinguish a definition from a forward declaration. It
// answers exactly one question per name: in how many of these distinct
// repositories does SOME file declare a function/method/class with this
// exact name. A heuristic declaration scan (per language family below),
// disclosed as such — this is a frequency measurement, not a parser.
//
// LANGUAGES COVERED, AND WHY THESE FOUR SHAPES. The corpus's real code
// files are C, Go, Python, and TypeScript (measured: `find` over
// 09-source-code's own tree, 2026-09-11 — 17 .c/.h, 2 .go, 3 .py, 1 .ts).
// Each family gets its own declaration regex, matched against how that
// language actually writes a top-level definition; no cross-language
// pattern is asserted to generalize to a family it was not measured against.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CODE_DIR = path.join(ROOT, "09-source-code");
const OUT_DIR = path.join(ROOT, "derived-priors", "code-priors");
const OUT = path.join(OUT_DIR, "code-name-prior-v1.json");
const MANIFEST_FILES = ["source-code-manifest.json", "audited-code-manifest.json"].map((f) => path.join(ROOT, "manifests", f));

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// ── per-language declaration recipes ─────────────────────────────────────
// Each recipe's regex is anchored at a line start (`^`, `m` flag) so a
// control-flow keyword ("if (x) {") cannot match: the outer, non-capturing
// prefix a C/Go declaration requires must itself END in whitespace/`*`
// immediately before the captured name, which "if"/"for"/"while" alone
// (no type-shaped prefix before them) cannot produce.
const RECIPES = [
  {
    lang: "c",
    exts: [".c", ".h"],
    re: /^(?:[A-Za-z_][\w\s*]*[\s*])([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:\n|\s)*\{/gm,
    kind: "function",
  },
  {
    lang: "go",
    exts: [".go"],
    re: /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*\(/gm,
    kind: "function",
  },
  {
    lang: "python",
    exts: [".py"],
    re: /^[ \t]*(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/gm,
    kind: null, // group 1 is the kind (def/class), group 2 the name
  },
  {
    lang: "typescript",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/gm,
    kind: "function",
  },
  {
    lang: "typescript-class",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm,
    kind: "class",
  },
  {
    lang: "typescript-const-arrow",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/gm,
    kind: "function",
  },
];

function declarationsIn(text, ext) {
  const names = [];
  for (const recipe of RECIPES) {
    if (!recipe.exts.includes(ext)) continue;
    const re = new RegExp(recipe.re.source, recipe.re.flags);
    let m;
    while ((m = re.exec(text))) {
      if (recipe.lang === "python") names.push({ name: m[2], kind: m[1] === "class" ? "class" : "function" });
      else names.push({ name: m[1], kind: recipe.kind });
    }
  }
  return names;
}

function repoOf(relPath) {
  // "torvalds_linux/init_main.c" -> "torvalds_linux"
  return relPath.split(path.sep)[0];
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, out); continue; }
    if (e.isFile()) out.push(full);
  }
}

function main() {
  const files = [];
  walk(CODE_DIR, files);
  const CODE_EXTS = new Set([".c", ".h", ".go", ".py", ".ts", ".tsx", ".js", ".mjs", ".jsx"]);
  const codeFiles = files.filter((f) => CODE_EXTS.has(path.extname(f)));

  // name -> { repos: Set, files: Set, kinds: Set }
  const byName = new Map();
  let totalDeclarations = 0;
  const fileRecords = [];
  const repos = new Set();

  for (const abs of codeFiles) {
    const rel = path.relative(ROOT, abs); // "09-source-code/torvalds_linux/init_main.c"
    const relInCode = path.relative(CODE_DIR, abs); // "torvalds_linux/init_main.c"
    const repo = repoOf(relInCode);
    repos.add(repo);
    const ext = path.extname(abs);
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const decls = declarationsIn(text, ext);
    totalDeclarations += decls.length;
    fileRecords.push({ path: rel, repo, ext, bytes: bytes.length, sha256: sha256(bytes), declarations: decls.length });
    for (const d of decls) {
      if (!byName.has(d.name)) byName.set(d.name, { repos: new Set(), files: new Set(), kinds: new Set() });
      const rec = byName.get(d.name);
      rec.repos.add(repo);
      rec.files.add(rel);
      rec.kinds.add(d.kind);
    }
  }

  // Genericness threshold: the SAME structural-minimum argument this
  // codebase reuses everywhere a recurrence floor is needed (P58/
  // RECURRENCE_FLOOR, FORM_MIN_ARRIVALS) — a name declared in only ONE
  // project tells you nothing about whether OTHER code would also declare
  // it; two is the floor at which "this recurs across projects" starts to
  // be a claim at all. Measured, not asserted: reported alongside the
  // counts so a consumer can pick its own floor instead of trusting this
  // one blindly.
  const names = {};
  let genericAtFloor2 = 0;
  for (const [name, rec] of byName) {
    names[name] = { repos: rec.repos.size, files: rec.files.size, kinds: [...rec.kinds].sort() };
    if (rec.repos.size >= 2) genericAtFloor2 += 1;
  }

  const manifestGiver = MANIFEST_FILES.filter((f) => fs.existsSync(f)).map((f) => path.relative(ROOT, f));

  const out = {
    schema: "CodeNamePrior@1",
    giver: {
      resource: "live_priors 09-source-code corpus (audited + landmark tiers, own README/VETTING.md)",
      manifests: manifestGiver,
      note:
        "Distinct-REPO attestation count per declared function/method/class name, over this corpus's own real code files (C/Go/Python/TypeScript, measured 2026-09-11). A heuristic declaration scan per language family (see this script's own header), not a parser: a name is counted once per repo it is declared in at least once, never once per occurrence. Built to tell a locally-recurring name apart from one that recurs across independent real codebases generally (init/main/run/close/handle/... at repos>=2 in this small a sample already) \u2014 the same closed-class-from-frequency discipline as functionWordSet, never a hand-typed stoplist.",
    },
    declared_params: {
      recipes: RECIPES.map((r) => ({ lang: r.lang, exts: r.exts, pattern: r.re.source })),
      genericFloor: 2,
      genericFloorBasis: "RECURRENCE_FLOOR/FORM_MIN_ARRIVALS precedent: one repo is a hapax, not a pattern; two is the structural minimum for 'this recurs across independent code' to be a claim at all",
    },
    counts: {
      files: codeFiles.length,
      repos: repos.size,
      totalBytes: fileRecords.reduce((a, f) => a + f.bytes, 0),
      distinctNames: byName.size,
      totalDeclarations,
      namesAtOrAboveGenericFloor: genericAtFloor2,
    },
    files: fileRecords,
    names,
    builtAt: new Date().toISOString(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`wrote ${OUT}`);
  console.log(`files=${codeFiles.length} repos=${repos.size} distinctNames=${byName.size} totalDeclarations=${totalDeclarations} genericAtFloor2=${genericAtFloor2}`);
  const topGeneric = [...byName.entries()].sort((a, b) => b[1].repos.size - a[1].repos.size).slice(0, 15);
  console.log("most cross-repo-common names:", topGeneric.map(([n, r]) => `${n}(${r.repos.size})`).join(", "));
}

main();
