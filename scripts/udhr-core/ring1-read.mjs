// udhr-core/ring1-read.mjs — READ the English ring-1 corpora: settle the unknown words they raise, with the sniff, and write what was learned as an
// EXTENSION to the English POS prior. The prior itself is not touched (non-destructive); a reader that wants the extension layers it on.
//
// Population: the 3,000 highest-priority needs (mentions x documents, lower-case alphabetic, >= 5 mentions in >= 3 documents) saved by ring1-reentry.mjs.
// Each word gets ONE real ring-1 sentence containing it, is sniffed by sniff.mjs (a word the prior knows is refused), and is ACCEPTED only above the
// model's saved threshold. Accepted votes enter the extension as source "sniff", revisable; everything else is listed as pending for a lookup.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   R1  Coverage: at least 50% of the 3,000 are accepted (the treebank test accepted 65% of occurrences; ring-1 text is a different domain, so a lower
//       share is expected and a share under 50% means the domain shift costs more than half the saving).
//   R2  Domain check (ring1-read-check.mjs, run next): on 40 accepted words drawn AT RANDOM, those whose Wiktionary list is pure agree with the sniff in
//       at least 85% of cases. (The treebank-domain accuracy above the threshold was 89.6%.)
//   R3  Reported, not claimed: the class split, the share of the 3,000's mentions that accepted words cover, and the 25 highest-margin words of each class.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { sniff } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const model = JSON.parse(readFileSync(new URL("./sniff-eng.json", import.meta.url), "utf8"));
const queue = JSON.parse(readFileSync(new URL("./ring1-reentry-report.json", import.meta.url), "utf8")).queue;
const m = await modelOf("eng"), P = m.hearing.posPrior;
const want = new Set(queue.map((n) => n.surface)), ctx = new Map(), TOK = /\p{L}+(?:['’]\p{L}+)?/gu, isEn = (l) => /^(en|english)\b/i.test(l ?? "");
let docs = 0;
for (const p of shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))), mulberry(13))) {
  if (ctx.size >= want.size || docs >= 1400) break;
  const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language)) continue; docs++;
  for (const s of gutenbergBody(body).slice(0, 120000).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    const toks = s.match(TOK) ?? []; if (toks.length < 6 || toks.length > 40) continue;
    for (const w of new Set(toks.map((t) => t.toLowerCase()))) if (want.has(w) && !ctx.has(w)) ctx.set(w, s);
  }
}
const todo = queue.filter((n) => ctx.has(n.surface)); const votes = [], skipped = [];
for (let i = 0; i < todo.length; i += 8) votes.push(...(await Promise.all(todo.slice(i, i + 8).map((n) => sniff(model, P, n.surface, ctx.get(n.surface), embed).then((v) => ({ ...v, mentions: n.mentions, docs: n.units }), (e) => { skipped.push(`${n.surface}: ${e.message.slice(0, 60)}`); return null; })))).filter(Boolean));
const accepted = votes.filter((v) => v.accept), pending = votes.filter((v) => !v.accept);
const entries = Object.fromEntries(accepted.map((v) => [v.word, { cls: v.cls, score: v.score, mentions: v.mentions, docs: v.docs, source: "sniff" }]));
const ext = { schema: "POSPriorExtension@1", language: "eng", base: "english POS prior (janus), untouched", provenance: { corpora: "Zenodotus 21-anti-colonial and 20-first-person-voices, English", sniff: "sniff-eng.json (UD English-EWT, nomic-embed-text deltas + word ending)", threshold: model.threshold, scannedDocs: docs }, entries, pending: pending.map((v) => v.word) };
writeFileSync(new URL("./eng-prior-extension.json", import.meta.url), JSON.stringify(ext) + "\n");
const mentionSum = (xs) => xs.reduce((a, v) => a + v.mentions, 0), top = (c) => accepted.filter((v) => v.cls === c).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 25).map((v) => v.word).join(" ");
const out = {
  queue: queue.length, withContext: todo.length, skippedUnmatched: skipped.length, skippedExamples: skipped.slice(0, 3), scannedDocs: docs,
  R1_coverage: { accepted: accepted.length, share: +(accepted.length / queue.length).toFixed(3), minimum: 0.5, holds: accepted.length / queue.length >= 0.5 },
  R3: { nominal: accepted.filter((v) => v.cls === "nominal").length, other: accepted.filter((v) => v.cls === "other").length, mentionShareCoveredOfTop3000: +(mentionSum(accepted) / mentionSum(todo)).toFixed(3), topNominal: top("nominal"), topOther: top("other") },
  extensionBytes: JSON.stringify(ext).length, extensionSha: createHash("sha256").update(JSON.stringify(ext)).digest("hex").slice(0, 16),
};
console.log(JSON.stringify(out, null, 1));
