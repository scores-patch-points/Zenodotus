// What is actually in the ring-1 directories? Frontmatter language / region / license / size, so the claim is fixed against facts.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".txt") ? [p] : []; });
const fm = (p) => { const t = readFileSync(p, "utf8").slice(0, 3000); const m = /^---\n([\s\S]*?)\n---/.exec(t); const o = {}; if (m) for (const l of m[1].split("\n")) { const k = l.indexOf(":"); if (k > 0) o[l.slice(0, k).trim()] = l.slice(k + 1).trim(); } return o; };
for (const dir of ["21-anti-colonial", "20-first-person-voices", "01-literature-books"]) {
  const files = walk(join(ROOT, dir)), langs = {}, regions = {}, lic = {}; let bytes = 0, noFm = 0;
  for (const f of files) { const o = fm(f); if (!o.language && !o.title) noFm++; langs[o.language ?? "?"] = (langs[o.language ?? "?"] ?? 0) + 1; const r = (o.region ?? "?").split(/[;,(]/)[0].trim(); regions[r] = (regions[r] ?? 0) + 1; lic[o.license ?? "?"] = (lic[o.license ?? "?"] ?? 0) + 1; bytes += statSync(f).size; }
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`${dir}: ${files.length} files, ${(bytes / 1e6).toFixed(0)} MB, no frontmatter ${noFm}\n  languages ${top(langs, 8)}\n  regions ${top(regions, 14)}\n  licenses ${top(lic, 5)}`);
}
