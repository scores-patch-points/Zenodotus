#!/usr/bin/env node
// mine-extraction-patterns.mjs — DERIVED-RULES.md was hand-rolled from 4
// specimens a single reader adjudicated by eye. This asks the same
// question — what does the current pipeline systematically miss or
// garble — of the 2,208 sidecars the full corpus sweep already produced
// and this repo already commits (`find . -name '*.eot.json'`), no new
// reading required. Every DR candidate below is stated with its own
// count and worked examples, pulled straight from real admitted edges —
// never asserted from one specimen the way DR8/DR10 originally were.
//
// This is a MINING pass, not a fix: it names candidate rules, the same
// standing DERIVED-RULES.md's own header claims for itself ("PROPOSALS
// derived from measured gaps, deliberately NOT written into any
// POLICIES.md"). Adopting any finding below into the pipeline is its own
// pass with its own validation — the calibration-on-the-fixture trap this
// project already forbids applies here exactly as it does to a golden.
//
// Reads only; writes scripts/mined-patterns.json + prints the report.

import fs from "node:fs";
import path from "node:path";
import { LP_ROOT } from "./eot-digest.mjs";

const SKIP_DIRS = new Set(["scripts", "manifests", "digested", "derived-priors", "src", ".git", "node_modules"]);

function walkSidecars(root = LP_ROOT) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(abs);
        continue;
      }
      if (entry.name.endsWith(".eot.json")) out.push(abs);
    }
  }
  return out.sort();
}

// ── structural signatures on one folded edge — each names a candidate DR ──
const PRONOUN_STARTS = new Set(["he", "she", "it", "they", "him", "her", "them", "this", "that", "these", "those", "i", "we", "you"]);
const NON_VERB_SHAPED = new Set(["of", "in", "the", "to", "at", "on", "and", "or", "a", "an", "for", "with", "as", "by", "from", "than", "that", "this"]);

