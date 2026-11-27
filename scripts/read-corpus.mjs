#!/usr/bin/env node
// read-corpus.mjs — the MODEL tier: read Zenodotus documents through khora's canonical door and let the
// pharos hold what the reading changed, as binary (PHB1). Three things, never the text:
//   the gate's own entries   khora's recordRead/weaveFullRead write the act and the read's claims (being,
//                            karaka, binding, gender, proform, part_of), writer `khora`, because the door is
//                            called without allowDegraded and with the gate on.
//   activation               CON·Figure `activation`, addr doc:<sha256>/<ref>: for one being the read admitted,
//                            where it stands, as (byte start, byte length) pairs into the document's own bytes.
//                            No text. The mouth reads the span from Zenodotus when it quotes.
//   (the source entries and the lexicon door are separate tiers: ingest-corpus.mjs, janus hyperlexicon.)
//
// Only documents the canonical reader can read: the document's label -> khora's OWN stemOf -> "eng".
// A label with no stem, or none at all, is skipped and counted (a typed gap, never English by default).
// Resumable (checkpoint of finished sha256s), sharded (one pharos directory per shard: one writer, one file),
// bounded (--budget-sec), and every dial is declared in the summary. WHOLE DOCUMENTS ONLY: a document is read whole or not at all
// (--max-bytes defers whole documents, never cuts one; a read whose readCharacters differs from the work's length is not recorded).
//
//   node scripts/read-corpus.mjs --shard 0/4 --budget-sec 2400 [--max-bytes 1500000] [--stride 1] [--dir <out>]
//   env: KHORA_HOME (../khora), PHAROS_HOME (../pharos), HL_DOOR (http://127.0.0.1:11450)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const [SI, SN] = (arg("--shard", "0/1")).split("/").map(Number);
const BUDGET = Number(arg("--budget-sec", 0)) || Infinity;
const MAX_BYTES = Number(arg("--max-bytes", 1500000));   // declared dial: a document larger than this is deferred, counted, not read
const STRIDE = Number(arg("--stride", 1));               // declared dial: read every STRIDE-th eligible document (a sample is said to be one)
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const MAX_SHARD_BYTES = Number(arg("--max-shard-bytes", 200e6));   // declared dial: the pharos stays under 1 GB in all (4 shards x 200 MB + the 52 MB source tier)
const OUT = path.resolve(arg("--dir", path.join(ROOT, "..", "zenodotus-pharos", `model-${SI}of${SN}`)));
fs.mkdirSync(OUT, { recursive: true });

const KHORA = process.env.KHORA_HOME ? path.resolve(process.env.KHORA_HOME) : path.join(ROOT, "..", "khora");
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(ROOT, "..", "pharos");
process.env.PHAROS = OUT; process.env.PHAROS_FORMAT = "phb"; process.env.PHAROS_HOME = PHAROS;   // the gate writes binary, into this shard's directory
const DOOR = (process.env.HL_DOOR || "http://127.0.0.1:11450").replace(/\/$/, "");

const { readDocument } = await import(path.join(KHORA, "native/reading.js"));
const { stemOf } = await import(path.join(KHORA, "native/the-fold/language-grammar.js"));
const { open, weaveMany, weave } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

let hlHead = null;
try { hlHead = (await (await fetch(`${DOOR}/v1/hyperlexicon`)).json()).head ?? null; } catch { /* door down: the read records its own gap */ }

function header(text) {
  const claims = {}; if (!text.startsWith("---\n")) return { claims, bodyStart: 0 };
  let pos = 4;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos); const line = nl < 0 ? text.slice(pos) : text.slice(pos, nl); pos = nl < 0 ? text.length : nl + 1;
    if (line === "---") return { claims, bodyStart: pos };
    const c = line.indexOf(":"); if (c > 0) claims[line.slice(0, c).trim()] = line.slice(c + 1).trim();
  }
  return { claims: {}, bodyStart: 0 };
}
// the work's own extent inside a Project Gutenberg file: after the START marker's line, before the END marker (format markers, not language)
function workExtent(text, from) {
  const s = text.indexOf("*** START OF", from), e = text.indexOf("*** END OF", from);
  let a = from, b = text.length;
  if (s >= 0) { const nl = text.indexOf("\n", s); a = nl < 0 ? from : nl + 1; }
  if (e >= 0 && e > a) b = e;
  return [a, b];
}

