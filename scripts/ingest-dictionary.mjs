#!/usr/bin/env node
// ingest-dictionary.mjs <giver> <license> <normalized.jsonl> — the GIVEN (lexicographic) half, into
// the pharos. Each dictionary is a WRITER: it normalizes its entries to one line { lang, word, gloss }
// and this script weaves them as DEF·Figure "definition" entries (addr lemma:<word>), with the giver
// and the license as the basis (provenance — the exact file's license, never assumed). Nothing calls
// anything: a dictionary writes, the surfaces project.
//
//   node scripts/ingest-dictionary.mjs webster1913 PD /tmp/webster.jsonl
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(HERE, "..", "..", "pharos");
const { open, weave, weaveMany, entries } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

const [, , giver, license, file] = process.argv;
if (!giver || !license || !file) { console.error("usage: node ingest-dictionary.mjs <giver> <license> <normalized.jsonl>"); process.exit(1); }

const h = open("given", { dir: process.env.PHAROS_DIR || null, writer: giver });
if (!entries(h).some((e) => e.kind === "kind" && e.addr === "kind:definition")) weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:definition", body: { name: "definition", cell: "DEF·Figure" } });

const inputs = [];
for (const line of fs.readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  try { var e = JSON.parse(line); } catch { continue; }
  if (!e.word || !e.gloss) continue;
  inputs.push({ cell: "DEF·Figure", kind: "definition", addr: `lemma:${String(e.word).toLowerCase()}`, body: { lang: e.lang ?? "en", gloss: e.gloss }, basis: { giver, license } });
}
const n = weaveMany(h, inputs);
console.log(`woven ${n} definition entries (${giver}, ${license}) into ${h.file}`);
