// udhr-core/lived-read.mjs — READ the lived-experience material we have in the languages we can read, against the Declaration, and settle its unknown words.
//
// Jobs (what the repo actually holds; see inventory-lived.mjs):
//   coraal  English. 55 CORAAL interview excerpts (African American speakers, DC, Princeville NC, Rochester NY; CC BY-NC-SA 4.0, read locally, nothing redistributed). The '#' header is
//           dropped, redaction tags like /RD-ADDRESS-3/ are removed, and each speech turn (one line) is one paragraph. Neutral comparison: the same English novels as ring 1.
//   spa     Spanish. 7 first-person documents (Sor Juana, Dario x2, Marti, Rizal, Gorriti, + the 21-anti-colonial one): literary 19th-century first-person writing, NOT testimony.
//   por     Portuguese. 4 documents (Machado de Assis): literary, pre-reform spelling.
//   (Haitian: no lived-experience text in the repo; the MIT-Ayiti corpus is educational. 19-organic-community is chat, SMS and email: not lived experience of the dispossessed.)
//
// PRE-REGISTERED before the first run (2026-10-20):
//   C1  (coraal) the CORAAL profile differs from the novels' profile: total-variation distance above the MAXIMUM over 200 draws that reassign documents between the two (sizes kept).
//   C2  (coraal) REPLICATION of ring 1 on independent material: of the five units first-person voices over-indexed in ring 1 (4, 16, 23, 25, 27), at least 3 have a CORAAL share above the
//       novels' share in at least 190 of 200 bootstrap resamples of documents.
//   C3  (all jobs) the language's sniff accepts at least 50% of the unknown words (>= 2 mentions) it is asked about.
//   C4  (spa, por) NO test is claimed: 7 and 4 documents cannot support a permutation test. They are described (units above the neutral Gutenberg profile of 60 documents of the
//       same language) and labelled descriptive.
//   Caveats fixed in advance: spoken turns are much shorter than novel paragraphs, so a profile difference can be register; the Spanish model has no independent second UDHR edition
//   (so the held-out positive control of ring1.mjs cannot be run for it); the Portuguese Declaration model (por_BR) passed that control in ring 1; CORAAL words are dialectal, where the
//   English sniff (trained on web text) has not been tested.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { modelOf, profileDocument, meanOf, tv, permutationTest, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT, tokensOf } from "./ring1.mjs";
import { isUnknownWord } from "./read-beings.mjs";
import { sniff } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", rnd = mulberry(29), TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const embed = async (texts) => { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const rd = (p) => readFileSync(p, "utf8");
const coraalDir = join(ROOT, "11-multi-language/dialects-pidgins-creoles/coraal");
const coraal = walk2(coraalDir).map((p) => rd(p).split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.replace(/\/[A-Za-z0-9-]+\//g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).filter((l) => l.length > 3).join("\n\n"));
function walk2(d) { return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : [])); }
const fp = (names) => names.map((n) => gutenbergBody(frontmatter(rd(join(ROOT, "20-first-person-voices", n))).body));
const lang = (l) => walk(join(ROOT, "20-first-person-voices")).map((p) => ({ p, ...frontmatter(rd(p)) })).filter((d) => new RegExp(`^${l}\\b`, "i").test(d.meta.language ?? "")).map((d) => gutenbergBody(d.body));
const spaDocs = [...lang("es"), ...walk(join(ROOT, "21-anti-colonial")).map((p) => ({ p, ...frontmatter(rd(p)) })).filter((d) => /^es\b/i.test(d.meta.language ?? "")).map((d) => gutenbergBody(d.body))], porDocs = lang("pt");
const sample = (dir, n) => shuffle(walk(join(ROOT, dir)).sort(), rnd).slice(0, n).map((p) => gutenbergBody(frontmatter(rd(p)).body));
const known = (t, P) => { const w = t.slice(0, 200000).toLowerCase().match(TOK) ?? []; return w.length ? w.filter((x) => P[x]).length / w.length : 0; };

