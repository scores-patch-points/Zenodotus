// udhr-core/wikidata-pilot.mjs — PILOT in 5 languages (eng, spa, arb, cmn_hans, swh): can what each edition hears be resolved to
// Wikidata concept ids, so that editions in different languages are compared on CONCEPTS instead of on language-specific words?
//
// PRE-REGISTERED before the first run (2026-10-19):
//   Resolve   each language's own heard beings (heardNominals, the stack's ear) -> wbsearchentities in THAT language. A candidate
//             counts only if Wikidata's own match is a label or alias equal to the form (case-insensitive). No English seeding.
//   Concept   a Wikidata id supported by the forms heard in a unit in a language. Agreement between two languages on a unit = Jaccard
//             of their id sets there.
//   Claim C1  mean cross-language agreement over the 31 units and 10 language pairs exceeds the MAXIMUM over 200 draws in which each
//             language's unit labels are permuted independently.
//   Also reported, not claimed: resolution rate per language; ids supported by >= 2 languages in the same unit.
// Etiquette: sequential requests, ~250 ms apart, a descriptive User-Agent, a disk cache so nothing is fetched twice, maxlag set.
// Scope: a pilot in 5 languages that already have priors and gold. Wikidata labels are thin for most low-resource languages.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { hearingFor, readUnits, UNITS } from "./read-beings.mjs";
import { loadLedger, LOG, CORPUS } from "./build.mjs";

export const LANGS = [["eng", "en"], ["spa", "es"], ["arb", "ar"], ["cmn_hans", "zh"], ["swh", "sw"]];
const CACHE = new URL("./wikidata-cache.json", import.meta.url).pathname;
const UA = "udhr-core-pilot/0.1 (research on the Universal Declaration of Human Rights; github.com/scores-patch-points)";
const TOP = 30;                                    // forms per language: the most-mentioned beings (bounds the number of requests; 60 was the first design, cut to 30 when Wikimedia limited this address to about one request per 10 s)
export const PACE = 10000;                         // ms between requests, from Wikimedia's own `retry-after: 10`
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).normalize("NFC").toLowerCase();

