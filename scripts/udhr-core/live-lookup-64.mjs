// udhr-core/live-lookup-64.mjs — the 64 English words the UDHR itself uses that the English POS prior does not know (ring1-reentry R2), looked up
// on en.wiktionary.org only, one per PACE ms, cached; each answer applied through applyEvidence to a COPY of the log (_live64.eot).
// Pre-registered: the words are exactly N0 = unknown-to-prior words of the English UDHR editions; nothing else is asked. Reported, not claimed:
// per word the page/POS verdict, and whether the English edition's nearest-neighbour map or the domain conclusion moved.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { readAll, modalNN, mutualPairs, rootOf } from "./build-mind-beings.mjs";
import { readUnits, isUnknownWord } from "./read-beings.mjs";
import { makeSettler, drain } from "./lookup.mjs";
import { applyEvidence, domainTip } from "./revise.mjs";
import { entry, cache } from "./wiktionary-pilot.mjs";
const DRY = process.argv.includes("dry"), DOMAIN = "udhr-core/beings-independent";
const SRC = new URL("./mind.eot", import.meta.url).pathname, OUT = new URL("./_live64.eot", import.meta.url).pathname;
copyFileSync(SRC, OUT);
const { rows: every } = await readAll({ settle: () => null });
let rows = every.filter((r) => r.kind !== "projected-from-UDHR");
const tip = domainTip(readFileSync(OUT), DOMAIN), start = rootOf(mutualPairs(modalNN(rows)));
if (tip.root !== start) throw new Error(`log ${tip.root} != rows ${start}`);
const idx = rows.findIndex((r) => r.file === "udhr-eng.txt");
console.log(`eng in independent domain: ${idx >= 0}; rows ${rows.length}`);
if (idx < 0) process.exit(0);
const P = rows[idx].hearing.posPrior, TOK = /[\p{L}\p{M}\p{N}'’]+/gu, count = new Map();
for (const f of rows[idx].frames) for (const raw of f.match(TOK) ?? []) { const w = raw.toLowerCase(); if (isUnknownWord(P, w)) count.set(w, (count.get(w) ?? 0) + 1); }
const needs = [...count].map(([surface, mentions]) => ({ surface, mentions, units: 1 }));
console.log(`words: ${needs.length}; already cached: ${needs.filter((n) => cache[n.surface] !== undefined).length}`);
if (DRY) process.exit(0);
const settle = makeSettler(cache, "en"), results = [];
await drain(needs, {
  fetchEntry: async (w) => { if (!isUnknownWord(P, w)) throw new Error(`refusing ${w}`); return entry(w); },
  onAnswer: async (w, e) => {
    const sec = e?.en ?? null, verdict = settle(w);
    const re = readUnits(rows[idx].frames, rows[idx].hearing, { settle });
    const moved = re.nn.some((v, u) => v !== rows[idx].nn[u]);
    const r = applyEvidence(OUT, DOMAIN, rows, idx, re.nn);
    rows = rows.map((x, i) => (i === idx ? { ...x, nn: re.nn, needs: re.needs } : x));
    results.push({ word: w, pageFound: e != null, pos: sec?.map((s) => s.pos).join("/") ?? null, verdict, nnMoved: moved, conclusionMoved: r.changed, surpriseBits: +r.surpriseBits.toFixed(3) });
    console.log(JSON.stringify(results.at(-1)));
  },
});
const n = (f) => results.filter(f).length;
const summary = { asked: results.length, pageFound: n((r) => r.pageFound), nominal: n((r) => r.verdict === "nominal"), other: n((r) => r.verdict === "other"), noVerdict: n((r) => !r.verdict), nnMoved: n((r) => r.nnMoved), conclusionMoved: n((r) => r.conclusionMoved) };
writeFileSync(new URL("./live-lookup-64-report.json", import.meta.url), JSON.stringify({ summary, results }, null, 1) + "\n");
console.log(JSON.stringify(summary));
