// udhr-core/read-beings.mjs — read an edition with the stack's own ear and heard-nominals tier (beings that need no capital
// letters), and reduce it to a structure that does not depend on the language: WHICH UNITS OF THE DECLARATION SHARE A BEING.
//   frames   the 31 units (preamble + 30 articles), each the concatenation of its paragraphs
//   beings   heardNominals(frames, { posPrior, framePrior, segment, peel }) — recurring words the language's own grammar reads as nominal
//   nn       each unit's NEAREST NEIGHBOUR by Jaccard overlap of its being set: a rank, so no number is typed in and text length cancels
// Priors are the caller's; a language with no POS prior is a typed gap ("the gate that cannot run must not guess").
import { readFileSync, existsSync } from "node:fs";
const K = new URL("../../../khora/native/", import.meta.url).pathname;
const PRIORS = new URL("../../../janus/priors/", import.meta.url).pathname;
const { heardNominals } = await import(K + "adapters/text/heard-nominals.js");
const { makeEar } = await import(K + "adapters/text/ear.js");
const { isUnspacedScript } = await import(K + "adapters/text/script-segment.js");
let organsP = null;
const organs = () => (organsP ??= import("../eot-digest.mjs").then((m) => m.loadOrgans()));
const J = (f) => (existsSync(PRIORS + f) ? JSON.parse(readFileSync(PRIORS + f, "utf8")) : null);
export const MIN_MENTIONS = 2, NAME_SHARE = 0.5;           // heard-nominals' own declared defaults, stated here because "every number is the caller's"
export const UNITS = 31;
export const pairId = (u, v) => `${u}-${v}`;
export const PAIRS = (() => { const out = []; for (let u = 0; u < UNITS; u++) for (let v = u + 1; v < UNITS; v++) out.push(pairId(u, v)); return out; })();

/** Which prior file hears this edition? Candidates in order: the header code (normalized), the file stem, the stem with - for _, the base language of the stem. Never another language. */
export async function findPosPrior(code, stem) {
  const o = await organs();
  const norm = o.normalizeLangCode(code || "");
  const base = (stem || "").split("_")[0].replace(/\d+$/, "");
  const cands = [...new Set([norm, code, stem, (stem || "").replace(/_/g, "-"), base].filter(Boolean))];
  for (const c of cands) { const f = `pos-${c}.json`; if (existsSync(PRIORS + f)) return { name: c, prior: JSON.parse(readFileSync(PRIORS + f, "utf8")) }; }
  return null;
}

/** What the stack can hear for an edition: { posPrior, ear, framePrior, why } or { gap }. */
export async function hearingFor(code, sampleText = "", stem = "") {
  const found = await findPosPrior(code, stem);
  if (!found?.prior?.forms) return { gap: `no POSPrior@1 for "${code}" / "${stem}"`, unspaced: isUnspacedScript(sampleText) };
  const norm = found.name, posPrior = found.prior;
  const proclitics = J(`proclitics-${norm}.json`), enclitics = J(`enclitics-${norm}.json`), contractions = J(`contractions-${norm}.json`);
  const ear = makeEar({ posPrior, proclitics: proclitics?.proclitics ?? null, enclitics: enclitics?.enclitics ?? null, contractions });
  return { norm, posPrior, ear, framePrior: J(`frame-${norm}.json`), kind: priorKind(posPrior), why: `pos-${norm}${proclitics ? "+proclitics" : ""}${enclitics ? "+enclitics" : ""}` };
}

/** Where a POS prior came from. A prior projected from English through the UDHR's own parallel translation is NOT independent evidence about that language. */
export function priorKind(p) {
  const g = String(p?.provenance?.giver ?? p?.giver ?? ""), src = String(p?.provenance?.source ?? "");
  if (/projected from the UDHR/i.test(g)) return "projected-from-UDHR";
  if (/treebank|universal dependencies|UD_/i.test(g + src)) return "UD-treebank";
  if (/unimorph/i.test(g + src)) return "UniMorph";
  if (/wiktionary|kaikki/i.test(g + src)) return "Wiktionary";
  return "other";
}

