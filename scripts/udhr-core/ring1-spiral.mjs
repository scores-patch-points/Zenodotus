// udhr-core/ring1-spiral.mjs — RE-ENTRY: what ring 1's English voices associate with each unit of the Declaration, and does it move the core?
//
// For every paragraph of the English ring-1 documents the UDHR-English model casts a soft vote over the 31 units (ring1.mjs scoreTokens; weight = idf mass).
// A nominal word that is NOT one of the UDHR's own beings accumulates the votes of the paragraphs it appears in. A word is an ASSOCIATE of unit u when its
// vote share on u is at least 2.5x u's corpus base rate and at least 0.10 (up to 3 units per word). Nominal = the English prior's nominal share >= 0.8
// (>= 5 counts), or an accepted nominal in eng-prior-extension.json. Documents are split 300 / 300 by a seeded shuffle: associates are LEARNED on A.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   E1  REPLICATION. On the held-out half B, the mean B-lift of each learned (word, unit) pair (B share on the unit / B base rate) exceeds the MAXIMUM over
//       200 draws that permute the learned words' unit assignments among the words. Only words with >= 25 mentions in A are learned.
//   E2  RE-ENTRY (reported, not claimed). Associates learned on ALL 600 documents are added to the English edition's unit sets; the nearest-neighbour map
//       is recomputed. Reported: units whose neighbour changed, and whether the 170-edition conclusion (mutual-pair set) moved. A move would be applied
//       through applyEvidence to a COPY of the log (REVISE record); the published log is not touched here.
//   Control  my reimplementation of the nearest-neighbour map must reproduce the reader's own map on the unaugmented sets, else E2 is void.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, scoreTokens, tokensOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { readUnits, UNITS } from "./read-beings.mjs";
import { readAll, modalNN, mutualPairs, rootOf } from "./build-mind-beings.mjs";
import { applyEvidence, domainTip } from "./revise.mjs";

const m = await modelOf("eng"), P = m.hearing.posPrior.forms;
const ext = JSON.parse(readFileSync(new URL("./eng-prior-extension.json", import.meta.url), "utf8")).entries;
const nominal = (w) => { if (ext[w]) return ext[w].cls === "nominal"; const c = P[w]; if (!c) return false; const t = Object.values(c).reduce((a, b) => a + b, 0); return t >= 5 && ((c.NOUN ?? 0) + (c.PROPN ?? 0)) / t >= 0.8; };
const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const files = shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))), mulberry(41));
const docs = []; for (const p of files) { if (docs.length >= 600) break; const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (isEn(meta.language)) docs.push(gutenbergBody(body).slice(0, 120000)); }
const A = docs.slice(0, 300), B = docs.slice(300);

