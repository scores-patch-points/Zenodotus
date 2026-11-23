#!/usr/bin/env node
// record-corpus-lexicon-pharos.mjs — weave the corpus lexicon into a pharos as PHB1 BINARY entries.
// Each content lemma is one woven entry, addressable at `lemma:<lemma>`, carrying its usage profile
// (the gloss recovered from use): upos, uses, docs, and the roles/heads/company. The pharos is the
// one shared log; recording here (not a JSON file) is what makes the lexicon a woven record —
// append-only, content-addressed, foldable, and read as a union with any other writer's entries.
//
//   node scripts/record-corpus-lexicon-pharos.mjs <lexicon.json> <pharos-dir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(HERE, "..", "..", "pharos");
const { open, weave, status } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

const [, , lexiconFile, pharosDir] = process.argv;
const store = JSON.parse(fs.readFileSync(lexiconFile, "utf8"));

const h = open("corpus-lexicon", { dir: path.resolve(pharosDir), writer: "zenodotus", format: "phb" });

// declare the kind once (a kind declaration is itself a woven entry at BOOT.kind = DEF·Figure)
weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:usage", body: { name: "usage", cell: "DEF·Figure" } });

const basis = { source: store.source, giver: store.giver, language: store.language, documents: store.documents, built: store.built };
let n = 0;
for (const [lemma, e] of Object.entries(store.lexicon)) {
  weave(h, {
    cell: "DEF·Figure", kind: "usage", addr: `lemma:${lemma}`,
    body: { upos: e.upos, uses: e.uses, docs: e.docs, roles: e.roles, heads: e.heads, company: e.company },
    basis,
  });
  n++;
  if (n % 1000 === 0) process.stdout.write(`\r  ${n} lemmas woven`);
}
const st = status(h);
console.log(`\nrecorded ${n} lemmas as PHB1 entries into ${h.file}`);
console.log(`  pharos status: ${st.entries ?? st.total ?? "see file"} entries, writer ${h.writer}`);
