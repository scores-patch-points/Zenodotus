// udhr-core/survey-languages.mjs — what non-English material the repo holds, by language and collection, with licence and size, joined to POS priors.
// Reads only YAML frontmatter (first 3 KB of each .txt/.md); counts, never text. Pointer-only directories are not read.
import { readdirSync, readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname, SKIP = new Set([".git", "node_modules", "pointers", "legacy", "derived-priors", "scripts", "src", "manifests", "09-source-code", "07-images-media", "10-audio-music"]);
const head = (p) => { const fd = openSync(p, "r"), b = Buffer.alloc(3000), n = readSync(fd, b, 0, 3000, 0); closeSync(fd); return b.toString("utf8", 0, n); };
const fm = (t) => { const m = /^---\n([\s\S]*?)\n---/.exec(t), o = {}; if (m) for (const l of m[1].split("\n")) { const k = l.indexOf(":"); if (k > 0) o[l.slice(0, k).trim()] = l.slice(k + 1).trim(); } return o; };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); const s = statSync(p); return s.isDirectory() ? (SKIP.has(f) ? [] : walk(p)) : /\.(txt|md)$/.test(f) ? [[p, s.size]] : []; });
const lic = (s = "") => (/public domain|pd\b|cc0/i.test(s) ? "PD/CC0" : /by-nc-nd|sin ?derivadas|noderiv/i.test(s) ? "CC BY-NC-ND" : /by-nc-sa/i.test(s) ? "CC BY-NC-SA" : /\bby-nc|non-?commercial/i.test(s) ? "CC BY-NC" : /by-sa/i.test(s) ? "CC BY-SA" : /\bcc by|attribution/i.test(s) ? "CC BY" : /may not be reproduced|all rights|copyright/i.test(s) ? "RESTRICTED" : s ? "other" : "none");
const rows = {};
for (const top of readdirSync(ROOT).filter((d) => !SKIP.has(d) && statSync(join(ROOT, d)).isDirectory() && !d.startsWith("."))) {
  if (top === "06-government-legal") continue;                       // UDHR editions and legislation: counted elsewhere
  for (const [p, size] of walk(join(ROOT, top))) {
    const o = fm(head(p)); const lang = (o.language ?? "?").toLowerCase().split(/[;,( ]/)[0];
    if (/^(en|english)$/.test(lang)) continue;
    const key = `${lang}|${top}`; const r = (rows[key] ??= { lang, top, docs: 0, bytes: 0, lic: {}, regions: {} });
    r.docs++; r.bytes += size; const l = lic(o.license); r.lic[l] = (r.lic[l] ?? 0) + 1; const rg = (o.region ?? "?").split(/[;,(]/)[0].trim().slice(0, 30); r.regions[rg] = (r.regions[rg] ?? 0) + 1;
  }
}
const priors = new Set(readdirSync(join(ROOT, "../../../janus/priors")).filter((f) => /^pos-/.test(f)).map((f) => f.replace(/^pos-/, "").replace(/\.json$/, "").slice(0, 3)));
const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(" ");
const out = Object.values(rows).sort((a, b) => b.docs - a.docs).slice(0, 45);
for (const r of out) console.log(`${r.lang.padEnd(8)} ${r.top.padEnd(30)} ${String(r.docs).padStart(5)} docs ${(r.bytes / 1e6).toFixed(1).padStart(6)} MB  lic[${top(r.lic, 3)}]  region[${top(r.regions, 2)}]  priorFile:${priors.has(r.lang.slice(0, 3)) ? "yes" : "no"}`);
