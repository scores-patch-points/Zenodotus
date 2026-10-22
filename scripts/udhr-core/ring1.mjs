// udhr-core/ring1.mjs — RING 1: which units of the Declaration do the voices of the dispossessed speak to?
//
// Method (the stack's own ear and heard-nominals, no model, no pivot): a language's UDHR edition gives a MODEL: for each of the 31 units the recurring
// nominal beings it holds (B_u), weighted by rarity across units, w(b) = ln(31 / units containing b). A paragraph of any text in that language is scored
// against every unit by idf-weighted cosine of the beings it uses; each paragraph casts a soft vote (its scores, normalised) weighted by its matched idf
// mass; a document's PROFILE is the weighted mean vote; a corpus profile is the mean of its documents' profiles.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   C0  positive control (the method is only trusted if this passes): same-language, DIFFERENT-translation retrieval. Build the model from one UDHR
//       edition; present each unit of a second edition of the same language as a paragraph; its top-scoring unit must be the same unit. Pairs:
//       every language that has two editions with a prior and all 31 units (both directions). Passes iff mean top-1 accuracy exceeds the MAXIMUM over
//       200 draws in which the model's unit labels are permuted (chance is about 1/31).
//   C1  English anti-colonial documents (21-anti-colonial) profile onto the units differently from neutral English literature (01-literature-books):
//       total-variation distance between the two corpus profiles exceeds the MAXIMUM over 200 draws that reassign documents between the two corpora
//       at random (sizes kept).
//   C2  the same for English first-person voices (20-first-person-voices) against the neutral corpus.
//   Reported, not claimed: which units each corpus over-indexes (lift = corpus profile / neutral profile) and under-indexes.
//   Control  every claim is REVERSED by a null draw that reaches the real value. A failed C0 voids C1 and C2 whatever they show.
// Scope: English documents only (the language of nearly all of both directories); es/pt/de documents are too few to profile. Neutral = English
// Gutenberg literature in 01-literature-books, chosen by a test on the text (the English prior knows at least half of its word tokens), not by hand.
// The mind log receives nothing from this file: it holds structure, never text. Reading is local; no text leaves this machine.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hearingFor, readUnits, UNITS } from "./read-beings.mjs";
import { loadLedger, LOG } from "./build.mjs";

