#!/usr/bin/env node
// eot-coverage-summary.mjs — task #8's own report: walk every sidecar this
// corpus now carries and say, honestly, what got read and what did not.
// Reads only; writes nothing but its own summary file. Re-runnable at any
// point (after task #9/#10's fixes land, this is the driver that shows
// whether the anomaly rate actually moved).
import fs from "node:fs";
import path from "node:path";
import { LP_ROOT } from "./eot-digest.mjs";

function walkSidecars(root = LP_ROOT) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["scripts", "manifests", "digested", "derived-priors", "src", ".git", "node_modules"].includes(entry.name)) continue;
        stack.push(abs);
        continue;
      }
      if (entry.name.endsWith(".eot.json")) out.push(abs);
    }
  }
  return out.sort();
}

function main() {
  const sidecars = walkSidecars();
  console.log(`found ${sidecars.length} sidecars`);

  const byGate = {};
  const byCategory = {};
  let totalHeard = 0, totalTurnedAway = 0, totalOffered = 0;
  let totalRawChecked = 0, totalRawOk = 0;
  const scriptGaps = {};
  const flagged = { gapped_self_verify: [], errors: [], catalogDominated: [], corrupt: [] };
  let parseErrors = 0;

  for (const abs of sidecars) {
    const rel = path.relative(LP_ROOT, abs);
    const category = rel.includes("/") ? rel.split("/")[0] : "(repo root)";
    byCategory[category] ??= { total: 0, clean: 0, empty: 0, gapped_script: 0, gapped_self_verify: 0, heard: 0 };
    byCategory[category].total += 1;

    let s;
    try { s = JSON.parse(fs.readFileSync(abs, "utf8")); }
    catch (err) { parseErrors += 1; flagged.corrupt.push({ rel, error: String(err?.message ?? err) }); continue; }

    if (s.reading?.extractionError) flagged.errors.push({ rel, error: s.reading.extractionError });

    const gate = s.admission?.gate ?? "unknown";
    byGate[gate] = (byGate[gate] ?? 0) + 1;
    byCategory[category][gate] = (byCategory[category][gate] ?? 0) + 1;
    byCategory[category].heard += s.admission?.heard ?? 0;

    totalHeard += s.admission?.heard ?? 0;
    totalTurnedAway += s.admission?.turnedAway ?? 0;
    totalOffered += s.admission?.offered ?? 0;
    totalRawChecked += s.spanSelfVerification?.rawChecked ?? 0;
    totalRawOk += s.spanSelfVerification?.rawOk ?? 0;

    if (s.script?.gap) scriptGaps[s.script.gap.reason] = (scriptGaps[s.script.gap.reason] ?? 0) + 1;
    if (gate === "gapped_self_verify") flagged.gapped_self_verify.push(rel);
    if (s.excerpting?.catalogDominated) flagged.catalogDominated.push(rel);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalSidecars: sidecars.length,
    parseErrors,
    byGate,
    byCategory,
    admission: { totalOffered, totalHeard, totalTurnedAway },
    spanSelfVerification: { totalRawChecked, totalRawOk, rawPassRate: totalRawChecked ? totalRawOk / totalRawChecked : null },
    scriptGaps,
    flagged: {
      gapped_self_verify_count: flagged.gapped_self_verify.length,
      gapped_self_verify_sample: flagged.gapped_self_verify.slice(0, 20),
      errors_count: flagged.errors.length,
      errors_sample: flagged.errors.slice(0, 20),
      catalogDominated_count: flagged.catalogDominated.length,
      catalogDominated_sample: flagged.catalogDominated.slice(0, 20),
      corrupt_count: flagged.corrupt.length,
      corrupt_sample: flagged.corrupt.slice(0, 20),
    },
  };

  fs.writeFileSync(path.join(LP_ROOT, "scripts", "eot-coverage-summary.json"), JSON.stringify(report, null, 1));

  console.log(`\ngates: ${JSON.stringify(byGate)}`);
  console.log(`admission: offered ${totalOffered}, heard ${totalHeard}, turnedAway ${totalTurnedAway}`);
  console.log(`raw span self-verification: ${totalRawOk}/${totalRawChecked} (${totalRawChecked ? (100 * totalRawOk / totalRawChecked).toFixed(2) : "n/a"}%)`);
  console.log(`script gaps: ${JSON.stringify(scriptGaps)}`);
  console.log(`\nflagged — gapped_self_verify: ${flagged.gapped_self_verify.length}, extraction errors: ${flagged.errors.length}, catalogDominated: ${flagged.catalogDominated.length}, corrupt sidecars: ${flagged.corrupt.length}`);
  console.log("\nby category:");
  for (const [cat, info] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${info.total} sources, ${info.heard} assertions heard — ${JSON.stringify(Object.fromEntries(Object.entries(info).filter(([k]) => !["total", "heard"].includes(k))))}`);
  }
  console.log(`\nwrote scripts/eot-coverage-summary.json`);
}

main();
