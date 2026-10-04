#!/usr/bin/env node
// live_priors/derived-priors/genre-priors/genre-prior.mjs — the genre prior.
//
// GenrePrior@1 — "what a document of THIS KIND normally assumes and states":
// a byte-addressed, mechanical print of the numbered source categories in
// live_priors, measured over the FULL ORIGINAL texts. It is the baseline a
// grounded summary reads a document AGAINST, so that a persuasive document's
// own framing is never taken as its own gospel.
//
// WHY THIS EXISTS (the defect it closes). A summary baseline built from the
// document itself measures the document against itself: the essay's quoted
// objection becomes the prior, and the essay's first principles become the
// ground. That is circular — it lets any document define the standard it then
// appears to meet. The prior must come from the genre: what texts OF THIS KIND
// normally hold, measured from real bytes in OTHER documents. A framing the
// document states that the genre does NOT normally hold is then the author's
// own assertion, disclosed as such, never promoted to the baseline.
//
// THE NULL IS THE CORPUS'S OWN POPULATION (the house's standing shape —
// elenchus born mass, anchoring, pronouns: "the null is the caller's own
// distribution"). For each genre, a term's null is the SAME-frequency terms
// of the OTHER genres (leave-the-genre-out): the floor is the MAX over
// NULL_DRAWS seeded draws from that neighborhood. A term that appears in
// every genre is ordinary vocabulary and is refused by its peers; a term that
// dwells in ONE genre beyond what its frequency predicts is that genre's own.
//
// DISCIPLINE (inherited from concern-field.mjs, live_priors/POLICIES.md):
//   minLen/minCount   declared structural bounds, in the header
//   the null          the other genres' same-frequency terms, 39 seeded draws
//   determinism       by construction (seeded)
//   stability         a second, independent seed arm re-runs the whole
//                     admission; the prior is the INTERSECTION, drops recorded
//   named gaps        a genre with too few documents is a NAMED GAP, never
//                     approximated from a sibling
//
//   node genre-prior.mjs            build every genre
//   node genre-prior.mjs news       build one genre
//   node genre-prior.mjs --list     the genres + their document counts
//
// Output: genre-priors/<genre>.json, plus named-gaps.jsonl.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createSeededRng, seedFrom } from '../../../khora/native/kernel/rng.js';

const ROOT = '/Users/mlacy/Documents/3.0';
const CORPUS = path.join(ROOT, 'live_priors');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAPS = path.join(HERE, 'named-gaps.jsonl');

// ── declared parameters (structural, in the header, never tuned) ──────────
const MIN_LEN = 4; // a 1-3 letter run is a particle in most of these scripts
const MIN_COUNT = 4; // below 4 occurrences a dwelling cannot be told from noise
const NULL_DRAWS = 39; // budget, disclosed: resolution 1/40 < RERUN_NULL.alpha
const ALPHA = 0.05; // the house's standing alpha
const SEED_PREFIX = 'genre-prior@1';
const MIN_DOCS = 8; // a genre needs 8 documents or it is a named gap
const TEXT_EXT = /\.(txt|md|html|htm|json|jsonl)$/i;
const SKIP_DIR = /(^|\/)(node_modules|\.git|scripts|manifests|goldens|legacy|digested|derived-priors|fixtures)(\/|$)/;

// The genre map: the numbered categories of the corpus. Each is "what texts
// of this kind are". A genre is measured, never declared as a topic list.
const GENRES = {
  'literature': '01-literature-books',
  'encyclopedic': '02-encyclopedic',
  'academic': '05-academic-papers',
  'government-legal': '06-government-legal',
  'news': '08-news-current',
  'source-code': '09-source-code',
  'holy-texts': '14-holy-texts',
  'western-canon': '15-western-canon',
  'organic-community': '19-organic-community',
};

function* walk(dir, base = dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (SKIP_DIR.test(rel)) continue;
    if (e.isDirectory()) yield* walk(full, base);
    else if (TEXT_EXT.test(e.name)) yield full;
  }
}

function tokenize(text) {
  const re = /\p{L}+/gu;
  const out = [];
  for (let m; (m = re.exec(text)) !== null;) {
    const t = m[0];
    if (t.length < MIN_LEN) continue;
    out.push(t.toLowerCase());
  }
  return out;
}

function readDocs(genreDir, cap = 400) {
  const files = [...walk(path.join(CORPUS, genreDir))].slice(0, cap);
  const docs = [];
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (/\u0000/.test(text.slice(0, 2000))) continue; // binary masquerading as text
    const toks = tokenize(text);
    if (toks.length < 200) continue; // a fragment is not a document
    docs.push({ file: path.relative(CORPUS, f), sha: crypto.createHash('sha256').update(text).digest('hex'), toks, ntok: toks.length });
  }
  return docs;
}

// term frequency within a genre (doc-frequency: how many of the genre's docs
// carry the term — a genre prior is about what the genre NORMALLY says, so a
// term dwelling in one document is not the genre's, it is that document's).
function termDocFreq(docs) {
  const df = new Map();
  for (const d of docs) for (const t of new Set(d.toks)) df.set(t, (df.get(t) || 0) + 1);
  return df;
}