function firstToken(s) {
  const m = String(s ?? "").trim().match(/[\p{L}\p{N}'’]+/u);
  return m ? m[0].toLowerCase() : "";
}
function tokenCount(s) {
  return (String(s ?? "").match(/[\p{L}\p{N}'’]+/gu) ?? []).length;
}
// A lowercase letter immediately followed by an uppercase letter, INSIDE
// one token — never legitimate in ordinary English prose (no real word
// does this); the DR10 wiki-glue signature ("RevolutionMetaphorical"),
// generalized from one hand-spotted Kant example to a mechanical test.
//
// FALSE-POSITIVE CLASS FOUND BY RUNNING THIS, NOT ASSUMED: real English
// surnames legitimately carry an internal capital (McDonald, MacCauley,
// O'Brien, DeVries) — checked against the first raw run's own printed
// examples, which surfaced "MacCauley" as a "glue" hit. Excluded by its
// own closed, receivable pattern (the surname-formation prefixes), never
// a blanket exemption — a genuine glue artifact starting with "Mac"/"Mc"
// by coincidence would still need checking by hand, disclosed here rather
// than silently swept away.
const NAME_PREFIX_RE = /^(Mc|Mac|O['’]|De|Di|Van|Von|Le|La)\p{Lu}/u;
const MIDWORD_GLUE_RAW = /\p{Ll}\p{Lu}/u;
function hasGlue(str) {
  for (const tok of String(str ?? "").match(/[\p{L}\p{N}'’]+/gu) ?? []) {
    if (MIDWORD_GLUE_RAW.test(tok) && !NAME_PREFIX_RE.test(tok)) return true;
  }
  return false;
}

function signaturesOf(edge) {
  const sig = {};
  const subj = String(edge.subject ?? "");
  const obj = String(edge.object ?? "");
  const verb = String(edge.verb ?? "");
  sig.containsNewline = subj.includes("\n") || obj.includes("\n");
  sig.midWordGlue = hasGlue(subj) || hasGlue(obj);
  sig.subjectStartsPronoun = PRONOUN_STARTS.has(firstToken(subj));
  sig.verbNonVerbShaped = NON_VERB_SHAPED.has(verb.trim().toLowerCase());
  sig.subjectTokens = tokenCount(subj);
  sig.objectTokens = tokenCount(obj);
  return sig;
}

function main() {
  const sidecars = walkSidecars();
  console.log(`mining ${sidecars.length} sidecars`);

  const byCategory = {}; // register-level: density, contentWithoutRelations, turnedAway histogram
  const overallTurnedAway = {};
  let totalSentences = 0, totalEdges = 0, totalDocsWithContentNoRelations = 0, totalDocs = 0;

  const allSigCounts = { containsNewline: 0, midWordGlue: 0, subjectStartsPronoun: 0, verbNonVerbShaped: 0 };
  const subjectTokenHist = {}; // bucketed 1,2,3,4-6,7-10,11+
  let totalEdgesSampled = 0;
  const examples = { containsNewline: [], midWordGlue: [], subjectStartsPronoun: [], verbNonVerbShaped: [] };
  const EXAMPLE_CAP = 6;

  let parseErrors = 0;

  for (const abs of sidecars) {
    const rel = path.relative(LP_ROOT, abs);
    const category = rel.includes("/") ? rel.split("/")[0] : "(repo root)";
    let s;
    try { s = JSON.parse(fs.readFileSync(abs, "utf8")); }
    catch { parseErrors += 1; continue; }

    byCategory[category] ??= { docs: 0, sentences: 0, edges: 0, contentWithoutRelations: 0, turnedAway: {} };
    const c = byCategory[category];
    c.docs += 1; totalDocs += 1;
    const sentences = s.reading?.sentences ?? 0;
    const edges = s.reading?.edgesFound ?? 0;
    c.sentences += sentences; totalSentences += sentences;
    c.edges += edges; totalEdges += edges;
    if (s.reading?.contentWithoutRelations) { c.contentWithoutRelations += 1; totalDocsWithContentNoRelations += 1; }

    for (const [reason, n] of Object.entries(s.admission?.turnedAwayReasons ?? {})) {
      c.turnedAway[reason] = (c.turnedAway[reason] ?? 0) + n;
      overallTurnedAway[reason] = (overallTurnedAway[reason] ?? 0) + n;
    }

    for (const edge of s.folded ?? []) {
      totalEdgesSampled += 1;
      const sig = signaturesOf(edge);
      const bucket = sig.subjectTokens <= 0 ? "0" : sig.subjectTokens === 1 ? "1" : sig.subjectTokens === 2 ? "2" : sig.subjectTokens === 3 ? "3" : sig.subjectTokens <= 6 ? "4-6" : sig.subjectTokens <= 10 ? "7-10" : "11+";
      subjectTokenHist[bucket] = (subjectTokenHist[bucket] ?? 0) + 1;
      for (const key of Object.keys(allSigCounts)) {
        if (sig[key]) {
          allSigCounts[key] += 1;
          if (examples[key].length < EXAMPLE_CAP) {
            examples[key].push({ doc: rel, subject: edge.subject, verb: edge.verb, object: edge.object });
          }
        }
      }
    }
  }

  // register-level density, sorted worst-first (lowest edges/sentence)
  const registerRows = Object.entries(byCategory)
    .map(([cat, c]) => ({
      category: cat,
      docs: c.docs,
      density: c.sentences ? c.edges / c.sentences : null,
      contentWithoutRelationsRate: c.docs ? c.contentWithoutRelations / c.docs : 0,
      topTurnedAway: Object.entries(c.turnedAway).sort((a, b) => b[1] - a[1]).slice(0, 3),
    }))
    .sort((a, b) => (a.density ?? 1) - (b.density ?? 1));

  const report = {
    generatedAt: new Date().toISOString(),
    totalSidecars: sidecars.length,
    parseErrors,
    totals: { docs: totalDocs, sentences: totalSentences, edges: totalEdges, density: totalSentences ? totalEdges / totalSentences : null, contentWithoutRelationsRate: totalDocs ? totalDocsWithContentNoRelations / totalDocs : 0 },
    overallTurnedAway,
    registerRows,
    edgesSampled: totalEdgesSampled,
    signatureCounts: allSigCounts,
    signatureRates: Object.fromEntries(Object.entries(allSigCounts).map(([k, n]) => [k, totalEdgesSampled ? n / totalEdgesSampled : 0])),
    subjectTokenHistogram: subjectTokenHist,
    examples,
  };

  fs.writeFileSync(path.join(LP_ROOT, "scripts", "mined-patterns.json"), JSON.stringify(report, null, 1));

  console.log(`\ntotal: ${totalDocs} docs, ${totalSentences} sentences, ${totalEdges} edges, density ${(report.totals.density ?? 0).toFixed(3)} edges/sentence`);
  console.log(`content-but-zero-edges: ${totalDocsWithContentNoRelations}/${totalDocs} (${(100 * report.totals.contentWithoutRelationsRate).toFixed(1)}%)`);
  console.log(`\noverall turnedAway reasons: ${JSON.stringify(overallTurnedAway)}`);
  console.log(`\nworst 8 registers by edge density (candidate DR8 — register priors):`);
  for (const r of registerRows.slice(0, 8)) {
    console.log(`  ${r.category}: ${r.docs} docs, density ${(r.density ?? 0).toFixed(3)}, content-no-edges ${(100 * r.contentWithoutRelationsRate).toFixed(0)}% — top refusals: ${JSON.stringify(r.topTurnedAway)}`);
  }
  console.log(`\nbest 5 registers by edge density (control — what "working" looks like):`);
  for (const r of registerRows.slice(-5).reverse()) {
    console.log(`  ${r.category}: ${r.docs} docs, density ${(r.density ?? 0).toFixed(3)}`);
  }
  console.log(`\nsampled ${totalEdgesSampled} admitted edges across all sidecars for structural signatures:`);
  for (const [key, n] of Object.entries(allSigCounts)) {
    console.log(`  ${key}: ${n} (${(100 * n / totalEdgesSampled).toFixed(2)}%)`);
    for (const ex of examples[key]) console.log(`      e.g. [${ex.doc}] ${ex.subject} —${ex.verb}→ ${ex.object}`);
  }
  console.log(`\nsubject token-length histogram (DR4's own "average ~7 tokens" claim, checked at scale):`);
  console.log(`  ${JSON.stringify(subjectTokenHist)}`);
  console.log(`\nwrote scripts/mined-patterns.json`);
}

main();
