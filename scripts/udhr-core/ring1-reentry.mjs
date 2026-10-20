// udhr-core/ring1-reentry.mjs — RE-ENTRY: what does ring 1 teach the core's reader about English, and can it reach the core?
//
// Offline. No network, no lookup is made; the output is the need list a later, approved lookup would be driven by.
// A need is a word the English POS prior does not know (isUnknownWord, the reader's own test). Ring 1 raises needs by MENTIONS in its documents.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   R1  Ring 1 raises needs the core never raised. Let N1 = distinct unknown words in the English ring-1 documents with >= 5 mentions in >= 3 documents,
//       and N0 = unknown words in the English UDHR editions. Reported: |N1|, |N0|, |N1 ∩ N0|.
//   R2  REACH. A lookup can move the core only through a word the core reads. The core's English readings (eng edition(s) in the 233/170 sets) read
//       only UDHR text, so only words in N1 ∩ (words of the English UDHR editions) can reach it. CLAIM: that intersection is empty or tiny; stated
//       as a count. If it is non-empty those words go first in the queue and are listed.
//   R3  CONSEQUENCE ordering for the rest: rank N1 by mentions x documents (lookup.mjs `prioritise`), split by corpus, and report the share of ring-1
//       word tokens the unknowns cover (the English reader's blind fraction per corpus) against the same fraction in the neutral novels.
//       CLAIM: the blind fraction is higher in the anti-colonial and first-person corpora than in the novels (the prior was trained on other text);
//       holds iff the difference exceeds the max over 200 draws that reassign documents between corpora (sizes kept).
//   Control  a word is reported unknown only if it is lower-case alphabetic after peeling; capitalised-only forms are counted separately as names
//            (a proper noun is a need of a different kind, and is not what the prior's gap is about).
// Nothing is written to the mind log: no UDHR conclusion changes here, and REVISE is for conclusions.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modelOf, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT } from "./ring1.mjs";
import { isUnknownWord } from "./read-beings.mjs";
import { prioritise } from "./lookup.mjs";

const TOK = /[\p{L}\p{M}\p{N}'’]+/gu;
const m = await modelOf("eng"), P = m.hearing.posPrior;
const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const load = (dir, keep) => walk(join(ROOT, dir)).map((p) => { const { meta, body } = frontmatter(readFileSync(p, "utf8")); return { p, meta, text: gutenbergBody(body) }; }).filter(keep);
const known = (t) => { const w = t.slice(0, 200000).toLowerCase().match(TOK) ?? []; return w.length ? w.filter((x) => P.forms[x]).length / w.length : 0; };
const corpora = {
  anticolonial: load("21-anti-colonial", (d) => isEn(d.meta.language)),
  firstPerson: load("20-first-person-voices", (d) => isEn(d.meta.language)),
  novels: load("01-literature-books", (d) => known(d.text) >= 0.5),
};

function scan(doc) {
  const unk = new Map(), names = new Map(); let tokens = 0, blind = 0;
  for (const raw of doc.text.match(TOK) ?? []) {
    tokens++;
    const w = raw.toLowerCase(); if (!isUnknownWord(P, w)) continue;
    blind++;
    if (/^[a-z]+$/.test(w) && raw === w) unk.set(w, (unk.get(w) ?? 0) + 1);
    else if (/^\p{Lu}/u.test(raw) && /^[\p{L}]+$/u.test(raw)) names.set(w, (names.get(w) ?? 0) + 1);
  }
  return { tokens, blind, unk, names };
}
const per = {}, need = new Map();
for (const [c, docs] of Object.entries(corpora)) {
  per[c] = docs.map(scan).filter((r) => r.tokens > 500);
  if (c === "novels") continue;
  for (const r of per[c]) for (const [w, k] of r.unk) { const n = need.get(w) ?? { surface: w, mentions: 0, units: 0, by: { anticolonial: 0, firstPerson: 0 } }; n.mentions += k; n.units += 1; n.by[c] += k; need.set(w, n); }
}
const N1 = prioritise([...need.values()].filter((n) => n.mentions >= 5 && n.units >= 3));

// N0 / reach: words of the English UDHR editions (any with a prior) that the prior does not know
const udhrWords = new Set(), N0 = new Set();
for (const stem of ["eng", "eng_1", "eng_2"]) { try { const mm = await modelOf(stem); if (!mm) continue; for (const f of mm.frames) for (const raw of f.match(TOK) ?? []) { const w = raw.toLowerCase(); udhrWords.add(w); if (isUnknownWord(P, w)) N0.add(w); } } catch {} }
const inter = N1.filter((n) => udhrWords.has(n.surface));

const frac = (rs) => rs.reduce((a, r) => a + r.blind, 0) / rs.reduce((a, r) => a + r.tokens, 0);
const mean = (rs) => rs.reduce((a, r) => a + r.blind / r.tokens, 0) / rs.length;
const rnd = mulberry(31), blindTest = (X) => {
  const real = mean(per[X]) - mean(per.novels), pool = [...per[X], ...per.novels], nulls = [];
  for (let i = 0; i < 200; i++) { const s = shuffle(pool, rnd); nulls.push(mean(s.slice(0, per[X].length)) - mean(s.slice(per[X].length))); }
  return { corpusDocBlind: +mean(per[X]).toFixed(4), novelsDocBlind: +mean(per.novels).toFixed(4), diff: +real.toFixed(4), nullMax: +Math.max(...nulls).toFixed(4), holds: real > Math.max(...nulls) };
};
const out = {
  documents: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.length])),
  R1: { N1: N1.length, N0: N0.size, N0_words: [...N0].slice(0, 20), N1_in_N0: N1.filter((n) => N0.has(n.surface)).length },
  R2_reach: { udhrEnglishWords: udhrWords.size, N1_that_appear_in_UDHR_text: inter.length, words: inter.slice(0, 20).map((n) => n.surface) },
  R3_blind: { anticolonial: blindTest("anticolonial"), firstPerson: blindTest("firstPerson"), pooledTokenFraction: { anticolonial: +frac(per.anticolonial).toFixed(4), firstPerson: +frac(per.firstPerson).toFixed(4), novels: +frac(per.novels).toFixed(4) } },
  queueTop40: N1.slice(0, 40).map((n) => `${n.surface} (${n.mentions}x/${n.units}d; ac ${n.by.anticolonial}, fp ${n.by.firstPerson})`),
  queueSize: N1.length,
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./ring1-reentry-report.json", import.meta.url), JSON.stringify({ ...out, queue: N1.slice(0, 3000) }, null, 1) + "\n");
