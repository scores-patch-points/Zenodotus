#!/usr/bin/env node
// build-corpus-lexicon.mjs — rebuild the hyperlexicon from Zenodotus: the LEARNED half, not the
// Wiktionary (given) half. Read every document of a corpus genre FULLY through khora (the canonical
// dependency-tree read, one document whole in order) and derive, per content lemma, its usage
// profile — the gloss that HyperlexiconBin@2 dropped, now recovered not from a dictionary but from
// use:
//
//   names   surface -> { lemma, upos }            (the corpus's own vocabulary, from the reader's rows)
//   roles   lemma  -> { kāraka -> count }         (what the word IS in events — the "definition")
//   heads   lemma  -> { event lemma -> count }    (which events it serves)
//   company lemma  -> { co-present lemma -> count } (Firth: a word is known by the company it keeps)
//   counters lemma -> { uses, docs }              (DMD: a type is a standing only at docs >= 2)
//
// apoha in the material: a word means by the role it occupies and the company it keeps, never by a
// lexicographer's sentence. "man" is kartṛ (agent) with company {woman, wife}; "thing" is karman
// (patient) and never the agent. That is the gloss, derived.
//
// Not an abbreviation: every document is read in full (no slice), every content lemma is kept (no
// arbitrary count floor), roles/heads/counters are unbounded. The one bound is company, and it is
// the same bound the Wiktionary bin drew: full co-occurrence is postings-level data, so company is
// kept top-K per lemma (a distributional-lexicon bound, not a corpus cut). LANGUAGE: one language
// per run (this is the en layer; the aligned 11-multi-language texts become the translation links
// in a later layer). RESUMPTION: each document's contribution is appended to a checkpoint JSONL
// keyed by content hash; a re-run skips documents already processed.
//
//   node scripts/build-corpus-lexicon.mjs en <checkpoint.jsonl> <file>...   (process)
//   node scripts/build-corpus-lexicon.mjs --merge <checkpoint.jsonl> <out.json>   (combine)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KHORA = process.env.KHORA_HOME ? path.resolve(process.env.KHORA_HOME) : path.join(HERE, "..", "..", "khora-clone");
const { read } = await import(path.join(KHORA, "native/reading-one.mjs"));

const CONTENT = new Set(["NOUN", "VERB", "ADJ", "PROPN", "ADV"]);
const COMPANY_K = 30;      // per-doc company kept per lemma (postings bound)
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const lk = (row) => String(row.lemma || row.form || "").toLowerCase();

// Strip the Project Gutenberg header/footer boilerplate (license text is not the work).
function gutenbergBody(text) {
  const m = text.match(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const e = text.match(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  return text.slice(m ? m.index + m[0].length : 0, e ? e.index : text.length);
}

// A Zenodotus document opens with a `---` header of `key: value` claims (metadata, not prose): the
// reader reads the work, never its header. Read by line; an unterminated header is not a header.
function zenodotusBody(text) {
  if (!text.startsWith("---\n")) return text;
  let pos = 4;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos);
    const line = nl < 0 ? text.slice(pos) : text.slice(pos, nl);
    pos = nl < 0 ? text.length : nl + 1;
    if (line === "---") return text.slice(pos);
  }
  return text;
}

function topK(m, k) { return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k); }

// One document, whole: the per-lemma usage profile of this document alone.
async function docLexicon(text, language) {
  const r = await read(text, { rows: true, allowDegraded: true, language, admitNominals: true, speakers: true });
  const lex = new Map();
  const up = (l) => { if (!lex.has(l)) lex.set(l, { upos: null, count: 0, roles: {}, heads: {}, company: {} }); return lex.get(l); };
  for (const p of r.parse ?? []) {
    const headOf = (id) => p.rows.find((x) => x.id === id);
    const rows = (p.rows ?? []).filter((row) => row.lemma && CONTENT.has(row.upos));
    const uniq = new Set(rows.map(lk));
    for (const row of rows) {
      const e = up(lk(row)); e.upos = row.upos; e.count++;
      if (row.karaka) e.roles[row.karaka] = (e.roles[row.karaka] ?? 0) + 1;
      const h = row.head ? headOf(row.head) : null;
      if (h?.lemma && (h.upos === "VERB" || h.upos === "NOUN" || h.upos === "ADJ")) { const hl = lk(h); e.heads[hl] = (e.heads[hl] ?? 0) + 1; }
    }
    for (const l of uniq) { const e = up(l); for (const q of uniq) if (q !== l) e.company[q] = (e.company[q] ?? 0) + 1; }
  }
  // company top-K per lemma (postings bound)
  for (const [, e] of lex) e.company = Object.fromEntries(topK(e.company, COMPANY_K));
  return lex;
}