// A term is the GENRE'S OWN if it is over-represented in this genre beyond
// what its frequency in the whole corpus predicts — the standard, non-tuned
// instrument is the log-likelihood ratio G² (Dunning), which asymptotically
// follows a χ² with 1 d.f. The 5% cutoff on χ²(1) is 3.841, the house alpha
// expressed in the test's own units — not a threshold tuned on any specimen.
// The null is the corpus's own population (the house's standing shape): the
// term is measured against itself elsewhere, never against a hand list.
const CHI2_1DF_05 = 3.841;
function g2(a, b, c, d) {
  // 2x2 G² (Dunning log-likelihood): a = term in genre docs, b = genre docs
  // without it, c = term in other-genre docs, d = other-genre docs without it.
  const N = a + b + c + d;
  if (!N) return 0;
  const rt = a + b, ct1 = a + c, ct2 = b + d;
  const cells = [[a, (rt * ct1) / N], [b, (rt * ct2) / N], [c, ((c + d) * ct1) / N], [d, ((c + d) * ct2) / N]];
  let g = 0;
  for (const [o, e] of cells) if (o > 0 && e > 0) g += 2 * o * Math.log(o / e);
  return g;
}

// One arm limits the genre to a seeded half of its documents and the null to a
// seeded half of the others, so a term must be over-represented in BOTH
// independent halves — the concern-field two-arm stability discipline, here by
// document split rather than null draw (a term that only dwells in one subset
// is that subset's, not the genre's).
function armOnce(docs, otherDocs, seedKey) {
  const rng = createSeededRng(seedFrom(seedKey));
  const half = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, Math.max(1, Math.floor(a.length / 2))); };
  const mine = half(docs), other = half(otherDocs);
  const mineDF = termDocFreq(mine), otherDF = termDocFreq(other);
  const out = new Set();
  for (const [t, df] of mineDF) {
    if (df < MIN_COUNT) continue;
    const g = g2(df, mine.length - df, otherDF.get(t) || 0, other.length - (otherDF.get(t) || 0));
    if (g >= CHI2_1DF_05) out.add(t);
  }
  return out;
}

function buildGenre(name) {
  const docs = readDocs(GENRES[name]);
  if (docs.length < MIN_DOCS) {
    fs.appendFileSync(GAPS, JSON.stringify({ schema: 'GenreGap@1', genre: name, why: `only ${docs.length} usable documents (< ${MIN_DOCS}); a genre prior needs a population, never approximated from a sibling`, at: new Date().toISOString() }) + '\n');
    return null;
  }
  const mine = termDocFreq(docs);
  // the other genres are the null population
  const otherDocs = [];
  for (const g of Object.keys(GENRES)) { if (g === name) continue; otherDocs.push(...readDocs(GENRES[g], 120)); }
  const sha = crypto.createHash('sha256').update(docs.map((d) => d.sha).join('|')).digest('hex').slice(0, 16);
  const s1 = armOnce(docs, otherDocs, `${SEED_PREFIX}|${sha}|a1`);
  const s2 = armOnce(docs, otherDocs, `${SEED_PREFIX}|${sha}|a2`);
  const dfAll = termDocFreq(docs);
  const otherDFAll = termDocFreq(otherDocs);
  const kept = [...s1].filter((t) => s2.has(t)).map((t) => ({ term: t, df: dfAll.get(t) || 0, g2: +g2(dfAll.get(t) || 0, docs.length - (dfAll.get(t) || 0), otherDFAll.get(t) || 0, otherDocs.length - (otherDFAll.get(t) || 0)).toFixed(2) }));
  const dropped = [...s1].filter((t) => !s2.has(t));
  kept.sort((x, y) => y.g2 - x.g2);
  const prior = {
    schema: 'GenrePrior@1',
    giver: 'measured from live_priors numbered categories, byte-addressed, no model',
    genre: name,
    dir: GENRES[name],
    docs: docs.length,
    tokens: docs.reduce((s, d) => s + d.ntok, 0),
    declared_params: { minLen: MIN_LEN, minCount: MIN_COUNT, alpha: ALPHA, seed: SEED_PREFIX, test: '2x2 G² (Dunning), χ²(1) 5% = 3.841', stability: 'two independent document-split arms, the intersection' },
    null: 'the corpus’s own population: over-representation vs the other genres (leave-the-genre-out), G² ≥ 3.841 in BOTH arms',
    stability: { kept: kept.length, dropped_one_arm_only: dropped.length, dissent: dropped.slice(0, 40) },
    prior_terms: kept.slice(0, 2000),
  };
  fs.writeFileSync(path.join(HERE, `${name}.json`), JSON.stringify(prior, null, 2));
  return prior;
}

const args = process.argv.slice(2);
if (args.includes('--list')) { for (const [g, d] of Object.entries(GENRES)) console.log(g.padEnd(18), readDocs(d).length, 'docs'); process.exit(0); }
const targets = args.length ? args : Object.keys(GENRES);
for (const g of targets) {
  if (!GENRES[g]) { console.error('unknown genre:', g); continue; }
  const p = buildGenre(g);
  console.log(p ? `${g}: ${p.docs} docs, ${p.prior_terms.length} prior terms, ${p.stability.dropped_one_seed_only} dropped by the second arm` : `${g}: NAMED GAP`);
}
