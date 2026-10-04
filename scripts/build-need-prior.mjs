// build-need-prior.mjs — harvest a received NEED-ODDS prior from the corpus's
// own narrative works, in the EXACT cell shape the-fold/retrieval.js already
// consumes, validated on a HELD-OUT work before it earns the name.
//
// WHY (user direction, 2026-09-01, near-verbatim): retrieval needs odds, and
// before a document's own history exists those odds must come "from both
// this document itself, and the structure of similar documents its read in
// the past." retrieval.js's ladder today is: own cell -> own recency margin
// -> ACT-R d=0.5 (received, universal). The corpus rung belongs BETWEEN
// margin and ACT-R: the same (recency|frequency) dyadic cells, tallied over
// works already read, pooled. Never blended — precedence only (P45).
//
// METHOD, reused not re-derived: the prequential trial/arrival construction
// is eoreader7 native/eval/forgetting-falsification.mjs::runArm verbatim —
// at each sentence step, every LIVE referent (seen >=2x) is a TRIAL; a HIT
// is arriving in the next sentence; cells are dyadicFloor(gap)|dyadicFloor
// (count); tallies land AFTER scoring (the firewall). Identity is the
// earned referent face (cast.js makeReferentIndex), never a raw token.
//
// POOL, declared (P42: genre moves the curve — Austen tighter than Shelley):
// English narrative prose only. Dracula is HELD OUT and never pooled; the
// prior ships only if, frozen, it beats cold ACT-R on that never-seen work.
// Non-English and non-narrative works are excluded by declaration, not
// silently — the artifact names its pool.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadOrgans, LP_ROOT } from "./eot-digest.mjs";

const FOLD = path.join(LP_ROOT, "..", "the-fold");
const { stripContainer, stripItalicsMarkup } = await import(path.join(FOLD, "source.js"));
const { makeReferentIndex } = await import(path.join(FOLD, "cast.js"));

const GUT = path.join(LP_ROOT, "01-literature-books", "gutenberg");
const POOL = [
  "pg11_Alice_s_Adventures_in_Wonderland.txt",
  "pg12_Through_the_Looking_Glass.txt",
  "pg1342_Pride_and_Prejudice.txt",
  "pg1661_The_Adventures_of_Tom_Sawyer.txt",
  "pg174_The_Picture_of_Dorian_Gray.txt",
  "pg2701_Moby_Dick.txt",
  "pg768_The_Adventures_of_Sherlock_Holmes.txt",
  "pg84_Frankenstein.txt",
  "pg98_A_Tale_of_Two_Cities.txt",
];
const HELD_OUT = "pg345_Dracula.txt";

const dyadicFloor = (n) => 1 << Math.floor(Math.log2(Math.max(1, n)));

const organs = await loadOrgans();
const flat = {
  splitSentences: organs.spans.splitSentences,
  extractSurfaces: organs.surfaces.extractSurfaces,
  discoverReferents: organs.surfaces.discoverReferents,
  namesCorefer: organs.surfaces.namesCorefer,
  diaNorm: organs.spans.diaNorm ?? ((x) => String(x)),
};
const indexFor = makeReferentIndex(flat);

/** Per-sentence Sets of referent ids — the observations stream. */
function observationsOf(file) {
  const raw = fs.readFileSync(path.join(GUT, file), "utf8");
  const body = stripItalicsMarkup(stripContainer(raw).text);
  const sentences = organs.spans.splitSentences(body);
  const idx = indexFor([{ ref: file, text: body }]);
  const surfaceToRef = new Map();
  for (const e of idx.events ?? []) if (e.type === "DEF.admit" && e.surface) surfaceToRef.set(e.surface.toLowerCase(), e.referent_id);
  // first-word index so each sentence only tries surfaces that could start here
  const byFirst = new Map();
  for (const s of surfaceToRef.keys()) {
    const w = s.split(/\s+/);
    if (!byFirst.has(w[0])) byFirst.set(w[0], []);
    byFirst.get(w[0]).push(w);
  }
  const obs = [];
  for (const sent of sentences) {
    const words = sent.text.split(/\s+/).map((t) => t.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, "").toLowerCase());
    const here = new Set();
    for (let i = 0; i < words.length; i++) {
      for (const cand of byFirst.get(words[i]) ?? []) {
        if (cand.every((w, k) => words[i + k] === w)) here.add(surfaceToRef.get(cand.join(" ")));
      }
    }
    obs.push(here);
  }
  return { obs, sentences: sentences.length, referents: new Set(surfaceToRef.values()).size };
}

const precisionAtK = (ranked, truth) => {
  let hit = 0;
  for (let i = 0; i < Math.min(truth.size, ranked.length); i += 1) if (truth.has(ranked[i])) hit += 1;
  return hit / truth.size;
};

/**
 * One prequential pass. `tallyInto` receives (cellKey, r, hit) per live item
 * per step; `scorers` are ranked and scored per step (before tallying).
 */
