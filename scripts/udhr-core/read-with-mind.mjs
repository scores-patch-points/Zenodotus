// udhr-core/read-with-mind.mjs — READ a text with the mind as priors. Local, non-destructive (writes only a report), no model beyond the local embedder for the sniff.
// Usage: node read-with-mind.mjs <udhr-stem> <sniff-model.json> <text file> [--max 60000] [--log ../mnemosyne/mind.eot] [--out report.json]
//
// What it uses, and with what standing (every prior is loaded by mind-priors.mjs, which recomputes each domain's root from the artifacts and withholds a mismatch):
//   the Declaration's charter (udhr-core, "given" for the stated relations, "candidate" for the interpretive ones): which referents (units) each paragraph speaks to, from the language's own UDHR
//     edition (ring1.mjs scoreTokens), and which relations of the charter join the units a paragraph speaks to;
//   ring1-english over-indexed units and ring1-associates (English only, "candidate"): reported beside, never mixed into, the charter's votes;
//   the language's sniff for the words its POS prior does not know ("revisable pressure": accepted only above the model's threshold).
// THE DECLARATION IS ONE GROUND, NOT THE ONLY ONE (user, 2026-10-20: "it's just where we started"). Two grounds are reported apart:
//   (1) the Declaration: a paragraph "speaks to" a unit only if its best idf-cosine beats the 95th percentile of a NULL made from the text itself (its own words shuffled across its
//       own paragraph slots, 30 times); otherwise the paragraph is counted as NOT concentrating on any unit, not assigned one. NOTE: about 5% of paragraphs pass by chance BY CONSTRUCTION, so a rate
//       near 5% means no concentration beyond the text's own word mix; it does NOT mean the text is unrelated to the Declaration. Text-level relevance is the other number: the share of the
//       text's tokens that are the Declaration edition's recurring beings, against the same share in neutral text of the same language (--ref <dir under Zenodotus>);
//   (2) the text's OWN beings: the stack's ear (heardNominals) over the text's paragraphs, with no reference to the Declaration at all.
// Nothing here is a verdict. It prints WHAT the reading rests on, so a reader can discount it.
import { readFileSync, writeFileSync } from "node:fs";
import { loadMind } from "./mind-priors.mjs";
import { modelOf, scoreTokens, tokensOf } from "./ring1.mjs";
import { isUnknownWord } from "./read-beings.mjs";
import { sniff } from "./sniff.mjs";
const K = new URL("../../../khora/native/", import.meta.url).pathname;
const { heardNominals } = await import(K + "adapters/text/heard-nominals.js");
const argv = process.argv.slice(2), [stem, sniffFile, textFile] = argv, opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
if (!textFile) throw new Error("usage: node read-with-mind.mjs <udhr-stem> <sniff-model.json> <text file> [--max N] [--log path] [--out path]");
const MAX = +opt("--max", 60000), LOG = opt("--log", "../../../mnemosyne/mind.eot"), TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const unitName = (u) => (u === 0 ? "preamble" : `art ${u}`);

