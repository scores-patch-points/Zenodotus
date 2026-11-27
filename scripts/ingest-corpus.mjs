#!/usr/bin/env node
// ingest-corpus.mjs — the MEMORY tier: every document of Zenodotus, whole, into a pharos, so the
// corpus is a woven record a surface can chat from (nothing is read by a pattern here; this tier
// only keeps, addresses and cites — the reading tier is build-corpus-lexicon.mjs).
//
// Per document, two kinds, both written by the one writer `zenodotus-ingest`:
//   source   NUL·Figure  addr doc:<sha256 of the bytes>   body = the header claims (title, author,
//                        language, license, source_url ... as the file states them; a claim no one
//                        states is null — never guessed), the path, bytes, words, passage count.
//   passage  SEG·Figure  addr doc:<sha256>#<n>            body = { text, i, of, off } the document's
//                        own text in order, cut at the document's own line breaks (never mid-line
//                        unless one line alone exceeds the cap), `of` = the source entry's address.
// Re-running is idempotent: a document already in the checkpoint (by sha256) is skipped.
//
// Typed gaps, never silent drops (written to manifests/corpus-ingest-manifest.json):
//   non_text      files that are not .txt documents (xml, json, sidecars ...) counted by extension
//   unreadable    a .txt that is not valid UTF-8 text (replacement characters > 1%)
//   no_language   a document whose language is neither declared in its header nor in its path
//
//   node scripts/ingest-corpus.mjs [--dir <pharos-dir>] [--only <collection-prefix>] [--limit N]
//   env: PHAROS_HOME (default ../pharos), PHAROS_DIR (default ../zenodotus-pharos)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(ROOT, "..", "pharos");
const { open, weave, weaveMany } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = path.resolve(arg("--dir", process.env.PHAROS_DIR ?? path.join(ROOT, "..", "zenodotus-pharos")));
const ONLY = arg("--only");
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const CAP = 2400;        // a passage's character cap (a declared dial: one passage must be quotable in a reply)
const TARGET = 1200;     // flush a passage at a document line break once it holds this many characters
const SKIP_DIRS = new Set([".git", "node_modules", "derived-priors", "legacy", "mind-pharos", "scripts", "src", "manifests", "pointers"]);
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// header: a leading `---` block of `key: value` lines, read by line (a file format, not language)
function parseHeader(text) {
  const out = { claims: {}, bodyStart: 0 };
  if (!text.startsWith("---\n")) return out;
  let pos = 4;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos);
    const line = nl < 0 ? text.slice(pos) : text.slice(pos, nl);
    pos = nl < 0 ? text.length : nl + 1;
    if (line === "---") { out.bodyStart = pos; return out; }
    const c = line.indexOf(":");
    if (c > 0) out.claims[line.slice(0, c).trim()] = line.slice(c + 1).trim();
  }
  return { claims: {}, bodyStart: 0 }; // an unterminated header is not a header
}

// words as the corpus's own floor counts them (whitespace-separated runs), by a character scan
function countWords(s) {
  let n = 0, inw = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const sp = c === 32 || c === 10 || c === 13 || c === 9 || c === 0xa0 || c === 0x3000;
    if (!sp && !inw) n++;
    inw = !sp;
  }
  return n;
}

function sliceSafe(s, a, b) { // never cut a surrogate pair
  let e = b;
  if (e < s.length) { const c = s.charCodeAt(e - 1); if (c >= 0xd800 && c <= 0xdbff) e--; }
  return [s.slice(a, e), e];
}

function passages(body) {
  const out = []; let cur = "", off = 0, curOff = 0;
  const flush = () => { if (cur.trim()) out.push({ text: cur, off: curOff }); cur = ""; };
  for (const line of body.split("\n")) {
    const piece = line + "\n";
    if (piece.length > CAP) { // one line alone exceeds the cap: slice it, flushing what came before
      flush();
      for (let a = 0; a < piece.length;) { const [t, e] = sliceSafe(piece, a, Math.min(a + CAP, piece.length)); out.push({ text: t, off: off + a }); a = e; }
      off += piece.length; curOff = off; continue;
    }
    if (!cur) curOff = off;
    if (cur.length + piece.length > CAP) { flush(); curOff = off; }
    cur += piece; off += piece.length;
    if (cur.length >= TARGET && line.trim() === "") flush(); // a blank line is the document's own paragraph break
  }
  flush();
  return out;
}

