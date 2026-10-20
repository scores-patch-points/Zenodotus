// udhr-core/ring1-read-check.mjs — R2 of ring1-read.mjs: do the sniff's ACCEPTED votes in the ring-1 domain agree with Wiktionary?
// 40 accepted words drawn AT RANDOM (seeded; not by margin), looked up on en.wiktionary.org only, one request per 10 s through the existing cache.
// A word is scored only if its English Wiktionary list is PURE (every POS nominal, or none nominal); mixed lists are counted and set aside.
// Claim fixed in ring1-read.mjs: agreement among scored words >= 0.85. Reported next to a shuffled-label null (200 draws) for context.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { entry } from "./wiktionary-pilot.mjs";
import { entryKind } from "./hybrid-settle.mjs";
const ext = JSON.parse(readFileSync(new URL("./eng-prior-extension.json", import.meta.url), "utf8"));
const pick = shuffle(Object.keys(ext.entries).sort(), mulberry(2026)).slice(0, 40), rows = [];
for (const w of pick) { const e = await entry(w), k = entryKind(e, "en"); rows.push({ word: w, sniff: ext.entries[w].cls, score: ext.entries[w].score, wiktionary: (e?.en ?? []).map((s) => s.pos).join("/"), kind: k }); console.log(JSON.stringify(rows.at(-1))); }
const scored = rows.filter((r) => r.kind === "pure-nominal" || r.kind === "pure-other"), truth = (r) => (r.kind === "pure-nominal" ? "nominal" : "other");
const agree = scored.filter((r) => r.sniff === truth(r)).length, rnd = mulberry(7);
const nulls = Array.from({ length: 200 }, () => { const lab = shuffle(scored.map(truth), rnd); return scored.filter((r, i) => r.sniff === lab[i]).length / scored.length; });
const out = { asked: rows.length, scored: scored.length, mixedSetAside: rows.filter((r) => r.kind === "mixed").length, noEntry: rows.filter((r) => !r.kind).length, agree, rate: +(agree / scored.length).toFixed(3), minimum: 0.85, holds: agree / scored.length >= 0.85, nullMax: +Math.max(...nulls).toFixed(3), disagreements: scored.filter((r) => r.sniff !== truth(r)).map((r) => `${r.word}: sniff ${r.sniff} (${r.score}), wiktionary ${r.wiktionary}`) };
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./ring1-read-check-report.json", import.meta.url), JSON.stringify({ out, rows }, null, 1) + "\n");
