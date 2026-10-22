// udhr-core/live-lookup.mjs — as-needs lookups for the pilot five, applied to the mind through the same gate as everything else.
//   needs     whatever ingestion raises for eng, spa, arb, cmn_hans, swh (read-beings `needs`): an unseen word admitted on its frame alone
//   lookup    en.wiktionary.org REST definition API only, one request per PACE ms, cached (wiktionary-cache.json)
//   apply     each answer settles its word; the edition is re-read; applyEvidence appends a REVISE only if the conclusion moved
// Runs against a COPY of the log (_live.eot): the published mind.eot is not touched.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { readAll, modalNN, mutualPairs, rootOf } from "./build-mind-beings.mjs";
import { readUnits, isUnknownWord } from "./read-beings.mjs";
import { makeSettler, drain } from "./lookup.mjs";
import { applyEvidence, domainTip } from "./revise.mjs";
import { entry, cache } from "./wiktionary-pilot.mjs";

const FIVE = { eng: "en", spa: "es", arb: "ar", cmn_hans: "zh", swh: "sw" };
const DOMAIN = "udhr-core/beings-independent";
const SRC = new URL("./mind.eot", import.meta.url).pathname, OUT = new URL("./_live.eot", import.meta.url).pathname;
copyFileSync(SRC, OUT);

// Chinese "no page" answers from the first run were really stubs (see wiktionary-pilot.mjs stubTarget): forget them so they are looked up again.
for (const k of Object.keys(cache)) if (cache[k] === null && /\p{Script=Han}/u.test(k)) delete cache[k];
const settleFor = (wd) => makeSettler(cache, wd);
const { rows: every } = await readAll({ settle: () => null });
let rows = every.filter((r) => r.kind !== "projected-from-UDHR");
const tip = domainTip(readFileSync(OUT), DOMAIN);
const start = rootOf(mutualPairs(modalNN(rows)));
if (tip.root !== start) throw new Error(`the log (${tip.root}) does not hold the conclusion these rows imply (${start})`);

const needs = [], where = {};
for (const [stem, wd] of Object.entries(FIVE)) {
  const idx = rows.findIndex((r) => r.file === `udhr-${stem}.txt`);
  where[stem] = idx;
  if (idx < 0) { console.log(`${stem}: not in the independent domain (its prior is English-projected, or it has no beings): no revision possible here`); continue; }
  for (const n of rows[idx].needs) needs.push({ surface: `${stem}|${n.surface}`, mentions: n.mentions, units: n.units });
  console.log(`${stem}: ${rows[idx].needs.length} needs, edition #${idx} of ${rows.length}`);
}
console.log(`queue: ${needs.length} words\n`);

const results = [];
await drain(needs, {
  // defence in depth: whatever the queue holds, a word the language's prior KNOWS is never sent to the outside
  fetchEntry: async (key) => {
    const [stem, word] = key.split("|"), row = rows[where[stem]];
    if (!isUnknownWord(row.hearing.posPrior, word)) throw new Error(`refusing to look up "${word}" (${stem}): the prior already knows it`);
    return entry(word);
  },
  onAnswer: async (key, e) => {
    const [stem, word] = key.split("|"), wd = FIVE[stem], idx = where[stem];
    const sec = e?.[wd] ?? null, verdict = settleFor(wd)(word);
    const re = readUnits(rows[idx].frames, rows[idx].hearing, { settle: settleFor(wd) });
    const oldNn = rows[idx].nn, newNn = re.nn;
    const moved = newNn.some((v, u) => v !== oldNn[u]);
    const r = applyEvidence(OUT, DOMAIN, rows, idx, newNn);
    rows = rows.map((x, i) => (i === idx ? { ...x, nn: newNn, needs: re.needs } : x));      // the edition's reading is revised either way; only a moved CONCLUSION is a record
    results.push({ stem, word, pageFound: e != null, ownLanguageEntry: !!sec?.length, pos: sec?.map((s) => s.pos).join("/") ?? null, verdict, nnMoved: moved, conclusionMoved: r.changed, surpriseBits: +r.surpriseBits.toFixed(3) });
    console.log(JSON.stringify(results.at(-1)));
  },
});

const sum = (f) => results.filter(f).length;
const summary = { asked: results.length, pageFound: sum((r) => r.pageFound), ownLanguageEntry: sum((r) => r.ownLanguageEntry), verdictNominal: sum((r) => r.verdict === "nominal"), verdictOther: sum((r) => r.verdict === "other"), noVerdict: sum((r) => r.verdict == null), editionNnMoved: sum((r) => r.nnMoved), conclusionMoved: sum((r) => r.conclusionMoved), totalSurpriseBits: +results.reduce((a, r) => a + r.surpriseBits, 0).toFixed(3), finalRootEqualsStart: rootOf(mutualPairs(modalNN(rows))) === start, logBytesBefore: readFileSync(SRC).length, logBytesAfter: readFileSync(OUT).length };
writeFileSync(new URL("./live-lookup-report.json", import.meta.url), JSON.stringify({ summary, results }, null, 1) + "\n");
console.log("\n" + JSON.stringify(summary, null, 1));
