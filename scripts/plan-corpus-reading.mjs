#!/usr/bin/env node
// plan-corpus-reading.mjs — which documents the canonical reader can read, in which language, and with what
// standing: the typed-gap map that the reading tier (the model) works from. It reads nothing for its content
// beyond one probe slice per language stem, and it never reads a language as English by default.
//
// Per document: a label (the header's `language`, else a path tail declared as such: basis "path", else none)
// -> the reader's OWN stem (khora the-fold/language-grammar.js stemOf, never a table kept here) -> a verdict:
//   readable          the probe read of that stem reports the stem it was asked for and no gap
//   readable_gapped   the probe read reports the stem it was asked for, with its typed gaps listed
//   no_stem           stemOf has no stem for the label: the reader would fall back to English (the probe
//                     shows tier reading+pronouns, stem eng, gap unknown_language). REFUSED, a typed gap.
//   no_label          the document names no language: REFUSED, a typed gap.
// A probe whose competency stem differs from the stem asked for is `refused_substituted`.
//
//   node scripts/plan-corpus-reading.mjs [checkpoint.jsonl]       -> manifests/corpus-reading-plan.json
//   env: KHORA_HOME (default ../khora), PHAROS_HOME (default ../pharos), PHAROS (gate log dir; default a temp dir)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const KHORA = process.env.KHORA_HOME ? path.resolve(process.env.KHORA_HOME) : path.join(ROOT, "..", "khora");
process.env.PHAROS_HOME ??= path.join(ROOT, "..", "pharos");
process.env.PHAROS ??= fs.mkdtempSync(path.join(os.tmpdir(), "plan-reading-gate-"));
const { readToWeft } = await import(path.join(KHORA, "native/the-fold/read-process.mjs"));
const { stemOf } = await import(path.join(KHORA, "native/the-fold/language-grammar.js"));

const cp = process.argv[2] ?? path.join(ROOT, "..", "zenodotus-pharos", "ingest-checkpoint.jsonl");
const docs = fs.readFileSync(cp, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

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

const byLabel = new Map();
for (const d of docs) {
  const fd = fs.openSync(path.join(ROOT, d.path), "r"); const b = Buffer.alloc(4096); const n = fs.readSync(fd, b, 0, 4096, 0); fs.closeSync(fd);
  const { claims } = header(b.toString("utf8", 0, n));
  const tail = path.basename(path.dirname(d.path));
  const pathLabel = tail.length >= 2 && tail.length <= 3 && [...tail].every((c) => c >= "a" && c <= "z") ? tail : null;
  const label = claims.language ?? pathLabel ?? null; const basis = claims.language ? "declared-by-source" : pathLabel ? "path" : "none";
  const key = `${label}\u0000${basis}`; const e = byLabel.get(key) ?? { label, basis, documents: 0, words: 0, largest: null };
  e.documents++; e.words += d.words; if (!e.largest || d.words > e.largest.words) e.largest = d; byLabel.set(key, e);
}

const probes = new Map(); // stem -> verdict (one probe per stem, on the largest document asked for under a label that maps to it)
async function probe(stem, label, doc) {
  if (probes.has(stem)) return probes.get(stem);
  let t = fs.readFileSync(path.join(ROOT, doc.path), "utf8"); const h = header(t); t = t.slice(h.bodyStart).slice(3000, 9000);
  let v;
  try {
    const w = await readToWeft(t, { language: label });
    const got = w.competency?.stem ?? null; const gaps = [...new Set((w.gaps ?? []).map((g) => g?.gap ?? g))];
    v = got !== stem && got !== null && !(stem && got.startsWith?.(stem)) ? { verdict: "refused_substituted", asked: stem, got, gaps } : { verdict: gaps.length ? "readable_gapped" : "readable", stem: got, tier: w.competency?.tier ?? null, gaps };
  } catch (e) { v = { verdict: "refused_by_gate", why: String(e.message).replace(/\s+/g, " ").slice(0, 200) }; }
  probes.set(stem, v); return v;
}

const rows = []; const totals = {};
for (const e of [...byLabel.values()].sort((a, b) => b.words - a.words)) {
  let r;
  if (!e.label) r = { verdict: "no_label" };
  else { const stem = stemOf(e.label); r = stem ? { stem, ...(await probe(stem, e.label, e.largest)) } : { verdict: "no_stem" }; }
  rows.push({ label: e.label, label_basis: e.basis, documents: e.documents, words: e.words, ...r });
  const t = (totals[r.verdict] ??= { documents: 0, words: 0 }); t.documents += e.documents; t.words += e.words;
}
const plan = { schema: "CorpusReadingPlan@1", built: new Date().toISOString(), door: "native/the-fold/read-process.mjs#readToWeft (no allowDegraded, gate on)", khora: path.basename(KHORA), documents: docs.length, totals, labels: rows };
fs.writeFileSync(path.join(ROOT, "manifests", "corpus-reading-plan.json"), JSON.stringify(plan, null, 1));
console.log(JSON.stringify(totals, null, 1));
