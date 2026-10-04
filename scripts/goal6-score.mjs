#!/usr/bin/env node
// goal6-score.mjs — score the blind panel (ROSETTA-GOALS Goal 6).
//
// Inputs: goldens/reading/goal6/key.json (the stored assignments the
// readers never saw) + verdicts-{en,ar,es,zh,sw}.json (each reader's
// fenced JSON, saved verbatim).
//
// Two DIFFERENT measurements, kept apart because they answer different
// questions:
//   1. PANEL vs STORED, per language — how often a blind reader lands the
//      stored cell. This measures the original adjudication's
//      reproducibility, one language at a time.
//   2. PANEL vs PANEL, across languages — Fleiss' kappa over the 40
//      sampled props, five raters (one per language), at cell, op, and
//      grain level. THIS is the falsification test: "if equivalent
//      propositions do not receive equal phaseposts under INDEPENDENT
//      adjudication across languages, the Rosetta stone fails." The
//      grain-invariance hypothesis (LP8) predicts grain kappa > cell
//      kappa.
//
// Discipline (goldens/agency-civic, carried over): a kappa below the
// declared floor of 0.4 is reported as the number it is and REFUSED as
// certification — never spun. The panel is an LLM proxy sharing one base
// model: agreement here is an upper bound on independence, a floor on
// nothing, and a human pass is still what certification needs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const G6 = path.join(HERE, "..", "goldens", "reading", "goal6");
const LANGS = ["en", "ar", "es", "zh", "sw"];
const KAPPA_FLOOR = 0.4;

const key = JSON.parse(fs.readFileSync(path.join(G6, "key.json"), "utf8"));
const verdicts = {};
for (const l of LANGS) {
  const v = JSON.parse(fs.readFileSync(path.join(G6, `verdicts-${l}.json`), "utf8"));
  verdicts[l] = Object.fromEntries(v.map((r) => [r.i, r]));
}

const props = key.order;
const cellOf = (v) => `${v.op}·${v.grain}`;

// ---- 1. panel vs stored ----
const perLang = {};
for (const l of LANGS) {
  let cell = 0, op = 0, grain = 0, n = 0;
  const disagreements = [];
  props.forEach((p, i) => {
    const stored = key.sample[p][l].cell;
    const v = verdicts[l][i];
    if (!v) return;
    n++;
    const [sOp, sGrain] = stored.split("·");
    if (v.op === sOp) op++;
    if (v.grain === sGrain) grain++;
    if (cellOf(v) === stored) cell++;
    else disagreements.push({ prop: p, stored, blind: cellOf(v), because: v.because });
  });
  perLang[l] = { n, cell, op, grain, cellRate: cell / n, opRate: op / n, grainRate: grain / n, disagreements };
}

// ---- 2. panel vs panel: Fleiss' kappa ----
function fleiss(items) {
  // items: array of arrays of category labels (k raters per item)
  const k = items[0].length;
  const cats = [...new Set(items.flat())];
  const n = items.length;
  let pBarSum = 0;
  const catTotals = Object.fromEntries(cats.map((c) => [c, 0]));
  for (const it of items) {
    const counts = {};
    for (const c of it) { counts[c] = (counts[c] ?? 0) + 1; catTotals[c] += 1; }
    const sumSq = Object.values(counts).reduce((a, b) => a + b * b, 0);
    pBarSum += (sumSq - k) / (k * (k - 1));
  }
  const pBar = pBarSum / n;
  const total = n * k;
  const pe = Object.values(catTotals).reduce((a, b) => a + (b / total) ** 2, 0);
  return { kappa: (pBar - pe) / (1 - pe), pBar, pe, n, k, categories: cats.length };
}

const byLevel = { cell: [], op: [], grain: [] };
const splitFlags = [];
props.forEach((p, i) => {
  const cells = LANGS.map((l) => cellOf(verdicts[l][i]));
  byLevel.cell.push(cells);
  byLevel.op.push(cells.map((c) => c.split("·")[0]));
  byLevel.grain.push(cells.map((c) => c.split("·")[1]));
  const storedCells = new Set(LANGS.map((l) => key.sample[p][l].cell));
  splitFlags.push(storedCells.size > 1);
});

const panel = {};
for (const [level, items] of Object.entries(byLevel)) {
  panel[level] = fleiss(items);
  panel[level].unanimousProps = items.filter((it) => new Set(it).size === 1).length;
}
// split vs unanimous strata at cell level
const strata = {};
for (const [name, flag] of [["construction-split", true], ["stored-unanimous", false]]) {
  const items = byLevel.cell.filter((_, i) => splitFlags[i] === flag);
  const grains = byLevel.grain.filter((_, i) => splitFlags[i] === flag);
  strata[name] = { props: items.length, cell: fleiss(items).kappa, grain: fleiss(grains).kappa };
}

const out = {
  schema: "Goal6Score@1",
  proxy: "LLM panel — five context-isolated readers sharing one base model; an upper bound on independence, never a human ceiling; file access was prohibited by instruction, not by sandbox (residual disclosed)",
  floor: KAPPA_FLOOR,
  panelVsStored: Object.fromEntries(LANGS.map((l) => [l, {
    n: perLang[l].n,
    cell: `${perLang[l].cell}/${perLang[l].n} (${(perLang[l].cellRate * 100).toFixed(0)}%)`,
    op: `${perLang[l].op}/${perLang[l].n} (${(perLang[l].opRate * 100).toFixed(0)}%)`,
    grain: `${perLang[l].grain}/${perLang[l].n} (${(perLang[l].grainRate * 100).toFixed(0)}%)`,
  }])),
  panelVsPanel: {
    cell: { kappa: +panel.cell.kappa.toFixed(3), unanimousProps: panel.cell.unanimousProps, categories: panel.cell.categories },
    op: { kappa: +panel.op.kappa.toFixed(3), unanimousProps: panel.op.unanimousProps, categories: panel.op.categories },
    grain: { kappa: +panel.grain.kappa.toFixed(3), unanimousProps: panel.grain.unanimousProps, categories: panel.grain.categories },
    strata,
  },
  verdictAgainstFloor: null,
  disagreements: Object.fromEntries(LANGS.map((l) => [l, perLang[l].disagreements])),
  at: new Date().toISOString(),
};
out.verdictAgainstFloor = Object.fromEntries(Object.entries(panel).map(([lvl, f]) => [lvl,
  f.kappa >= KAPPA_FLOOR ? `kappa ${f.kappa.toFixed(3)} clears the declared ${KAPPA_FLOOR} floor` : `kappa ${f.kappa.toFixed(3)} is BELOW the declared ${KAPPA_FLOOR} floor — reported, not certified`]));

fs.writeFileSync(path.join(G6, "score.json"), JSON.stringify(out, null, 1));
console.log("panel vs stored (cell):", Object.fromEntries(LANGS.map((l) => [l, out.panelVsStored[l].cell])));
console.log("panel vs panel kappa: cell", out.panelVsPanel.cell.kappa, "| op", out.panelVsPanel.op.kappa, "| grain", out.panelVsPanel.grain.kappa);
console.log("strata:", JSON.stringify(strata));
console.log("floor verdicts:", JSON.stringify(out.verdictAgainstFloor));
