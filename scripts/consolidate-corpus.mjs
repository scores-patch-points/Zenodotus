#!/usr/bin/env node
// consolidate-corpus.mjs — THE NIGHT over the day's deposits (khora organs/consolidation.js): what STANDS across documents
// is projected into the field; the rest is the ECHO, still on the record by address. Corpus level of the void holarchy; the
// Pattern grain there (DMD, the difference that makes a difference): what recurs across documents is the corpus's difference
// to the reader. Nothing here reads text or decides identity; it unions witnesses and applies khora's own projection.
//
//   reads  the `deposit` entries (INS·Figure, one per document: note ids as sha256[0:16], byte spans) and the `activation`
//          entries (CON·Figure, one per being per document: byte spans) from every model directory given
//   applies khora projectField(door, log, { floor }) — floor 2 by default, the ledger's own >=2-source standing; window null
//          (only standing counts: the field is what primes the next read)
//   writes a NEW directory per night (the log is append-only; a re-run is a new night, never an overwrite):
//          standing-note   SYN·Figure  note:<id>     witnesses and sources only; the spans stay in each witness's deposit (no copy)
//          standing-being  SYN·Figure  being:<ref>   the same, for a being the read admitted in more than one document
//          echo            NUL·Figure  echo:<night>  counts below the floor, refusal `below_recurrence_floor`; each echoed
//                                                    item stays in its document's deposit or activation entry, by address
//   Identity is disclosed, never earned here: a note's identity is the assertion log's normalized ends (noteId); a being's is
//   the reader's ref. Two documents sharing a ref share a name the reader admitted, not a proven referent (identity-meet.js).
//
//   node scripts/consolidate-corpus.mjs [--floor 2] [--out <dir>] <model-dir>...
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const KHORA = process.env.KHORA_HOME ? path.resolve(process.env.KHORA_HOME) : path.join(ROOT, "..", "khora");
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(ROOT, "..", "pharos");
const { open, entries, weave, weaveMany } = await import(path.join(PHAROS, "lib", "pharos.mjs"));
const { projectField } = await import(path.join(KHORA, "native/organs/consolidation.js"));
const { sourceOfWitness } = await import(path.join(KHORA, "native/kernel/notes.js"));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const FLOOR = Number(opt("--floor", 2));
const night = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = path.resolve(opt("--out", path.join(ROOT, "..", "zenodotus-pharos", `field-${night}`)));
const dirs = args.length ? args : fs.readdirSync(path.join(ROOT, "..", "zenodotus-pharos")).filter((d) => d.startsWith("model-")).map((d) => path.join(ROOT, "..", "zenodotus-pharos", d)).filter((d) => fs.statSync(d).isDirectory());

const notes = new Map(), beings = new Map(); let deposits = 0, activations = 0;
const add = (m, id, doc, spans) => { const n = m.get(id) ?? { witnesses: new Set(), spans: {} }; n.witnesses.add(doc); n.spans[doc] = [...(n.spans[doc] ?? []), ...spans]; m.set(id, n); };
for (const d of dirs) {
  for (const e of entries(open("model", { dir: d, writer: "night-reader", format: "phb" }))) {
    if (e.kind === "deposit") { deposits++; for (const [k, sp] of e.body.notes ?? []) add(notes, k, e.body.source, sp); }
    else if (e.kind === "activation") { activations++; if (Array.isArray(e.body.beings)) for (const [ref, sp] of e.body.beings) add(beings, ref, e.body.source, sp); else add(beings, e.body.ref, e.body.source, e.body.spans ?? []); }
  }
}
// khora's projection decides field and echo; this adapter only hands it notes with their source count, as the ledger would
const project = (m) => {
  const folded = [...m].map(([id, n]) => ({ id, sources: new Set([...n.witnesses].map((w) => sourceOfWitness(w) ?? w)).size }));
  return projectField({ foldWithStanding: () => folded }, { entries: [] }, { floor: FLOOR, window: null });
};
const pn = project(notes), pb = project(beings);

fs.mkdirSync(OUT, { recursive: true });
const h = open("field", { dir: OUT, writer: "zenodotus-night", format: "phb" });
for (const [name, cell] of [["standing-note", "SYN·Figure"], ["standing-being", "SYN·Figure"], ["echo", "NUL·Figure"]]) weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${name}`, body: { name, cell } });
const basis = { organ: "khora native/organs/consolidation.js#projectField", floor: FLOOR, window: null, deposits, activations, models: dirs.map((d) => path.basename(d)) };
// the night's basis is written ONCE, on the echo entry; every standing entry points at it with `of` (what it answers)
const night0 = weave(h, { cell: "NUL·Figure", kind: "echo", addr: `echo:${night}`, body: { refusal: "below_recurrence_floor", floor: FLOOR, notes: pn.echo.length, beings: pb.echo.length, record: "each echoed item stays in its document's deposit or activation entry, by address" }, basis: { ...basis, identity: { note: "noteId (the assertion log's normalized ends), as sha256[0:16]; not referent identity", being: "the reader's ref in each document: a shared admitted name, not a proven cross-document referent" } } });
const out = [];
for (const n of pn.field) out.push({ cell: "SYN·Figure", kind: "standing-note", addr: `note:${n.id}`, of: [night0.id], body: { witnesses: [...notes.get(n.id).witnesses], sources: n.sources } });
for (const n of pb.field) out.push({ cell: "SYN·Figure", kind: "standing-being", addr: `being:${n.id}`, of: [night0.id], body: { witnesses: [...beings.get(n.id).witnesses], sources: n.sources } });
if (out.length) weaveMany(h, out);
const summary = { schema: "CorpusNight@1", night, out: OUT, floor: FLOOR, models: dirs.length, deposits, activations, notes: { total: notes.size, field: pn.field.length, echo: pn.echo.length }, beings: { total: beings.size, field: pb.field.length, echo: pb.echo.length } };
fs.writeFileSync(path.join(OUT, "night-summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
