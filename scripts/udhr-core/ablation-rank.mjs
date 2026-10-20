// udhr-core/ablation-rank.mjs — rank ring 1's unknown-word needs by ablation confidence, then spot-check the confident ones against Wiktionary.
//
// Population: the 500 highest-priority needs saved in ring1-reentry-report.json (mentions x documents, lower-case alphabetic). Each word gets ONE real
// ring-1 sentence (the live case), a delta, and a vote from the treebank centroids (ablation-treebank-centroids.json). Network: en.wiktionary.org only,
// one request per PACE ms, the existing cache, 30 words in total. Nothing is written to the mind log.
//
// PRE-REGISTERED before the run (2026-10-19):
//   S1  Spot-check set = the 15 highest-margin words voted NOMINAL and the 15 highest-margin voted OTHER (selection uses margin only, never the answer).
//       A word is scored only if Wiktionary's English entry is PURE (every listed POS nominal, or none nominal); mixed words are counted and set aside.
//   S2  Claim: accuracy over the scored words exceeds the MAXIMUM over 200 label shuffles of those words, AND exceeds the 0.748 all-margin treebank
//       accuracy (T1). Power is low at n = 30; a miss means "not shown at this n", a hit means "consistent with the treebank calibration".
//   S3  Reported: the 500-word vote split, and where the high-margin words concentrate (names and place words vs abstract nouns).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { entry } from "./wiktionary-pilot.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11435") + "/api/embed", MASK = "___", rnd = mulberry(5);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
const C = JSON.parse(readFileSync(new URL("./ablation-treebank-centroids.json", import.meta.url)));
const queue = JSON.parse(readFileSync(new URL("./ring1-reentry-report.json", import.meta.url))).queue.map((n) => n.surface).filter((w) => /^[a-z]{3,}$/.test(w));
const want = new Set(queue), ctx = new Map(), TOK = /\p{L}+(?:['’]\p{L}+)?/gu, isEn = (l) => /^(en|english)\b/i.test(l ?? "");
let docs = 0;
for (const p of shuffle(walk(join(ROOT, "21-anti-colonial")).concat(walk(join(ROOT, "20-first-person-voices"))), rnd)) {
  if (docs >= 300) break;
  const { meta, body } = frontmatter(readFileSync(p, "utf8")); if (!isEn(meta.language)) continue; docs++;
  for (const s of gutenbergBody(body).slice(0, 80000).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
    const toks = s.match(TOK) ?? []; if (toks.length < 6 || toks.length > 40) continue;
    for (const w of new Set(toks.map((t) => t.toLowerCase()))) if (want.has(w) && !ctx.has(w)) ctx.set(w, s);
  }
}
const words = queue.filter((w) => ctx.has(w));
const mask = (s, w) => s.replace(new RegExp(`\\b${w}\\b`, "i"), MASK);
const A = (await embed(words.map((w) => ctx.get(w)))).map(norm), B = (await embed(words.map((w) => mask(ctx.get(w), w)))).map(norm);
const votes = words.map((w, i) => { const d = norm(A[i].map((v, j) => v - B[i][j])), a = cos(d, C.centroids.nominal), b = cos(d, C.centroids.other); return { word: w, cls: a >= b ? "nominal" : "other", margin: Math.abs(a - b) }; });
const top = (cls) => votes.filter((v) => v.cls === cls).sort((a, b) => b.margin - a.margin).slice(0, 15);
const check = [...top("nominal"), ...top("other")];
console.log(JSON.stringify({ needsWithContext: words.length, voteSplit: { nominal: votes.filter((v) => v.cls === "nominal").length, other: votes.filter((v) => v.cls === "other").length }, spotCheck: check.map((v) => `${v.word}:${v.cls}:${v.margin.toFixed(3)}`) }));

const NOMTAG = new Set(["noun", "proper noun"]), results = [];
for (const v of check) {
  const e = await entry(v.word), tags = (e?.en ?? []).map((s) => s.pos);
  const nn = tags.filter((t) => NOMTAG.has(t)).length, truth = !tags.length ? "none" : nn === tags.length ? "nominal" : nn === 0 ? "other" : "mixed";
  results.push({ ...v, margin: +v.margin.toFixed(4), wiktionary: tags.join("/"), truth });
  console.log(JSON.stringify(results.at(-1)));
}
const scored = results.filter((r) => r.truth === "nominal" || r.truth === "other");
const real = scored.filter((r) => r.cls === r.truth).length / scored.length;
const nulls = Array.from({ length: 200 }, () => { const lab = shuffle(scored.map((r) => r.truth), rnd); return scored.filter((r, i) => r.cls === lab[i]).length / scored.length; });
const out = { asked: results.length, scored: scored.length, mixedSetAside: results.filter((r) => r.truth === "mixed").length, noEntry: results.filter((r) => r.truth === "none").length, accuracy: +real.toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), beatsNull: real > Math.max(...nulls), beatsTreebankT1: real > 0.748, perClass: { nominalVotes: scored.filter((r) => r.cls === "nominal").length, nominalCorrect: scored.filter((r) => r.cls === "nominal" && r.truth === "nominal").length, otherVotes: scored.filter((r) => r.cls === "other").length, otherCorrect: scored.filter((r) => r.cls === "other" && r.truth === "other").length } };
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ablation-rank-report.json", import.meta.url), JSON.stringify({ summary: out, votes: votes.sort((a, b) => b.margin - a.margin).map((v) => ({ ...v, margin: +v.margin.toFixed(4) })), results }, null, 1) + "\n");
