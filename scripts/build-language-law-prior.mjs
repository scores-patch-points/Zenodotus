#!/usr/bin/env node
// build-language-law-prior.mjs — LanguageLawPrior@1: the Python language's
// OWN laws, introspected from the running engine (CPython, compiled to WASM
// as pyodide). The engine is the law: keywords, the token/grammar structure
// (ast node kinds), the builtins, the stdlib surface, and the signatures of
// the core library callables are read off the live interpreter — never
// hand-typed. The one received table is operator precedence (the PEG grammar
// is not shipped as introspectable data), disclosed as such.
//
// WHY THIS EXISTS. A code generator should not spend model tokens re-deriving
// what the language already guarantees: which names are keywords, what a
// valid `def`/`class` looks like, what the stdlib provides and with what
// signature. This prior is the machine-readable index of those laws — the
// closed-world analogue of POSPrior@1 for prose. Where the engine is
// executable (it is, here), the prior is a DERIVED index over it, not a
// re-definition: `compile()`, `ast`, `keyword`, `inspect` and the stdlib are
// the source; this file is the snapshot.
//
// WHAT IT DOES NOT DO. It does not encode semantics (evaluation rules), which
// stay in the engine itself (compile/exec). It does not encode idioms
// (CodeNamePrior@1 already measures name genericity). It is Python-only for
// now: other languages need their own engine (tree-sitter grammar, node, go
// toolchain) — the schema is language-neutral, the build is not.
//
// RUN. Requires the vendored pyodide (eoreader7/native/eval/the-fold/
// node_modules/pyodide). `node scripts/build-language-law-prior.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "code-priors");
const OUT = path.join(OUT_DIR, "python-language-law-prior-v1.json");

// The engine: pyodide (CPython → WASM), vendored in eoreader7. live_priors is
// its own repo with no node_modules; the engine lives beside it.
const PYODIDE_ENTRY = path.join(
  ROOT, "..", "eoreader7", "native", "eval", "the-fold", "node_modules", "pyodide", "pyodide.mjs",
);

// ── the one received table: operator precedence ────────────────────────────
// The PEG grammar (Grammar/python.gram) is not shipped inside the WASM engine
// as introspectable data, so precedence cannot be read off the runtime. It is
// a small, stable, received table from the language reference, disclosed as
// received rather than introspected. Order: LOWEST binding first.
const PRECEDENCE = [
  { op: "lambda", assoc: null, note: "lambda expression" },
  { op: "if-else", assoc: null, note: "conditional expression (a if C else b)" },
  { op: "or", assoc: "left" },
  { op: "and", assoc: "left" },
  { op: "not x", assoc: null, note: "boolean NOT" },
  { op: "== != < <= > >= is is not in not in", assoc: "chain", note: "comparisons; chainable" },
  { op: "|", assoc: "left", note: "bitwise OR / set union" },
  { op: "^", assoc: "left", note: "bitwise XOR / set symmetric difference" },
  { op: "&", assoc: "left", note: "bitwise AND / set intersection" },
  { op: "<< >>", assoc: "left", note: "shifts" },
  { op: "+ -", assoc: "left" },
  { op: "* @ / // %", assoc: "left", note: "multiply, matrix multiply, divide, floor divide, modulo" },
  { op: "+x -x ~x", assoc: null, note: "unary plus/minus/invert" },
  { op: "**", assoc: "right", note: "exponentiation (right-associative, the exception)" },
  { op: "await x", assoc: null },
  { op: "x[i] x[i:j] f(...) x.attr", assoc: null, note: "subscript, slice, call, attribute — highest binding" },
];

// Declaration recipes — the shapes a top-level definition takes in this
// language. Kept in step with eoreader7's code-structure.js RECIPES (python
// entry); disclosed here as a received table so the prior is self-contained.
const DECLARATION_RECIPES = [
  { kind: "function", shape: "def name(params) -> ret:", async: false },
  { kind: "function", shape: "async def name(params) -> ret:", async: true },
  { kind: "class", shape: "class Name(Base):", async: false },
  { kind: "lambda", shape: "lambda args: expr" },
  { kind: "comprehension", shape: "[x for x in it if p]", note: "also dict/set/gen forms" },
];