async function job(name, stem, lived, neutral, sniffFile, extFile, test) {
  const m = await modelOf(stem), P = m.hearing.posPrior, model = JSON.parse(rd(new URL(`./${sniffFile}`, import.meta.url))), out = { job: name, livedDocs: lived.length, neutralDocs: neutral.length };
  const prof = (docs) => docs.map((t) => profileDocument(t, m)).filter(Boolean).map((r) => r.profile), L = prof(lived), N = prof(neutral);
  out.profiled = { lived: L.length, neutral: N.length }; const mL = meanOf(L), mN = meanOf(N);
  out.overIndexed = mL.map((x, u) => ({ u, share: x, ratio: mN[u] ? x / mN[u] : null })).filter((x) => x.ratio).sort((a, b) => b.ratio - a.ratio).slice(0, 8).map((x) => `${x.u === 0 ? "preamble" : "art " + x.u}×${x.ratio.toFixed(2)}`).join(", ");
  if (test) {
    out.C1 = permutationTest(L, N);
    const rr = mulberry(31), boot = (a) => Array.from({ length: a.length }, () => a[Math.floor(rr() * a.length)]), wins = Object.fromEntries([4, 16, 23, 25, 27].map((u) => [u, 0]));
    for (let i = 0; i < 200; i++) { const a = meanOf(boot(L)), b = meanOf(boot(N)); for (const u of [4, 16, 23, 25, 27]) if (a[u] > b[u]) wins[u]++; }
    out.C2 = { wins, unitsReplicated: Object.values(wins).filter((w) => w >= 190).length, holds: Object.values(wins).filter((w) => w >= 190).length >= 3 };
  } else out.descriptiveOnly = "C4: too few documents for a permutation test; the over-indexed list is a description, not a finding";
  // unknown words
  const st = new Map(), sent = new Map(); let tokens = 0, blind = 0;
  for (const t of lived) { const seen = new Set(); for (const s of t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) { const raws = s.match(TOK) ?? []; tokens += raws.length; for (const raw of raws) { const w = raw.toLowerCase(); if (!isUnknownWord(P, w)) continue; blind++; if (raw !== w || !/^\p{Ll}{3,}$/u.test(w)) continue; const e = st.get(w) ?? { n: 0, d: 0 }; e.n++; if (!seen.has(w)) { e.d++; seen.add(w); } st.set(w, e); if (!sent.has(w) && raws.length >= 6 && raws.length <= 40) sent.set(w, s); } } }
  const queue = [...st].filter(([w, e]) => e.n >= 2 && sent.has(w)).sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1)).slice(0, 2000), votes = [];
  for (let i = 0; i < queue.length; i += 8) votes.push(...(await Promise.all(queue.slice(i, i + 8).map(([w, e]) => sniff(model, P, w, sent.get(w), embed).then((v) => ({ ...v, mentions: e.n }), () => null)))).filter(Boolean));
  const acc = votes.filter((v) => v.accept);
  out.unknownWords = { priorBlindTokenFraction: +(blind / tokens).toFixed(3), tokens, distinctUnknown: st.size, asked: queue.length, accepted: acc.length, C3: { share: queue.length ? +(acc.length / queue.length).toFixed(3) : null, holds: queue.length > 0 && acc.length / queue.length >= 0.5 }, nominal: acc.filter((v) => v.cls === "nominal").length, other: acc.filter((v) => v.cls === "other").length, sampleNominal: acc.filter((v) => v.cls === "nominal").slice(0, 14).map((v) => v.word).join(" "), sampleOther: acc.filter((v) => v.cls === "other").slice(0, 14).map((v) => v.word).join(" ") };
  writeFileSync(new URL(`./${extFile}`, import.meta.url), JSON.stringify({ schema: "POSPriorExtension@1", language: name, provenance: { corpus: "lived-experience read (lived-read.mjs)", sniff: sniffFile, threshold: model.threshold }, entries: Object.fromEntries(acc.map((v) => [v.word, { cls: v.cls, score: v.score, mentions: v.mentions, source: "sniff" }])), pending: votes.filter((v) => !v.accept).map((v) => v.word) }) + "\n");
  return out;
}
const mE = await modelOf("eng"), novels = walk(join(ROOT, "01-literature-books")).map((p) => gutenbergBody(frontmatter(rd(p)).body)).filter((t) => known(t, mE.hearing.posPrior.forms) >= 0.5);
const results = [await job("coraal", "eng", coraal, novels, "sniff-eng2.json", "coraal-prior-extension.json", true), await job("spa", "spa", spaDocs, sample("24-global-literature/es", 60), "sniff-spa2.json", "spa-lived-extension.json", false), await job("por", "por_BR", porDocs, sample("24-global-literature/pt", 60), "sniff-por2.json", "por-lived-extension.json", false)];
console.log(JSON.stringify(results, null, 1)); writeFileSync(new URL("./lived-read-report.json", import.meta.url), JSON.stringify(results, null, 1) + "\n");