const lowerTokens = (text, ear) => {
  let t = String(text).toLowerCase();
  if (ear?.segment) t = ear.segment(t);
  if (ear?.peel) t = ear.peel(t);
  return t.match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? [];
};

/**
 * Is this word UNKNOWN to the language's POS prior? The same test heard-nominals' classAt applies, so the lookup and the reader never disagree about
 * what is known: no entry; or no entry for the word and none for its stem before an apostrophe (a treebank splits "don't"); or a form the prior holds
 * only as X ("other": a transliterated foreign name in an Arabic or Hebrew treebank), which the reader also treats as unseen. These are the ONLY
 * words an outside lookup may be asked about.
 */
export function isUnknownWord(posPrior, w) {
  const forms = posPrior?.forms ?? {};
  let counts = forms[w];
  const apos = w.search(/['’]/);
  if (!counts && apos > 0) { const stem = w.slice(0, apos); counts = forms[stem] ?? (stem.endsWith("n") ? forms[stem.slice(0, -1)] : undefined); }
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  if (counts && total >= 1 && (counts.X ?? 0) / total >= 0.5) return true;
  return !(counts && total >= 1);
}

/** frames: 31 strings. Returns { beings, nn: number[31] } (each unit's nearest neighbour by shared beings, -1 = none) or { gap }. */
export function readUnits(frames, hearing, { settle = null } = {}) {
  const heard = heardNominals(frames, { posPrior: hearing.posPrior, framePrior: hearing.framePrior, segment: hearing.ear?.segment ?? null, peel: hearing.ear?.peel ?? null, minMentions: MIN_MENTIONS, nameShare: NAME_SHARE });
  // AS-NEEDS EVIDENCE. A being the POS prior has never seen (`unseen > 0`) was admitted on its neighbours alone: that is a NEED, the only place
  // an outside lookup can make a difference. `settle(form)` is the caller's cache-backed answer: "nominal" keeps it, "other" drops it, null leaves
  // it admitted on the frame and raises the need. Forms the prior has seen are never asked about.
  const needs = [];
  const unseenWord = (w) => isUnknownWord(hearing.posPrior, w);
  const ask = (w, b) => { const v = settle(w); if (v == null && !needs.some((n) => n.surface === w)) needs.push({ surface: w, mentions: b.mentions, units: b.sentences }); return v; };
  const beings = settle ? heard.filter((b) => {
    const parts = b.surface.split(" ").filter(unseenWord);      // a compound is asked about by its unseen WORDS, never as a whole
    if (!parts.length) return true;                              // every word is one the prior has settled: never asked
    return !parts.map((w) => ask(w, b)).includes("other");
  }) : heard;
  if (!beings.length) return { gap: "no recurring beings heard", beings: 0, needs };
  const toks = frames.map((f) => lowerTokens(f, hearing.ear));
  const has = (ts, surface) => { const parts = surface.split(" "); if (parts.length === 1) return ts.includes(parts[0]); for (let i = 0; i + parts.length <= ts.length; i++) if (parts.every((p, k) => ts[i + k] === p)) return true; return false; };
  const sets = toks.map((ts) => new Set(beings.filter((b) => has(ts, b.surface)).map((b) => b.surface)));
  // nearest neighbour of each unit by Jaccard overlap of heard beings (ties -> the lower unit; -1 when it shares nothing with any unit)
  const n = frames.length, J2 = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) {
    const a = sets[u], b = sets[v]; let inter = 0; for (const x of a) if (b.has(x)) inter++;
    const un = a.size + b.size - inter; J2[u][v] = J2[v][u] = un ? inter / un : 0;
  }
  const nn = J2.map((row, u) => { let best = -1, bj = 0; row.forEach((j, v) => { if (v !== u && j > bj) { bj = j; best = v; } }); return best; });
  return { beings: beings.length, nn, sets, list: beings, needs, unseenAdmitted: heard.filter((b) => b.unseen > 0).length };
}
