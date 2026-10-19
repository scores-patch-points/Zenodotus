// udhr-core/wiktionary-pilot.mjs — PILOT in 5 languages: what do Wiktionary's own entries say about the forms each edition hears?
//   POS      a form's part of speech from ITS OWN language section of the page, compared with the class the stack's POS prior settles
//            (reported by where the prior came from: UD treebank, Wiktionary, projected-from-UDHR).
//   Meaning  the glosses of the forms heard in each unit, as a bag of English words, compared across languages. The glosses are English,
//            so this is a BRIDGE and an evaluation, not a ground: it is tagged as a pivot, the way the English-projected priors were.
//
// PRE-REGISTERED before the first run (2026-10-19):
//   Claim C2  mean cross-language gloss agreement (Jaccard over the 31 units and 10 language pairs, on gloss words whose document
//             frequency across the 155 unit-language bags is under half: a band derived from the material, no stop-word list typed in)
//             exceeds the MAXIMUM over 200 draws in which each language's unit labels are permuted independently.
//   Reported, not claimed: own-language entry rate; POS agreement with the prior per prior kind.
// Host: en.wiktionary.org REST definition API only, one request per PACE ms, disk cache, descriptive User-Agent. No dumps.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { LANGS, PACE, pilotForms } from "./wikidata-pilot.mjs";
import { priorKind } from "./read-beings.mjs";
import { UNITS } from "./read-beings.mjs";

const CACHE = new URL("./wiktionary-cache.json", import.meta.url).pathname;
const UA = "udhr-core-pilot/0.1 (research on the Universal Declaration of Human Rights; github.com/scores-patch-points)";
export const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UPOS = { noun: "NOUN", verb: "VERB", adjective: "ADJ", adverb: "ADV", "proper noun": "PROPN", pronoun: "PRON", preposition: "ADP", postposition: "ADP", conjunction: "CCONJ", determiner: "DET", article: "DET", numeral: "NUM", particle: "PART", interjection: "INTJ", "verb form": "VERB", participle: "VERB" };
const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#\d+;|&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

// Network errors (a connect timeout killed the first live run) are retried, politely; Wikimedia's own throttle is honoured elsewhere.
async function get(url) {
  for (let attempt = 0; ; attempt++) {
    try { return await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } }); }
    catch (e) { if (attempt >= 5) throw e; await sleep(PACE * (attempt + 1)); }
  }
}
/** A simplified-Chinese page is usually a one-line stub `{{zh-see|傳統}}` pointing at the traditional form: the REST definition endpoint 404s on it. */
async function stubTarget(term) {
  const res = await get(`https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1`);
  if (!res.ok) return null;
  const j = await res.json(), text = j?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? "";
  await sleep(PACE);
  return (/\{\{zh-see\|([^|}]+)/.exec(text) ?? [])[1] ?? null;
}
export async function entry(term, depth = 0) {
  if (term in cache) return cache[term];
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await get(url);
    if (res.status === 404) {
      await sleep(PACE);
      const target = depth === 0 && /\p{Script=Han}/u.test(term) ? await stubTarget(term) : null;
      const viaStub = target && target !== term ? await entry(target, 1) : null;       // one hop: the traditional form's own page
      cache[term] = viaStub ? { ...viaStub, _via: target } : null; writeFileSync(CACHE, JSON.stringify(cache));
      return cache[term];
    }
    if (res.status === 429 || res.status === 503) { const ra = Number(res.headers.get("retry-after")); await sleep(1000 * ((Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) : 10) + 5 * attempt)); continue; }
    if (!res.ok) throw new Error(`wiktionary ${res.status} for ${term}`);
    const j = await res.json();
    const slim = {};
    for (const [lang, secs] of Object.entries(j)) slim[lang] = secs.map((s) => ({ pos: String(s.partOfSpeech ?? "").toLowerCase(), glosses: (s.definitions ?? []).slice(0, 4).map((d) => strip(d.definition)).filter(Boolean) }));
    cache[term] = slim; writeFileSync(CACHE, JSON.stringify(cache)); await sleep(PACE);
    return slim;
  }
  throw new Error(`wiktionary gave up on ${term}`);
}

const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 0; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const words = (s) => (String(s).toLowerCase().match(/\p{L}{3,}/gu) ?? []);

export async function runWiktionaryPilot() {
  const forms = await pilotForms();
  const info = {}, report = { languages: {} };
  for (const [stem, wd] of LANGS) {
    const f = forms[stem], per = new Map(); let own = 0, posBoth = 0, posAgree = 0;
    const kind = priorKind(f.hearing.posPrior);
    for (const form of f.forms) {
      const e = await entry(form);
      const mine = e?.[wd] ?? null;
      per.set(form, mine);
      if (mine?.length) {
        own++;
        const counts = f.hearing.posPrior.forms?.[form];
        if (counts) { const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]; const wp = new Set(mine.map((s) => UPOS[s.pos]).filter(Boolean)); if (wp.size) { posBoth++; if (wp.has(top)) posAgree++; } }
      }
    }
    info[stem] = { per, sets: f.sets };
    report.languages[stem] = { priorKind: kind, forms: f.forms.length, ownLanguageEntry: own, posCompared: posBoth, posAgree, posAgreement: posBoth ? +(posAgree / posBoth).toFixed(3) : null };
    console.log(stem, JSON.stringify(report.languages[stem]));
  }
  // gloss bag per unit per language
  const bag = {};
  for (const [stem] of LANGS) bag[stem] = info[stem].sets.map((set) => { const w = new Set(); for (const form of set) for (const sec of info[stem].per.get(form) ?? []) for (const g of sec.glosses) for (const x of words(g)) w.add(x); return w; });
  const df = new Map(); let nBags = 0;
  for (const [stem] of LANGS) for (const b of bag[stem]) { nBags++; for (const x of b) df.set(x, (df.get(x) ?? 0) + 1); }
  const keep = (b) => new Set([...b].filter((x) => df.get(x) < nBags / 2));
  const kb = Object.fromEntries(LANGS.map(([s]) => [s, bag[s].map(keep)]));
  const stems = LANGS.map(([s]) => s);
  const agree = (sets) => { let sum = 0, n = 0; for (let a = 0; a < stems.length; a++) for (let b = a + 1; b < stems.length; b++) for (let u = 0; u < UNITS; u++) { sum += jaccard(sets[stems[a]][u], sets[stems[b]][u]); n++; } return sum / n; };
  const real = agree(kb), rnd = mulberry(7), nulls = [];
  for (let rep = 0; rep < 200; rep++) { const sh = {}; for (const s of stems) { const p = Array.from({ length: UNITS }, (_, i) => i); for (let i = UNITS - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } sh[s] = p.map((i) => kb[s][i]); } nulls.push(agree(sh)); }
  report.meaning = { pivot: "English glosses (a bridge, not a ground)", meanAgreement: +real.toFixed(4), nullMax: +Math.max(...nulls).toFixed(4), nullMean: +(nulls.reduce((a, b) => a + b, 0) / nulls.length).toFixed(4), claimHolds: real > Math.max(...nulls) };
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runWiktionaryPilot();
  writeFileSync(new URL("./wiktionary-pilot-report.json", import.meta.url), JSON.stringify(r, null, 1) + "\n");
  console.log(JSON.stringify(r.meaning, null, 1));
}
