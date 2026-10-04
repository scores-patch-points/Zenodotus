#!/usr/bin/env node
// lavar-rebuild-all-sidecars.mjs — wipe and rebuild every existing .eot.json
// sidecar in the corpus with the current recipe, per LAVAR.md §7 ("every
// existing sidecar is discarded and rebuilt"). User direction (2026-09-09):
// full 601-file corpus, in place — "they'll be in git history so feel free
// to wipe" (confirmed: all 601 are tracked and committed, working tree
// clean, before this ran).
//
// Reuses eot-sidecar.mjs's own loadOrgans/processFile rather than re-driving
// the pipeline a second way — one recipe, one place it is built.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processFile } from "./eot-sidecar.mjs";
import { loadOrgans } from "./eot-digest.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

function findSidecars(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findSidecars(full, out);
    else if (entry.name.endsWith(".eot.json")) out.push(full);
  }
  return out;
}

async function main() {
  const organs = await loadOrgans();
  const sidecars = findSidecars(ROOT).sort();
  console.log(`found ${sidecars.length} existing sidecars; rebuilding each with --fresh`);

  let clean = 0, gappedScript = 0, gappedSelfVerify = 0, empty = 0, errors = 0;
  const t0 = Date.now();
  for (const [i, sidecarPath] of sidecars.entries()) {
    const sourcePath = sidecarPath.replace(/\.eot\.json$/, "");
    const rel = path.relative(ROOT, sourcePath);
    try {
      const out = await processFile(organs, sourcePath, { fresh: true });
      const gate = out.admission.gate;
      if (gate === "clean") clean += 1;
      else if (gate === "gapped_script") gappedScript += 1;
      else if (gate === "gapped_self_verify") gappedSelfVerify += 1;
      else empty += 1;
      console.log(`[${i + 1}/${sidecars.length}] ${rel}: ${gate} — ${out.reading.edgesFound} edges, ${out.admission.heard} heard`);
    } catch (err) {
      errors += 1;
      console.error(`[${i + 1}/${sidecars.length}] ${rel}: ERROR — ${err.message}`);
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\ndone in ${secs}s: ${clean} clean, ${gappedScript} gapped_script, ${gappedSelfVerify} gapped_self_verify, ${empty} empty, ${errors} errors, ${sidecars.length} total`);
}

main();
