// reading-hypotheses.mjs — the adversarial-prior ledger (LP8): competing
// hypotheses about what minimizes hypergraph surprise, each a pure
// predictor scored against the same adjudicated rows. APPEND-ONLY: adding
// a hypothesis appends an entry to HYPOTHESES; editing or removing one is
// forbidden (the ledger is the append-only reality behind every sidecar's
// regenerated layer stack — LP8's own squaring of "amend via appends"
// with LP7's checkpoint law).
//
// Each hypothesis answers: given what the readings BEFORE this one know,
// what cell does this proposition land? Ranked by measurement, never by
// preference. The ladder as first measured (2026-08-31, five-language
// UDHR graph): frame ~50% < structural 58-66% < cell-transfer 90-99% <
// grain-transfer 97-100% — and on the 23 construction-splits, grain
// survives 20/23. The finding: THE GRAIN IS THE NEAR-INVARIANT AXIS OF
// TRANSLATION; THE OP CARRIES THE CONSTRUCTION. An op variant is
// ordinary translation information; a grain break is an alarm.
//
// A founding reading (nothing before it) is UNSCORED — a hypothesis that
// predicts from priors cannot be measured against the reading that
// founds them; the layer says so rather than scoring itself against
// itself (Goal 5's self-confirmation firewall).

const grainOf = (cell) => cell.split("·")[1];

// helpers over the ReadingPriors@1 rosetta section
function langRows(priors, prop, lang) {
  return priors.rosetta.props[prop]?.languages?.[lang] ?? [];
}
function propsOf(priors, lang) {
  return Object.keys(priors.rosetta.props).filter((p) => langRows(priors, p, lang).length);
}

export const HYPOTHESES = [
  {
    id: "frame",
    appended: "2026-08-31",
    knows: "the family frame alone — the modal cell of the languages read so far, nothing about this proposition",
    predict(priors, lang, langsBefore) {
      if (!langsBefore.length) return { scored: false, why: "founding reading — no prior frame to predict from" };
      const census = {};
      for (const l of langsBefore) {
        for (const p of propsOf(priors, l)) {
          for (const r of langRows(priors, p, l)) census[r.cell] = (census[r.cell] ?? 0) + 1;
        }
      }
      const modal = Object.entries(census).sort((a, b) => b[1] - a[1])[0][0];
      let hit = 0, total = 0;
      for (const p of propsOf(priors, lang)) {
        for (const r of langRows(priors, p, lang)) { total++; if (r.cell === modal) hit++; }
      }
      return { scored: true, unit: "rows", expected: modal, hit, total, rate: total ? hit / total : 0 };
    },
  },
  {
    id: "structural",
    appended: "2026-08-31",
    knows: "(role × clause × polarity) → the modal cell for that construction shape, learned from prior languages — no lexicon, no prop join",
    predict(priors, lang, langsBefore) {
      if (!langsBefore.length) return { scored: false, why: "founding reading — no prior table to condition on" };
      const key = (r) => `${r.role}|${r.clause}|${r.polarity}`;
      const table = {};
      for (const l of langsBefore) {
        for (const p of propsOf(priors, l)) {
          for (const r of langRows(priors, p, l)) {
            (table[key(r)] ??= {})[r.cell] = (table[key(r)][r.cell] ?? 0) + 1;
          }
        }
      }
      let hit = 0, total = 0, noCoverage = 0;
      for (const p of propsOf(priors, lang)) {
        for (const r of langRows(priors, p, lang)) {
          total++;
          const dist = table[key(r)];
          if (!dist) { noCoverage++; continue; }
          const modal = Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];
          if (r.cell === modal) hit++;
        }
      }
      return { scored: true, unit: "rows", hit, total, noCoverage, rate: total ? hit / total : 0 };
    },
  },
  {
    id: "cell-transfer",
    appended: "2026-08-31",
    knows: "the Rosetta prop join — the cells prior languages adjudicated for the SAME proposition",
    predict(priors, lang, langsBefore) {
      if (!langsBefore.length) return { scored: false, why: "founding reading — the join has nothing to transfer yet" };
      let hit = 0, shared = 0;
      const departures = [];
      for (const p of propsOf(priors, lang)) {
        const before = langsBefore.filter((l) => langRows(priors, p, l).length);
        if (!before.length) continue;
        shared++;
        const cellsHere = new Set(langRows(priors, p, lang).map((r) => r.cell));
        const cellsBefore = new Set(before.flatMap((l) => langRows(priors, p, l).map((r) => r.cell)));
        if ([...cellsHere].some((c) => cellsBefore.has(c))) hit++;
        else departures.push({ prop: p, here: [...cellsHere], before: [...cellsBefore] });
      }
      return { scored: true, unit: "shared-props", hit, total: shared, rate: shared ? hit / shared : 0, departures };
    },
  },
  {
    id: "grain-transfer",
    appended: "2026-08-31",
    knows: "the prop join, GRAIN only — the hypothesis that grain is what translation preserves while the op carries the construction",
    predict(priors, lang, langsBefore) {
      if (!langsBefore.length) return { scored: false, why: "founding reading — the join has nothing to transfer yet" };
      let hit = 0, shared = 0;
      const grainBreaks = [];
      for (const p of propsOf(priors, lang)) {
        const before = langsBefore.filter((l) => langRows(priors, p, l).length);
        if (!before.length) continue;
        shared++;
        const grainsHere = new Set(langRows(priors, p, lang).map((r) => grainOf(r.cell)));
        const grainsBefore = new Set(before.flatMap((l) => langRows(priors, p, l).map((r) => grainOf(r.cell))));
        if ([...grainsHere].some((g) => grainsBefore.has(g))) hit++;
        else grainBreaks.push({ prop: p, here: [...grainsHere], before: [...grainsBefore] });
      }
      return { scored: true, unit: "shared-props", hit, total: shared, rate: shared ? hit / shared : 0, grainBreaks };
    },
  },
];

/** Score every hypothesis for one reading; ranking by measured rate. */
export function adversarialLayers(priors, lang, langsBefore) {
  const layers = HYPOTHESES.map((h, i) => {
    const result = h.predict(priors, lang, langsBefore);
    return { layer: i + 1, kind: "adversarial-prior", hypothesis: h.id, appended: h.appended, knows: h.knows, ...result };
  });
  const ranked = layers.filter((l) => l.scored).sort((a, b) => b.rate - a.rate)
    .map((l) => ({ hypothesis: l.hypothesis, rate: Number(l.rate.toFixed(3)), of: `${l.hit}/${l.total} ${l.unit}` }));
  return { layers, ranking: ranked };
}

/** Grain survival across the whole matrix's construction-splits. */
export function grainSurvival(priors) {
  const splits = Object.entries(priors.rosetta.matrix).filter(([, m]) => m.agreement === "construction-split");
  const breaks = [];
  for (const [p, m] of splits) {
    const grains = new Set(Object.values(m.cellsByLang).flat().map(grainOf));
    if (grains.size > 1) breaks.push({ prop: p, cellsByLang: m.cellsByLang });
  }
  return { splits: splits.length, grainSurvives: splits.length - breaks.length, breaks };
}
