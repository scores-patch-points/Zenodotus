// udhr-core/sniff-udhr64-gold.mjs — score settlement POLICIES against the in-sentence roles of the 64 UDHR words (gold/udhr64-roles.json).
//
// Policies (each yields a `settle(word)` for the reader):
//   wikt     type-level Wiktionary verdict: nominal iff ANY listed POS is nominal (what the lookup run applied)
//   sniff    only accepted sniff votes (one UDHR sentence each); the rest unsettled
//   hybrid   Wiktionary verdict when its POS list is PURE (all nominal, or none); for a MIXED list, the accepted sniff vote, else unsettled
// PRE-REGISTERED before scoring (2026-10-19; the gold file was written first):
//   X1  hybrid's agreement with the gold roles is at least wikt's, over the words it settles.
//   X2  the English nearest-neighbour map under hybrid differs from the map under GOLD (every word settled by its role) in no more units than the map
//       under wikt does.
//   Reported: every policy's accuracy and coverage; each map's distance from the gold map; and the gold map's distance from no settlement.
import { readFileSync } from "node:fs";
import { readAll } from "./build-mind-beings.mjs";
import { readUnits, isUnknownWord } from "./read-beings.mjs";
import { makeSettler } from "./lookup.mjs";
import { cache } from "./wiktionary-pilot.mjs";
import { sniff } from "./sniff.mjs";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; };
const model = JSON.parse(readFileSync(new URL("./sniff-eng.json", import.meta.url), "utf8")), report = JSON.parse(readFileSync(new URL("./live-lookup-64-report.json", import.meta.url), "utf8"));
const goldFile = JSON.parse(readFileSync(new URL("./gold/udhr64-roles.json", import.meta.url), "utf8"));
const gold = new Map([...goldFile.nominal.map((w) => [w, "nominal"]), ...goldFile.other.map((w) => [w, "other"])]);
const { rows } = await readAll({ settle: () => null });
const row = rows.find((r) => r.kind !== "projected-from-UDHR" && r.file === "udhr-eng.txt"), P = row.hearing.posPrior, TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const sentenceOf = (w) => { for (const f of row.frames) for (const s of f.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+/)) if ((s.match(TOK) ?? []).some((t) => t.toLowerCase() === w)) return s; return null; };
const wikt = makeSettler(cache, "en"), NOMTAG = new Set(["noun", "proper noun"]);
const sn = new Map(), pure = new Map();
for (const r of report.results) {
  if (!gold.has(r.word)) throw new Error(`no gold role for ${r.word}`);
  const v = await sniff(model, P, r.word, sentenceOf(r.word), embed); if (v.accept) sn.set(r.word, v.cls);
  const tags = (r.pos ?? "").split("/").filter(Boolean), nn = tags.filter((t) => NOMTAG.has(t)).length;
  pure.set(r.word, nn === tags.length || nn === 0);
}
const policies = { wikt: (w) => wikt(w), sniff: (w) => sn.get(w) ?? null, hybrid: (w) => (pure.get(w) ? wikt(w) : sn.get(w) ?? null), gold: (w) => gold.get(w) ?? null };
const nnOf = (settle) => readUnits(row.frames, row.hearing, { settle }).nn, diff = (a, b) => a.filter((v, u) => v !== b[u]).length;
const maps = Object.fromEntries(Object.entries(policies).map(([k, f]) => [k, nnOf(f)])), none = nnOf(() => null);
const stat = (f) => { const ws = [...gold.keys()].filter((w) => f(w)); return { settled: ws.length, agree: ws.filter((w) => f(w) === gold.get(w)).length, rate: +(ws.filter((w) => f(w) === gold.get(w)).length / ws.length).toFixed(3) }; };
const out = {
  accuracyVsGold: { wikt: stat(policies.wikt), sniff: stat(policies.sniff), hybrid: stat(policies.hybrid) },
  X1: { hybrid: stat(policies.hybrid).rate, wikt: stat(policies.wikt).rate, holds: stat(policies.hybrid).rate >= stat(policies.wikt).rate },
  unitsDifferingFromGoldMap: { none: diff(none, maps.gold), wikt: diff(maps.wikt, maps.gold), sniff: diff(maps.sniff, maps.gold), hybrid: diff(maps.hybrid, maps.gold) },
  X2: { hybrid: diff(maps.hybrid, maps.gold), wikt: diff(maps.wikt, maps.gold), holds: diff(maps.hybrid, maps.gold) <= diff(maps.wikt, maps.gold) },
  wiktionaryWrongInContext: [...gold.keys()].filter((w) => wikt(w) && wikt(w) !== gold.get(w)),
  hybridWrong: [...gold.keys()].filter((w) => policies.hybrid(w) && policies.hybrid(w) !== gold.get(w)),
  unsettledByHybrid: [...gold.keys()].filter((w) => !policies.hybrid(w)).length,
};
console.log(JSON.stringify(out, null, 1));
