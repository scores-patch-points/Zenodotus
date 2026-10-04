// build-alias-prior.mjs — AliasDeclarationPrior@1
//
// WHAT THIS IS FOR. Every reader in this project eventually needs to know
// that two surfaces name one thing. `surfaces.js::namesCorefer` already
// folds a name shortened by DROPPING WORDS ("Regional Transit
// Authority" / "Transit Authority"), and measurably does NOT fold one
// shortened by INITIALS ("RTA"). The tempting patch is a rule that
// builds an initialism and compares it — refused, because a rule that
// DERIVES a name is a rule that can INVENT one, and this project has never
// let the shape of a string decide referent identity.
//
// Prose does not need us to guess: it introduces its own short forms, and
// it does so in a small number of recurring SHAPES. This script measures
// which shapes actually do that, over the corpus, so the shapes enter a
// reader as a prior WITH A GIVER and with the evidence that earned each of
// them, rather than as a regex someone typed.
//
// THE MEASUREMENT. A shape FIRES when it matches. It is CONFIRMED when the
// form it introduced is then USED in the same document at least MIN_USES
// times (the declaration counting as one) — because a gloss the document
// never uses again is an aside, not a name. A shape's rate is confirmed /
// fires, and a consumer applies its own floor to that: this file measures,
// it does not decide.
//
// The shapes below are CANDIDATES TO TEST, not the answer. A candidate that
// never fires, or fires and is rarely confirmed, is reported exactly that
// way and a consumer is expected to refuse it.
//
// Run: node scripts/build-alias-prior.mjs
//   env: DIRS (comma-separated corpus dirs) · MAX_FILES · MIN_USES · OUT

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIRS = (process.env.DIRS ?? "02-encyclopedic,06-government-legal,15-western-canon,05-academic-papers").split(",");
const MAX_FILES = Number(process.env.MAX_FILES ?? 900);
const MIN_USES = Number(process.env.MIN_USES ?? 2);
const OUT = process.env.OUT ?? join(ROOT, "derived-priors", "alias-priors", "alias-declaration-en.json");

// A run of capitalised words, allowing the small connectors a real name
// carries. Shared by every shape so they differ only in their CONNECTIVE.
const NAME = "(?:[A-Z][\\w'’-]*)(?:\\s+(?:of|the|and|for|de|van|von|[A-Z][\\w'’-]*))*";
const GLOSS = "[^()\\n]{1,60}";
const SHORT = "[A-Z][\\w'’.&-]*(?:\\s+[\\w'’.&-]+){0,3}";

// The candidates. `full`/`alias` name which capture group is which, so a
// shape whose alias comes FIRST ("X, short for Y") is expressible without a
// second code path.
const SHAPES = [
  { id: "parenthetical", connective: "( )", re: new RegExp(`(${NAME})\\s*\\(\\s*(${GLOSS}?)\\s*\\)`, "g"), full: 1, alias: 2 },
  { id: "also-known-as", connective: "also known as", re: new RegExp(`(${NAME})\\s*,?\\s+also known as\\s+(${SHORT})`, "g"), full: 1, alias: 2 },
  { id: "known-as", connective: "known as", re: new RegExp(`(${NAME})\\s*,?\\s+known as\\s+(${SHORT})`, "g"), full: 1, alias: 2 },
  { id: "or", connective: ", or", re: new RegExp(`(${NAME})\\s*,\\s+or\\s+(${SHORT})\\s*,`, "g"), full: 1, alias: 2 },
  { id: "abbreviated", connective: "abbreviated", re: new RegExp(`(${NAME})\\s*,?\\s+abbreviated\\s+(${SHORT})`, "g"), full: 1, alias: 2 },
  { id: "short-for", connective: "short for", re: new RegExp(`(${SHORT})\\s*,\\s+short for\\s+(${NAME})`, "g"), full: 2, alias: 1 },
  { id: "dba", connective: "doing business as", re: new RegExp(`(${NAME})\\s*,?\\s+(?:d/b/a|doing business as)\\s+(${SHORT})`, "g"), full: 1, alias: 2 },
  { id: "formerly", connective: "formerly", re: new RegExp(`(${NAME})\\s*,?\\s+formerly\\s+(${SHORT})`, "g"), full: 1, alias: 2 },
];

