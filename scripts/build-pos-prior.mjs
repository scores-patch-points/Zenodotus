#!/usr/bin/env node
// build-pos-prior.mjs — transform Universal Dependencies UD_English-EWT
// (real human POS annotation, CC BY-SA 4.0) into POSPrior@1: per surface
// FORM, how often the treebank attests each UPOS class. Ambiguity is
// PRESERVED — no winner is picked at build time; `dominantClass`
// (eoreader7 native/adapters/text/wordclass.js, this artifact's one
// consumer contract) collapses only at a CALLER-DECLARED share floor.
//
// Why this script exists in live_priors: the canonical build
// (the legacy engine.1's scripts/build-pos-prior.mjs, run for the first time by
// the grammar-lens pass) is unreachable in this checkout —
// `legacy-legacy-engine.1` is the standing uninitialized submodule and its
// gitignored local output (`pos-eng.json`) exists nowhere on this
// machine, verified 2026-08-31. This is the same one-fetch-one-script
// move this repo's own build-act-prior.mjs already reproduces for
// VerbNet, and the output is COMMITTED (derived-priors/, with giver and
// license) matching act-prior-en.json's own precedent rather than
// the legacy engine.1's gitignored-local convention — a reading recipe that
// depends on this prior must be reproducible from the repo alone.
//
// The consumer this was built for, named so the next reader knows what
// depends on it: ReadingPriors@1's head extraction (build-reading-
// priors.mjs::headOf) — "which token of an adjudicated relation string is
// the content verb" answered by MEASURED treebank dominance, never by a
// hand-typed stop list (user direction, 2026-08-31: "I don't like stop
// lists, they're a hack" — and widget.js's own recorded law: a hand
// list is a sample of an open class standing in for the whole).
//
// CONLL-U reading: FORM = column 2, UPOS = column 4; comment lines (#),
// multiword-token ranges (ID with '-') and empty nodes (ID with '.') are
// skipped — ranges would double-count their parts, empty nodes are not
// surface tokens. Forms are lowercased (the consumer's own classifyWord
// lowercases before lookup).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "pos-priors");
const OUT = path.join(OUT_DIR, "pos-prior-en.json");

const BASE = "https://raw.githubusercontent.com/UniversalDependencies/UD_English-EWT/master";
const FILES = ["en_ewt-ud-train.conllu", "en_ewt-ud-dev.conllu", "en_ewt-ud-test.conllu"];

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// Object.create(null), not {}: English EWT itself has no colliding token
// (checked), but the sibling multilingual build (build-pos-prior-multi.mjs)
// found a real one live in UD_Spanish-AnCora ("constructor" is a genuine
// attested Spanish word) — a plain {} lets `forms[form] ??= {}` silently
// resolve to Object.prototype.constructor instead of a fresh counter,
// corrupting that word's counts with no error. Fixed here too as a
// preventive measure, not a correction — this file's own committed output
// was verified unaffected before this change.
const forms = Object.create(null);
const sources = [];
let tokens = 0, sentences = 0;

for (const f of FILES) {
  const url = `${BASE}/${f}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`fetch failed ${res.status}: ${url}`); process.exit(1); }
  const text = await res.text();
  sources.push({ file: f, url, sha256: sha256(text), bytes: Buffer.byteLength(text) });
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) { if (line.startsWith("# sent_id")) sentences++; continue; }
    const cols = line.split("\t");
    if (cols.length < 5) continue;
    const id = cols[0];
    if (id.includes("-") || id.includes(".")) continue; // ranges / empty nodes
    const form = cols[1].toLowerCase();
    const upos = cols[3];
    if (!form || !upos || upos === "_") continue;
    (forms[form] ??= {})[upos] = (forms[form][upos] ?? 0) + 1;
    tokens++;
  }
}

const artifact = {
  schema: "POSPrior@1",
  giver: {
    resource: "Universal Dependencies UD_English-EWT",
    resourceLicense: "CC BY-SA 4.0",
    url: "https://github.com/UniversalDependencies/UD_English-EWT",
    files: sources,
    note: "per-form UPOS attestation counts; ambiguity preserved, no winner picked at build time — the consumer contract is eoreader7 native/adapters/text/wordclass.js (classifyWord/dominantClass, caller-declared share floor)",
  },
  counts: { forms: Object.keys(forms).length, tokens, sentences },
  forms,
  builtAt: new Date().toISOString(),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 1));
console.log(`POSPrior@1 -> ${path.relative(ROOT, OUT)}: ${artifact.counts.forms} forms, ${tokens} tokens, ${sentences} sentences`);
for (const w of ["the", "have", "has", "shall", "subjected", "pledged", "right", "enjoy", "is"]) {
  console.log(` ${w}:`, JSON.stringify(forms[w] ?? null));
}
