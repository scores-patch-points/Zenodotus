// udhr-core/perspective-profiles.mjs — read each STANDPOINT in its own terms: the nouns it recurs on that the other standpoints do not. No reference to the Declaration.
//
// Standpoints (admitted, English): anticolonial-{global,africa,india,caribbean} (21-anti-colonial by declared region), fp-{interviewees,authors,children,older,mentally-ill,colonized} (20-first-person-voices by declared
// `perspective`, groups with >= 5 documents), coraal-{dc,rochester,princeville} (the three CORAAL communities). A document is the SET of nouns it uses at least twice in its first 120 KB (noun = the English POS prior's
// NOUN/PROPN share >= 0.8 on >= 5 counts, or an accepted nominal of eng-prior-extension.json), length >= 3 letters.
// DISTINCTIVE for a standpoint G: nouns in at least 3 documents of G and in >= 10% of them, ranked by log2( (dfG/|G|) / (dfRest/|Rest|) ) with +0.5 smoothing, where Rest = all admitted documents NOT in G.
//
// PRE-REGISTERED before the run (2026-10-20):
//   PP1  HELD-OUT DISTINCTIVENESS. For each standpoint with >= 8 documents: split its documents in two halves (seeded); learn the top 15 distinctive nouns on half A; their mean log2 lift on the other half B (against Rest)
//        exceeds the MAXIMUM over 200 draws in which a pseudo-standpoint of the same size is drawn at random from ALL admitted documents and put through the same procedure.
//   PP2  reported: each standpoint's 20 most distinctive nouns learned on ALL its documents (the standpoint's own world, read by eye), with the share of its documents using each.
//   Caution fixed in advance: Rest is dominated by the largest group (anticolonial-global, 638 documents) so a standpoint is contrasted mostly with general anti-colonial writing; PROPN counts as noun so places and peoples
//   appear (author-specific names are screened by the 3-document and 10% floors and by PP1); period, genre and translation are not controlled.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { admitted } from "./perspective-gate.mjs";
const isEn = (l) => /^(en|english)\b/i.test(l ?? ""), TOK = /\p{L}+/gu, rd = (p) => readFileSync(p, "utf8");
const m = await modelOf("eng"), P = m.hearing.posPrior.forms, ext = JSON.parse(rd(new URL("./eng-prior-extension.json", import.meta.url))).entries;
const isNoun = (w) => { if (w.length < 3) return false; if (ext[w]) return ext[w].cls === "nominal"; const c = P[w]; if (!c) return false; const t = Object.values(c).reduce((a, b) => a + b, 0); return t >= 5 && ((c.NOUN ?? 0) + (c.PROPN ?? 0)) / t >= 0.8; };
const cache = new Map(), nounSet = (w) => { let v = cache.get(w); if (v === undefined) { v = isNoun(w); cache.set(w, v); } return v; };
const docSet = (text) => { const cnt = new Map(); for (const raw of text.slice(0, 120000).toLowerCase().match(TOK) ?? []) if (raw.length >= 3) cnt.set(raw, (cnt.get(raw) ?? 0) + 1); return new Set([...cnt].filter(([w, n]) => n >= 2 && nounSet(w)).map(([w]) => w)); };
const regionGroup = (r) => { r = (r ?? "").toLowerCase().split(/[;,(]/)[0].trim(); return /^(africa|south africa|egypt|algeria)$/.test(r) ? "africa" : r === "india" ? "india" : /^(caribbean|west indies|cuba)$/.test(r) ? "caribbean" : r === "global" ? "global" : null; };
const fpGroup = (v) => { v = (v ?? "").toLowerCase(); return /interviewees' own/.test(v) ? "interviewees" : /author's own/.test(v) ? "authors" : /^children/.test(v) ? "children" : /older people/.test(v) ? "older" : /mentally ill/.test(v) ? "mentally-ill" : /^colonized/.test(v) ? "colonized" : null; };
const groups = {}, add = (g, p, text) => (groups[g] ??= []).push({ p, set: docSet(text) });
for (const p of walk(join(ROOT, "21-anti-colonial"))) { const { meta, body } = frontmatter(rd(p)); if (!isEn(meta.language) || !admitted(p).admit) continue; const g = regionGroup(meta.region); if (g) add(`anticolonial-${g}`, p, gutenbergBody(body)); }
for (const p of walk(join(ROOT, "20-first-person-voices"))) { const { meta, body } = frontmatter(rd(p)); if (!isEn(meta.language) || !admitted(p).admit) continue; const g = fpGroup(meta.perspective); if (g) add(`fp-${g}`, p, gutenbergBody(body)); }
const w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : []));
for (const [dir, g] of [["dcb", "dc"], ["roc", "rochester"], ["prv", "princeville"]]) for (const p of w2(join(ROOT, "11-multi-language/dialects-pidgins-creoles/coraal", dir)).sort()) if (admitted(p).admit) add(`coraal-${g}`, p, rd(p).split("\n").filter((l) => !l.startsWith("#")).join("\n").replace(/\/[A-Za-z0-9-]+\//g, " ").replace(/<[^>]*>/g, " "));
const names = Object.keys(groups).filter((g) => groups[g].length >= 5), all = names.flatMap((g) => groups[g].map((d) => ({ g, ...d }))), dfAll = new Map(); for (const d of all) for (const w of d.set) dfAll.set(w, (dfAll.get(w) ?? 0) + 1);
console.log(JSON.stringify(Object.fromEntries(names.map((g) => [g, groups[g].length]))));
const df = (docs) => { const c = new Map(); for (const d of docs) for (const w of d.set) c.set(w, (c.get(w) ?? 0) + 1); return c; };
const learn = (docs, K, nPool, dfPool) => { const dg = df(docs), nR = nPool - docs.length; return [...dg].filter(([w, c]) => c >= 3 && c / docs.length >= 0.10).map(([w, c]) => [w, Math.log2(((c + 0.5) / (docs.length + 1)) / (((dfPool.get(w) ?? 0) - c + 0.5) / (nR + 1)))]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K); };
const heldOut = (A, B, K, nPool, dfPool) => { const top = learn(A, K, nPool, dfPool); if (!top.length) return null; const dB = df(B), nR = nPool - A.length; /* rest for B: the pool minus the whole group; approximated by pool minus A (B's own use is part of the group) */ return top.reduce((s, [w]) => s + Math.log2(((dB.get(w) ?? 0) + 0.5) / (B.length + 1) / (((dfPool.get(w) ?? 0) - (dB.get(w) ?? 0) - (df(A).get(w) ?? 0) + 0.5) / (nR - B.length + 1))), 0) / top.length; };
const rnd = mulberry(8), out = {};
for (const g of names) {
  const docs = groups[g], rest = all.filter((d) => d.g !== g), dfRest = df(rest), nRest = rest.length;
  const full = learn(docs, 20, all.length, dfAll), dG = df(docs);
  const report = { documents: docs.length, top20: full.map(([w, l]) => `${w} (x${(2 ** l).toFixed(1)}, ${((dG.get(w) / docs.length) * 100).toFixed(0)}% of docs)`) };
  if (docs.length >= 8) {
    const sh = shuffle(docs, rnd), half = sh.length >> 1, A = sh.slice(0, half), B = sh.slice(half), dfPoolFor = (pseudo) => dfAll; // pool df over everything; Rest is derived inside learn() by subtracting the group
    const score = (a, b, n) => { const top = learn(a, 15, all.length, dfAll); if (!top.length) return null; const dB = df(b), restN = all.length - n; return top.reduce((s, [w]) => { const inGroupB = dB.get(w) ?? 0; const dgA = df(a).get(w) ?? 0; return s + Math.log2(((inGroupB + 0.5) / (b.length + 1)) / (((dfAll.get(w) ?? 0) - dgA - inGroupB + 0.5) / (restN + 1))); }, 0) / top.length; };
    const real = score(A, B, docs.length), nulls = []; for (let i = 0; i < 200; i++) { const ps = shuffle(all, rnd).slice(0, docs.length), h = ps.length >> 1, v = score(ps.slice(0, h), ps.slice(h), ps.length); if (v != null) nulls.push(v); }
    report.PP1 = { heldOutMeanLog2Lift: +real.toFixed(2), nullMax: +Math.max(...nulls).toFixed(2), nullMean: +(nulls.reduce((a, b) => a + b, 0) / nulls.length).toFixed(2), holds: real > Math.max(...nulls) };
  } else report.PP1 = "not judged: fewer than 8 documents";
  out[g] = report;
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([g, r]) => [g, { docs: r.documents, PP1: r.PP1 }])), null, 0));
writeFileSync(new URL("./perspective-profiles-report.json", import.meta.url), JSON.stringify({ groups: Object.fromEntries(names.map((g) => [g, groups[g].length])), out }, null, 1) + "\n");
for (const [g, r] of Object.entries(out)) console.log(`\n${g} (${r.documents} docs):`, r.top20.slice(0, 14).join(", "));
