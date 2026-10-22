// udhr-core/build-mind-beings.mjs — the third conclusion in the same log: which units of the Declaration the languages themselves
// bind together, read with the stack's own ear and heard-nominals tier in every edition that has a POS prior.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   Conclusion  after k editions: each unit's modal nearest neighbour (by Jaccard overlap of heard beings; ties to the lower unit),
//               and the conclusion is the set of MUTUAL pairs (u's modal neighbour is v and v's is u). Parameter-free: a majority
//               rule would need a share threshold, and the shares are low (about 0.24 against a 0.06 null), so the claim is about
//               agreement ABOVE CHANCE, not about a majority.
//   Claim C1    the number of mutual pairs from all readable editions exceeds the MAXIMUM over 200 draws of the same count after
//               the unit labels of every edition are permuted independently (the null destroys cross-language agreement and keeps
//               each edition's own structure).
//   Control     reversed by: a null draw that reaches the real count; or a single edition whose removal changes the pair set.
// Scope: this is the structure of what the reader hears recurring, in as many languages as have a POS prior. It is NOT an alignment
// of wording, and languages without a prior are not read (a typed gap, counted below).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { hearingFor, readUnits, UNITS } from "./read-beings.mjs";
import { loadLedger, LOG, CORPUS } from "./build.mjs";
import { makeModel } from "./surprise.mjs";
import { dmdWindow } from "../../../khora/native/kernel/activation.js";
import * as E from "./eotm.mjs";

export const DOMAIN = E.domainOf("udhr-core/beings");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const id8 = (name) => sha(name).slice(0, 16);
const NONE = "00".repeat(16);
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** modal nearest neighbour per unit over a set of rows (plurality; ties to the lower unit) */
export function modalNN(rows) {
  const out = [];
  for (let u = 0; u < UNITS; u++) {
    const t = new Map(); for (const r of rows) if (r.nn[u] >= 0) t.set(r.nn[u], (t.get(r.nn[u]) ?? 0) + 1);
    out.push([...t].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? -1);
  }
  return out;
}
export const mutualPairs = (modal) => { const out = []; for (let u = 0; u < UNITS; u++) { const v = modal[u]; if (v > u && modal[v] === u) out.push(`${u}-${v}`); } return out; };
export const rootOf = (pairs) => sha(JSON.stringify(pairs)).slice(0, 32);
export const pairId8 = (p) => id8(`pair:${p}`);

