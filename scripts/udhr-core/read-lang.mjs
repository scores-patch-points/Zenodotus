// udhr-core/read-lang.mjs — READ a language's text and settle the words its POS prior does not know, with that language's sniff. Usage:
//   node read-lang.mjs <udhr-stem> <sniff-model.json> <lang-code> <docs-dir under Zenodotus> <out-extension.json> <word-regex>
// e.g. node read-lang.mjs spa sniff-spa.json es 24-global-literature/es spa-prior-extension.json '^[a-zñáéíóúü]{4,}$'
// Same shape as ring1-read.mjs, language-agnostic: 200 shuffled documents (first 120 KB), unknown = isUnknownWord(prior, w) on lower-case word forms,
// the 3,000 highest by mentions x documents (>= 5 mentions in >= 3 documents), ONE real sentence each, accepted only above the model's threshold.
// The prior is not touched; the extension is a separate file marked source "sniff", revisable.
// PRE-REGISTERED for the Spanish literature read (2026-10-19): R1 at least 50% of the 3,000 accepted; R2 (read-lang-check.mjs): 30 accepted words drawn
// at random, those with a PURE en.wiktionary.org list in the language agree with the sniff in at least 85%; R3 reported: class split, the prior's blind
// token fraction on this text, the mention share the accepted words cover. NOT ring 1: these are general Spanish literature, not the voices ring 1 is for.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { isUnknownWord } from "./read-beings.mjs";
import { sniff } from "./sniff.mjs";

const [stem, modelFile, code, dir, outFile, wordRe] = process.argv.slice(2); if (!outFile) throw new Error("usage: see header");
const WORD = new RegExp(wordRe, "u"), OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const model = JSON.parse(readFileSync(new URL(`./${modelFile}`, import.meta.url), "utf8"));
const m = await modelOf(stem); if (!m) throw new Error(`no UDHR model for ${stem}`);
const P = m.hearing.posPrior, TOK = /\p{L}+(?:['’]\p{L}+)?/gu, rnd = mulberry(23);
const files = shuffle(walk(join(ROOT, dir)).sort(), rnd).slice(0, 200);
const stats = new Map(), sentences = new Map(); let tokens = 0, blind = 0;
for (const p of files) {
  const { body } = frontmatter(readFileSync(p, "utf8")), seen = new Set();
  for (const s of gutenbergBody(body).slice(0, 120000).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    const raws = s.match(TOK) ?? []; tokens += raws.length;
    for (const raw of raws) {
      const w = raw.toLowerCase(); if (!isUnknownWord(P, w)) continue; blind++;
      if (raw !== w || !WORD.test(w)) continue;
      const st = stats.get(w) ?? { mentions: 0, docs: 0 }; st.mentions++; if (!seen.has(w)) { st.docs++; seen.add(w); } stats.set(w, st);
      if (!sentences.has(w) && raws.length >= 6 && raws.length <= 40) sentences.set(w, s);
    }
  }
}
const queue = [...stats].filter(([w, s]) => s.mentions >= 5 && s.docs >= 3 && sentences.has(w)).sort((a, b) => b[1].mentions * b[1].docs - a[1].mentions * a[1].docs || (a[0] < b[0] ? -1 : 1)).slice(0, 3000).map(([w, s]) => ({ word: w, ...s }));
const votes = [], skipped = [];
for (let i = 0; i < queue.length; i += 8) votes.push(...(await Promise.all(queue.slice(i, i + 8).map((n) => sniff(model, P, n.word, sentences.get(n.word), embed).then((v) => ({ ...v, mentions: n.mentions, docs: n.docs }), (e) => { skipped.push(n.word); return null; })))).filter(Boolean));
const accepted = votes.filter((v) => v.accept), pending = votes.filter((v) => !v.accept);
const ext = { schema: "POSPriorExtension@1", language: code, base: `${stem} POS prior (janus), untouched`, provenance: { corpus: dir, sniff: modelFile, threshold: model.threshold, scannedDocs: files.length }, entries: Object.fromEntries(accepted.map((v) => [v.word, { cls: v.cls, score: v.score, mentions: v.mentions, docs: v.docs, source: "sniff" }])), pending: pending.map((v) => v.word) };
writeFileSync(new URL(`./${outFile}`, import.meta.url), JSON.stringify(ext) + "\n");
const msum = (xs) => xs.reduce((a, v) => a + v.mentions, 0), top = (c) => accepted.filter((v) => v.cls === c).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 20).map((v) => v.word).join(" ");
console.log(JSON.stringify({ docs: files.length, tokens, priorBlindTokenFraction: +(blind / tokens).toFixed(3), distinctUnknownLowercase: stats.size, queue: queue.length, skipped: skipped.length, R1: { accepted: accepted.length, share: +(accepted.length / queue.length).toFixed(3), holds: accepted.length / queue.length >= 0.5 }, R3: { nominal: accepted.filter((v) => v.cls === "nominal").length, other: accepted.filter((v) => v.cls === "other").length, mentionShare: +(msum(accepted) / msum(queue)).toFixed(3), topNominal: top("nominal"), topOther: top("other") }, extensionSha: createHash("sha256").update(JSON.stringify(ext)).digest("hex").slice(0, 16) }, null, 1));
