// udhr-core/read-hat.mjs — READ real Haitian Creole text and settle the words the Haitian POS prior does not know, with the Haitian sniff (sniff-hat2.json).
// Text: the MIT-Ayiti corpus staged in CreoleVal (Zenodotus/11-multi-language/dialects-pidgins-creoles/creoleval/mt_mit_haiti): the Haitian sides of
// children's-story translations (ht-en.trg, ht-fr.trg, ht-es.trg) and a monolingual sample of lesson plans and blog posts. Read locally, nothing redistributed.
// The Haitian prior is hat_kreyol's (janus); the extension is a separate file and the prior is not touched.
//
// PRE-REGISTERED before the first run (2026-10-20). The corpus is small (about 250 KB), so unknown = lower-case alphabetic word of >= 3 letters that
// isUnknownWord(prior, w) flags, with >= 2 mentions (not the >= 5 mentions in >= 3 documents of the large corpora), one real sentence each (6-40 tokens):
//   H1  at least 50% of the queue is accepted at sniff-hat2's threshold (0.801).
//   H2  (read-lang-check.mjs, run next, Haitian section "ht") 30 accepted words drawn at random: those with a PURE Wiktionary list agree with the sniff in >= 85%.
//   H3  reported: the prior's blind token fraction on this text; the prior's source kind; how many of the 30 checked words have ANY Haitian entry on en.wiktionary.org
//       (expected low: Haitian is thinly covered, so H2 may rest on few words and says so).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { modelOf } from "./ring1.mjs";
import { isUnknownWord, priorKind } from "./read-beings.mjs";
import { sniff } from "./sniff.mjs";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const model = JSON.parse(readFileSync(new URL("./sniff-hat2.json", import.meta.url), "utf8")), m = await modelOf("hat_kreyol"); if (!m) throw new Error("no Haitian UDHR model");
const P = m.hearing.posPrior, D = new URL("../Zenodotus/11-multi-language/dialects-pidgins-creoles/creoleval/mt_mit_haiti/", import.meta.url).pathname, TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const lines = ["ht-en.trg", "ht-fr.trg", "ht-es.trg", "ht_monolingual_sample.txt"].flatMap((f) => readFileSync(D + f, "utf8").split("\n").map((l) => l.replace(/^\d+\t/, "").trim()).filter((l) => l.length > 10));
let tokens = 0, blind = 0; const stats = new Map(), sent = new Map();
for (const s of lines) { const raws = s.match(TOK) ?? []; tokens += raws.length; for (const raw of raws) { const w = raw.toLowerCase(); if (!isUnknownWord(P, w)) continue; blind++; if (raw !== w || !/^\p{Ll}{3,}$/u.test(w)) continue; stats.set(w, (stats.get(w) ?? 0) + 1); if (!sent.has(w) && raws.length >= 6 && raws.length <= 40) sent.set(w, s); } }
const queue = [...stats].filter(([w, n]) => n >= 2 && sent.has(w)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w, n]) => ({ word: w, mentions: n })), votes = [], skipped = [];
for (let i = 0; i < queue.length; i += 8) votes.push(...(await Promise.all(queue.slice(i, i + 8).map((n) => sniff(model, P, n.word, sent.get(n.word), embed).then((v) => ({ ...v, mentions: n.mentions }), () => { skipped.push(n.word); return null; })))).filter(Boolean));
const accepted = votes.filter((v) => v.accept);
writeFileSync(new URL("./hat-prior-extension.json", import.meta.url), JSON.stringify({ schema: "POSPriorExtension@1", language: "ht", base: "hat_kreyol POS prior (janus), untouched", provenance: { corpus: "MIT-Ayiti (CreoleVal mt_mit_haiti)", sniff: "sniff-hat2.json", threshold: model.threshold }, entries: Object.fromEntries(accepted.map((v) => [v.word, { cls: v.cls, score: v.score, mentions: v.mentions, source: "sniff" }])), pending: votes.filter((v) => !v.accept).map((v) => v.word) }) + "\n");
const top = (c) => accepted.filter((v) => v.cls === c).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 20).map((v) => v.word).join(" ");
console.log(JSON.stringify({ lines: lines.length, tokens, priorKind: priorKind(P), priorBlindTokenFraction: +(blind / tokens).toFixed(3), distinctUnknownLowercase: stats.size, queue: queue.length, skipped: skipped.length, H1: { accepted: accepted.length, share: +(accepted.length / queue.length).toFixed(3), holds: accepted.length / queue.length >= 0.5 }, split: { nominal: accepted.filter((v) => v.cls === "nominal").length, other: accepted.filter((v) => v.cls === "other").length }, topNominal: top("nominal"), topOther: top("other") }, null, 1));