const ROOT = new URL("../../", import.meta.url).pathname, UDHR = join(ROOT, "06-government-legal/un-udhr");
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const UNIT = /[\p{L}\p{M}\p{N}'’]+/gu;

const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
function editionFrames(stem) {
  const sid = [...full.sources].find(([, s]) => s.locator.endsWith(`udhr-${stem}.txt`))?.[0];
  if (!sid) return null;
  const evs = full.events.filter((e) => e.stage === "arrange" && e.source_id === sid && e.unit && e.unit !== "title");
  if (evs.length !== UNITS) return null;
  const ord = (u) => (u === "preamble" ? 0 : +u.slice(8));
  evs.sort((a, b) => ord(a.unit) - ord(b.unit));
  const buf = readFileSync(join(UDHR, `udhr-${stem}.txt`));
  const raw = buf.toString("utf8"), head = raw.split("\n")[1] ?? "", code = (head.match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  return { frames: evs.map((e) => e.detail.paragraphs.map(([s, t]) => buf.subarray(s, t).toString("utf8")).join(" \n")), code, raw };
}

export async function modelOf(stem) {
  const ed = editionFrames(stem); if (!ed) return null;
  const hearing = await hearingFor(ed.code, ed.raw.slice(300, 900), stem); if (hearing.gap) return null;
  const r = readUnits(ed.frames, hearing); if (r.gap) return null;
  const B = r.sets.map((s) => new Set([...s].filter((x) => !x.includes(" "))));
  const df = new Map(); for (const s of B) for (const b of s) df.set(b, (df.get(b) ?? 0) + 1);
  const w = new Map([...df].map(([b, c]) => [b, Math.log(UNITS / c)]));
  const norm = B.map((s) => Math.sqrt([...s].reduce((a, b) => a + w.get(b) ** 2, 0)));
  return { stem, hearing, B, w, norm, frames: ed.frames };
}

export const tokensOf = (text, ear) => { let t = String(text).toLowerCase(); if (ear?.segment) t = ear.segment(t); if (ear?.peel) t = ear.peel(t); return t.match(UNIT) ?? []; };

/** scores of a bag of tokens against the 31 units, and the idf mass of what matched */
export function scoreTokens(tokens, m) {
  const M = new Set(); for (const t of tokens) if ((m.w.get(t) ?? 0) > 0) M.add(t);
  if (!M.size) return null;
  let mass = 0, sq = 0; for (const b of M) { const x = m.w.get(b); mass += x; sq += x * x; }
  const s = new Array(UNITS).fill(0);
  for (let u = 0; u < UNITS; u++) { if (!m.norm[u]) continue; let dot = 0; for (const b of M) if (m.B[u].has(b)) dot += m.w.get(b) ** 2; s[u] = dot / (Math.sqrt(sq) * m.norm[u]); }
  return { s, mass };
}
const argmax = (s) => { let b = -1, v = 0; s.forEach((x, i) => { if (x > v) { v = x; b = i; } }); return b; };

// ---- C0: held-out translation retrieval ---------------------------------------------------------------------------------------------------
export async function positiveControl() {
  const groups = { ron: ["ron_1953", "ron_1993", "ron_2006"], por: ["por_BR", "por_PT"], deu: ["deu_1901", "deu_1996"], hat: ["hat_kreyol", "hat_popular"], roh: ["roh_puter", "roh_rumgr", "roh_surmiran", "roh_sursilv", "roh_sutsilv", "roh_vallader"], oci: ["oci_1", "oci_2", "oci_3", "oci_4"] };
  const runs = [], rnd = mulberry(5);
  for (const [lang, stems] of Object.entries(groups)) {
    const ms = (await Promise.all(stems.map(modelOf))).filter(Boolean);
    for (const A of ms) for (const B of ms) {
      if (A === B) continue;
      const pred = B.frames.map((f) => { const sc = scoreTokens(tokensOf(f, A.hearing.ear), A); return sc ? argmax(sc.s) : -1; });
      const hits = pred.filter((p, u) => p === u).length;
      const nulls = Array.from({ length: 200 }, () => { const pi = shuffle(Array.from({ length: UNITS }, (_, i) => i), rnd); return pred.filter((p, u) => p >= 0 && pi[p] === u).length / UNITS; });
      runs.push({ lang, model: A.stem, test: B.stem, accuracy: hits / UNITS, nullMax: Math.max(...nulls), nullMean: nulls.reduce((a, b) => a + b, 0) / nulls.length });
    }
  }
  const mean = runs.reduce((a, r) => a + r.accuracy, 0) / runs.length, nullMax = Math.max(...runs.map((r) => r.nullMax));
  return { runs, pairs: runs.length, meanAccuracy: +mean.toFixed(3), nullMax: +nullMax.toFixed(3), passes: runs.length > 0 && mean > nullMax };
}

// ---- corpora ------------------------------------------------------------------------------------------------------------------------------
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".txt") ? [p] : []; });
const frontmatter = (t) => { const m = /^---\n([\s\S]*?)\n---\n/.exec(t); const o = {}; if (m) for (const l of m[1].split("\n")) { const k = l.indexOf(":"); if (k > 0) o[l.slice(0, k).trim()] = l.slice(k + 1).trim(); } return { meta: o, body: m ? t.slice(m[0].length) : t }; };
const gutenbergBody = (t) => { const a = /\*\*\* ?START OF[^\n]*\n/.exec(t), z = /\*\*\* ?END OF/.exec(t); return t.slice(a ? a.index + a[0].length : 0, z ? z.index : t.length); };

export function profileDocument(text, m) {
  const sum = new Array(UNITS).fill(0); let W = 0, paragraphs = 0, matched = 0;
  for (const para of text.split(/\n\s*\n/)) {
    const toks = tokensOf(para, m.hearing.ear); if (toks.length < 3) continue; paragraphs++;
    const sc = scoreTokens(toks, m); if (!sc) continue;
    const tot = sc.s.reduce((a, b) => a + b, 0); if (!tot) continue;
    matched++; W += sc.mass; for (let u = 0; u < UNITS; u++) sum[u] += sc.mass * (sc.s[u] / tot);
  }
  return W ? { profile: sum.map((x) => x / W), paragraphs, matched } : null;
}
const meanOf = (ps) => { const m = new Array(UNITS).fill(0); for (const p of ps) for (let u = 0; u < UNITS; u++) m[u] += p[u] / ps.length; return m; };
const tv = (a, b) => 0.5 * a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);

