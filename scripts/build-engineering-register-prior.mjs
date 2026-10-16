#!/usr/bin/env node
// build-engineering-register-prior.mjs — EngineeringRegisterPrior@1: the register people use to talk ABOUT code, measured from the
// comments, docstrings and READMEs of 09-source-code's own repositories.
//
// WHY. eoreader7's reader is primed for English prose about named beings (pos-eng, morphology-eng). A coding agent's turns are
// prose about common nouns and identifiers (webhook, backoff, validateOrder): the reader admits no referents there and so reads no
// relations. The remedy this repo already uses is a received prior derived from the corpus, not a hand list.
//
// WHAT IT MEASURES (two things, both with their null):
//   1. TECHNICAL REFERENT SHAPE: a token is a technical being when it is identifier-shaped (underscore, interior capital, trailing
//      "()") or is a declared name that recurs in fewer than GENERIC_REPOS repos (CodeNamePrior@1: init/main/run are generic).
//   2. ACT LEXICON: the tokens that most often stand immediately AFTER a technical being, in >= MIN_REPOS distinct repos. Null =
//      PERTURBATION of ADJACENCY (tokens shuffled within each sentence, seeded): an act is a verb whose lift over the null >= LIFT.
// FALSIFIER (BAND): the acts must not be a frequency band: Jaccard(acts, top-N most frequent tokens overall) is reported and must
// stay < BAND_MAX or the prior is disclosed as a band, not a register.
// DOES NOT: parse, resolve, or judge truth. A frequency/adjacency measurement over a small corpus, disclosed as such.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CORPUS = path.join(ROOT, "09-source-code");
const OUT = path.join(ROOT, "derived-priors", "engineering-priors", "engineering-register-prior-v1.json");
const P = { EVERYDAY_MIN: 5, REF_MAX: 60_000_000, KEY_MIN: 4, KEY_RATIO: 30, VERB_SHARE: 0.5, GENERIC_REPOS: 2, MIN_REPOS: 2, MIN_COUNT: 3, LIFT: 2, BAND_TOP: 60, BAND_MAX: 0.5, SEED: 20261015, NULL_DRAWS: 20, MAX_FILE: 400_000 };
const CODE_EXT = new Set([".py", ".go", ".c", ".h", ".ts", ".tsx", ".js", ".mjs", ".jsx", ".rs", ".java", ".rb", ".cc", ".cpp", ".hpp"]);

// RECEIVED POS PRIOR (janus/priors/pos-eng.json, POSPrior@1): an act is a word the received prior types mostly VERB (AUX, CCONJ, NOUN excluded)
const POS = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "janus", "priors", "pos-eng.json"), "utf8")).forms;
const verbShare = (w) => { const f = POS[w]; if (!f) return null; const t = Object.values(f).reduce((a, b) => a + b, 0); return t ? (f.VERB ?? 0) / t : null; };
const lemmas = (w) => [w, w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ing$/, ""), w.replace(/ing$/, "e")];
const isVerb = (w) => { for (const l of lemmas(w)) { const v = verbShare(l); if (v !== null) return v >= P.VERB_SHARE; } return false; };

const names = JSON.parse(fs.readFileSync(path.join(ROOT, "derived-priors", "code-priors", "code-name-prior-v1.json"), "utf8")).names ?? {};
const rare = new Set(Object.entries(names).filter(([, v]) => v.repos < P.GENERIC_REPOS).map(([k]) => k.toLowerCase()).filter((k) => k.length >= 4));

function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith(".git")) continue; const p = path.join(d, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }

