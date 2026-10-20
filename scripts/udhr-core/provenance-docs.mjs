// udhr-core/provenance-docs.mjs — for each source hash in the mind log that is an EVIDENCE REPORT, write the list of DOCUMENTS that report read (path, sha256, bytes), so "why" reaches the documents.
// Writes provenance/ring1-docs.json (step 0 and 1 of ring1-english: ring1-report.json and ring1-genre-report.json) and provenance/coraal-docs.json (step 2). The associates' list is written by
// ring1-spiral3-docs.mjs (a certified rerun). Membership here is ORDER-INDEPENDENT (every English document of the two collections; the neutral and control sets by the same tests as ring1.mjs and
// ring1-genre.mjs), so recomputing it now gives the membership the original runs had; ring1.mjs's profiler skipped 1 anti-colonial document with no matching paragraph (noted below).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { modelOf, walk, frontmatter } from "./ring1.mjs";
import { admitted } from "./perspective-gate.mjs";
const ROOT = new URL("../../", import.meta.url).pathname, sha = (b) => createHash("sha256").update(b).digest("hex"), rd = (p) => readFileSync(p, "utf8");
const entry = (p) => ({ path: relative(ROOT, p), sha256: sha(readFileSync(p)), bytes: statSync(p).size });
const isEn = (l) => /^(en|english)\b/i.test(l ?? ""), TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const m = await modelOf("eng"), P = m.hearing.posPrior.forms, known = (t) => { const w = t.slice(0, 200000).toLowerCase().match(TOK) ?? []; return w.length ? w.filter((x) => P[x]).length / w.length : 0; };
const body = (p) => { const f = frontmatter(rd(p)); const t = f.body; const a = /\*\*\* ?START OF[^\n]*\n/.exec(t), z = /\*\*\* ?END OF/.exec(t); return t.slice(a ? a.index + a[0].length : 0, z ? z.index : t.length); };
const A = walk(join(ROOT, "21-anti-colonial")).filter((p) => isEn(frontmatter(rd(p)).meta.language)), B = walk(join(ROOT, "20-first-person-voices")).filter((p) => isEn(frontmatter(rd(p)).meta.language));
const N = walk(join(ROOT, "01-literature-books")).filter((p) => known(body(p)) >= 0.5);
const walkMd = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walkMd(p) : /\.(txt|md)$/.test(p) ? [p] : []; });
const G = [...walkMd(join(ROOT, "06-government-legal/world-legislation/uk")), ...walkMd(join(ROOT, "06-government-legal/world-legislation/us")), ...walkMd(join(ROOT, "02-encyclopedic/1911-britannica")).filter((p) => /Law|Economics|Sociology|Philosophy/.test(p))].filter((p) => !p.includes("1911-britannica") || true).filter((p) => p.includes("1911-britannica") || known(body(p)) >= 0.5);
const set = (name, ps) => ({ name, documents: ps.length, root: sha(ps.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 32), files: ps.map(entry) });
const out = { schema: "DocsRead@1", forReports: { "ring1-report.json": ["anticolonial", "firstPerson", "neutral"], "ring1-genre-report.json": ["anticolonial", "firstPerson", "neutral", "genreControl"] }, note: "membership is order-independent; ring1.mjs profiled 1,146 of the 1,147 English anti-colonial documents (one had no paragraph that matched the model)", sets: { anticolonial: set("21-anti-colonial English", A), firstPerson: set("20-first-person-voices English", B), neutral: set("01-literature-books, >= 50% known to the English prior", N), genreControl: set("UK and US statutes (>= 50% known) + Britannica 1911 Law/Economics/Sociology/Philosophy", G) } };
writeFileSync(new URL("./provenance/ring1-docs.json", import.meta.url), JSON.stringify(out) + "\n");
const w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : [])), cor = w2(join(ROOT, "11-multi-language/dialects-pidgins-creoles/coraal")).filter((p) => admitted(p).admit).sort();
const cset = set("CORAAL admitted excerpts", cor); writeFileSync(new URL("./provenance/coraal-docs.json", import.meta.url), JSON.stringify({ schema: "DocsRead@1", for: "coraal-units-report.json (ring1-english step 2)", license: "CC BY-NC-SA 4.0; hashes and paths only, no text", logSource: sha(cor.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 20), ...cset }) + "\n");
console.log(JSON.stringify({ anticolonial: A.length, firstPerson: B.length, neutral: N.length, genreControl: G.length, coraal: cor.length, coraalLogSource: sha(cor.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 20) }));
