// build-slim.mjs — wiktextract JSONL → sorted, chunked, brotli-packed slim dictionary + manifest.
//
//   node build-slim.mjs --in extract/enwiktionary-extract.jsonl --out slim [--chunk-mb 8]
//
// 1. stream the JSONL, project each entry (project.mjs), write `word<TAB>json` lines to slim/unsorted.tsv
// 2. `LC_ALL=C sort` by word (external, so it never has to fit in memory)
// 3. cut the sorted run into chunks at word boundaries of ~chunk-mb uncompressed, brotli each, name it by its sha256
// 4. manifest.json: {version, licence, chunks:[{first, last, sha256, bytes, rawBytes, words}]} — first/last are the
//    keys a lookup binary-searches, so a reader (or a peer holding only some chunks) fetches only the chunk it needs.
// A chunk file is brotli(JSON lines: one line per word, {w, e:[slim entries…]}). Re-running over unchanged input yields
// byte-identical chunks, so a mirror only re-fetches the chunks whose hash changed.
import { createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { brotliCompressSync, constants } from "node:zlib";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { slimOf, tagOf, sha256, SLIM_VERSION } from "./project.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const GLOSS = arg("gloss-lang"), TSV_IN = arg("tsv"), CODES = arg("codes"), IN = arg("in") ?? TSV_IN, OUT = arg("out", "slim"), CHUNK = Number(arg("chunk-mb", 8)) * 1048576;
if (!IN) { console.error("usage: node build-slim.mjs --in <extract.jsonl> --out <dir>"); process.exit(2); }
mkdirSync(join(OUT, "chunks"), { recursive: true });
const TSV = join(OUT, "unsorted.tsv"), SORTED = join(OUT, "sorted.tsv");

// --tsv: lines already slim (`word<TAB>json`, language by NAME) from build-fast.mjs; --codes: {name: code} to attach.
const nameToCode = CODES ? JSON.parse(readFileSync(CODES, "utf8")) : {};
let unmapped = 0;
let read = 0, kept = 0, rawIn = 0;
const w = createWriteStream(TSV);
for await (const line of createInterface({ input: createReadStream(IN), crlfDelay: Infinity })) {
  if (!line) continue;
  read++; rawIn += line.length + 1;
  let s;
  if (TSV_IN) {
    const tab = line.indexOf("\t"); try { s = JSON.parse(line.slice(tab + 1)); } catch { continue; }
    const code = nameToCode[s.n];
    if (code) { const { tag, inSuite } = tagOf(code); s = { w: s.w, c: code, tag, st: inSuite, n: s.n, p: s.p, s: s.s, ...(s.t ? { t: s.t } : {}) }; }
    else { unmapped++; s = { ...s, c: null, tag: null, st: 0 }; } // a language the tables do not name: typed gap, not a guess
  } else {
    let e; try { e = JSON.parse(line); } catch { continue; }
    s = slimOf(e); if (!s) continue;
    if (GLOSS) s.gl = GLOSS; // the language the glosses are WRITTEN in (the edition), not the language of the word
  }
  if (!w.write(`${s.w.replace(/[\t\n]/g, " ")}\t${JSON.stringify(s)}\n`)) await new Promise((r) => w.once("drain", r));
  kept++;
}
await new Promise((r) => w.end(r));
execFileSync("sort", ["-t", "\t", "-k1,1", "-s", "-S", "4G", "-T", process.env.TMPDIR || "/mnt/tmp", "-o", SORTED, TSV], { env: { ...process.env, LC_ALL: "C" } });
rmSync(TSV);

const chunks = [];
let buf = [], raw = 0, words = 0, cur = null, curEntries = [];
const flushWord = () => { if (cur == null) return; const line = JSON.stringify({ w: cur, e: curEntries }) + "\n"; buf.push(line); raw += line.length; words++; };
const flushChunk = () => {
  if (!buf.length) return;
  const body = Buffer.from(buf.join(""));
  const z = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_LGWIN]: 24, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
  const id = sha256(z);
  writeFileSync(join(OUT, "chunks", `${id}.br`), z);
  const first = JSON.parse(buf[0]).w, last = JSON.parse(buf[buf.length - 1]).w;
  chunks.push({ first, last, sha256: id, bytes: z.length, rawBytes: body.length, words });
  buf = []; raw = 0; words = 0;
};
for await (const line of createInterface({ input: createReadStream(SORTED), crlfDelay: Infinity })) {
  const tab = line.indexOf("\t"); const word = line.slice(0, tab); const rec = JSON.parse(line.slice(tab + 1));
  if (word !== cur) { flushWord(); if (raw >= CHUNK) flushChunk(); cur = word; curEntries = []; }
  curEntries.push(rec);
}
flushWord(); flushChunk(); rmSync(SORTED);

const manifest = { version: SLIM_VERSION, built: new Date().toISOString(), source: IN,
  licence: "Wiktionary text is CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); attribution: Wiktionary contributors, page histories at https://en.wiktionary.org; this slim projection is a derivative under the same licence.",
  glossLanguage: GLOSS ?? "en", reader: TSV_IN ? "fast-read.mjs (structural, templates collapsed; senses with an unread template carry gaps)" : "wiktextract", unmappedEntries: unmapped, entriesRead: read, entriesKept: kept, rawBytesIn: rawIn, chunks };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest));
const packed = chunks.reduce((n, c) => n + c.bytes, 0);
console.log(`${unmapped} entries in languages with no code in the tables;`);
console.log(`read ${read} kept ${kept}; ${chunks.length} chunks, ${(packed / 1e6).toFixed(1)} MB packed from ${(rawIn / 1e6).toFixed(0)} MB extract`);