const NAME_SHAPE = /^[\w'’.&-]+(?:\s+[\w'’.&-]+){0,3}$/;
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fold = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (out.length >= MAX_FILES) return out;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if ([".txt", ".md"].includes(extname(p))) out.push(p);
  }
  return out;
}

const files = [];
for (const d of DIRS) walk(join(ROOT, d), files);

const tally = new Map(SHAPES.map((s) => [s.id, { fires: 0, confirmed: 0, notName: 0, sameAsFull: 0, examples: [] }]));
let read = 0, bytes = 0;

for (const f of files.slice(0, MAX_FILES)) {
  let text; try { text = readFileSync(f, "utf8"); } catch { continue; }
  if (!text || text.length < 500) continue;
  read += 1; bytes += text.length;
  const usesOf = (form) => {
    try { return (text.match(new RegExp(`(?<![\\w'’-])${escapeRe(form)}(?![\\w'’-])`, "gi")) ?? []).length; }
    catch { return 0; }
  };
  for (const shape of SHAPES) {
    const t = tally.get(shape.id);
    shape.re.lastIndex = 0;
    for (const m of text.matchAll(shape.re)) {
      const full = fold(m[shape.full]);
      const alias = fold(m[shape.alias]);
      if (!full || !alias) continue;
      t.fires += 1;
      if (!NAME_SHAPE.test(alias) || /^\d+$/.test(alias)) { t.notName += 1; continue; }
      if (alias.toLowerCase() === full.toLowerCase()) { t.sameAsFull += 1; continue; }
      if (usesOf(alias) >= MIN_USES) {
        t.confirmed += 1;
        if (t.examples.length < 5) t.examples.push({ full, alias, uses: usesOf(alias), file: f.slice(ROOT.length) });
      }
    }
  }
}

const shapes = {};
for (const s of SHAPES) {
  const t = tally.get(s.id);
  shapes[s.id] = {
    connective: s.connective,
    source: s.re.source,
    full_group: s.full,
    alias_group: s.alias,
    fires: t.fires,
    confirmed: t.confirmed,
    refused_not_a_name: t.notName,
    refused_same_as_full: t.sameAsFull,
    confirm_rate: t.fires ? Number((t.confirmed / t.fires).toFixed(4)) : null,
    examples: t.examples,
  };
}

const prior = {
  schema: "AliasDeclarationPrior@1",
  language: "en",
  provenance: {
    source: `live_priors corpus: ${DIRS.join(", ")}`,
    license: "per-work; see SOURCES.md",
    built_by: "scripts/build-alias-prior.mjs",
    files_read: read,
    bytes_read: bytes,
    min_uses: MIN_USES,
    note:
      "Shapes are CANDIDATES TESTED against the corpus, never a list asserted to be right. " +
      "A shape FIRES when it matches; it is CONFIRMED when the form it introduced is used at least min_uses times in the same document, the declaration counting as one. " +
      "confirm_rate is confirmed/fires. A consumer applies its own floor: this prior measures, it does not decide. " +
      "No rule here derives a name from another name — an initialism is admitted only where a document declares it, which is why acronyms need no rule of their own.",
  },
  min_uses: MIN_USES,
  shapes,
};

mkdirSync(join(ROOT, "derived-priors", "alias-priors"), { recursive: true });
writeFileSync(OUT, JSON.stringify(prior, null, 1));
console.log(`AliasDeclarationPrior@1 — ${read} file(s), ${(bytes / 1e6).toFixed(1)}MB`);
for (const [id, v] of Object.entries(shapes))
  console.log(`  ${id.padEnd(14)} fires ${String(v.fires).padStart(6)}  confirmed ${String(v.confirmed).padStart(6)}  rate ${v.confirm_rate ?? "—"}`);
console.log(`wrote ${OUT}`);