function accumulate(texts) {
  const assoc = new Map(), count = new Map(), base = new Array(UNITS).fill(0); let W = 0;
  for (const text of texts) for (const para of text.split(/\n\s*\n/)) {
    const toks = tokensOf(para, m.hearing.ear); if (toks.length < 3) continue;
    const sc = scoreTokens(toks, m); if (!sc) continue;
    const tot = sc.s.reduce((a, b) => a + b, 0); if (!tot) continue;
    W += sc.mass; for (let u = 0; u < UNITS; u++) base[u] += sc.mass * (sc.s[u] / tot);
    for (const w of new Set(toks)) {
      if (!/^[a-z]{4,}$/.test(w) || m.w.has(w) || !nominal(w)) continue;
      let a = assoc.get(w); if (!a) { a = new Float64Array(UNITS); assoc.set(w, a); }
      for (let u = 0; u < UNITS; u++) a[u] += sc.mass * (sc.s[u] / tot);
      count.set(w, (count.get(w) ?? 0) + 1);
    }
  }
  return { assoc, count, base: base.map((x) => x / W) };
}
function associates({ assoc, count, base }, minCount = 25) {
  const out = [];
  for (const [w, a] of assoc) {
    if ((count.get(w) ?? 0) < minCount) continue;
    const tot = a.reduce((x, y) => x + y, 0); if (!tot) continue;
    const units = [...a].map((x, u) => ({ u, share: x / tot, lift: x / tot / base[u] })).filter((x) => x.share >= 0.1 && x.lift >= 2.5).sort((p, q) => q.lift - p.lift).slice(0, 3);
    if (units.length) out.push({ word: w, count: count.get(w), units });
  }
  return out;
}
const sA = accumulate(A), learned = associates(sA), sB = accumulate(B);
const bLift = (w, u) => { const a = sB.assoc.get(w); if (!a) return null; const tot = a.reduce((x, y) => x + y, 0); return tot ? a[u] / tot / sB.base[u] : null; };
const pairs = learned.flatMap((l) => l.units.map((x) => ({ word: l.word, u: x.u }))).filter((p) => bLift(p.word, p.u) != null);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length, realLift = mean(pairs.map((p) => bLift(p.word, p.u)));
const rnd = mulberry(5), words = [...new Set(pairs.map((p) => p.word))], perWord = new Map(words.map((w) => [w, pairs.filter((p) => p.word === w).map((p) => p.u)]));
const nulls = Array.from({ length: 200 }, () => { const sh = shuffle(words, rnd); return mean(words.flatMap((w, i) => perWord.get(sh[i]).map((u) => bLift(w, u)))); });
console.log(JSON.stringify({ docsA: A.length, docsB: B.length, learnedWords: learned.length, pairs: pairs.length, E1: { meanBLift: +realLift.toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), nullMean: +mean(nulls).toFixed(3), holds: realLift > Math.max(...nulls) } }));

// E2: learn on everything, re-enter
const all = accumulate(docs), final = associates(all);
const r = readUnits(m.frames, m.hearing), nnOf = (sets) => sets.map((a, u) => { let best = -1, bj = 0; sets.forEach((b, v) => { if (v === u) return; let i = 0; for (const x of a) if (b.has(x)) i++; const un = a.size + b.size - i, j = un ? i / un : 0; if (v > u ? j > bj : j > bj) { bj = j; best = v; } }); return best; });
const reproduces = JSON.stringify(nnOf(r.sets)) === JSON.stringify(r.nn);
const aug = r.sets.map((s) => new Set(s)); for (const l of final) for (const x of l.units) aug[x.u].add(l.word);
const nnAug = nnOf(aug), changedUnits = nnAug.map((v, u) => (v !== r.nn[u] ? u : -1)).filter((u) => u >= 0);
const { rows: every } = await readAll({ settle: () => null }); let rows = every.filter((x) => x.kind !== "projected-from-UDHR");
const idx = rows.findIndex((x) => x.file === "udhr-eng.txt"), DOMAIN = "udhr-core/beings-independent", OUT = new URL("./_spiral.eot", import.meta.url).pathname;
copyFileSync(new URL("./mind.eot", import.meta.url), OUT);
const startRoot = rootOf(mutualPairs(modalNN(rows)));
const ev = applyEvidence(OUT, DOMAIN, rows, idx, nnAug);
const perUnit = Array.from({ length: UNITS }, (_, u) => final.filter((l) => l.units.some((x) => x.u === u)).sort((a, b) => b.units.find((x) => x.u === u).lift - a.units.find((x) => x.u === u).lift).slice(0, 6).map((l) => l.word));
const out = {
  controlReproducesReaderNN: reproduces,
  E2: { associatesLearned: final.length, unitsWithAssociates: perUnit.filter((x) => x.length).length, englishNeighbourChanged: changedUnits.length, changedUnits, conclusionMoved: ev.changed, surpriseBits: +ev.surpriseBits.toFixed(3), startRoot, endRoot: ev.root },
  associatesByUnit: Object.fromEntries(perUnit.map((w, u) => [u === 0 ? "preamble" : `art${u}`, w.join(" ")]).filter(([, w]) => w)),
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ring1-spiral-report.json", import.meta.url), JSON.stringify({ out, associates: final.map((l) => ({ word: l.word, count: l.count, units: l.units.map((x) => ({ u: x.u, share: +x.share.toFixed(3), lift: +x.lift.toFixed(2) })) })) }) + "\n");
