#!/usr/bin/env node
// measure-dr45-at-scale.mjs — MINED-PATTERNS.md's own named next experiment:
// every committed sidecar was read with DR4 (whole-NP subjects) and DR5
// (phrasal predicates) OFF, so the corpus could confirm the recall problem
// existed but could not say whether DR4/DR5 actually help at real scale —
// only that they were a wash on the 4 hand-rolled goldens. This runs the
// SAME 2,208 sources through the SAME reader with phrasalPredicates/
// nounPhraseSubjects turned ON, `write: false` throughout (eot-sidecar.mjs's
// own escape hatch), so NOTHING on disk is touched — a pure, non-destructive
// measurement, not a re-sweep. The committed sidecars (built with the old
// recipe) are the baseline; this script's own JSON output is the new arm.
//
// Deciding whether to make DR4/DR5 the corpus's own new default — an actual
// `--fresh` re-sweep that writes 2,208 files — is a separate, later decision
// this script does not make; it only measures.

import fs from "node:fs";
import path from "node:path";
import { loadOrgans, LP_ROOT } from "./eot-digest.mjs";
import { processFile, walkCorpus } from "./eot-sidecar.mjs";

const NAME_PREFIX_RE = /^(Mc|Mac|O['’]|De|Di|Van|Von|Le|La)\p{Lu}/u;
const MIDWORD_GLUE_RAW = /\p{Ll}\p{Lu}/u;
function hasGlue(str) {
  for (const tok of String(str ?? "").match(/[\p{L}\p{N}'’]+/gu) ?? []) {
    if (MIDWORD_GLUE_RAW.test(tok) && !NAME_PREFIX_RE.test(tok)) return true;
  }
  return false;
}
const PRONOUN_STARTS = new Set(["he", "she", "it", "they", "him", "her", "them", "this", "that", "these", "those", "i", "we", "you"]);
function firstToken(s) {
  const m = String(s ?? "").trim().match(/[\p{L}\p{N}'’]+/u);
  return m ? m[0].toLowerCase() : "";
}
function tokenCount(s) {
  return (String(s ?? "").match(/[\p{L}\p{N}'’]+/gu) ?? []).length;
}

async function main() {
  const organs = await loadOrgans({ phrasalPredicates: true, nounPhraseSubjects: true });
  const files = walkCorpus();
  console.log(`measuring DR4/DR5 at scale: ${files.length} sources, write:false (nothing on disk touched)`);

  const byCategory = {};
  let totalSentences = 0, totalEdges = 0, totalDocsWithContentNoRelations = 0, totalDocs = 0;
  const allSigCounts = { containsNewline: 0, midWordGlue: 0, subjectStartsPronoun: 0 };
  const subjectTokenHist = {};
  let totalEdgesSampled = 0;
  let errors = 0;
  const t0 = Date.now();

  for (let i = 0; i < files.length; i++) {
    const abs = files[i];
    const rel = path.relative(LP_ROOT, abs);
    const category = rel.includes("/") ? rel.split("/")[0] : "(repo root)";
    let sidecar;
    try {
      sidecar = await processFile(organs, abs, { write: false, fresh: true });
    } catch (err) {
      errors += 1;
      if (errors <= 5) console.error(`  ERROR ${rel}: ${err?.message ?? err}`);
      continue;
    }

    byCategory[category] ??= { docs: 0, sentences: 0, edges: 0, contentWithoutRelations: 0 };
    const c = byCategory[category];
    c.docs += 1; totalDocs += 1;
    const sentences = sidecar.reading?.sentences ?? 0;
    const edges = sidecar.reading?.edgesFound ?? 0;
    c.sentences += sentences; totalSentences += sentences;
    c.edges += edges; totalEdges += edges;
    // contentWithoutRelations isn't a field eot-sidecar.mjs computes (that
    // was eot-digest.mjs's own SAMPLE-driver field) — reconstructed the
    // same way: real sentences present, zero edges found.
    const contentNoRelations = sentences > 0 && edges === 0;
    if (contentNoRelations) { c.contentWithoutRelations += 1; totalDocsWithContentNoRelations += 1; }

    for (const edge of sidecar.folded ?? []) {
      totalEdgesSampled += 1;
      const subj = String(edge.subject ?? ""), obj = String(edge.object ?? "");
      const nTok = tokenCount(subj);
      const bucket = nTok <= 0 ? "0" : nTok === 1 ? "1" : nTok === 2 ? "2" : nTok === 3 ? "3" : nTok <= 6 ? "4-6" : nTok <= 10 ? "7-10" : "11+";
      subjectTokenHist[bucket] = (subjectTokenHist[bucket] ?? 0) + 1;
      if (subj.includes("\n") || obj.includes("\n")) allSigCounts.containsNewline += 1;
      if (hasGlue(subj) || hasGlue(obj)) allSigCounts.midWordGlue += 1;
      if (PRONOUN_STARTS.has(firstToken(subj))) allSigCounts.subjectStartsPronoun += 1;
    }

    if ((i + 1) % 200 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ...${i + 1}/${files.length} (${elapsed}s elapsed, density so far ${(totalEdges / Math.max(1, totalSentences)).toFixed(3)})`);
    }
  }

  const registerRows = Object.entries(byCategory)
    .map(([cat, c]) => ({ category: cat, docs: c.docs, density: c.sentences ? c.edges / c.sentences : null, contentWithoutRelationsRate: c.docs ? c.contentWithoutRelations / c.docs : 0 }))
    .sort((a, b) => (a.density ?? 1) - (b.density ?? 1));

  const report = {
    generatedAt: new Date().toISOString(),
    recipe: "phrasalPredicates:true, nounPhraseSubjects:true — write:false, fresh:true (nothing on disk touched)",
    totalSources: files.length,
    errors,
    totals: { docs: totalDocs, sentences: totalSentences, edges: totalEdges, density: totalSentences ? totalEdges / totalSentences : null, contentWithoutRelationsRate: totalDocs ? totalDocsWithContentNoRelations / totalDocs : 0 },
    registerRows,
    edgesSampled: totalEdgesSampled,
    signatureCounts: allSigCounts,
    signatureRates: Object.fromEntries(Object.entries(allSigCounts).map(([k, n]) => [k, totalEdgesSampled ? n / totalEdgesSampled : 0])),
    subjectTokenHistogram: subjectTokenHist,
    elapsedMs: Date.now() - t0,
  };
  fs.writeFileSync(path.join(LP_ROOT, "scripts", "dr45-at-scale.json"), JSON.stringify(report, null, 1));

  console.log(`\ndone in ${(report.elapsedMs / 1000).toFixed(1)}s, ${errors} errors`);
  console.log(`total: ${totalDocs} docs, ${totalSentences} sentences, ${totalEdges} edges, density ${(report.totals.density ?? 0).toFixed(3)} edges/sentence`);
  console.log(`content-but-zero-edges: ${totalDocsWithContentNoRelations}/${totalDocs} (${(100 * report.totals.contentWithoutRelationsRate).toFixed(1)}%)`);
  console.log(`\nsignature rates (of ${totalEdgesSampled} sampled edges): ${JSON.stringify(report.signatureRates)}`);
  console.log(`subject token histogram: ${JSON.stringify(subjectTokenHist)}`);
  console.log(`\nwrote scripts/dr45-at-scale.json`);
}

main();
