// udhr-core/ring1-spiral2.mjs — the second pass of the re-entry (ring1-spiral.mjs), with two fixes and a looser bar, all fixed BEFORE this run (2026-10-19).
//   fix 1  names: only LOWER-CASE occurrences of a word count toward it (sentence-initial capitals are dropped, a conservative loss); "terry" and "santa" go.
//   fix 2  spread: a word must occur in at least 15 DISTINCT documents of the learning half; a dialect form from one narrator's papers ("whar") goes.
//   bar    learn a word at >= 10 paragraph mentions (was 25) and unit lift >= 2.0 (was 2.5); share >= 0.10 and up to 3 units per word, as before.
//   E1'    unchanged claim: held-out mean lift of the learned (word, unit) pairs exceeds the MAXIMUM over 200 permutations of the assignments.
//   E2'    unchanged: reported, not claimed; the same control; the same REVISE gate on a scratch copy.
//   E3     reported: how many learned words are ones the prior already knows as nominal versus ones only the sniff extension settles (the sniff-dependent share).
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

const docSeen = new Set();
function accumulate(texts) {
  const assoc = new Map(), count = new Map(), docCount = new Map(), base = new Array(UNITS).fill(0); let W = 0;
  for (const text of texts) for (const para of [...text.split(/\n\s*\n/), null]) {
    if (para === null) { for (const w of docSeen) docCount.set(w, (docCount.get(w) ?? 0) + 1); docSeen.clear(); continue; }
    const toks = tokensOf(para, m.hearing.ear); if (toks.length < 3) continue;
    const lowerOnly = new Set((para.match(/\p{L}+/gu) ?? []).filter((t) => t === t.toLowerCase()));
    const sc = scoreTokens(toks, m); if (!sc) continue;
    const tot = sc.s.reduce((a, b) => a + b, 0); if (!tot) continue;
    W += sc.mass; for (let u = 0; u < UNITS; u++) base[u] += sc.mass * (sc.s[u] / tot);
    for (const w of new Set(toks)) {
      if (!/^[a-z]{4,}$/.test(w) || !lowerOnly.has(w) || m.w.has(w) || !nominal(w)) continue;
      docSeen.add(w);
      let a = assoc.get(w); if (!a) { a = new Float64Array(UNITS); assoc.set(w, a); }
      for (let u = 0; u < UNITS; u++) a[u] += sc.mass * (sc.s[u] / tot);
      count.set(w, (count.get(w) ?? 0) + 1);
    }
  }
  return { assoc, count, docCount, base: base.map((x) => x / W) };
}
function associates({ assoc, count, docCount, base }, minCount = 10) {
  const out = [];
  for (const [w, a] of assoc) {
    if ((count.get(w) ?? 0) < minCount || (docCount.get(w) ?? 0) < 15) continue;
    const tot = a.reduce((x, y) => x + y, 0); if (!tot) continue;
    const units = [...a].map((x, u) => ({ u, share: x / tot, lift: x / tot / base[u] })).filter((x) => x.share >= 0.1 && x.lift >= 2.0).sort((p, q) => q.lift - p.lift).slice(0, 3);
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
console.log(JSON.stringify({ docsA: A.length, docsB: B.length, learnedWords: learned.length, pairs: pairs.length, E1prime: { meanBLift: +realLift.toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), nullMean: +mean(nulls).toFixed(3), holds: realLift > Math.max(...nulls) } }));

// E2: learn on everything, re-enter
const all = accumulate(docs), final = associates(all);
const r = readUnits(m.frames, m.hearing), nnOf = (sets) => sets.map((a, u) => { let best = -1, bj = 0; sets.forEach((b, v) => { if (v === u) return; let i = 0; for (const x of a) if (b.has(x)) i++; const un = a.size + b.size - i, j = un ? i / un : 0; if (v > u ? j > bj : j > bj) { bj = j; best = v; } }); return best; });
const reproduces = JSON.stringify(nnOf(r.sets)) === JSON.stringify(r.nn);
const aug = r.sets.map((s) => new Set(s)); for (const l of final) for (const x of l.units) aug[x.u].add(l.word);
const nnAug = nnOf(aug), changedUnits = nnAug.map((v, u) => (v !== r.nn[u] ? u : -1)).filter((u) => u >= 0);
const { rows: every } = await readAll({ settle: () => null }); let rows = every.filter((x) => x.kind !== "projected-from-UDHR");
const idx = rows.findIndex((x) => x.file === "udhr-eng.txt"), DOMAIN = "udhr-core/beings-independent", OUT = new URL("./_spiral2.eot", import.meta.url).pathname;
copyFileSync(new URL("./mind.eot", import.meta.url), OUT);
const startRoot = rootOf(mutualPairs(modalNN(rows)));
const ev = applyEvidence(OUT, DOMAIN, rows, idx, nnAug);
const perUnit = Array.from({ length: UNITS }, (_, u) => final.filter((l) => l.units.some((x) => x.u === u)).sort((a, b) => b.units.find((x) => x.u === u).lift - a.units.find((x) => x.u === u).lift).slice(0, 6).map((l) => l.word));
const sniffOnly = final.filter((l) => ext[l.word]).length;
const out = {
  E3: { learned: final.length, sniffSettled: sniffOnly, priorKnownNominal: final.length - sniffOnly },
  controlReproducesReaderNN: reproduces,
  E2: { associatesLearned: final.length, unitsWithAssociates: perUnit.filter((x) => x.length).length, englishNeighbourChanged: changedUnits.length, changedUnits, conclusionMoved: ev.changed, surpriseBits: +ev.surpriseBits.toFixed(3), startRoot, endRoot: ev.root },
  associatesByUnit: Object.fromEntries(perUnit.map((w, u) => [u === 0 ? "preamble" : `art${u}`, w.join(" ")]).filter(([, w]) => w)),
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ring1-spiral2-report.json", import.meta.url), JSON.stringify({ out, associates: final.map((l) => ({ word: l.word, count: l.count, units: l.units.map((x) => ({ u: x.u, share: +x.share.toFixed(3), lift: +x.lift.toFixed(2) })) })) }) + "\n");
