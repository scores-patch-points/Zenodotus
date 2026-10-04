#!/usr/bin/env node
// lavar-prior-scaffold.mjs — mechanical half of LaVarPrior@1.
//
// LaVar (see 3.0/eoreader7's LAVAR.md — the reading-grader agent) is a
// frontier model reading source material directly, never a script. This
// tool does only the bookkeeping a script CAN do honestly: hash the source
// file, count its words, and lay down a skeleton with those facts already
// filled in, so a LaVar session spends its reading time on judgment, not on
// path arithmetic, and never states a sha256 or word count it didn't
// actually compute.
//
// The `priors`, `mistakes`, and the first `history` entry are left for the
// session that reads the material to fill in by hand (Edit/Write), the same
// way build-reading-priors.mjs's goldens are hand-adjudicated rather than
// machine-read (LP7). Running this script twice on the same file overwrites
// nothing — it refuses if the target already exists — because a second run
// would blow away hand-written judgment with a fresh skeleton.
//
//   node scripts/lavar-prior-scaffold.mjs <path-to-source-file> [--sidecar <path>] [--rung <name>]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { countWords } from "./lib/corpus-util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT_DIR = path.join(ROOT, "derived-priors", "lavar-priors");

function parseArgs(argv) {
  const args = { sidecar: null, rung: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sidecar") args.sidecar = argv[++i];
    else if (argv[i] === "--rung") args.rung = argv[++i];
    else positional.push(argv[i]);
  }
  if (positional.length !== 1) {
    console.error("usage: lavar-prior-scaffold.mjs <path-to-source-file> [--sidecar <path>] [--rung <name>]");
    process.exit(1);
  }
  args.sourcePath = positional[0];
  return args;
}

function relToRoot(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function slugFor(sourcePath) {
  return path
    .basename(sourcePath)
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function main() {
  const { sourcePath, sidecar, rung } = parseArgs(process.argv.slice(2));
  const abs = path.isAbsolute(sourcePath) ? sourcePath : path.resolve(process.cwd(), sourcePath);
  if (!fs.existsSync(abs)) {
    console.error(`no such file: ${abs}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(abs);
  const text = buf.toString("utf8");
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const forms_total = countWords(text);

  const slug = slugFor(abs);
  const outPath = path.join(OUT_DIR, `${slug}.json`);
  if (fs.existsSync(outPath)) {
    console.error(`refusing to overwrite existing prior file: ${relToRoot(outPath)}`);
    console.error("edit it by hand, or delete it first if it was a mistake.");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const skeleton = {
    schema: "LaVarPrior@1",
    giver: `LaVar (frontier model, this session) — scaffolded ${today}, not yet read`,
    read: {
      title: path.basename(abs),
      source_path: relToRoot(abs),
      sha256,
      forms_total,
    },
    sidecar: sidecar
      ? { path: relToRoot(path.resolve(process.cwd(), sidecar)), recipe_hash: null }
      : null,
    rung: rung ?? null,
    priors: [],
    mistakes: [],
    history: [
      {
        date: today,
        note: "scaffolded by lavar-prior-scaffold.mjs — sha256 and forms_total measured, nothing read yet",
      },
    ],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + "\n");
  console.log(`wrote ${relToRoot(outPath)}`);
  console.log(`sha256=${sha256} forms_total=${forms_total}`);
}

main();
