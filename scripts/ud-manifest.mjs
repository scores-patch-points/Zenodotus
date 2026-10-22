#!/usr/bin/env node
// ud-manifest.mjs — enumerate every Universal Dependencies treebank and build a
// language → canonical-treebank manifest. "Every possible language" is defined
// here, mechanically and verified live (not assumed from a naming convention):
// each UD_* repository is listed, its .conllu files and sizes read, and for a
// language with several treebanks the one with the largest TRAIN split is chosen
// as canonical (a disclosed, deterministic rule — not a hand list).
//
// Output: scripts/ud-manifest.json (committed), keyed by UD language name, with:
//   { language, treebanks: [{repo, prefix, files: [{split, name, bytes}] }], canonical: <repo> }
//
// Needs: a `gh` token (reads `gh auth token`). Network: api.github.com only.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "ud-manifest.json");
const CONCURRENCY = 16;

let token;
try { token = execSync("gh auth token", { encoding: "utf8" }).trim(); } catch { token = ""; }
if (!token) { console.error("no gh token (run: gh auth token)"); process.exit(1); }

const repos = fs.readFileSync("/tmp/ud-repos.txt", "utf8").split("\n").map((s) => s.trim()).filter((s) => s.startsWith("UD_"));

async function listRepo(repo) {
  const res = await fetch(`https://api.github.com/repos/UniversalDependencies/${repo}/contents/`, {
    headers: { Authorization: `token ${token}`, "User-Agent": "ud-manifest" },
  });
  if (!res.ok) return { repo, error: res.status };
  const entries = await res.json();
  const conllu = (Array.isArray(entries) ? entries : [])
    .filter((e) => e.type === "file" && /-ud-(train|dev|test)\.conllu$/.test(e.name))
    .map((e) => {
      const m = /^(.+)-ud-(train|dev|test)\.conllu$/.exec(e.name);
      return { split: m[2], name: e.name, bytes: e.size };
    })
    .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
  const prefix = conllu.length ? conllu[0].name.replace(/-ud-(train|dev|test)\.conllu$/, "") : null;
  return { repo, prefix, files: conllu };
}

async function mapWithConcurrency(items, fn, n = CONCURRENCY) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

console.error(`listing ${repos.length} UD repositories…`);
const listed = await mapWithConcurrency(repos, listRepo);

const byLang = new Map();
for (const r of listed) {
  if (r.error) { console.error(`  ${r.repo}: HTTP ${r.error}`); continue; }
  const lang = r.repo.replace(/^UD_/, "").replace(/-[^-]+$/, "");
  if (!byLang.has(lang)) byLang.set(lang, []);
  byLang.get(lang).push(r);
}

const manifest = {};
for (const [lang, tbs] of [...byLang.entries()].sort()) {
  // canonical = largest train split; ties broken by repo name
  const best = tbs.slice().sort((a, b) => {
    const at = a.files.find((f) => f.split === "train")?.bytes ?? 0;
    const bt = b.files.find((f) => f.split === "train")?.bytes ?? 0;
    return bt - at || a.repo.localeCompare(b.repo);
  })[0];
  manifest[lang] = {
    language: lang,
    treebanks: tbs.map((t) => ({ repo: t.repo, prefix: t.prefix, files: t.files })),
    canonical: best.repo,
    canonical_prefix: best.prefix,
    canonical_train_bytes: best.files.find((f) => f.split === "train")?.bytes ?? null,
  };
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1) + "\n");
const n = Object.keys(manifest).length;
const multi = Object.values(manifest).filter((m) => m.treebanks.length > 1).length;
const noTrain = Object.values(manifest).filter((m) => m.canonical_train_bytes == null).length;
console.error(`wrote ${OUT}: ${n} languages, ${listed.filter((r) => !r.error).length} treebanks, ${multi} languages with >1 treebank, ${noTrain} with no train split`);