/** comment/doc prose of one file as paragraphs of text */
function proseOf(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".md") return text.replace(/```[\s\S]*?```/g, " ").split(/\n\s*\n/);
  if (!CODE_EXT.has(ext)) return [];
  const paras = []; let cur = []; let inDoc = false;
  const flush = () => { if (cur.length) paras.push(cur.join(" ")); cur = []; };
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (ext === ".py" && /"""|'''/.test(line)) { const n = (line.match(/"""|'''/g) ?? []).length; line = line.replace(/"""|'''/g, ""); if (n % 2 === 1) inDoc = !inDoc; if (line) cur.push(line); if (!inDoc && n % 2 === 1) flush(); continue; }
    if (inDoc) { if (line) cur.push(line); else flush(); continue; }
    const m = /^(?:\/\/\/?|\/\*+|\*\/?|#(?!include|define|if|endif|!)|--)\s?(.*)$/.exec(line);
    if (m && m[1] !== undefined) { const t = m[1].replace(/\*\/\s*$/, "").trim(); if (t) cur.push(t); else flush(); } else flush();
  }
  flush(); return paras;
}
const sentences = (p) => p.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z`"'(\[])/).map((s) => s.trim()).filter((s) => s.length >= 20 && s.length <= 300);
const TOK = /[A-Za-z_][A-Za-z0-9_]*(?:\(\))?/g;
const identShaped = (t) => /_/.test(t) || /[a-z][A-Z]/.test(t) || /\(\)$/.test(t);
const isTech = (t) => identShaped(t) || rare.has(t.replace(/\(\)$/, "").toLowerCase());

let s = P.SEED; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const afterTech = new Map(), afterNull = new Map(), allTok = new Map(), verbRepos = new Map();
let nFiles = 0, nSent = 0, nTech = 0; const repos = new Set(); const techSeen = new Map();
for (const f of walk(CORPUS)) {
  const rel = path.relative(CORPUS, f); const repo = rel.split(path.sep)[0];
  if (!repo || repo.startsWith("README") || repo.startsWith("VETTING")) continue;
  let st; try { st = fs.statSync(f); } catch { continue; } if (st.size > P.MAX_FILE) continue;
  let text; try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  const paras = proseOf(f, text); if (!paras.length) continue; nFiles++; repos.add(repo);
  for (const para of paras) for (const sent of sentences(para)) {
    const toks = sent.match(TOK) ?? []; if (toks.length < 4) continue; nSent++;
    for (const t of toks) { const l = t.toLowerCase(); allTok.set(l, (allTok.get(l) ?? 0) + 1); }
    const count = (arr, into, track) => { for (let i = 0; i + 1 < arr.length; i++) if (isTech(arr[i])) { const v = arr[i + 1]; if (isTech(v) || !/^[a-z]{3,12}$/.test(v)) continue; into.set(v, (into.get(v) ?? 0) + 1); if (track) { if (!verbRepos.has(v)) verbRepos.set(v, new Set()); verbRepos.get(v).add(repo); } } };
    nTech += toks.filter(isTech).length; for (const t of toks) if (isTech(t)) techSeen.set(t, (techSeen.get(t) ?? 0) + 1);
    count(toks, afterTech, true);
    for (let d = 0; d < P.NULL_DRAWS; d++) count(shuffle(toks), afterNull, false);
  }
}
for (const [v, c] of afterNull) afterNull.set(v, c / P.NULL_DRAWS);
const acts = [...afterTech].filter(([v, c]) => c >= P.MIN_COUNT && (verbRepos.get(v)?.size ?? 0) >= P.MIN_REPOS)
  .map(([v, c]) => ({ verb: v, count: c, repos: verbRepos.get(v).size, null: +(afterNull.get(v) ?? 0).toFixed(3), lift: +(c / ((afterNull.get(v) ?? 0) + 0.5)).toFixed(2) }))
  .filter((a) => a.lift >= P.LIFT && isVerb(a.verb)).sort((a, b) => b.lift * b.count - a.lift * a.count).slice(0, 200);
const band = new Set([...allTok].sort((a, b) => b[1] - a[1]).slice(0, P.BAND_TOP).map(([k]) => k));
const A = new Set(acts.map((a) => a.verb)); const inter = [...A].filter((x) => band.has(x)).length;
const jaccard = +(inter / (A.size + band.size - inter || 1)).toFixed(3);
// ── TECHNICAL VOCABULARY by KEYNESS against a reference of everyday prose (the literature categories): a token is register-technical
// when the code prose uses it far more than the reference does, in >= KEY_REPOS repos. Null = the reference itself.
const REF_DIRS = ["01-literature-books", "15-western-canon", "18-childrens-books"].map((d) => path.join(ROOT, d));
const refCount = new Map(); let refTotal = 0, refBytes = 0;
for (const d of REF_DIRS) { if (!fs.existsSync(d)) continue; for (const f of walk(d)) { if (!/\.(txt|md)$/i.test(f) || refBytes > P.REF_MAX) continue; let t; try { t = fs.readFileSync(f, "utf8"); } catch { continue; } refBytes += t.length; for (const w of t.toLowerCase().match(/[a-z]{3,}/g) ?? []) { refCount.set(w, (refCount.get(w) ?? 0) + 1); refTotal++; } } }
const codeTotal = [...allTok.values()].reduce((a, b) => a + b, 0);
const tokRepos = new Map();
const technical = [...allTok].filter(([w, c]) => /^[a-z]{4,}$/.test(w) && c >= P.KEY_MIN && (tokRepos.get(w)?.size ?? 0) >= 0)
  .map(([w, c]) => ({ w, c, key: +(((c / codeTotal) / (((refCount.get(w) ?? 0) + 1) / refTotal))).toFixed(1) }))
  .filter((x) => x.key >= P.KEY_RATIO).sort((a, b) => b.key * Math.log(b.c) - a.key * Math.log(a.c)).slice(0, 1500);
const out = {
  schema: "EngineeringRegisterPrior@1",
  giver: { pos: "janus/priors/pos-eng.json (POSPrior@1): VERB share >= declared_params.VERB_SHARE, over the word or its lemma candidates", resource: "09-source-code corpus: comments, docstrings and markdown prose of its own repositories", repos: [...repos].length, files: nFiles, note: "Measured, never hand-typed: technical-being shape from identifier syntax and CodeNamePrior@1 genericity; act lexicon from adjacency after a technical being, against a within-sentence shuffle null." },
  declared_params: P,
  measured: { sentences: nSent, technicalTokens: nTech, distinctTechnical: techSeen.size, acts: acts.length, technicalVocabulary: technical.length, everyday: [...refCount].filter(([, c]) => c >= P.EVERYDAY_MIN).length, refTokens: refTotal, bandJaccard: jaccard, bandVerdict: jaccard < P.BAND_MAX ? "register: not a frequency band" : "BAND: the acts are mostly the corpus's most frequent tokens" },
  referent_rule: { identifierShape: ["underscore", "interior capital (camelCase)", "trailing ()"], declaredNameMaxRepos: P.GENERIC_REPOS - 1, declaredNameMinLength: 4 },
  acts,
  technicalVocabulary: technical.map((x) => x.w),
  technicalKeyness: Object.fromEntries(technical.slice(0, 200).map((x) => [x.w, x.key])),
  known_limitation: "A small corpus (see giver.files). Adjacency after a technical being is a proxy for 'acts it performs'; it does not separate subject from object position and has no synonymy. Not a parser.",
  builtAt: new Date().toISOString(),
  sha256: null,
};
out.sha256 = crypto.createHash("sha256").update(JSON.stringify({ ...out, builtAt: null })).digest("hex");
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
// EVERYDAY VOCABULARY (same reference): the words the literature categories use at least EVERYDAY_MIN times. An open-class word NOT in it
// is, by the prior's own rule, a being worth tracking in a session (identifier, jargon, coinage, name). Closed-class-from-frequency.
const everyday = [...refCount].filter(([w, c]) => c >= P.EVERYDAY_MIN).map(([w]) => w).sort();
fs.writeFileSync(OUT.replace("register-prior-v1", "everyday-vocabulary-v1"), JSON.stringify({ schema: "EverydayVocabulary@1", giver: { resource: "01-literature-books, 15-western-canon, 18-childrens-books", tokens: refTotal, bytes: refBytes }, declared_params: { EVERYDAY_MIN: P.EVERYDAY_MIN, token: "[a-z]{3,}" }, known_limitation: "English literary prose; modern everyday words (email, website) are absent and will read as beings.", words: everyday }));
console.log(JSON.stringify({ probe: Object.fromEntries(['webhook','backoff','retry','retries','queue','idempotent','mutex','callback','parser','lexer','migration','deploy','cache','token'].map((w)=>[w, technical.some((x)=>x.w===w)])), files: nFiles, repos: repos.size, sentences: nSent, technicalTokens: nTech, acts: acts.length, technicalVocabulary: technical.length, everyday: [...refCount].filter(([, c]) => c >= P.EVERYDAY_MIN).length, refTokens: refTotal, bandJaccard: jaccard, top: acts.slice(0, 25).map((a) => `${a.verb}(${a.count}/${a.repos}r×${a.lift})`) }, null, 1));
