// udhr-core/derive-gold.mjs — steps 1, 2 and 4 of PLAN-GOLD-SPANS.md.
// Derive tight sub-paragraph byte spans for the hand-adjudicated propositions from the surface strings the annotators
// already wrote (end1 / label / end2) and the golden `anchor` phrase. Nothing under Zenodotus/ or janus/ is edited; the
// output is a sidecar. Rules come from reading the residue by hand (see PLAN-GOLD-SPANS.md, "Lessons"):
//   relation = SET of ranges (ordered tokens with gaps), anchor first for repeats, `resolved` subjects are LINKS not
//   surfaces, bracketed `[xx]` tags are IMPLICIT, the window grows to the preceding block when the gold says so.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { blocksOf } from "./segment.mjs";

export const CORPUS = new URL("../../06-government-legal/un-udhr/", import.meta.url);
export const PRIORS = new URL("../../../janus/priors/", import.meta.url);
export const OUT = new URL("./gold/", import.meta.url);
export const EDITIONS = { eng: "udhr.golden.json", spa: "udhr-spa.golden.json", arb: "udhr-arb.golden.json", cmn_hans: "udhr-cmn_hans.golden.json", swh: "udhr-swh.golden.json" };
export const SCHEMA = "UDHRGoldSpans@1";
export const MAXGAP = 60;                       // characters of folded text allowed between the tokens of one relation
const CLITIC = /[\p{Script=Arabic}\p{Script=Hebrew}]/u;                // scripts that write proclitics (wa-, li-, bi-) onto the word
const NOSPACE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const sha = (b) => createHash("sha256").update(b).digest("hex");

/** Fold text for matching: punctuation/space -> single space, NFC, lowercase. Keeps a byte range per folded code point. */
export function fold(text, base = 0) {
  const cps = [], map = []; let pos = base, prevSpace = true;
  for (const ch of text) {
    const n = Buffer.byteLength(ch, "utf8");
    if (/[\s\p{P}\p{S}]/u.test(ch)) { if (!prevSpace) { cps.push(" "); map.push([pos, pos + n]); prevSpace = true; } }
    else { for (const c of ch.normalize("NFC").toLocaleLowerCase()) { cps.push(c); map.push([pos, pos + n]); } prevSpace = false; }
    pos += n;
  }
  while (cps.at(-1) === " ") { cps.pop(); map.pop(); }
  return { cps, map };
}
const foldNeedle = (s) => fold(s).cps;
const eq = (cps, i, nd) => { for (let k = 0; k < nd.length; k++) if (cps[i + k] !== nd[k]) return false; return true; };
const spaced = (nd) => !NOSPACE.test(nd.join(""));
const bounded = (cps, i, len) => (i === 0 || cps[i - 1] === " ") && (i + len === cps.length || cps[i + len] === " ");

/** Contiguous occurrences of a folded needle: [{i, len}] */
export function occurrences(F, needle, loose = false) {
  const nd = foldNeedle(needle), out = [];
  if (!nd.length) return out;
  for (let i = 0; i + nd.length <= F.cps.length; i++) if (eq(F.cps, i, nd) && (loose || !spaced(nd) || bounded(F.cps, i, nd.length))) out.push({ i, len: nd.length });
  return out;
}
const rangeOf = (F, i, len) => [F.map[i][0], F.map[i + len - 1][1]];

/** Ordered-token match for a relation whose words are interrupted in the text: each token after the first within MAXGAP. */
export function subsequence(F, label) {
  const toks = foldNeedle(label).join("").split(" ").filter(Boolean).map((t) => [...t]);
  if (toks.length < 2) return [];
  const found = [];
  for (let i = 0; i < F.cps.length; i++) {
    if (!eq(F.cps, i, toks[0]) || !bounded(F.cps, i, toks[0].length)) continue;
    let at = i + toks[0].length; const parts = [[i, toks[0].length]];
    for (let t = 1; t < toks.length; t++) {
      let hit = -1;
      for (let j = at; j < Math.min(F.cps.length, at + MAXGAP); j++) if (eq(F.cps, j, toks[t]) && bounded(F.cps, j, toks[t].length)) { hit = j; break; }
      if (hit < 0) { parts.length = 0; break; }
      parts.push([hit, toks[t].length]); at = hit + toks[t].length;
    }
    if (parts.length === toks.length) found.push(parts);
  }
  return found.map((parts) => {                                       // merge tokens that touch
    const rs = parts.map(([s, l]) => rangeOf(F, s, l)), merged = [rs[0].slice()];
    for (const r of rs.slice(1)) { const last = merged.at(-1); if (r[0] - last[1] <= 1) last[1] = r[1]; else merged.push(r.slice()); }
    return merged;
  });
}