function walk(obs, { tallyInto = null, scorers = {} } = {}) {
  const count = new Map(), lastAt = new Map(), occ = new Map();
  const scores = Object.fromEntries(Object.keys(scorers).map((k) => [k, []]));
  for (let t = 0; t < obs.length - 1; t += 1) {
    for (const m of obs[t]) {
      count.set(m, (count.get(m) ?? 0) + 1);
      if (!occ.has(m)) occ.set(m, []);
      occ.get(m).push(t);
      lastAt.set(m, t);
    }
    const live = [...count.entries()].filter(([, n]) => n >= 2).map(([m]) => m);
    if (live.length < 2) continue;
    const truth = new Set([...obs[t + 1]].filter((m) => count.has(m)));
    if (!truth.size) continue;
    const ctx = { count, lastAt, occ, t };
    for (const [name, score] of Object.entries(scorers)) {
      const ranked = [...live].sort((a, b) => score(b, ctx) - score(a, ctx));
      scores[name].push(precisionAtK(ranked, truth));
    }
    if (tallyInto) {
      for (const m of live) {
        const r = dyadicFloor(t - (lastAt.get(m) ?? t) + 1);
        const f = dyadicFloor(count.get(m) ?? 1);
        tallyInto(`${r}|${f}`, r, truth.has(m) ? 1 : 0);
      }
    }
  }
  return scores;
}

const actr = (m, { occ, t }) => {
  let b = 0;
  for (const ti of occ.get(m) ?? []) b += 1 / Math.sqrt(t - ti + 1);
  return b;
};

// ── harvest the pool ─────────────────────────────────────────────────────
const cells = new Map(), margins = new Map();
const works = [];
for (const file of POOL) {
  const { obs, sentences, referents } = observationsOf(file);
  let steps = 0;
  walk(obs, { tallyInto: (key, r, hit) => {
    steps += 1;
    const c = cells.get(key) ?? { trials: 0, arrivals: 0 };
    c.trials += 1; c.arrivals += hit; cells.set(key, c);
    const g = margins.get(r) ?? { trials: 0, arrivals: 0 };
    g.trials += 1; g.arrivals += hit; margins.set(r, g);
  } });
  works.push({ file, sentences, referents, trials: steps });
  console.log(`pooled ${file}: ${sentences} sentences, ${referents} referents, ${steps} trials`);
}

// ── held-out validation: frozen prior vs cold ACT-R on a never-seen work ──
const priorOdds = (m, ctx) => {
  const r = dyadicFloor(ctx.t - (ctx.lastAt.get(m) ?? ctx.t) + 1);
  const f = dyadicFloor(ctx.count.get(m) ?? 1);
  const cell = cells.get(`${r}|${f}`);
  if (cell && cell.trials > 0) return cell.arrivals / cell.trials;
  const marg = margins.get(r);
  if (marg && marg.trials > 0) return marg.arrivals / marg.trials;
  return 0;
};
const held = observationsOf(HELD_OUT);
const heldScores = walk(held.obs, { scorers: { actr, prior: priorOdds } });
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
let wins = 0, losses = 0;
for (let i = 0; i < heldScores.actr.length; i++) {
  if (heldScores.prior[i] > heldScores.actr[i]) wins++;
  else if (heldScores.prior[i] < heldScores.actr[i]) losses++;
}
const mPrior = mean(heldScores.prior), mActr = mean(heldScores.actr);
console.log(`\nHELD OUT ${HELD_OUT}: ${heldScores.actr.length} scored steps`);
console.log(`  cold ACT-R (d=0.5)      mean precision ${mActr.toFixed(4)}`);
console.log(`  frozen corpus prior     mean precision ${mPrior.toFixed(4)}`);
console.log(`  paired: prior wins ${wins}, loses ${losses}, ties ${heldScores.actr.length - wins - losses}`);
const earned = mPrior > mActr && wins > losses;
console.log(`  VERDICT: ${earned ? "EARNED — prior beats cold ACT-R on a never-seen work" : "NOT EARNED — do not ship"}`);

if (earned) {
  const out = {
    schema: "NeedPrior@1",
    giver: "this corpus's own English narrative prose, 9 works, held-out-validated (build-need-prior.mjs); estimator construction: eoreader7 native/eval/forgetting-falsification.mjs::runArm, reused verbatim",
    language: "en",
    genre: "narrative prose",
    step: "sentence",
    identity: "referent canonical face (the-fold cast.js makeReferentIndex over eoreader7 native organs)",
    liveFloor: 2,
    heldOut: { file: HELD_OUT, meanPrecisionPrior: mPrior, meanPrecisionActr: mActr, pairedWins: wins, pairedLosses: losses, steps: heldScores.actr.length },
    works,
    cells: Object.fromEntries([...cells].map(([k, v]) => [k, v])),
    recencyMargins: Object.fromEntries([...margins].map(([k, v]) => [String(k), v])),
  };
  const dir = path.join(LP_ROOT, "derived-priors", "need-priors");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "need-prior-eng-narrative.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  console.log(`\nwrote ${dest} (${[...cells.keys()].length} cells)`);
}
