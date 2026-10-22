// udhr-core/relations.mjs — step 5: relations AMONG referents, filed in the same log.
//
// Two standings, never mixed:
//   stated    the text itself says it. Anchored to a verbatim span (byte range) in an edition, checked against the
//             bytes at file time. The UDHR cites no article by number; what it states is SCOPE: a paragraph speaks of
//             "this Declaration" / "the rights and freedoms set forth herein", so a stated relation runs from a
//             paragraph (or the preamble) to the whole.
//   candidate an interpretive reading (tensions, groundings, classes). No text states it, so it has no anchor and
//             licenses nothing: nomination is not reasoning permission (khora admitHyperlexiconCandidates).
//
// Caveat carried in the data: statedness is READ in one edition (the span below is English bytes). Other editions
// witness it only through alignment of the stating paragraph, which assumes translation fidelity; that is counted
// (witnesses()), not verified. Verifying it in 515 other languages is the job of the convergence test (step 9).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DECLARATION, paragraphKey, articleKey } from "./referents.mjs";

export const RELATION_SCHEMA = "UDHRRelation@1";
export const SPEC = "holodeck/docs/CONSTITUTIVE-ETHOS-SPEC.md:172,227";
const A = articleKey, P = paragraphKey;

/** Stated: [kind, stating referent, quoted span (verbatim English), scope target]. */
export const STATED = [
  ["proclaims", "ref:udhr:preamble", "Proclaims this Universal Declaration of Human Rights as a common standard of achievement for all peoples and all nations", DECLARATION],
  ["scopes_over", P(2, 1), "all the rights and freedoms set forth in this Declaration", DECLARATION],
  ["protects_against_breach_of", P(7, 1), "discrimination in violation of this Declaration", DECLARATION],
  ["requires_realization_of", P(28, 1), "the rights and freedoms set forth in this Declaration can be fully realized", DECLARATION],
  ["limits_exercise_of", P(29, 2), "subject only to such limitations as are determined by law solely for the purpose of securing due recognition and respect for the rights and freedoms of others", DECLARATION],
  ["forbids_use_against", P(30, 1), "Nothing in this Declaration may be interpreted as implying for any State, group or person any right to engage in any activity or to perform any act aimed at the destruction of any of the rights and freedoms set forth herein", DECLARATION],
];

/** Candidate: [kind, left, right, basis]. Interpretive; no anchor. */
export const CANDIDATES = [
  ["tension_with", A(12), A(19), `${SPEC}: read conflicting rights together; privacy against seeking, receiving and imparting information`],
  ["tension_with", A(18), P(29, 2), `${SPEC}: Articles 18 and 29 read together; freedom to manifest belief against limits for morality, public order, welfare`],
  ["tension_with", A(19), P(29, 2), `${SPEC}: Articles 19 and 29 read together; expression against the same limitations clause`],
  ["tension_with", P(29, 2), P(30, 1), `${SPEC}: Articles 29 and 30 read together; the limits on exercise against the bar on using the Declaration to destroy rights`],
  ["grounds", P(1, 1), P(2, 1), "equality in dignity and rights offered as the ground of non-distinction; the text does not say so"],
  ...[23, 24, 25, 26, 27].map((n) => ["member_of_class", A(n), P(22, 1), `Article 22 names "economic, social and cultural rights"; which articles belong to that class is a reading, not stated`]),
];

const sha = (b) => createHash("sha256").update(b).digest("hex");
const relId = (kind, left, right) => `rel:udhr:${kind}:${left.replace("ref:udhr:", "")}->${right.replace("ref:udhr:", "")}`;

export function relate(ledger, { corpus, edition = "udhr-eng.txt" }) {
  const before = ledger.events.length;
  const gen = new Map(ledger.events.filter((e) => e.transform === "mint-referent").map((e) => [e.unit, e.event_id]));
  const need = (k) => { if (!gen.has(k)) throw new TypeError(`relate: no referent ${k}`); return gen.get(k); };
  const src = [...ledger.sources.values()].find((s) => s.locator.endsWith(edition));
  if (!src) throw new TypeError(`relate: edition ${edition} is not in the log`);
  const buf = readFileSync(new URL(edition, corpus));
  const members = new Map(ledger.events.filter((e) => e.transform === "member" && e.source_id === src.source_id).map((e) => [e.unit, e]));
  for (const [kind, left, quote, right] of STATED) {
    const m = members.get(left);
    if (!m) throw new TypeError(`relate: ${edition} has no member for ${left}`);
    const span = buf.subarray(m.range.start, m.range.end), q = Buffer.from(quote, "utf8");
    const at = span.indexOf(q);
    if (at < 0 || span.indexOf(q, at + 1) >= 0) throw new TypeError(`relate: "${quote.slice(0, 40)}…" must occur exactly once in ${left}`);
    const start = m.range.start + at;
    ledger.event({
      stage: "ground", source_id: src.source_id, parent: need(left), ibid: need(right), unit: relId(kind, left, right),
      range: { unit: "byte", start, end: start + q.length }, transform: "relate",
      detail: { schema: RELATION_SCHEMA, kind, left, right, standing: "stated", quoteSha256: sha(q), readIn: edition },
    });
  }
  for (const [kind, left, right, basis] of CANDIDATES) {
    ledger.event({ stage: "ground", parent: need(left), ibid: need(right), unit: relId(kind, left, right), transform: "relate", detail: { schema: RELATION_SCHEMA, kind, left, right, standing: "candidate", basis } });
  }
  return { added: ledger.events.length - before, stated: STATED.length, candidate: CANDIDATES.length };
}

/** Pure fold: each relation with how many editions witness it (are members of the stating/left referent). */
export function witnesses(ledger) {
  const mem = new Map();
  for (const e of ledger.events) if (e.transform === "member") { if (!mem.has(e.unit)) mem.set(e.unit, new Set()); mem.get(e.unit).add(e.source_id); }
  return ledger.events.filter((e) => e.transform === "relate").map((e) => {
    const l = mem.get(e.detail.left) ?? new Set(), r = mem.get(e.detail.right);
    const both = r ? [...l].filter((x) => r.has(x)).length : l.size;     // the declaration has no member events: the stating paragraph is the witness
    return { id: e.unit, kind: e.detail.kind, standing: e.detail.standing, left: e.detail.left, right: e.detail.right, editions: both };
  });
}
