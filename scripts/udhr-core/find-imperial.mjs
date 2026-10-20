// Candidates for a genre-matched control: imperial-side or administrator political/legal prose already in the repo (titles and authors only).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname;
const SKIP = new Set(["24-global-literature", "06-government-legal", "11-multi-language", "14-holy-texts", "09-source-code", "19-organic-community", "10-audio-music", "07-images-media", ".git", "legacy", "derived-priors", "scripts", "src", "pointers", "manifests"]);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".txt") ? [p] : []; });
const KW = /\b(empire|imperial|colonial|colony|colonies|governor|viceroy|administration|administrator|parliament|native|natives|india office|crown|dominion|protectorate|annexation|rhodes|lugard|cromer|curzon|macaulay|froude|kipling|seeley|mill|burke|livingstone|stanley|jameson|bryce|dilke|hobson|lenin)\b/i;
const rows = [];
for (const top of readdirSync(ROOT)) {
  if (SKIP.has(top) || !statSync(join(ROOT, top)).isDirectory()) continue;
  for (const p of walk(join(ROOT, top))) {
    const t = readFileSync(p, "utf8").slice(0, 2500), m = /^---\n([\s\S]*?)\n---/.exec(t); if (!m) continue;
    const o = {}; for (const l of m[1].split("\n")) { const k = l.indexOf(":"); if (k > 0) o[l.slice(0, k).trim()] = l.slice(k + 1).trim(); }
    const hay = `${o.title ?? ""} ${o.author_catalog ?? ""} ${o.counter ?? ""}`;
    if (top === "21-anti-colonial" && !o.counter) continue;
    if (KW.test(hay) && top !== "21-anti-colonial") rows.push([top, (o.title ?? "").slice(0, 70), (o.author_catalog ?? "").slice(0, 40), (statSync(p).size / 1e6).toFixed(2) + "MB", o.language ?? "?"]);
  }
}
console.log(rows.length, "candidates outside 21-anti-colonial");
for (const r of rows.slice(0, 70)) console.log(r.join(" | "));
// and what does 21-anti-colonial say each document COUNTERS?
const counters = {}; for (const p of walk(join(ROOT, "21-anti-colonial"))) { const m = /^counter:\s*(.*)$/m.exec(readFileSync(p, "utf8").slice(0, 2500)); if (m) counters[m[1].slice(0, 50)] = (counters[m[1].slice(0, 50)] ?? 0) + 1; }
console.log("--- what 21-anti-colonial documents counter:", Object.entries(counters).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}:${v}`).join(" ; "));