const cp = path.join(ROOT, "..", "zenodotus-pharos", "ingest-checkpoint.jsonl");
const all = fs.readFileSync(cp, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const eligible = []; const skipped = { no_label: 0, no_stem: 0, other_stem: 0, too_large: 0 };
for (const d of all) {
  const fd = fs.openSync(path.join(ROOT, d.path), "r"); const b = Buffer.alloc(4096); const n = fs.readSync(fd, b, 0, 4096, 0); const size = fs.fstatSync(fd).size; fs.closeSync(fd);
  const { claims } = header(b.toString("utf8", 0, n));
  const tail = path.basename(path.dirname(d.path)); const pathLabel = tail.length >= 2 && tail.length <= 3 && [...tail].every((c) => c >= "a" && c <= "z") ? tail : null;
  const label = claims.language ?? pathLabel ?? null;
  if (!label) { skipped.no_label++; continue; }
  const stem = stemOf(label); if (!stem) { skipped.no_stem++; continue; } if (stem !== "eng") { skipped.other_stem++; continue; }
  if (size > MAX_BYTES) { skipped.too_large++; continue; }
  eligible.push({ ...d, label });
}
eligible.sort((a, b) => (a.sha256 < b.sha256 ? -1 : 1));   // a stable, content-addressed order: shards and strides are reproducible
const mine = eligible.filter((_, i) => i % STRIDE === 0).filter((_, i) => i % SN === SI);

const done = new Set(); const dcp = path.join(OUT, "read-checkpoint.jsonl");
if (fs.existsSync(dcp)) for (const l of fs.readFileSync(dcp, "utf8").split("\n")) if (l) done.add(JSON.parse(l).sha256);
const act = open("activation", { dir: OUT, writer: "zenodotus-activation", format: "phb" });
weave(act, { cell: "DEF·Figure", kind: "kind", addr: "kind:activation", body: { name: "activation", cell: "CON·Figure" } });

const dirBytes = () => fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
const t0 = Date.now(); const st = { documents: 0, beings: 0, spans: 0, chars: 0, failed: [], partial: [] };
for (const d of mine) {
  if ((Date.now() - t0) / 1000 > BUDGET || st.documents >= LIMIT) break;
  if (dirBytes() > MAX_SHARD_BYTES) { st.stopped = "size_cap"; break; }
  if (done.has(d.sha256)) continue;
  const text = fs.readFileSync(path.join(ROOT, d.path), "utf8");
  const h = header(text); const [a, b] = workExtent(text, h.bodyStart); const body = text.slice(a, b);
  const byteAt = new Uint32Array(body.length + 1);   // char offset -> byte offset inside the body
  for (let i = 0, acc = 0; i < body.length; i++) { byteAt[i] = acc; const c = body.charCodeAt(i); acc += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c <= 0xdbff) ? 4 : (c >= 0xdc00 && c <= 0xdfff) ? 0 : 3; } byteAt[body.length] = Buffer.byteLength(body);
  const base = Buffer.byteLength(text.slice(0, a));  // the body's first byte in the file
  const docAddr = `doc:${d.sha256}`;
  try {
    const w = await readDocument(body, { language: "eng", address: docAddr });   // canonical door; no allowDegraded; the gate writes the read
    // WHOLE DOCUMENTS ONLY (the owner's rule: fewer documents, never segments): a read that took fewer characters than the work has is
    // not recorded as a read of it. The gate has already written its act; the document stays out of the checkpoint and is counted.
    if (w.readCharacters !== body.length) { st.partial.push({ path: d.path, given: body.length, read: w.readCharacters }); continue; }
    const batch = [];
    for (const c of w.cast ?? []) {
      const spans = (c.mentionSpans ?? []).filter((s) => Array.isArray(s) && s[0] >= 0 && s[1] <= body.length && s[1] > s[0]).map(([s, e]) => [base + byteAt[s], byteAt[e] - byteAt[s]]);
      if (!spans.length) continue;
      batch.push({ cell: "CON·Figure", kind: "activation", addr: `${docAddr}/${c.ref}`, body: { source: docAddr, ref: c.ref, surface: c.surface, spans }, basis: { door: "native/reading.js#readDocument", tier: w.competency?.tier ?? null, stem: w.competency?.stem ?? null, hyperlexicon: hlHead } });
      st.spans += spans.length;
    }
    if (batch.length) weaveMany(act, batch);
    st.beings += batch.length; st.documents++; st.chars += body.length;
    fs.appendFileSync(dcp, JSON.stringify({ sha256: d.sha256, path: d.path, chars: body.length, readCharacters: w.readCharacters, beings: batch.length, tier: w.competency?.tier ?? null }) + "\n");
  } catch (e) { st.failed.push({ path: d.path, why: String(e.message).replace(/\s+/g, " ").slice(0, 160) }); }
  if (st.documents % 10 === 0) process.stdout.write(`\r  shard ${SI}: ${st.documents} docs, ${(st.chars / 1e6).toFixed(1)}M chars, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
const summary = { schema: "CorpusModelRun@1", shard: `${SI}/${SN}`, door: "native/reading.js#readDocument (gate on, no allowDegraded)", format: "phb", hyperlexicon_head: hlHead, dials: { max_bytes: MAX_BYTES, stride: STRIDE, max_shard_bytes: MAX_SHARD_BYTES, budget_sec: BUDGET === Infinity ? null : BUDGET }, eligible: eligible.length, assigned: mine.length, skipped, ...st, failed_count: st.failed.length, partial_count: st.partial.length, bytes_on_disk: bytes, seconds: Math.round((Date.now() - t0) / 1000) };
fs.writeFileSync(path.join(OUT, "run-summary.json"), JSON.stringify(summary, null, 1));
console.log(`\n${JSON.stringify({ ...summary, failed: undefined })}`);
