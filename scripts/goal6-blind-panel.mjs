#!/usr/bin/env node
// goal6-blind-panel.mjs — build the BLIND SHEETS for ROSETTA-GOALS Goal 6:
// independent adjudication, one language per context-isolated reader,
// blind to every other language's assignments and to the stored goldens.
//
// The falsification condition this serves, verbatim from ROSETTA-GOALS:
// "If equivalent propositions do not receive equal phaseposts under
// INDEPENDENT adjudication across languages, the Rosetta stone fails."
// Every agreement figure the sidecars carry is one reader's consistency
// until this runs. The panel is an LLM-proxy (context-isolated sessions,
// agency-civic's own labeled-proxy discipline), never a human ceiling.
//
// WHAT A SHEET CONTAINS, and what it deliberately does not: per sampled
// proposition, ONE row of that language (the first, a declared mechanical
// choice) with sentence anchor, subject, relation, object, clause,
// polarity, role — and NO op, NO grain, NO because, NO prop id, NO hint
// that other languages exist. The stored assignments land in a separate
// key file the readers never see. Phasepost vocabulary cannot be
// memorized from outside this project (RULE.md is its only teacher), so
// the one genuine leak channel for an LLM reader is the repo itself —
// the runner forbids tool use and the results doc discloses the residual.
//
// SAMPLING, declared before any sheet was built: all props present in
// ALL FIVE languages; from those, every construction-split prop (the
// hard cases, including the three grain-breaks) plus every Nth unanimous
// prop in document order to a target of ~30 (N chosen mechanically from
// the count, no seed needed — document order is the corpus's own).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "goldens", "reading", "goal6");
const priors = JSON.parse(fs.readFileSync(path.join(ROOT, "derived-priors/reading-priors/reading-priors-v1.json"), "utf8"));

const LANGS = ["en", "ar", "es", "zh", "sw"];
const TARGET_UNANIMOUS = 18;

const matrix = priors.rosetta.matrix;
const props = priors.rosetta.props;

const fullPresence = Object.entries(matrix)
  .filter(([, m]) => LANGS.every((l) => m.presentIn.includes(l)))
  .sort((a, b) => a[1].order - b[1].order);

const splits = fullPresence.filter(([, m]) => m.agreement === "construction-split").map(([p]) => p);
const unanimous = fullPresence.filter(([, m]) => m.agreement === "unanimous").map(([p]) => p);
const stride = Math.max(1, Math.floor(unanimous.length / TARGET_UNANIMOUS));
const sampledUnanimous = unanimous.filter((_, i) => i % stride === 0).slice(0, TARGET_UNANIMOUS);
const sample = [...splits, ...sampledUnanimous]
  .sort((a, b) => props[a].order - props[b].order);

fs.mkdirSync(OUT, { recursive: true });

const key = { schema: "Goal6Key@1", sample: {}, method: { fullPresence: fullPresence.length, splits: splits.length, unanimousSampled: sampledUnanimous.length, stride, rowChoice: "first row of the prop in that language (declared mechanical choice)" } };

for (const lang of LANGS) {
  const rows = sample.map((p, i) => {
    const r = props[p].languages[lang][0];
    return {
      i,
      sentence: r.span ? null : null, // anchors live in the golden; carry the fields below
      subject: r.subject, relation: r.relation, object: r.object,
      clause: r.clause, polarity: r.polarity, role: r.role,
    };
  });
  // pull the anchor sentences from the golden files so readers see the text
  const spec = { en: "udhr", ar: "udhr-arb", es: "udhr-spa", zh: "udhr-cmn_hans", sw: "udhr-swh" }[lang];
  const golden = JSON.parse(fs.readFileSync(path.join(ROOT, "goldens", "reading", `${spec}.golden.json`), "utf8"));
  const byGround = Object.fromEntries(golden.rows.map((r) => [r.ground, r]));
  sample.forEach((p, i) => {
    const r = props[p].languages[lang][0];
    rows[i].sentence = byGround[r.ground]?.anchor ?? null;
  });
  fs.writeFileSync(path.join(OUT, `sheet-${lang}.json`), JSON.stringify({ schema: "Goal6Sheet@1", language: lang, rows }, null, 1));
}

for (const p of sample) {
  key.sample[p] = Object.fromEntries(LANGS.map((l) => {
    const r = props[p].languages[l][0];
    return [l, { cell: r.cell, ground: r.ground }];
  }));
}
key.order = sample;
fs.writeFileSync(path.join(OUT, "key.json"), JSON.stringify(key, null, 1));

console.log(`goal6: ${sample.length} props sampled (${splits.length} splits + ${sampledUnanimous.length} unanimous of ${unanimous.length}, stride ${stride}) from ${fullPresence.length} full-presence props`);
console.log(`sheets -> goldens/reading/goal6/sheet-{${LANGS.join(",")}}.json; key (never shown to readers) -> key.json`);
