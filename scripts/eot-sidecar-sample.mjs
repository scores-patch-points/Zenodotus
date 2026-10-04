#!/usr/bin/env node
// eot-sidecar-sample.mjs — task #7's own driver: validate eot-sidecar.mjs on
// a real, declared, stratified sample BEFORE committing to a 2,208-file
// sweep, and measure real throughput rather than guessing at a budget.
//
// NOT a committed regression test — a re-runnable driver, this repo's own
// P19/P27 posture (the-fold CLAUDE.md): output is read and reported, not
// pinned to a specific number that would fail the moment the corpus grows.
//
// THE SAMPLE, DECLARED. Every top-level category directory contributes:
// its three LARGEST files (worst-case timing — a 10MB single-file category
// like 16-wordplay is exactly the case a flat per-file excerpt cap needs to
// be measured against) and its three SMALLEST non-trivial files (the other
// edge: does a short document still produce a real reading, or does it
// starve the extractor the way MINE-1's own essays did). A category with
// fewer than six files contributes everything it has. This is deliberately
// NOT random sampling — this project's own eval drivers (mine-1-*.mjs,
// asserted-eval.mjs) favour declared, reproducible construction over a
// seeded shuffle whenever the question is "does this handle real material,"
// not "what is the population average."
import fs from "node:fs";
import path from "node:path";
import { loadOrgans, LP_ROOT } from "./eot-digest.mjs";
import { processFile, walkCorpus } from "./eot-sidecar.mjs";

const CATEGORIES = fs.readdirSync(LP_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d\d-/.test(e.name))
  .map((e) => e.name)
  .sort();

function filesUnder(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      if (entry.isDirectory()) { stack.push(abs); continue; }
      if (/\.(txt|md)$/i.test(entry.name) && !entry.name.endsWith(".eot.json")) out.push(abs);
    }
  }
  return out;
}

function buildSample() {
  const sample = [];
  const perCategory = {};
  for (const cat of CATEGORIES) {
    const files = filesUnder(path.join(LP_ROOT, cat))
      .map((f) => ({ path: f, bytes: fs.statSync(f).size }))
      .sort((a, b) => a.bytes - b.bytes);
    let chosen;
    if (files.length <= 6) chosen = files;
    else chosen = [...files.slice(0, 3), ...files.slice(-3)];
    perCategory[cat] = { totalFiles: files.length, totalBytes: files.reduce((s, f) => s + f.bytes, 0), sampled: chosen.length };
    sample.push(...chosen.map((f) => ({ ...f, category: cat })));
  }
  return { sample, perCategory };
}

async function main() {
  const { sample, perCategory } = buildSample();
  console.log(`stratified sample: ${sample.length} files across ${CATEGORIES.length} categories\n`);
  const organs = await loadOrgans();

  const results = [];
  const started = Date.now();
  for (const f of sample) {
    const t0 = Date.now();
    let out, error = null;
    try { out = await processFile(organs, f.path, { write: false }); }
    catch (err) { error = String(err?.message ?? err); }
    const ms = Date.now() - t0;
    results.push({ ...f, ms, error, gate: out?.admission?.gate ?? null, edgesFound: out?.reading?.edgesFound ?? null, heard: out?.admission?.heard ?? null, rawPassRate: out?.spanSelfVerification?.rawPassRate ?? null, catalogDominated: out?.excerpting?.catalogDominated ?? false, script_gap: out?.script?.gap?.reason ?? null });
    const rel = path.relative(LP_ROOT, f.path);
    console.log(`[${f.category}] ${rel} (${(f.bytes / 1024).toFixed(0)}KB): ${error ? `ERROR ${error}` : out.admission.gate} — ${ms}ms`);
  }
  const totalMs = Date.now() - started;

  console.log(`\n${sample.length} files in ${(totalMs / 1000).toFixed(1)}s`);
  const times = results.filter((r) => !r.error).map((r) => r.ms).sort((a, b) => a - b);
  const p = (q) => times[Math.floor(times.length * q)];
  console.log(`per-file: min ${times[0]}ms, p50 ${p(0.5)}ms, p90 ${p(0.9)}ms, max ${times[times.length - 1]}ms, mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)}ms`);

  const byGate = results.reduce((acc, r) => { const k = r.error ? "error" : r.gate; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  console.log(`gates: ${JSON.stringify(byGate)}`);
  const catalogDominatedCount = results.filter((r) => r.catalogDominated).length;
  console.log(`catalogDominated: ${catalogDominatedCount}/${sample.length}`);
  const scriptGaps = results.reduce((acc, r) => { if (r.script_gap) acc[r.script_gap] = (acc[r.script_gap] ?? 0) + 1; return acc; }, {});
  console.log(`script gaps: ${JSON.stringify(scriptGaps)}`);

  const bySizeBucket = { under10KB: [], "10to100KB": [], "100KBto1MB": [], over1MB: [] };
  for (const r of results) {
    const kb = r.bytes / 1024;
    const bucket = kb < 10 ? "under10KB" : kb < 100 ? "10to100KB" : kb < 1024 ? "100KBto1MB" : "over1MB";
    bySizeBucket[bucket].push(r.ms);
  }
  console.log("\nby file size (raw bytes read, NOT excerpt size — the whole-file regex passes scale with this):");
  for (const [bucket, list] of Object.entries(bySizeBucket)) {
    if (!list.length) continue;
    const mean = list.reduce((a, b) => a + b, 0) / list.length;
    console.log(`  ${bucket}: n=${list.length}, mean ${mean.toFixed(0)}ms, max ${Math.max(...list)}ms`);
  }

  console.log("\nper category:");
  for (const [cat, info] of Object.entries(perCategory)) {
    const catResults = results.filter((r) => r.category === cat);
    const catGates = catResults.reduce((acc, r) => { const k = r.error ? "error" : r.gate; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
    console.log(`  ${cat}: ${info.totalFiles} files total (${(info.totalBytes / 1e6).toFixed(1)}MB), sampled ${info.sampled} — gates ${JSON.stringify(catGates)}`);
  }

  const errors = results.filter((r) => r.error);
  if (errors.length) {
    console.log(`\n${errors.length} ERRORS (real, not gates — these are extraction crashes, worth naming for the audit):`);
    for (const e of errors) console.log(`  ${path.relative(LP_ROOT, e.path)}: ${e.error}`);
  }

  const totalFilesInCorpus = Object.values(perCategory).reduce((s, c) => s + c.totalFiles, 0);
  const meanMs = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\nfull-corpus projection: ${totalFilesInCorpus} files x ${meanMs.toFixed(0)}ms mean = ${(totalFilesInCorpus * meanMs / 1000 / 60).toFixed(1)} minutes (sequential, one process)`);

  fs.writeFileSync(path.join(LP_ROOT, "scripts", "eot-sidecar-sample-results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sampleSize: sample.length, totalMs, results, perCategory }, null, 1));
  console.log("\nwrote scripts/eot-sidecar-sample-results.json");
}

await main();