const within = (rs, a) => rs.every(([s, e]) => s >= a[0] && e <= a[1]);
const overlaps = (rs, a) => rs.some(([s, e]) => s < a[1] && e > a[0]);

/** Derive one slot. `slot` is "subject" | "relation" | "object". Returns { status, ranges, rule, candidates? }. */
export function deriveSlot({ slot, surface, F, anchor, resolved }) {
  if (!surface) return { status: "none", ranges: [] };
  if (/\[[^\]]+\]/.test(surface)) return { status: "implicit", ranges: [], rule: "bracketed tag: an elided word has no surface" };
  let cands = occurrences(F, surface).map(({ i, len }) => [rangeOf(F, i, len)]);
  let how = "contiguous";
  if (!cands.length && CLITIC.test(surface)) { cands = occurrences(F, surface, true).map(({ i, len }) => [rangeOf(F, i, len)]); how = "inside a token (clitic or inflection)"; }
  if (!cands.length && slot === "relation") { cands = subsequence(F, surface); how = "ordered tokens with gaps"; }
  if (resolved && slot === "subject") {
    if (cands.length === 1) return { status: "link-provisional", ranges: cands[0], rule: "resolved subject; one surface in the window, taken as the antecedent (unverified)", candidates: cands };
    return { status: cands.length ? "link-ambiguous" : "link-absent", ranges: [], rule: "resolved subject", candidates: cands };
  }
  if (!cands.length) return { status: "missing", ranges: [], rule: "not found by contiguous or ordered-token match" };
  if (cands.length === 1) return { status: how === "contiguous" ? "unique" : how.startsWith("inside") ? "clitic" : "discontinuous", ranges: cands[0], rule: how };
  if (anchor) {
    const inA = cands.filter((rs) => within(rs, anchor));
    if (inA.length === 1) return { status: "disambiguated", ranges: inA[0], rule: "inside the golden anchor phrase", candidates: cands };
    if (!inA.length) { const ov = cands.filter((rs) => overlaps(rs, anchor)); if (ov.length === 1) return { status: "disambiguated", ranges: ov[0], rule: "overlaps the golden anchor phrase", candidates: cands }; }
  }
  return { status: "ambiguous", ranges: [], rule: `${cands.length} candidates and the anchor does not choose`, candidates: cands };
}

const LOOKBACK = /preceding|previous|prior/i;