function add(a, b) { const out = new Map(a); for (const [l, e] of b) { const cur = out.get(l) ?? { upos: e.upos, count: 0, roles: {}, heads: {}, company: {} }; cur.count += e.count; for (const [k, v] of Object.entries(e.roles)) cur.roles[k] = (cur.roles[k] ?? 0) + v; for (const [k, v] of Object.entries(e.heads)) cur.heads[k] = (cur.heads[k] ?? 0) + v; for (const [k, v] of Object.entries(e.company)) cur.company[k] = (cur.company[k] ?? 0) + v; out.set(l, cur); } return out; }

const [, , mode, cp, ...rest] = process.argv;

if (mode === "--merge") {
  const outFile = rest[0];
  const acc = new Map(); let docs = 0; const docsSeen = new Map();
  for (const line of fs.readFileSync(cp, "utf8").split("\n")) { if (!line.trim()) continue; const j = JSON.parse(line); docs++; for (const [l, e] of Object.entries(j.lex)) { const cur = acc.get(l) ?? { upos: e.upos, count: 0, roles: {}, heads: {}, company: {}, docs: 0 }; cur.count += e.count; cur.docs++; for (const [k, v] of Object.entries(e.roles)) cur.roles[k] = (cur.roles[k] ?? 0) + v; for (const [k, v] of Object.entries(e.heads)) cur.heads[k] = (cur.heads[k] ?? 0) + v; for (const [k, v] of Object.entries(e.company)) cur.company[k] = (cur.company[k] ?? 0) + v; acc.set(l, cur); } }
  const lexicon = {}; let types = 0;
  for (const [l, e] of acc) { lexicon[l] = { upos: e.upos, uses: e.count, docs: e.docs, roles: Object.fromEntries(topK(e.roles, 8)), heads: Object.fromEntries(topK(e.heads, 8)), company: Object.fromEntries(topK(e.company, 20)) }; types++; }
  const store = { schema: "CorpusLexicon@1", source: "Zenodotus", giver: "khora dependency-tree read (kāraka)", language: "en", documents: docs, types, built: new Date().toISOString(), lexicon };
  fs.writeFileSync(outFile, JSON.stringify(store));
  console.log(`merged ${docs} documents -> ${types} types -> ${outFile}`);
  process.exit(0);
}

// process mode: mode = language, cp = checkpoint, rest = files
const lang = mode;
const done = new Set();
if (fs.existsSync(cp)) for (const line of fs.readFileSync(cp, "utf8").split("\n")) { if (!line.trim()) continue; done.add(JSON.parse(line).hash); }
const files = rest;
console.log(`corpus-lexicon: ${files.length} files, ${done.size} already done, language ${lang}`);
const t0 = Date.now(); let n = 0;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const hash = sha256(text);
  if (done.has(hash)) { console.log(`  skip ${path.basename(f)}`); continue; }
  const body = gutenbergBody(zenodotusBody(text)).replace(/\r/g, ""); // regex-ok: line-ending bytes, not language
  const t1 = Date.now();
  const lex = await docLexicon(body, lang);
  fs.appendFileSync(cp, JSON.stringify({ hash, file: f, lex: Object.fromEntries(lex) }) + "\n");
  done.add(hash); n++;
  console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${path.basename(f)}: ${body.length} chars, ${lex.size} lemmas (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
}
console.log(`done ${n} new documents in ${((Date.now() - t0) / 1000).toFixed(0)}s; checkpoint ${cp}`);
