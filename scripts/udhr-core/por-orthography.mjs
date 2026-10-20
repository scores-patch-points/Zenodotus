// udhr-core/por-orthography.mjs — map pre-reform Portuguese spellings to the modern form the prior knows, so the prior (and Wiktionary) can speak about them.
//
// Why: in the first Portuguese read the modern prior was blind on 29.4% of tokens, mostly old spellings ("instrucções", "differenças", "condemnação",
// "acceitou", "luctar", "comprehendo") and missing accents ("territorio", "indispensaveis"); 11 of 30 random accepted words had no Wiktionary entry in
// Portuguese and 7 no page at all, so the check could not judge them.
// Method: candidate rewrites (cç->ç, double consonants, mn->n, ph->f, th->t, ct->t, eh->e, y->i, strip an old circumflex/acute) applied singly and together;
// a candidate is accepted ONLY if it is a form the prior KNOWS, matched on an accent-stripped index so a missing accent is restored from the prior's own
// accented form. The rewrites are a fixed list of well-documented spelling differences, not learned. The prior is not modified.
//
// PRE-REGISTERED before the first run (2026-10-20), on the queue of the first Portuguese read (accepted + pending words of por-prior-extension.json):
//   O1  at least 20% of the queue words map to a form the prior knows (otherwise the fix does not reach enough of the blind fraction to matter).
//   O2  among mapped words whose modern form has a CLEAR prior class (nominal share >= 0.8 or <= 0.2 of >= 5 counts), the sniff's vote on the OLD form
//       agrees with that class in at least 85% of cases. This is a no-network check of the sniff on exactly the words Wiktionary could not judge.
//   O3  of the 30 words the first Wiktionary check drew at random (por-prior-extension-check-report.json), at least half of those it could NOT verify
//       gain a Portuguese entry through their mapped form; and among the newly verifiable ones the sniff agrees with Wiktionary in at least 85%.
//   Reported: which rewrite fired most; the mapped-but-class-unclear share; the words mapped to a different modern word than intended (read by eye, 20).
import { readFileSync, writeFileSync } from "node:fs";
import { modelOf } from "./ring1.mjs";
import { entry } from "./wiktionary-pilot.mjs";
import { entryKind } from "./hybrid-settle.mjs";

const m = await modelOf("por_BR"), forms = m.hearing.posPrior.forms;
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);
const strip = (s) => s.normalize("NFD").replace(/\p{M}/gu, "");
const index = new Map();           // accent-stripped -> best accented known form (by count)
for (const [f, c] of Object.entries(forms)) { if (!/^\p{L}+$/u.test(f)) continue; const k = strip(f), t = total(c); if (t >= 2 && (!index.has(k) || t > index.get(k).t)) index.set(k, { form: f, t }); }
const RULES = [["cc→c", /cc(?=[eiéí])/g, "c"], ["cç→ç", /cç/g, "ç"], ["pç→ç", /pç/g, "ç"], ["ff→f", /ff/g, "f"], ["ll→l", /ll/g, "l"], ["mm→m", /mm/g, "m"], ["nn→n", /nn/g, "n"], ["tt→t", /tt/g, "t"], ["mn→n", /mn/g, "n"], ["ph→f", /ph/g, "f"], ["th→t", /th/g, "t"], ["ct→t", /ct/g, "t"], ["eh→e", /eh/g, "e"], ["y→i", /y/g, "i"], ["ch→c", /ch(?=[aeiou])/g, "c"]];
const apply = (w, rs) => rs.reduce((x, [, re, to]) => x.replace(re, to), w);
function normalise(w) {
  const sets = [[]]; for (const r of RULES) sets.push([r]);                       // none, each alone
  sets.push(RULES.filter((r) => !/ct→t|ch→c/.test(r[0])), RULES);                 // all but the risky two, then all
  const seen = new Set();
  for (const rs of sets) { const c = apply(w, rs); if (seen.has(c)) continue; seen.add(c); const hit = index.get(strip(c)); if (hit && strip(hit.form) !== strip(w) + "\u0000") { if (hit.form !== w) return { modern: hit.form, via: rs.map((r) => r[0]) }; } }
  return null;
}
const ext = JSON.parse(readFileSync(new URL("./por-prior-extension.json", import.meta.url), "utf8")), queue = [...Object.keys(ext.entries), ...ext.pending];
const klass = (f) => { const c = forms[f]; if (!c) return null; const t = total(c); if (t < 5) return null; const n = ((c.NOUN ?? 0) + (c.PROPN ?? 0)) / t; return n >= 0.8 ? "nominal" : n <= 0.2 ? "other" : null; };
const mapped = [], viaCount = {};
for (const w of queue) { const r = normalise(w); if (!r) continue; mapped.push({ word: w, ...r, cls: klass(r.modern), sniff: ext.entries[w]?.cls ?? null }); for (const v of r.via) viaCount[v] = (viaCount[v] ?? 0) + 1; }
const clear = mapped.filter((x) => x.cls && x.sniff), agree = clear.filter((x) => x.sniff === x.cls).length;