export async function readAll({ settle = null } = {}) {
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const byEd = new Map();
  for (const e of full.events) { if (e.stage !== "arrange" || !e.unit || e.unit === "title") continue; if (!byEd.has(e.source_id)) byEd.set(e.source_id, []); byEd.get(e.source_id).push(e); }
  const ord = (u) => (u === "preamble" ? 0 : +u.slice(8));
  const rows = [], skipped = { noPrior: 0, unspacedNoPrior: 0, notAll31Units: 0, noBeings: 0 };
  for (const [sid, evs] of [...byEd].sort((a, b) => (full.sources.get(a[0]).locator < full.sources.get(b[0]).locator ? -1 : 1))) {
    const f = full.sources.get(sid).locator.split("/").pop(), raw = readFileSync(new URL(f, CORPUS), "utf8"), buf = Buffer.from(raw, "utf8");
    const code = (raw.split("\n")[1].match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
    const h = await hearingFor(code, raw.slice(300, 900), f.replace(/^udhr-|\.txt$/g, ""));
    if (h.gap) { skipped.noPrior++; if (h.unspaced) skipped.unspacedNoPrior++; continue; }
    evs.sort((a, b) => ord(a.unit) - ord(b.unit));
    if (evs.length !== UNITS) { skipped.notAll31Units++; continue; }
    const frames = evs.map((e) => e.detail.paragraphs.map(([s, t]) => buf.subarray(s, t).toString("utf8")).join(" \n"));
    const r = readUnits(frames, h, { settle });
    if (r.gap) { skipped.noBeings++; continue; }
    rows.push({ sid, file: f, code, nn: r.nn, beings: r.beings, kind: h.kind, needs: r.needs, unseenAdmitted: r.unseenAdmitted, frames, hearing: h });
  }
  return { rows, skipped, editionsTotal: byEd.size, manifestSet: full };
}

export function nullCounts(rows, reps = 200, seed = 4242) {
  const rnd = mulberry(seed), counts = [];
  for (let rep = 0; rep < reps; rep++) {
    const perm = rows.map(() => { const p = Array.from({ length: UNITS }, (_, i) => i); for (let i = UNITS - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; });
    const shuffled = rows.map((r, k) => { const nn = new Array(UNITS).fill(-1); for (let u = 0; u < UNITS; u++) { const pu = perm[k][u]; nn[pu] = r.nn[u] >= 0 ? perm[k][r.nn[u]] : -1; } return { nn }; });
    counts.push(mutualPairs(modalNN(shuffled)).length);
  }
  return counts;
}

export function windowOf(rows, orders = 200, seed = "beings-window") {
  const whole = rootOf(mutualPairs(modalNN(rows))), rnd = mulberry(parseInt(sha(seed).slice(0, 8), 16)), n = rows.length;
  const cands = []; for (let d = 2; d < n; d *= 2) cands.push(d); cands.push(n);
  const stable = []; let none = 0;
  for (let o = 0; o < orders; o++) {
    const a = rows.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    let d = null; for (const k of [...cands].reverse()) { if (rootOf(mutualPairs(modalNN(a.slice(0, k)))) === whole) d = k; else break; }
    if (d == null) none++; else stable.push(d);
  }
  const q = (p) => [...stable].sort((x, y) => x - y)[Math.min(stable.length - 1, Math.floor(p * stable.length))];
  const pivotal = rows.filter((_, i) => rootOf(mutualPairs(modalNN(rows.filter((__, j) => j !== i)))) !== whole).length;
  void dmdWindow;                                              // the stack's own dmdWindow is used for the first-agreement depth in dmd-ledger.mjs; here the stable depth is what is recorded
  return { p50: q(0.5), p95: q(0.95), max: Math.max(...stable), none, orders, pivotal };
}

/** domainName tags the records; keep(row) selects the editions. The default is every readable edition (domain udhr-core/beings, already in the log);
 *  the INDEPENDENT reading drops editions whose POS prior was projected from English through the UDHR's own parallel text. */
export async function buildBeings(out, { domainName = "udhr-core/beings", keep = null } = {}) {
  const dom = E.domainOf(domainName);
  const all = await readAll();
  const { skipped, editionsTotal } = all;
  const rows = keep ? all.rows.filter(keep) : all.rows;
  const universe = Array.from({ length: UNITS }, (_, u) => u);
  const model = makeModel(universe);
  let prev = { pairs: [], root: NONE }, absorbed = 0, written = 0; const steps = [];
  rows.forEach((r, step) => {
    const s = model.observe(new Map(r.nn.map((v, u) => [u, v]).filter(([, v]) => v >= 0)));
    const pairs = mutualPairs(modalNN(rows.slice(0, step + 1))), root = rootOf(pairs);
    if (root === prev.root) { absorbed += s; return; }
    const was = new Set(prev.pairs), now = new Set(pairs), changes = [];
    for (const p of new Set([...was, ...now])) if (was.has(p) !== now.has(p)) changes.push({ id: id8(`pair:${p}`), from: was.has(p) ? 1 : 0, to: now.has(p) ? 1 : 0 });
    E.append(out, E.KIND.DMDN, E.enc.dmdn({ domain: dom, step, source: r.sid.replace(/^src_/, ""), before: prev.root, after: root, surpriseBits: s, absorbedBits: absorbed, changes }));
    steps.push({ step, file: r.file, pairs: pairs.length, entered: changes.filter((c) => c.to).length, left: changes.filter((c) => !c.to).length, surpriseBits: +s.toFixed(2), absorbedBits: +absorbed.toFixed(2) });
    absorbed = 0; written++; prev = { pairs, root };
  });
  const w = windowOf(rows), nul = nullCounts(rows);
  E.append(out, E.KIND.WINDOW, E.enc.window({ domain: dom, rootP50: w.p50, rootP95: w.p95, rootMax: w.max, artP50: 0, artP95: 0, artMax: 0, orders: w.orders, pivotal: w.pivotal }));
  const setRoot = sha(rows.map((r) => r.sid).join("\n")).slice(0, 32);
  E.append(out, E.KIND.GROUND, E.enc.ground({ domain: dom, root: prev.root, setRoot, editions: rows.length, units: prev.pairs.length }));
  const claim = prev.pairs.length > Math.max(...nul);
  return { editionsTotal, read: rows.length, languages: new Set(rows.map((r) => r.code)).size, skipped, written, steps, pairs: prev.pairs, window: w, null: { max: Math.max(...nul), mean: +(nul.reduce((a, b) => a + b, 0) / nul.length).toFixed(2), reps: nul.length }, claimHolds: claim, absorbedAfterLast: absorbed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = new URL("./mind.eot", import.meta.url).pathname;
  const independent = process.argv[2] === "independent";
  const r = await buildBeings(out, independent ? { domainName: "udhr-core/beings-independent", keep: (row) => row.kind !== "projected-from-UDHR" } : {});
  console.log(JSON.stringify({ ...r, steps: undefined, bytes: readFileSync(out).length }, null, 1));
  for (const s of r.steps) console.log(JSON.stringify(s));
}