function* walk(dir, rel = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.isDirectory()) { if (rel === "" && SKIP_DIRS.has(e.name)) continue; if (SKIP_DIRS.has(e.name) && e.name === ".git") continue; yield* walk(path.join(dir, e.name), path.join(rel, e.name)); }
    else yield path.join(rel, e.name);
  }
}

const h = open("zenodotus", { dir: DIR, writer: "zenodotus-ingest", format: "phb" });
weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:source", body: { name: "source", cell: "NUL·Figure" } });
weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:passage", body: { name: "passage", cell: "SEG·Figure" } });

const cpFile = path.join(DIR, "ingest-checkpoint.jsonl");
fs.mkdirSync(DIR, { recursive: true });
const done = new Set();
if (fs.existsSync(cpFile)) for (const l of fs.readFileSync(cpFile, "utf8").split("\n")) if (l) done.add(JSON.parse(l).sha256);

const stats = { documents: 0, skipped_done: 0, passages: 0, words: 0, bytes: 0, non_text: {}, unreadable: [], no_language: 0, by_collection: {} };
const t0 = Date.now(); let batchSources = [], n = 0;
for (const rel of walk(ROOT)) {
  if (ONLY && !rel.startsWith(ONLY)) continue;
  if (!rel.endsWith(".txt")) { const x = path.extname(rel) || "(none)"; stats.non_text[x] = (stats.non_text[x] ?? 0) + 1; continue; }
  if (n >= LIMIT) break;
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const sha = sha256(buf);
  if (done.has(sha)) { stats.skipped_done++; continue; }
  const text = buf.toString("utf8");
  if (text.split("�").length - 1 > text.length * 0.01) { stats.unreadable.push(rel); continue; }
  const { claims, bodyStart } = parseHeader(text);
  const body = text.slice(bodyStart).replace(/\r/g, ""); // regex-ok: line-ending bytes of a file, not language
  const parts = passages(body);
  const tail = path.basename(path.dirname(rel));
  const pathLang = tail.length >= 2 && tail.length <= 3 && tail === tail.toLowerCase() && [...tail].every((c) => c >= "a" && c <= "z") ? tail : null;
  const language = claims.language ?? pathLang ?? null;
  const language_basis = claims.language ? (claims.language_basis ?? "declared-by-source") : pathLang ? "path" : "unknown";
  if (!language) stats.no_language++;
  const words = countWords(body);
  const collection = claims.collection ?? path.dirname(rel);
  const addr = `doc:${sha}`;
  const basis = { giver: "zenodotus-ingest", source: claims.source ?? null, license: claims.license ?? null, path: rel, sha256: sha };
  const inputs = [{ cell: "NUL·Figure", kind: "source", addr, body: { path: rel, collection, title: claims.title ?? null, author: claims.author ?? null, language, language_basis, source: claims.source ?? null, source_url: claims.source_url ?? null, license: claims.license ?? null, date: claims.date ?? null, claims, bytes: buf.length, words, passages: parts.length }, basis }];
  parts.forEach((p, i) => inputs.push({ cell: "SEG·Figure", kind: "passage", addr: `${addr}#${i}`, body: { text: p.text, i, of: parts.length, off: p.off, source: addr }, basis: { giver: "zenodotus-ingest", path: rel, sha256: sha } }));
  weaveMany(h, inputs);
  fs.appendFileSync(cpFile, JSON.stringify({ sha256: sha, path: rel, passages: parts.length, words }) + "\n");
  done.add(sha); n++;
  stats.documents++; stats.passages += parts.length; stats.words += words; stats.bytes += buf.length;
  const top = rel.split("/")[0]; const c = (stats.by_collection[top] ??= { documents: 0, words: 0, passages: 0 }); c.documents++; c.words += words; c.passages += parts.length;
  if (n % 250 === 0) process.stdout.write(`\r  ${n} docs, ${stats.passages} passages, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const manifest = { schema: "CorpusIngest@1", pharos: path.basename(DIR), writer: "zenodotus-ingest", built: new Date().toISOString(), dials: { passage_cap_chars: CAP, passage_target_chars: TARGET }, ...stats, unreadable_count: stats.unreadable.length };
fs.mkdirSync(path.join(ROOT, "manifests"), { recursive: true });
const mf = path.join(ROOT, "manifests", ONLY || LIMIT !== Infinity ? "corpus-ingest-partial-manifest.json" : "corpus-ingest-manifest.json");
fs.writeFileSync(mf, JSON.stringify(manifest, null, 1));
console.log(`\ningested ${stats.documents} documents (${stats.skipped_done} already done), ${stats.passages} passages, ${stats.words} words in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${h.file}\nmanifest ${mf}`);