const mind = await loadMind({ logPath: LOG, deep: true }), m = await modelOf(stem), sm = JSON.parse(readFileSync(new URL(`./${sniffFile}`, import.meta.url), "utf8"));
let text = readFileSync(textFile, "utf8").replace(/^---\n[\s\S]*?\n---\n/, ""); const sGut = /\*\*\* ?START OF[^\n]*\n/.exec(text); if (sGut) text = text.slice(sGut.index + sGut[0].length); text = text.slice(0, MAX);
let blocks = text.split(/\n\s*\n/); if (blocks.length < 5) blocks = text.split(/\n/);                        // a file with no blank lines is read line by line
const paras = blocks.map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => (p.match(TOK) ?? []).length >= 8);
const items = paras.map((p) => { const toks = tokensOf(p, m.hearing.ear), sc = scoreTokens(toks, m); return { p, toks, sc, max: sc ? Math.max(...sc.s) : 0 }; });
// null: the text's own words dealt across its own paragraph slots
const pool = items.flatMap((x) => x.toks), lens = items.map((x) => x.toks.length), rnd = (() => { let a = 20261020; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const nullMax = []; for (let r = 0; r < 30; r++) { const sh = pool.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } let o = 0; for (const n of lens) { const sc = scoreTokens(sh.slice(o, o + n), m); o += n; nullMax.push(sc ? Math.max(...sc.s) : 0); } }
nullMax.sort((a, b) => a - b); const thr = nullMax[Math.floor(nullMax.length * 0.95)] ?? 0;
const sum = new Array(31).fill(0), perPara = []; let W = 0, speaks = 0;
for (const it of items) {
  const { p, toks, sc } = it; if (!sc) continue; const tot = sc.s.reduce((a, b) => a + b, 0); if (!tot || it.max <= thr) continue;      // speaks to NO Declaration referent
  speaks++; W += sc.mass; sc.s.forEach((x, u) => (sum[u] += sc.mass * (x / tot)));
  const top = sc.s.map((x, u) => [u, x / tot]).sort((a, b) => b[1] - a[1]).slice(0, 2).filter((x) => x[1] >= 0.12);
  const assoc = mind.associates ? [...new Set(toks)].filter((w) => mind.associates.byWord.has(w)).map((w) => `${w}→${mind.associates.byWord.get(w).map((x) => unitName(x.unit)).join("/")}`) : [];
  perPara.push({ text: p.slice(0, 110), top: top.map(([u, s]) => `${unitName(u)} ${(s * 100).toFixed(0)}%`), associates: assoc });
}
const own = heardNominals(paras, { posPrior: m.hearing.posPrior, framePrior: m.hearing.framePrior, segment: m.hearing.ear?.segment ?? null, peel: m.hearing.ear?.peel ?? null, minMentions: 3, nameShare: 0.5 }).slice().sort((a, b) => b.mentions - a.mentions).slice(0, 18).map((b) => `${b.surface}:${b.mentions}`);
const beingsAll = new Set(m.B.flatMap((b) => [...b])), vocab = (t) => { const w = tokensOf(t, m.hearing.ear); return w.length ? w.filter((x) => beingsAll.has(x)).length / w.length : 0; };
let refShare = null; const refDir = opt("--ref", null);
if (refDir) { const { walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } = await import("./ring1.mjs"), { join } = await import("node:path"); const fs = walk(join(ROOT, refDir)).sort(), pick = shuffle(fs, mulberry(5)).slice(0, 15); const v = pick.map((p) => vocab(gutenbergBody(frontmatter(readFileSync(p, "utf8")).body).slice(0, 80000))); refShare = v.reduce((a, b) => a + b, 0) / v.length; }
const profile = sum.map((x) => x / (W || 1)), ranked = profile.map((x, u) => [u, x]).sort((a, b) => b[1] - a[1]), topUnits = ranked.slice(0, 5).map(([u]) => u);
const rel = (mind.charter?.relations ?? []).filter((r) => { const ids = [r.left, r.right].join(" "); return topUnits.some((u) => new RegExp(`(article:${u}\\b|preamble)`).test(ids) && u !== 0 ? true : u === 0 && /preamble/.test(ids)); }).slice(0, 8).map((r) => `${r.kind}: ${String(r.left).replace("ref:udhr:", "")} → ${String(r.right).replace("ref:udhr:", "")} [${r.standing ?? "?"}]`);
const oi = mind.overIndexed, voices = oi ? { ac: topUnits.filter((u) => oi.ac.includes(u)), fp: topUnits.filter((u) => oi.fp.includes(u)), cr: topUnits.filter((u) => oi.cr.includes(u)) } : null;
// unknown words
const stats = new Map(), sent = new Map(); let tokens = 0, blind = 0;
for (const s of text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) { const raws = s.match(TOK) ?? []; tokens += raws.length; for (const raw of raws) { const w = raw.toLowerCase(); if (!isUnknownWord(m.hearing.posPrior, w)) continue; blind++; if (raw !== w || !/^\p{Ll}{3,}$/u.test(w)) continue; stats.set(w, (stats.get(w) ?? 0) + 1); if (!sent.has(w) && raws.length >= 6 && raws.length <= 40) sent.set(w, s); } }
const queue = [...stats].filter(([w, n]) => n >= 2 && sent.has(w)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 40), unk = [];
for (let i = 0; i < queue.length; i += 8) unk.push(...(await Promise.all(queue.slice(i, i + 8).map(([w, n]) => sniff(sm, m.hearing.posPrior, w, sent.get(w), embed).then((v) => ({ word: w, n, cls: v.cls, score: v.score, accepted: v.accept }), () => null)))).filter(Boolean));
// (3) the co-core charters, each a ground of its own (charters/ground.mjs): which provisions a paragraph speaks to beyond the text's null, or none. Reported apart from (1) and (2).
const charterGrounds = [];
if (mind.charters) { const { charterModel, speaksTo } = await import("./charters/ground.mjs"); for (const [c, v] of Object.entries(mind.charters)) { const cm = await charterModel(c, stem, v.provisions); charterGrounds.push(cm.gap ? { charter: c, gap: cm.gap } : speaksTo(paras, cm)); } }
const report = {
  text: textFile.split("/").slice(-1)[0], paragraphsRead: perPara.length, tokens, language: stem,
  core: mind.core,
  rests_on: Object.fromEntries(Object.entries(mind.domains).map(([k, v]) => [k, v.verified ? `verified ${v.root.slice(0, 12)}` : `withheld (${v.reason})`])),
  declaration: { declarationVocabularyShare: +vocab(text).toFixed(4), referenceShare: refShare == null ? null : +refShare.toFixed(4), ratioToReference: refShare ? +(vocab(text) / refShare).toFixed(2) : null, paragraphsConcentratedBeyondNull: `${speaks} of ${paras.length}`, chanceLevel: "about 5% by construction (95th percentile of the text's own shuffled words); a rate near 5% means no concentration beyond the text's own word mix, NOT that the text is unrelated to the Declaration", nullThreshold: +thr.toFixed(3), speaksTo: speaks ? ranked.slice(0, 6).map(([u, x]) => `${unitName(u)} ${(x * 100).toFixed(1)}%`) : [] },
  charters: { rests_on: mind.coCore ?? null, grounds: charterGrounds },
  ownBeings: own,
  charterRelationsJoiningThoseUnits: speaks ? rel : [],
  sharedWithAdmittedVoices: voices, 
  priorBlindTokenFraction: +(blind / tokens).toFixed(3),
  unknownWords: { asked: unk.length, accepted: unk.filter((x) => x.accepted).length, sample: unk.slice(0, 12).map((x) => `${x.word}:${x.cls}${x.accepted ? "" : "?"}`).join(" ") },
  examples: perPara.filter((p) => p.top.length).slice(0, 4),
};
console.log(JSON.stringify(report, null, 1)); const out = opt("--out", null); if (out) writeFileSync(out, JSON.stringify({ report, perParagraph: perPara }, null, 1) + "\n");
