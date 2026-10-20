// udhr-core/coraal-units.mjs — which units of the Declaration do CORAAL speakers' own words speak to MORE than novels do? (the CORAAL step of ring1-english)
// Same preprocessing and profile as lived-read.mjs (header dropped, redaction and disfluency tags removed, one speech turn per paragraph; English UDHR model; neutral = the
// same English novels as ring 1). RULE FIXED BEFORE THE RUN (2026-10-20): a unit enters the CORAAL conclusion iff its profile share exceeds the novels' share in at least 190 of 200
// bootstrap resamples of documents (resampled within each corpus). Novels are the ONLY control here: ring 1's second control (UK/US statutes, Britannica 1911) is written legal
// and encyclopedic prose and does not fit spoken interviews. The CORAAL conclusion is therefore WEAKER than ring 1's two-control standard, and the log record says so by being
// a separate corpus item (`cr:<unit>`), never merged into the ring-1 items. Reported: the 31 bootstrap-win counts, the share ratios, and the 8 largest.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { modelOf, profileDocument, meanOf, walk, frontmatter, gutenbergBody, mulberry, ROOT } from "./ring1.mjs";
import { admitted } from "./perspective-gate.mjs";
const TOK = /\p{L}+(?:['’]\p{L}+)?/gu, rd = (p) => readFileSync(p, "utf8");
const w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : []));
const files = w2(join(ROOT, "11-multi-language/dialects-pidgins-creoles/coraal")).filter((p) => admitted(p).admit);
const coraal = files.map((p) => rd(p).split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.replace(/\/[A-Za-z0-9-]+\//g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).filter((l) => l.length > 3).join("\n\n"));
const m = await modelOf("eng"), P = m.hearing.posPrior.forms, known = (t) => { const w = t.slice(0, 200000).toLowerCase().match(TOK) ?? []; return w.length ? w.filter((x) => P[x]).length / w.length : 0; };
const novels = walk(join(ROOT, "01-literature-books")).map((p) => gutenbergBody(frontmatter(rd(p)).body)).filter((t) => known(t) >= 0.5);
const prof = (docs) => docs.map((t) => profileDocument(t, m)).filter(Boolean).map((r) => r.profile), L = prof(coraal), N = prof(novels), rnd = mulberry(37), boot = (a) => Array.from({ length: a.length }, () => a[Math.floor(rnd() * a.length)]), wins = new Array(31).fill(0);
for (let i = 0; i < 200; i++) { const a = meanOf(boot(L)), b = meanOf(boot(N)); for (let u = 0; u < 31; u++) if (a[u] > b[u]) wins[u]++; }
const mL = meanOf(L), mN = meanOf(N), rows = wins.map((w, u) => ({ unit: u, wins: w, share: +mL[u].toFixed(4), novels: +mN[u].toFixed(4), ratio: mN[u] ? +(mL[u] / mN[u]).toFixed(2) : null })), surv = rows.filter((r) => r.wins >= 190);
const out = { admittedDocs: files.length, profiled: L.length, novels: N.length, rule: ">= 190 of 200 bootstrap wins against novels", surviving: surv.map((r) => r.unit), survivingDetail: surv.sort((a, b) => b.ratio - a.ratio).map((r) => `${r.unit === 0 ? "preamble" : "art " + r.unit} x${r.ratio} (${r.wins}/200)`), borderline: rows.filter((r) => r.wins >= 150 && r.wins < 190).map((r) => `${r.unit}:${r.wins}`) };
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL("./coraal-units-report.json", import.meta.url), JSON.stringify({ out, rows }, null, 1) + "\n");