// O3: re-ask Wiktionary through the mapped form for the words the first check could not verify
const chk = JSON.parse(readFileSync(new URL("./por-prior-extension-check-report.json", import.meta.url), "utf8")).rows, unver = chk.filter((r) => !r.kind), byWord = new Map(mapped.map((x) => [x.word, x]));
const retry = [];
for (const r of unver) { const mp = byWord.get(r.word); if (!mp) { retry.push({ word: r.word, mapped: null }); continue; } const e = await entry(mp.modern), k = entryKind(e, "pt"); retry.push({ word: r.word, modern: mp.modern, sniff: r.sniff, wiktionary: (e?.pt ?? []).map((s) => s.pos).join("/"), kind: k }); console.log(JSON.stringify(retry.at(-1))); }
const gained = retry.filter((x) => x.kind), scored = gained.filter((x) => x.kind === "pure-nominal" || x.kind === "pure-other"), a3 = scored.filter((x) => x.sniff === (x.kind === "pure-nominal" ? "nominal" : "other")).length;
const out = {
  queue: queue.length, O1: { mapped: mapped.length, share: +(mapped.length / queue.length).toFixed(3), minimum: 0.2, holds: mapped.length / queue.length >= 0.2 },
  O2: { withClearPriorClass: clear.length, agree, rate: clear.length ? +(agree / clear.length).toFixed(3) : null, minimum: 0.85, holds: clear.length > 0 && agree / clear.length >= 0.85 },
  O3: { unverifiedBefore: unver.length, mapped: retry.filter((x) => x.modern).length, gainedEntry: gained.length, gainedShare: +(gained.length / unver.length).toFixed(3), holdsGain: gained.length / unver.length >= 0.5, scored: scored.length, agree: a3, rate: scored.length ? +(a3 / scored.length).toFixed(3) : null, holdsAgree: scored.length > 0 && a3 / scored.length >= 0.85 },
  rewritesFired: Object.entries(viaCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(" "),
  eyeSample: mapped.filter((_, i) => i % Math.max(1, Math.floor(mapped.length / 20)) === 0).slice(0, 20).map((x) => `${x.word}→${x.modern}`).join("  "),
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(new URL("./por-prior-extension-orth.json", import.meta.url), JSON.stringify({ schema: "POSPriorExtension@1", language: "pt", note: "old spelling mapped to a modern form the prior knows; priorClass from that form when clear; the sniff vote is kept beside it", entries: Object.fromEntries(mapped.map((x) => [x.word, { modern: x.modern, via: x.via, priorClass: x.cls, sniff: x.sniff, final: x.cls ?? x.sniff, source: x.cls ? "prior-via-orthography" : "sniff" }])) }) + "\n");
writeFileSync(new URL("./por-orthography-report.json", import.meta.url), JSON.stringify({ out, retry, mappedSample: mapped.slice(0, 40) }, null, 1) + "\n");
