// udhr-core/sniff-udhr64-ctx.mjs — TRANSFER test of the context-aware sniff (sniff-eng2.json, learned on web text) on the 64 English UDHR words in their own
// sentences, against the in-sentence roles in gold/udhr64-roles.json (one reader's judgement, written before any policy was scored). The UDHR is a different
// domain and register from the treebank: this is the check that ablation-context.mjs's caution asked for.
// PRE-REGISTERED before the first run (2026-10-19); reference = Sniff@1 on the same words: 41 accepted, 38 agree (92.7%); hybrid 51 of 53 (96.2%).
//   Q1  accepted-vote accuracy of Sniff@2 on the 64 is at least 0.90.
//   Q2  the hybrid policy (pure Wiktionary list decides; mixed defers to the accepted Sniff@2 vote) agrees with the gold roles at least as often as with
//       Sniff@1: rate >= 0.962 over the words it settles.
//   Q3  reported, not claimed: accepted count (coverage), and the units by which the sniff-only and hybrid English nearest-neighbour maps differ from the gold map.
import { readFileSync } from "node:fs";
import { readAll } from "./build-mind-beings.mjs";
import { readUnits } from "./read-beings.mjs";
import { makeHybridSettler } from "./hybrid-settle.mjs";
import { cache } from "./wiktionary-pilot.mjs";
import { sniff } from "./sniff.mjs";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; };
const model = JSON.parse(readFileSync(new URL("./sniff-eng2.json", import.meta.url), "utf8")), report = JSON.parse(readFileSync(new URL("./live-lookup-64-report.json", import.meta.url), "utf8")), goldFile = JSON.parse(readFileSync(new URL("./gold/udhr64-roles.json", import.meta.url), "utf8"));
const gold = new Map([...goldFile.nominal.map((w) => [w, "nominal"]), ...goldFile.other.map((w) => [w, "other"])]);
const { rows } = await readAll({ settle: () => null }), row = rows.find((r) => r.kind !== "projected-from-UDHR" && r.file === "udhr-eng.txt"), P = row.hearing.posPrior, TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const sentenceOf = (w) => { for (const f of row.frames) for (const s of f.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+/)) if ((s.match(TOK) ?? []).some((t) => t.toLowerCase() === w)) return s; return null; };
const sn = new Map(), all = [];
for (const { word } of report.results) { const v = await sniff(model, P, word, sentenceOf(word), embed); all.push(v); if (v.accept) sn.set(word, v.cls); }
const acc = all.filter((v) => v.accept), agree = acc.filter((v) => v.cls === gold.get(v.word));
const hybrid = makeHybridSettler(cache, "en", sn), settled = [...gold.keys()].filter((w) => hybrid(w)), hAgree = settled.filter((w) => hybrid(w) === gold.get(w));
const nnOf = (settle) => readUnits(row.frames, row.hearing, { settle }).nn, diff = (a, b) => a.filter((v, u) => v !== b[u]).length, goldNN = nnOf((w) => gold.get(w) ?? null);
const out = {
  Q1: { accepted: acc.length, agree: agree.length, rate: +(agree.length / acc.length).toFixed(3), minimum: 0.9, holds: agree.length / acc.length >= 0.9, reference: "Sniff@1: 38 of 41" },
  Q2: { settled: settled.length, agree: hAgree.length, rate: +(hAgree.length / settled.length).toFixed(3), minimum: 0.962, holds: hAgree.length / settled.length >= 0.962 },
  Q3: { acceptedOf64: acc.length, unitsFromGoldMap: { sniffOnly: diff(nnOf((w) => sn.get(w) ?? null), goldNN), hybrid: diff(nnOf(hybrid), goldNN) } },
  disagreements: agree.length === acc.length ? [] : acc.filter((v) => v.cls !== gold.get(v.word)).map((v) => `${v.word}: sniff ${v.cls} (${v.score}), gold ${gold.get(v.word)}`),
};
console.log(JSON.stringify(out, null, 1));
