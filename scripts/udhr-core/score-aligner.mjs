// udhr-core/score-aligner.mjs — step 5/6 of PLAN-GOLD-SPANS.md: score clause aligners against the derived gold.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   Unit scored   the byte extent of each gold proposition (the union of its located slots; provisional links and the
//                 20 residue slots are excluded), as intersection-over-union (IoU) with the aligner's predicted extent.
//   Clears        an aligner "clears the baselines" in a language if its mean IoU is >= 0.50 AND exceeds both B0 and B1 by
//                 >= 0.10 there. Fixed here, not tuned afterwards.
//   Baselines     B0 whole paragraph; B1 punctuation clauses taken in order; B2 English-pivot proportional position
//                 (a PIVOT, labelled so, a comparison only); B3a the stack's own mechanical clauses taken in order;
//                 B3o the same clauses with the best one chosen by an oracle (a ceiling, not an aligner).
//   Leak guard    non-pivot aligners read through guardedReader, which refuses the hand/golden files and the sidecars
//                 that embed them. B2 is declared pivot and may read the English gold; nothing else may.
import { readFileSync, existsSync } from "node:fs";
import { OUT, CORPUS, EDITIONS } from "./derive-gold.mjs";

const LOCATED = new Set(["unique", "discontinuous", "disambiguated", "clitic", "adjudicated"]);
const GOLD_CODES = Object.keys(EDITIONS);
export const THRESHOLD = { mean: 0.5, margin: 0.1 };

/** Reads corpus files for an aligner; refuses anything that would leak the gold. */
export function guardedReader({ pivot = false } = {}) {
  const denied = (name) => /\.hand\.eot\.jsonl$/.test(name) || /golden/.test(name) || (GOLD_CODES.some((c) => name === `udhr-${c}.txt.eot.json`)) || (!pivot && /\.spans\.jsonl$/.test(name));
  return (name) => { if (denied(name)) throw new Error(`leak guard: ${name} may not be read by this aligner`); return readFileSync(new URL(name, name.endsWith(".spans.jsonl") ? OUT : CORPUS)); };
}

export function loadGold(code) {
  const rows = readFileSync(new URL(`udhr-${code}.spans.jsonl`, OUT), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.kind === "proposition");
  const props = [];
  for (const r of rows) {
    const rs = Object.values(r.slots).filter((v) => LOCATED.has(v.status)).flatMap((v) => v.ranges);
    if (!rs.length) continue;
    props.push({ ...r, extent: [Math.min(...rs.map((x) => x[0])), Math.max(...rs.map((x) => x[1]))] });
  }
  const groups = new Map();
  for (const r of rows) { const k = r.at.join(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.id); }
  return { code, props, groups };
}
const iou = (a, b) => { const i = Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])); const u = (a[1] - a[0]) + (b[1] - b[0]) - i; return u > 0 ? i / u : 0; };

// ---- aligners: (ctx) -> predicted extent for one gold proposition ------------------------------------------------------
const CLAUSE = /[,;:.،؛、。，；：]/gu;
function clauses(buf, [w0, w1]) {
  const t = buf.subarray(w0, w1).toString("utf8"), out = []; let from = 0;
  const push = (a, b) => { const s = t.slice(a, b); if (s.trim()) out.push([w0 + Buffer.byteLength(t.slice(0, a + (s.length - s.trimStart().length))), w0 + Buffer.byteLength(t.slice(0, b - (s.length - s.trimEnd().length)))]); };
  for (const m of t.matchAll(CLAUSE)) { push(from, m.index + m[0].length); from = m.index + m[0].length; }
  push(from, t.length);
  return out;
}
const pickInOrder = (list, j, n) => list[Math.min(list.length - 1, Math.floor((j * list.length) / n))];

export const ALIGNERS = {
  B0: ({ window }) => window,
  B1: ({ buf, window, j, n }) => { const c = clauses(buf, window); return c.length ? pickInOrder(c, j, n) : window; },
  B2: ({ window, pivot }) => (pivot ? [window[0] + pivot[0] * (window[1] - window[0]), window[0] + pivot[1] * (window[1] - window[0])] : null),
  B3a: ({ mech, j, n }) => (mech.length ? pickInOrder(mech, j, n) : null),
  B3o: ({ mech, truth }) => (mech.length ? mech.reduce((b, m) => (iou(m, truth) > iou(b, truth) ? m : b)) : null),
};

function mechanicalClauses(code) {
  const f = `udhr-${code}.txt.eot.jsonl`;
  if (!existsSync(new URL(f, CORPUS))) return null;
  const read = guardedReader();
  return read(f).toString("utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1" && r.label && Array.isArray(r.at)).map((r) => r.at);
}

export function score() {
  const eng = loadGold("eng"), engByProp = new Map(eng.props.map((p) => [p.prop, p]));
  const report = {};
  for (const code of GOLD_CODES) {
    const g = loadGold(code), buf = readFileSync(new URL(`udhr-${code}.txt`, CORPUS)), mechAll = mechanicalClauses(code);
    const res = { n: 0 }; const add = (k, v) => { (res[k] ??= []).push(v); };
    for (const p of g.props) {
      const ids = g.groups.get(p.at.join()), j = ids.indexOf(p.id), n = ids.length;
      const mech = (mechAll ?? []).filter((a) => a[0] >= p.window[0] && a[1] <= p.window[1]);
      const e = code === "eng" ? null : engByProp.get(p.prop);
      const pivot = e ? [(e.extent[0] - e.window[0]) / (e.window[1] - e.window[0]), (e.extent[1] - e.window[0]) / (e.window[1] - e.window[0])] : null;
      res.n++;
      for (const [name, f] of Object.entries(ALIGNERS)) {
        if (name === "B2" && code === "eng") continue;
        if ((name === "B3a" || name === "B3o") && !mechAll) continue;
        const pred = f({ buf, window: p.window, j, n, mech, truth: p.extent, pivot });
        add(name, pred ? iou(pred, p.extent) : 0);
      }
    }
    const mean = (a) => (a && a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : null);
    report[code] = { propositions: res.n, ...Object.fromEntries(Object.keys(ALIGNERS).map((k) => [k, mean(res[k])])) };
    const m = report[code], base = Math.max(m.B0, m.B1);
    report[code].clears = Object.fromEntries(["B2", "B3a"].map((k) => [k, m[k] == null ? null : m[k] >= THRESHOLD.mean && m[k] >= m.B0 + THRESHOLD.margin && m[k] >= m.B1 + THRESHOLD.margin]));
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(score(), null, 1));
