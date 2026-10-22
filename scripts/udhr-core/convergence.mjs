// udhr-core/convergence.mjs — step 9: the leave-k-out convergence test (the holographic claim made falsifiable).
//
// PRE-REGISTERED before the first run (2026-10-19), so the result cannot move the goalposts:
//   Grid        k in {1,2,4,8,16,32,64,128,256}, R = 500 uniform draws without replacement per k, seeded from the set root.
//   Claim C1    at k = 16, EVERY draw reproduces the article-level structure of the full set: the 30 article referents
//               and their paragraph counts (the paragraph referents beneath them).
//   Reported, not claimed: the same for the whole structure (charter root, incl. the preamble), the Jaccard overlap of
//               referent sets, the deletion margin of each unit (how many modal-carrying editions must go to move it).
//   Control     The epoch is REVERSED by: any draw at k = 16 that differs at the article level (a repeat under a
//               different seed counts), or any added edition that moves an article's modal paragraph count.
// Scope, stated so it is not over-read: this tests the PARAGRAPH-STRUCTURE grain only. Wording is not aligned, so the
// convergence of what the editions SAY is not tested here. Independent draws are uniform; the repo gives no language-
// family tree to stratify by, and the language stem is near-unique per edition, so stratifying by it would change nothing.
import { createHash } from "node:crypto";
import { PREAMBLE, DECLARATION, MAJORITY } from "./referents.mjs";
import { STATED } from "./relations.mjs";

export const GRID = [1, 2, 4, 8, 16, 32, 64, 128, 256];
export const DRAWS = 500;
export const CLAIM_K = 16;
export const CONVERGENCE_SCHEMA = "UDHRConvergence@1";
const ORDER = [PREAMBLE, ...Array.from({ length: 30 }, (_, i) => i + 1)];
const short = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/** Per-edition paragraph counts per unit, read off the ingested arrange events: Map(source_id -> Map(unit -> count)). */
export function countsOf(ledger) {
  const out = new Map();
  for (const e of ledger.events) {
    if (e.stage !== "arrange" || !e.unit || e.unit === "title") continue;
    const u = e.unit === "preamble" ? PREAMBLE : +e.unit.slice(8);
    if (!out.has(e.source_id)) out.set(e.source_id, new Map());
    out.get(e.source_id).set(u, e.detail.paragraphs.length);
  }
  return out;
}

/** The structure a set of editions supports: the same rule referents.mjs uses (mode, majority, ties to the smaller). */
export function deriveStructure(counts, ids) {
  const referents = [[DECLARATION, "declaration", null]];
  const shared = new Map();
  for (const u of ORDER) {
    const tally = new Map(); let of = 0;
    for (const id of ids) { const c = counts.get(id)?.get(u); if (c != null) { of++; tally.set(c, (tally.get(c) ?? 0) + 1); } }
    const best = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    const ok = best && best[1] / of > MAJORITY;
    const key = u === PREAMBLE ? "ref:udhr:preamble" : `ref:udhr:article:${u}`;
    referents.push([key, u === PREAMBLE ? "preamble" : "article", ok ? best[0] : null]);
    if (ok) for (let k = 1; k <= best[0]; k++) referents.push([`${key}:p:${k}`, "paragraph", null]);
    shared.set(u, ok ? best[0] : null);
  }
  referents.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const have = new Set(referents.map((r) => r[0]));
  const relations = STATED.filter((s) => have.has(s[1])).map((s) => [s[0], s[1], s[3]]).sort((a, b) => (a.join() < b.join() ? -1 : 1));
  const article = referents.filter((r) => r[0].startsWith("ref:udhr:article:"));
  return { referents, relations, article, root: short(JSON.stringify({ schema: "UDHRCharterRoot@1", referents, relations })), articleKey: JSON.stringify(article), keys: new Set(referents.map((r) => r[0])), shared };
}

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sample = (arr, k, rnd) => { const a = arr.slice(); for (let i = 0; i < k; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };

/** Deletion margin per unit: how many modal-carrying editions must be removed before the runner-up ties or passes it. */
export function margins(counts, ids) {
  return ORDER.map((u) => {
    const tally = new Map(); let of = 0;
    for (const id of ids) { const c = counts.get(id)?.get(u); if (c != null) { of++; tally.set(c, (tally.get(c) ?? 0) + 1); } }
    const s = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return { unit: u === PREAMBLE ? "preamble" : `article:${u}`, mode: s[0]?.[0] ?? null, support: s[0]?.[1] ?? 0, of, runnerUp: s[1]?.[1] ?? 0, margin: (s[0]?.[1] ?? 0) - (s[1]?.[1] ?? 0), majority: s[0] ? s[0][1] / of > MAJORITY : false };
  });
}

export function runConvergence(ledger, { setRoot, seed = setRoot, draws = DRAWS, grid = GRID } = {}) {
  const counts = countsOf(ledger), ids = [...counts.keys()].sort();
  const full = deriveStructure(counts, ids);
  const rnd = mulberry32(parseInt(short(String(seed)).slice(0, 8), 16));
  const curve = grid.filter((k) => k < ids.length).map((k) => {
    let art = 0, whole = 0, jSum = 0, jMin = 1, preShared = 0;
    for (let d = 0; d < draws; d++) {
      const s = deriveStructure(counts, sample(ids, k, rnd));
      if (s.articleKey === full.articleKey) art++;
      if (s.root === full.root) whole++;
      if (s.shared.get(PREAMBLE) != null) preShared++;
      const inter = [...s.keys].filter((x) => full.keys.has(x)).length, j = inter / (s.keys.size + full.keys.size - inter);
      jSum += j; jMin = Math.min(jMin, j);
    }
    return { k, draws, articleExact: art / draws, wholeExact: whole / draws, meanJaccard: +(jSum / draws).toFixed(4), minJaccard: +jMin.toFixed(4), preambleHasStructure: preShared / draws };
  });
  const claim = curve.find((c) => c.k === CLAIM_K);
  const holds = claim ? claim.articleExact === 1 : null;     // null: this grid does not contain the pre-registered k
  const m = margins(counts, ids);
  return { schema: CONVERGENCE_SCHEMA, setRoot, seed: String(seed), editions: ids.length, fullRoot: full.root, grid, draws, claimK: CLAIM_K, claim: "every draw at claimK reproduces the article-level structure", holds, curve, margins: m,
    softest: m.filter((x) => x.majority).sort((a, b) => a.margin - b.margin).slice(0, 5).map((x) => `${x.unit}: ${x.margin}`) };
}

export const CONTROL = "REVERSED by any draw of 16 editions that differs from the full set at the article level (a repeat under another seed counts), or by an added edition that moves an article's modal paragraph count. Scope: paragraph-structure grain only; wording is not aligned.";