function permutationTest(A, N, reps = 200, seed = 11) {
  const real = tv(meanOf(A), meanOf(N)), pool = [...A, ...N], rnd = mulberry(seed), nulls = [];
  for (let r = 0; r < reps; r++) { const p = shuffle(pool, rnd); nulls.push(tv(meanOf(p.slice(0, A.length)), meanOf(p.slice(A.length)))); }
  return { real: +real.toFixed(4), nullMax: +Math.max(...nulls).toFixed(4), nullMean: +(nulls.reduce((a, b) => a + b, 0) / nulls.length).toFixed(4), holds: real > Math.max(...nulls) };
}

export { meanOf, tv, permutationTest, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT };

export async function runRing1() {
  const m = await modelOf("eng");
  const englishPrior = m.hearing.posPrior.forms;
  const load = (dir, keep) => walk(join(ROOT, dir)).map((p) => { const raw = readFileSync(p, "utf8"), { meta, body } = frontmatter(raw); return { p, meta, text: gutenbergBody(body) }; }).filter(keep);
  const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
  const docsA = load("21-anti-colonial", (d) => isEn(d.meta.language)), docsB = load("20-first-person-voices", (d) => isEn(d.meta.language));
  const known = (t) => { const w = t.slice(0, 200000).toLowerCase().match(UNIT) ?? []; return w.length ? w.filter((x) => englishPrior[x]).length / w.length : 0; };
  const docsN = load("01-literature-books", (d) => known(d.text) >= 0.5);
  const prof = (docs) => docs.map((d) => ({ d, r: profileDocument(d.text, m) })).filter((x) => x.r);
  const PA = prof(docsA), PB = prof(docsB), PN = prof(docsN);
  const profs = (P) => P.map((x) => x.r.profile);
  const c1 = permutationTest(profs(PA), profs(PN)), c2 = permutationTest(profs(PB), profs(PN));
  const mN = meanOf(profs(PN)), lift = (P) => { const mc = meanOf(profs(P)); return mc.map((x, u) => ({ unit: u, share: +x.toFixed(4), neutral: +mN[u].toFixed(4), lift: mN[u] ? +(x / mN[u]).toFixed(2) : null })); };
  const top = (L, k, dir) => [...L].filter((x) => x.lift != null).sort((a, b) => dir * (b.lift - a.lift)).slice(0, k).map((x) => `${x.unit === 0 ? "preamble" : "art " + x.unit}×${x.lift}`).join(", ");
  const LA = lift(PA), LB = lift(PB);
  return { documents: { anticolonial: PA.length, firstPerson: PB.length, neutral: PN.length, anticolonialSkippedNoMatch: docsA.length - PA.length, firstPersonSkippedNoMatch: docsB.length - PB.length }, C1_anticolonial_vs_neutral: c1, C2_firstPerson_vs_neutral: c2, overIndexed: { anticolonial: top(LA, 6, 1), firstPerson: top(LB, 6, 1) }, underIndexed: { anticolonial: top(LA, 4, -1), firstPerson: top(LB, 4, -1) }, lifts: { anticolonial: LA, firstPerson: LB } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c0 = await positiveControl();
  console.log("C0 positive control:", JSON.stringify({ pairs: c0.pairs, meanAccuracy: c0.meanAccuracy, nullMax: c0.nullMax, passes: c0.passes }));
  for (const r of c0.runs.slice(0, 12)) console.log(`  ${r.lang}: model ${r.model} -> test ${r.test}: ${r.accuracy.toFixed(3)} (null max ${r.nullMax.toFixed(3)})`);
  if (!c0.passes) { console.log("C0 FAILED: the method is not trusted; C1 and C2 are void and were not run."); writeFileSync(new URL("./ring1-report.json", import.meta.url), JSON.stringify({ c0 }, null, 1)); process.exit(1); }
  const r = await runRing1();
  writeFileSync(new URL("./ring1-report.json", import.meta.url), JSON.stringify({ c0, ...r }, null, 1) + "\n");
  console.log(JSON.stringify({ documents: r.documents, C1: r.C1_anticolonial_vs_neutral, C2: r.C2_firstPerson_vs_neutral, overIndexed: r.overIndexed, underIndexed: r.underIndexed }, null, 1));
}
