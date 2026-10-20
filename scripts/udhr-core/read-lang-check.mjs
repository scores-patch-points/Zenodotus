// udhr-core/read-lang-check.mjs — R2 of read-lang.mjs: 30 ACCEPTED words drawn at random (seeded) from a language's extension, looked up on en.wiktionary.org
// (one request per 10 s, existing cache), judged against the Wiktionary SECTION FOR THAT LANGUAGE. Pure lists only (all nominal, or none); mixed set aside.
// Claim fixed in read-lang.mjs: agreement among scored words >= 0.85. Usage: node read-lang-check.mjs <extension.json> <wiktionary-lang-key> <n>
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { entry } from "./wiktionary-pilot.mjs";
import { entryKind } from "./hybrid-settle.mjs";
const [extFile, wd, n] = process.argv.slice(2), ext = JSON.parse(readFileSync(new URL(`./${extFile}`, import.meta.url), "utf8"));
const pick = shuffle(Object.keys(ext.entries).sort(), mulberry(2026)).slice(0, +n), rows = [];
for (const w of pick) { const e = await entry(w), k = entryKind(e, wd); rows.push({ word: w, sniff: ext.entries[w].cls, score: ext.entries[w].score, wiktionary: (e?.[wd] ?? []).map((s) => s.pos).join("/"), kind: k, pageFound: e != null }); console.log(JSON.stringify(rows.at(-1))); }
const scored = rows.filter((r) => r.kind === "pure-nominal" || r.kind === "pure-other"), truth = (r) => (r.kind === "pure-nominal" ? "nominal" : "other");
const agree = scored.filter((r) => r.sniff === truth(r)).length, rnd = mulberry(7);
const nulls = Array.from({ length: 200 }, () => { const lab = shuffle(scored.map(truth), rnd); return scored.filter((r, i) => r.sniff === lab[i]).length / scored.length; });
const out = { asked: rows.length, scored: scored.length, mixedSetAside: rows.filter((r) => r.kind === "mixed").length, noEntryInLanguage: rows.filter((r) => !r.kind).length, noPage: rows.filter((r) => !r.pageFound).length, agree, rate: scored.length ? +(agree / scored.length).toFixed(3) : null, minimum: 0.85, holds: scored.length > 0 && agree / scored.length >= 0.85, nullMax: +Math.max(...nulls).toFixed(3), disagreements: scored.filter((r) => r.sniff !== truth(r)).map((r) => `${r.word}: sniff ${r.sniff} (${r.score}), wiktionary ${r.wiktionary}`) };
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL(`./${extFile.replace(".json", "")}-check-report.json`, import.meta.url), JSON.stringify({ out, rows }, null, 1) + "\n");