const INTROSPECT = `
import json, keyword, builtins, sys, inspect, importlib
import ast as _ast

def _public_api(module, cap=60):
    out = {}
    for name in dir(module):
        if name.startswith("_"):
            continue
        try:
            obj = getattr(module, name)
        except Exception:
            continue
        if callable(obj):
            try:
                sig = str(inspect.signature(obj))
            except (ValueError, TypeError):
                sig = None
            out[name] = {"kind": "callable", "signature": sig}
        elif isinstance(obj, (int, float, str, bool, type(None))):
            out[name] = {"kind": "constant", "value": repr(obj)}
        else:
            out[name] = {"kind": type(obj).__name__}
        if len(out) >= cap:
            break
    return out

def _issubclass_safe(n, base):
    try:
        return n[0].isupper() and issubclass(getattr(_ast, n), base)
    except Exception:
        return False

def _ident_ok(src):
    try:
        compile(src, "<id>", "exec")
        return True
    except SyntaxError:
        return False

stmt_kinds = sorted(n for n in dir(_ast) if _issubclass_safe(n, _ast.stmt))
expr_kinds = sorted(n for n in dir(_ast) if _issubclass_safe(n, _ast.expr))

CORE = ["argparse","json","re","os","pathlib","collections","itertools","functools",
        "typing","sys","math","random","datetime","csv","dataclasses","textwrap","enum",
        "subprocess","tempfile","shutil","string","hashlib","base64","statistics","time"]
core_api = {}
for m in CORE:
    try:
        core_api[m] = _public_api(importlib.import_module(m))
    except Exception as e:
        core_api[m] = {"_error": type(e).__name__ + ": " + str(e)[:120]}

result = {
    "pythonVersion": sys.version.split()[0],
    "keywords": sorted(keyword.kwlist),
    "softKeywords": sorted(keyword.softkwlist),
    "builtins": sorted(dir(builtins)),
    "statementKinds": stmt_kinds,
    "expressionKinds": expr_kinds,
    "stdlibModules": sorted(sys.stdlib_module_names) if hasattr(sys, "stdlib_module_names") else [],
    "coreApi": core_api,
    "unicodeIdentifiers": {
        "pep3131": True,
        "greek": _ident_ok("π = 3"),
        "cjk": _ident_ok("中文 = 4"),
        "arabic": _ident_ok("تحية = 5"),
        "hangul": _ident_ok("안녕 = 6"),
        "combining": _ident_ok("café = 1"),
        "emoji": _ident_ok("😀 = 1"),
        "note": "PEP 3131: identifiers are Unicode XID_Start/XID_Continue, not [A-Za-z_]. The engine parses Greek/CJK/Arabic/Hangul/combining-mark identifiers; emoji is correctly refused (not XID). Any identifier-recipe prior must use XID, not ASCII — the Western-centrism is in the recipe, never in the engine.",
    },
}
json.dumps(result)
`;

async function main() {
  const mod = await import(new URL(`file://${PYODIDE_ENTRY}`).href);
  const py = await mod.loadPyodide();
  const raw = py.runPython(INTROSPECT);
  const introspected = JSON.parse(raw);

  const counts = {
    keywords: introspected.keywords.length,
    softKeywords: introspected.softKeywords.length,
    builtins: introspected.builtins.length,
    statementKinds: introspected.statementKinds.length,
    expressionKinds: introspected.expressionKinds.length,
    stdlibModules: introspected.stdlibModules.length,
    coreApiModules: Object.keys(introspected.coreApi).length,
    coreApiCallables: Object.values(introspected.coreApi).reduce((a, m) => a + Object.values(m).filter((e) => e?.kind === "callable").length, 0),
  };

  const out = {
    schema: "LanguageLawPrior@1",
    language: "python",
    giver: {
      resource: "CPython (the actual Python engine, compiled to WASM as pyodide)",
      engine: { pyodide: "0.26.4", python: introspected.pythonVersion },
      manifests: null,
      note:
        "The Python language's own laws, introspected from the RUNNING engine — keyword.kwlist, ast node kinds (the grammar's structure), dir(builtins), sys.stdlib_module_names, and inspect.signature over the core library. Never hand-typed: this is a derived index over the engine, not a re-definition of it. Two received tables are disclosed as such: operator precedence (the PEG grammar is not introspectable data) and the declaration-recipe shapes (kept in step with eoreader7 code-structure.js). Semantics stay in the engine (compile/exec).",
    },
    lexical: {
      keywords: introspected.keywords,
      softKeywords: introspected.softKeywords,
      unicodeIdentifiers: introspected.unicodeIdentifiers,
    },
    grammar: {
      precedence: PRECEDENCE,
      precedenceGiver: "Python language reference §6.16 (operator precedence) — received table, not introspected",
      declarationRecipes: DECLARATION_RECIPES,
      statementKinds: introspected.statementKinds,
      expressionKinds: introspected.expressionKinds,
    },
    builtins: introspected.builtins,
    lexicon: {
      stdlibModules: introspected.stdlibModules,
      coreApi: introspected.coreApi,
      coreApiGiver: "inspect.signature over the live stdlib modules (the engine's own signatures), built at run time",
    },
    counts,
    builtAt: new Date().toISOString(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`wrote ${OUT}`);
  console.log(`python=${introspected.pythonVersion} keywords=${counts.keywords} astStmt=${counts.statementKinds} astExpr=${counts.expressionKinds} builtins=${counts.builtins} stdlibModules=${counts.stdlibModules} coreApiModules=${counts.coreApiModules} coreApiCallables=${counts.coreApiCallables}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
