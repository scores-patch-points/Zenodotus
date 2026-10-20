// udhr-core/read-lang-check2.mjs — R2/H2 again, for a language the REST definition API does not label: the same random words (same seed) as read-lang-check.mjs,
// judged from the wikitext under the named language heading (wiktionary-section.mjs). Claim as fixed: agreement among PURE-list scored words >= 0.85.
// Usage: node read-lang-check2.mjs <extension.json> "<Wiktionary language heading>" <n>      e.g.  hat-prior-extension.json "Haitian Creole" 30
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { sectionPos } from "./wiktionary-section.mjs";
const [extFile, heading, n] = process.argv.slice(2), ext = JSON.parse(readFileSync(new URL(`./${extFile}`, import.meta.url), "utf8"));
const NOMTAG = new Set(["noun", "proper noun"]), pick = shuffle(Object.keys(ext.entries).sort(), mulberry(2026)).slice(0, +n), rows = [];
for (const w of pick) { const s = await sectionPos(w, heading), nn = s.pos.filter((t) => NOMTAG.has(t)).length, kind = !s.pos.length ? null : nn === s.pos.length ? "pure-nominal" : nn === 0 ? "pure-other" : "mixed"; rows.push({ word: w, sniff: ext.entries[w].cls, score: ext.entries[w].score, wiktionary: s.pos.join("/"), kind, sectionFound: s.found, pageExists: s.pageExists }); console.log(JSON.stringify(rows.at(-1))); }
const scored = rows.filter((r) => r.kind === "pure-nominal" || r.kind === "pure-other"), truth = (r) => (r.kind === "pure-nominal" ? "nominal" : "other"), agree = scored.filter((r) => r.sniff === truth(r)).length, rnd = mulberry(7);
const nulls = scored.length ? Array.from({ length: 200 }, () => { const lab = shuffle(scored.map(truth), rnd); return scored.filter((r, i) => r.sniff === lab[i]).length / scored.length; }) : [];
const out = { heading, asked: rows.length, pageExists: rows.filter((r) => r.pageExists).length, haveLanguageSection: rows.filter((r) => r.sectionFound).length, scored: scored.length, mixedSetAside: rows.filter((r) => r.kind === "mixed").length, agree, rate: scored.length ? +(agree / scored.length).toFixed(3) : null, minimum: 0.85, holds: scored.length > 0 && agree / scored.length >= 0.85, nullMax: nulls.length ? +Math.max(...nulls).toFixed(3) : null, disagreements: scored.filter((r) => r.sniff !== truth(r)).map((r) => `${r.word}: sniff ${r.sniff} (${r.score}), wiktionary ${r.wiktionary}`) };
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL(`./${extFile.replace(".json", "")}-check2-report.json`, import.meta.url), JSON.stringify({ out, rows }, null, 1) + "\n");