export async function resolve(form, lang) {
  const key = `${lang}|${form}`;
  if (cache[key]) return cache[key];
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(form)}&language=${lang}&uselang=${lang}&type=item&limit=7&format=json`;
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { last = `HTTP ${res.status}`; const ra = Number(res.headers.get("retry-after")); await sleep(1000 * (Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) : 15 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`wikidata ${res.status} for ${key}`);
    const j = await res.json();
    if (j.error) { last = JSON.stringify(j.error).slice(0, 160); await sleep(3000); continue; }
    const hits = (j.search ?? []).filter((e) => e.match && (e.match.type === "label" || e.match.type === "alias") && norm(e.match.text) === norm(form)).map((e) => ({ id: e.id, label: e.label ?? null, description: e.description ?? null, via: e.match.type }));
    cache[key] = hits; writeFileSync(CACHE, JSON.stringify(cache)); await sleep(PACE);
    return hits;
  }
  throw new Error(`wikidata gave up on ${key}: ${last}`);
}

async function units(code, stem, full) {
  const sid = [...full.sources].find(([, s]) => s.locator.endsWith(`udhr-${stem}.txt`))[0];
  const evs = full.events.filter((e) => e.stage === "arrange" && e.source_id === sid && e.unit && e.unit !== "title");
  const ord = (u) => (u === "preamble" ? 0 : +u.slice(8));
  evs.sort((a, b) => ord(a.unit) - ord(b.unit));
  const raw = readFileSync(new URL(`udhr-${stem}.txt`, CORPUS), "utf8"), buf = Buffer.from(raw, "utf8");
  const head = raw.split("\n")[1] ?? "", hcode = (head.match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  const hearing = await hearingFor(hcode, raw.slice(300, 900), stem);
  if (hearing.gap) throw new Error(`${stem}: ${hearing.gap}`);
  if (evs.length !== UNITS) throw new Error(`${stem}: ${evs.length} units`);
  const frames = evs.map((e) => e.detail.paragraphs.map(([s, t]) => buf.subarray(s, t).toString("utf8")).join(" \n"));
  return { sid, hearing, frames, ...readUnits(frames, hearing) };
}

/** The forms every lookup in the pilot uses: per language, the TOP most-mentioned single-word beings its own ear hears. */
export async function pilotForms() {
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const out = {};
  for (const [stem, wd] of LANGS) {
    const u = await units(wd, stem, full);
    out[stem] = { wd, sid: u.sid, sets: u.sets, hearing: u.hearing, forms: u.list.filter((b) => !b.surface.includes(" ")).sort((a, b) => b.mentions - a.mentions).slice(0, TOP).map((b) => b.surface) };
  }
  return out;
}

const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 0; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export async function runPilot() {
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const per = {};
  for (const [stem, wd] of LANGS) {
    const u = await units(wd, stem, full);
    const forms = u.list.filter((b) => !b.surface.includes(" ")).sort((a, b) => b.mentions - a.mentions).slice(0, TOP).map((b) => b.surface);
    const resolved = new Map();
    for (const f of forms) resolved.set(f, await resolve(f, wd));
    const hit = [...resolved].filter(([, h]) => h.length).length;
    // concept ids per unit: every id any resolved form heard in that unit points at
    const idSets = u.sets.map((set) => { const ids = new Set(); for (const f of set) for (const h of resolved.get(f) ?? []) ids.add(h.id); return ids; });
    per[stem] = { sid: u.sid, forms: forms.length, resolvedForms: hit, idSets, resolved, wd };
    console.log(`${stem}: ${forms.length} forms, ${hit} resolved to >=1 Wikidata item (${((100 * hit) / Math.max(1, forms.length)).toFixed(0)}%)`);
  }
  const stems = LANGS.map(([s]) => s);
  const agree = (sets) => { let sum = 0, n = 0; for (let a = 0; a < stems.length; a++) for (let b = a + 1; b < stems.length; b++) for (let u = 0; u < UNITS; u++) { sum += jaccard(sets[stems[a]][u], sets[stems[b]][u]); n++; } return sum / n; };
  const real = Object.fromEntries(stems.map((s) => [s, per[s].idSets]));
  const realMean = agree(real);
  const rnd = mulberry(99), nulls = [];
  for (let rep = 0; rep < 200; rep++) {
    const sh = {};
    for (const s of stems) { const p = Array.from({ length: UNITS }, (_, i) => i); for (let i = UNITS - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } sh[s] = p.map((i) => per[s].idSets[i]); }
    nulls.push(agree(sh));
  }
  // ids supported by >= 2 languages in the same unit, with the label Wikidata gave
  const label = new Map(); for (const s of stems) for (const [, hs] of per[s].resolved) for (const h of hs) if (!label.has(h.id)) label.set(h.id, `${h.label}${h.description ? " — " + h.description : ""}`);
  const shared = []; for (let u = 0; u < UNITS; u++) { const count = new Map(); for (const s of stems) for (const id of per[s].idSets[u]) count.set(id, (count.get(id) ?? 0) + 1); for (const [id, c] of count) if (c >= 2) shared.push({ unit: u, id, languages: c }); }
  return { per, realMean, nullMax: Math.max(...nulls), nullMean: nulls.reduce((a, b) => a + b, 0) / nulls.length, claimHolds: realMean > Math.max(...nulls), shared, label, stems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runPilot();
  console.log(JSON.stringify({ meanCrossLanguageAgreement: +r.realMean.toFixed(4), nullMax: +r.nullMax.toFixed(4), nullMean: +r.nullMean.toFixed(4), claimHolds: r.claimHolds, idsSupportedBy2PlusLanguagesInAUnit: r.shared.length }, null, 1));
  const byId = new Map(); for (const s of r.shared) { const e = byId.get(s.id) ?? { id: s.id, units: new Set(), maxLangs: 0 }; e.units.add(s.unit); e.maxLangs = Math.max(e.maxLangs, s.languages); byId.set(s.id, e); }
  const top = [...byId.values()].sort((a, b) => b.maxLangs - a.maxLangs || b.units.size - a.units.size).slice(0, 25);
  for (const t of top) console.log(`${t.id}  langs ${t.maxLangs}  units ${[...t.units].slice(0, 6).join(",")}  ${r.label.get(t.id)}`);
}
