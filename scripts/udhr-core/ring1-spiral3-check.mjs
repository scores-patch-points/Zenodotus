// GATED variant of ring1-spiral-check.mjs (reads ring1-spiral3-report.json); claims K1-K3 unchanged and fixed before the run.
// udhr-core/ring1-spiral-check.mjs — settle the sniff-dependent associates of ring1-spiral2.mjs with Wiktionary, then re-enter the CLEANED set.
//
// The 34 associates (of 50) that only the sniff settled as nominal are looked up on en.wiktionary.org (one request per 10 s, existing cache), and settled by
// the hybrid policy (hybrid-settle.mjs): a pure Wiktionary list decides; a mixed list keeps the accepted sniff vote; no entry keeps it provisional.
// PRE-REGISTERED before the run (2026-10-19):
//   K1  Among associates with a PURE Wiktionary list, the sniff's "nominal" is right (Wiktionary pure-nominal) in at least 85%.
//   K2  Reported: every associate that Wiktionary contradicts (pure-other) or cannot find, and the dialect forms' fate.
//   K3  Reported, not claimed: the English neighbour map and the 170-edition conclusion when only associates that stay NOMINAL under the hybrid are added.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { modelOf } from "./ring1.mjs";
import { readUnits, UNITS } from "./read-beings.mjs";
import { readAll, modalNN, mutualPairs, rootOf } from "./build-mind-beings.mjs";
import { applyEvidence } from "./revise.mjs";
import { entry, cache } from "./wiktionary-pilot.mjs";
import { entryKind, makeHybridSettler } from "./hybrid-settle.mjs";

const ext = JSON.parse(readFileSync(new URL("./eng-prior-extension.json", import.meta.url), "utf8")).entries;
const rep = JSON.parse(readFileSync(new URL("./ring1-spiral3-report.json", import.meta.url), "utf8")), assoc = rep.associates;
const sniffed = assoc.filter((l) => ext[l.word]);
const rows = [];
for (const l of sniffed) { const e = await entry(l.word); rows.push({ word: l.word, units: l.units.map((x) => x.u), sniff: ext[l.word].cls, score: ext[l.word].score, wiktionary: (e?.en ?? []).map((s) => s.pos).join("/"), kind: entryKind(e, "en") }); console.log(JSON.stringify(rows.at(-1))); }
const pure = rows.filter((r) => r.kind === "pure-nominal" || r.kind === "pure-other"), right = pure.filter((r) => r.kind === "pure-nominal").length;
const sniffMap = new Map(sniffed.map((l) => [l.word, ext[l.word].cls])), settle = makeHybridSettler(cache, "en", sniffMap);
const kept = assoc.filter((l) => !ext[l.word] || settle(l.word) === "nominal"), dropped = assoc.filter((l) => ext[l.word] && settle(l.word) !== "nominal").map((l) => `${l.word} (${rows.find((r) => r.word === l.word)?.wiktionary || "no entry"})`);

const m = await modelOf("eng"), r0 = readUnits(m.frames, m.hearing);
const nnOf = (sets) => sets.map((a, u) => { let best = -1, bj = 0; sets.forEach((b, v) => { if (v === u) return; let i = 0; for (const x of a) if (b.has(x)) i++; const un = a.size + b.size - i, j = un ? i / un : 0; if (j > bj) { bj = j; best = v; } }); return best; });
const aug = r0.sets.map((s) => new Set(s)); for (const l of kept) for (const x of l.units) aug[x.u].add(l.word);
const nnAug = nnOf(aug), changed = nnAug.map((v, u) => (v !== r0.nn[u] ? u : -1)).filter((u) => u >= 0);
const { rows: every } = await readAll({ settle: () => null }), base = every.filter((x) => x.kind !== "projected-from-UDHR"), idx = base.findIndex((x) => x.file === "udhr-eng.txt");
const OUT = new URL("./_spiral3-check.eot", import.meta.url).pathname; copyFileSync(new URL("./mind.eot", import.meta.url), OUT);
const ev = applyEvidence(OUT, "udhr-core/beings-independent", base, idx, nnAug);
const out = {
  asked: rows.length, pureLists: pure.length, mixed: rows.filter((r) => r.kind === "mixed").length, noEntry: rows.filter((r) => !r.kind).length,
  K1: { sniffRightOnPure: right, of: pure.length, rate: +(right / pure.length).toFixed(3), minimum: 0.85, holds: right / pure.length >= 0.85 },
  K2_dropped: dropped, associatesKept: kept.length, of: assoc.length,
  K3: { englishNeighbourChanged: changed.length, changedUnits: changed, conclusionMoved: ev.changed, surpriseBits: +ev.surpriseBits.toFixed(3) },
};
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./ring1-spiral3-check-report.json", import.meta.url), JSON.stringify({ out, rows }, null, 1) + "\n");