export function deriveEdition(code) {
  const textBuf = readFileSync(new URL(`udhr-${code}.txt`, CORPUS)), text = textBuf.toString("utf8");
  const obs = readFileSync(new URL(`udhr-${code}.txt.hand.eot.jsonl`, CORPUS), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1");
  const gold = JSON.parse(readFileSync(new URL(EDITIONS[code], PRIORS), "utf8")).rows;
  if (gold.length !== obs.length) throw new TypeError(`${code}: ${obs.length} hand rows vs ${gold.length} golden rows`);
  const { blocks } = blocksOf(text);
  const rows = obs.map((o, n) => {
    const g = gold[n];
    if (g.prop !== o.prop || g.ground !== o.ground) throw new TypeError(`${code} row ${n}: hand ${o.prop}|${o.ground} vs golden ${g.prop}|${g.ground}`);
    const base = { schema: SCHEMA, edition: code, id: o.id, prop: o.prop, ground: o.ground, at: o.at };
    if (!o.end1 && !o.end2) return { ...base, kind: "heading", slots: { heading: { status: "unique", ranges: [[o.at[0], o.at[1]]], rule: "whole heading line (as filed)" } } };
    const bi = blocks.findIndex((b) => b.end > o.at[0] && b.start < o.at[1]);
    const lookback = LOOKBACK.test(o.resolutionNote ?? "") && bi > 0;
    const w = [lookback ? blocks[bi - 1].start : o.at[0], o.at[1]];
    const F = fold(textBuf.subarray(w[0], w[1]).toString("utf8"), w[0]);
    const aHits = g.anchor ? occurrences(F, g.anchor) : [];
    const anchor = aHits.length === 1 ? rangeOf(F, aHits[0].i, aHits[0].len) : null;
    const resolved = o.subjectBasis === "resolved";
    const slots = {
      subject: deriveSlot({ slot: "subject", surface: o.end1, F, anchor, resolved }),
      relation: deriveSlot({ slot: "relation", surface: o.label, F, anchor }),
      object: deriveSlot({ slot: "object", surface: o.end2, F, anchor }),
    };
    return { ...base, kind: "proposition", window: w, lookback, anchor, subjectBasis: o.subjectBasis, slots };
  });
  return { code, rows, sources: { text: sha(textBuf), hand: sha(readFileSync(new URL(`udhr-${code}.txt.hand.eot.jsonl`, CORPUS))), golden: sha(readFileSync(new URL(EDITIONS[code], PRIORS))) } };
}

/** Residue = what a person must decide. Implicit slots and provisional links are NOT residue; they are recorded values. */
export const RESIDUE = new Set(["ambiguous", "missing", "link-ambiguous", "link-absent"]);

const obsCache = new Map();
function obsSurface(code, id, field) {
  if (!obsCache.has(code)) obsCache.set(code, new Map(readFileSync(new URL(`udhr-${code}.txt.hand.eot.jsonl`, CORPUS), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1").map((r) => [r.id, r])));
  return obsCache.get(code).get(id)?.[field] ?? null;
}

/** Apply the person-confirmed proposals (gold/residue-proposals.json) to the derived rows. Mutates rows; returns the count. */
export function applyProposals(rowsByEdition, residue, proposals) {
  let applied = 0;
  for (const it of proposals.items) {
    const x = residue[it.n - 1];
    if (!x) throw new TypeError(`proposal ${it.n} has no residue item`);
    const rows = rowsByEdition[x.edition], row = rows.find((r) => r.id === x.id);
    const buf = readFileSync(new URL(`udhr-${x.edition}.txt`, CORPUS));
    const win = (re) => { const t = buf.subarray(row.window[0], row.window[1]).toString("utf8"); const m = re.exec(t); if (!m) throw new TypeError(`proposal ${it.n}: ${re} not in window`); const a = row.window[0] + Buffer.byteLength(t.slice(0, m.index)); return [a, a + Buffer.byteLength(m[0])]; };
    let ranges, status = x.slot === "subject" ? "link-adjudicated" : "adjudicated", rule = `adjudicated: ${it.why}`;
    if (it.choose) ranges = x.candidates[it.choose - 1];
    else if (it.n === 4) ranges = [win(/dotados/u), win(/están/u)];
    else if (it.n === 6) { const [a] = win(/\ba casarse/u); ranges = [win(/tienen derecho/u), [a, a + 1]]; }
    else if (it.n === 8) ranges = [win(/للرجل والمرأة/u)];
    else if (it.n === 17) { const src = rows.find((r) => r.prop === "udhr:entitled-to-rights"); ranges = src.slots.subject.ranges; status = "link-adjudicated"; rule += " (links to the subject of udhr:entitled-to-rights, Article 2 paragraph 1)"; }
    else throw new TypeError(`proposal ${it.n}: nothing to apply`);
    row.slots[x.slot] = { status, ranges, rule, adjudicated: { by: "proposed by Claude; accepted by the user's instruction to finish", confidence: it.confidence, residueStatus: x.status } };
    applied++;
  }
  return applied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const inputs = {}, summary = {}, residue = [], derived = {};
  for (const code of Object.keys(EDITIONS)) {
    const d = deriveEdition(code);
    inputs[code] = d.sources; derived[code] = d.rows;
    const s = {};
    for (const r of d.rows) for (const [slot, v] of Object.entries(r.slots)) {
      s[v.status] = (s[v.status] ?? 0) + 1;
      if (RESIDUE.has(v.status)) residue.push({ edition: code, id: r.id, prop: r.prop, ground: r.ground, slot, status: v.status, surface: slot === "subject" ? obsSurface(code, r.id, "end1") : slot === "relation" ? obsSurface(code, r.id, "label") : obsSurface(code, r.id, "end2"), candidates: v.candidates ?? [] });
    }
    summary[code] = s;
  }
  writeFileSync(new URL("residue.json", OUT), JSON.stringify(residue, null, 1) + "\n");      // what was asked, before adjudication
  const proposals = JSON.parse(readFileSync(new URL("residue-proposals.json", OUT), "utf8"));
  console.log("adjudications applied:", applyProposals(derived, residue, proposals));
  for (const code of Object.keys(EDITIONS)) writeFileSync(new URL(`udhr-${code}.spans.jsonl`, OUT), derived[code].map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(new URL("inputs.json", OUT), JSON.stringify({ schema: "UDHRGoldInputs@1", maxGap: MAXGAP, inputs }, null, 1) + "\n");
  console.log(JSON.stringify(summary, null, 1)); console.log("residue:", residue.length);
}
