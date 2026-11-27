#!/usr/bin/env node
// recall-corpus.mjs — RECALL (SIG·Figure, khora the-fold/relative.js: "have I met this, and where"). A cue is read by the SAME
// canonical door as the corpus (no pattern, no string match): its admitted beings are the active referents. Each is looked up
// in the shadow (the pharos: activation entries, and the field's standing-being when the night has run), and the holograph
// (Zenodotus) is opened at the addresses: the bytes of each mention, and the line it stands in, up to a declared reach. A cue
// whose read admits no being is answered with the reader's own gap, never a fallback search.
//
//   node scripts/recall-corpus.mjs "<cue text>" [--reach 240] [--per-ref 3] [--min-characters 1] [<model-or-field-dir>...]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const KHORA = process.env.KHORA_HOME ? path.resolve(process.env.KHORA_HOME) : path.join(ROOT, "..", "khora");
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(ROOT, "..", "pharos");
process.env.PHAROS_HOME = PHAROS; process.env.PHAROS_FORMAT = "phb";
process.env.PHAROS ??= fs.mkdtempSync(path.join(os.tmpdir(), "recall-gate-"));   // the cue's own read is logged by the gate, apart from the corpus
const { readDocument } = await import(path.join(KHORA, "native/reading.js"));
const { open, entries } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const REACH = Number(opt("--reach", 240));     // declared dial: bytes of context either side of a mention, cut back to the line it stands in
const PER_REF = Number(opt("--per-ref", 3));   // declared dial: addresses opened per referent (the rest are counted, not opened)
const MIN_CHARS = Number(opt("--min-characters", 1));   // declared dial: a cue is read whole whatever its length; the reader's own floor (read-core.mjs minCharacters = 200) is for reading a document for relations
const cue = args.shift();
if (!cue) { console.error('usage: node scripts/recall-corpus.mjs "<cue>" [dirs...]'); process.exit(2); }
const base = path.join(ROOT, "..", "zenodotus-pharos");
const dirs = args.length ? args : fs.readdirSync(base).filter((d) => d.startsWith("model-") || d.startsWith("field-")).map((d) => path.join(base, d)).filter((d) => fs.statSync(d).isDirectory());

const paths = new Map();
for (const l of fs.readFileSync(path.join(base, "ingest-checkpoint.jsonl"), "utf8").split("\n")) if (l) { const j = JSON.parse(l); paths.set(`doc:${j.sha256}`, j.path); }

const w = await readDocument(cue, { language: "eng", minCharacters: MIN_CHARS });
const active = (w.cast ?? []).map((c) => c.ref);
if (!active.length) { console.log(JSON.stringify({ cue, gap: "the cue's read admitted no being", readerGaps: w.gaps ?? [], skipped: w.skipped ?? null })); process.exit(0); }

const shadow = new Map(); const standing = new Map();
for (const d of dirs) for (const e of entries(open("model", { dir: d, writer: "recall-reader", format: "phb" }))) {
  if (e.kind === "activation") { const rows = Array.isArray(e.body.beings) ? e.body.beings.map(([ref, spans]) => ({ ref, spans, source: e.body.source })) : [{ ref: e.body.ref, spans: e.body.spans, source: e.body.source }]; for (const r of rows) if (active.includes(r.ref)) { const s = shadow.get(r.ref) ?? []; s.push(r); shadow.set(r.ref, s); } }
  else if (e.kind === "standing-being") { const ref = e.addr.slice("being:".length); if (active.includes(ref)) standing.set(ref, e.body.sources); }
}
const open1 = (doc, [s, l]) => {
  const p = paths.get(doc); if (!p) return { doc, gap: "no path for this source in the provenance tier" };
  const b = fs.readFileSync(path.join(ROOT, p)); let a = Math.max(0, s - REACH), z = Math.min(b.length, s + l + REACH);
  const nlBefore = b.lastIndexOf(10, s - 1); if (nlBefore >= a) a = nlBefore + 1; const nlAfter = b.indexOf(10, s + l); if (nlAfter >= 0 && nlAfter < z) z = nlAfter;
  return { doc, path: p, address: `${p}#${s}+${l}`, mention: b.subarray(s, s + l).toString("utf8"), line: b.subarray(a, z).toString("utf8") };
};
const result = active.map((ref) => {
  const hits = shadow.get(ref) ?? [];
  const docs = hits.map((x) => x.source);
  const spans = hits.flatMap((x) => x.spans.map((sp) => [x.source, sp]));
  return { ref, met: hits.length > 0, documents: docs.length, standing: standing.get(ref) ?? null, mentions: spans.length, opened: spans.slice(0, PER_REF).map(([doc, sp]) => open1(doc, sp)) };
});
console.log(JSON.stringify({ cue, active, recall: result }, null, 1));
