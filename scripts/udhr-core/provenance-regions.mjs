// udhr-core/provenance-regions.mjs — the documents region-read.mjs read, by group (path, sha256, bytes). Same selection as region-read.mjs (order-independent: every admitted English document of 21-anti-colonial with a declared region in a group).
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { walk, frontmatter, ROOT } from "./ring1.mjs";
import { admitted } from "./perspective-gate.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex"), isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const GROUP = (r) => { r = (r ?? "").toLowerCase().split(/[;,(]/)[0].trim(); return /^(africa|south africa|egypt|algeria)$/.test(r) ? "africa" : r === "india" ? "india" : /^(caribbean|west indies|cuba)$/.test(r) ? "caribbean" : r === "global" ? "global" : null; };
const g = { africa: [], india: [], caribbean: [], global: [] };
for (const p of walk(join(ROOT, "21-anti-colonial")).sort()) { const { meta } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language) || !admitted(p).admit) continue; const k = GROUP(meta.region); if (k) g[k].push(p); }
const sets = Object.fromEntries(Object.entries(g).map(([k, ps]) => [k, { documents: ps.length, root: sha(ps.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 32), files: ps.map((p) => ({ path: relative(ROOT, p), sha256: sha(readFileSync(p)), bytes: statSync(p).size })) }]));
const all = Object.values(sets).flatMap((s) => s.files.map((f) => f.sha256)).join("\n");
writeFileSync(new URL("./provenance/regions-docs.json", import.meta.url), JSON.stringify({ schema: "DocsRead@1", for: "region-read-report.json (ring1-regions)", root: sha(all).slice(0, 32), sets }) + "\n");
console.log(JSON.stringify(Object.fromEntries(Object.entries(sets).map(([k, s]) => [k, s.documents])), null), "root", sha(all).slice(0, 20));
