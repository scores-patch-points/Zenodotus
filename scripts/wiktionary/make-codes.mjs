// make-codes.mjs — the language NAME → CODE table, from the dump's own language data modules.
//
//   node make-codes.mjs --in slim-work/lang-modules.json --out slim-work/codes.json
//
// A Wiktionary page names its language ("==English=="); the code lives in Module:languages/data/* (and the etymology-language and
// family modules) as `m["en"] = { "English", … }`. Where two codes share a name the shorter, then alphabetically first, code wins,
// and the collision is counted so it is visible. A name no module gives is left out: build-slim.mjs tags it `c: null` (a typed gap).
import { readFileSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const mods = JSON.parse(readFileSync(arg("in"), "utf8"));
const names = new Map(); let rows = 0, collisions = 0;
const better = (a, b) => (a.length !== b.length ? a.length < b.length : a < b);
for (const [title, text] of Object.entries(mods)) {
  if (/\/extra$/.test(title)) continue; // extra modules hold characters and sort keys, not names
  for (const m of text.matchAll(/^\s*m\["([^"]+)"\]\s*=\s*\{\s*(?:--[^\n]*\n\s*)*"((?:[^"\\]|\\.)*)"/gm)) {
    rows++;
    const code = m[1], name = m[2].replace(/\\(.)/g, "$1");
    const cur = names.get(name);
    if (cur === undefined) names.set(name, code);
    else if (cur !== code) { collisions++; if (better(code, cur)) names.set(name, code); }
  }
}
writeFileSync(arg("out"), JSON.stringify(Object.fromEntries(names)));
console.log(`${Object.keys(mods).length} modules, ${rows} rows, ${names.size} names, ${collisions} name collisions`);
