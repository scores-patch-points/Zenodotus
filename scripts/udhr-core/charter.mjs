// udhr-core/charter.mjs — step 7 (+ the binding half of 8): the charter root and the hyperlexicon rows bound to it.
//
// The root is a hash of the STRUCTURE, never of any edition's bytes: which referents exist (kind, paragraph count)
// and which relations the text STATES between them. Candidates are not ground and are not in it. Adding or
// removing an edition changes evidence, not the root; the root changes only if the shared structure changes.
//
// The charter object keeps the shape khora already consumes (UDHRCharter@1: giver, sha256, protections, prohibitions),
// so it drops into resolveForeclosingKind / charterAffordances / licenseStanding unchanged. Its protection and
// prohibition SURFACES come from khora's existing English-pattern extractor (buildUdhCharter) run over the English
// edition; that extractor is language-bound and is reused as-is, not extended here.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildUdhCharter, charterAffordances } from "../../../khora/native/organs/charter.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../../khora/native/kernel/hyperlexicon.js";

export const CHARTER_ROOT_SCHEMA = "UDHRCharterRoot@1";
export const GIVER = "Universal Declaration of Human Rights — UN General Assembly resolution 217 A (III), Paris, 10 December 1948; read as the structure shared by the frozen set of OHCHR editions";
const short = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);   // project short-digest convention

/** The canonical structure: referents + STATED relations, sorted, evidence and set-root excluded. */
export function structureOf(ledger) {
  const referents = ledger.events.filter((e) => e.transform === "mint-referent")
    .map((e) => [e.unit, e.detail.kind, e.detail.paragraphs ?? null]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const relations = ledger.events.filter((e) => e.transform === "relate" && e.detail.standing === "stated")
    .map((e) => [e.detail.kind, e.detail.left, e.detail.right]).sort((a, b) => (a.join() < b.join() ? -1 : 1));
  return { schema: CHARTER_ROOT_SCHEMA, referents, relations };
}
export const structureRoot = (ledger) => short(JSON.stringify(structureOf(ledger)));

/** File the root in the log as an epoch (idempotent by content). */
export function fileRoot(ledger, { setRoot } = {}) {
  const st = structureOf(ledger);
  return ledger.event({ stage: "ground", unit: "charter:udhr", transform: "charter", detail: { schema: CHARTER_ROOT_SCHEMA, root: short(JSON.stringify(st)), referents: st.referents.length, statedRelations: st.relations.length, setRoot } });
}

/** The charter khora consumes. sha256 is the structure root; the English text hash is kept as provenance. */
export function charterOf(ledger, { corpus, edition = "udhr-eng.txt" }) {
  const text = readFileSync(new URL(edition, corpus), "utf8");
  const base = buildUdhCharter(text, { giver: GIVER });
  const withReferents = (table) => Object.fromEntries(Object.entries(table).map(([k, v]) => [k, { ...v, referents: v.articles.map((n) => `ref:udhr:article:${n}`) }]));
  return Object.freeze({
    ...base,
    sha256: structureRoot(ledger),
    textSha256: base.sha256,
    // khora keys its substrate cache on sha256 alone, so the root is the ground's identity there. The extracted
    // rights tables are a language-bound projection of the structure; they get their own digest so a change to
    // the extractor is visible without moving the root.
    tablesSha256: short(JSON.stringify([base.protections, base.prohibitions])),
    ground: Object.freeze({ kind: "referent-structure", readIn: edition, note: "surfaces extracted from the English edition by khora's pattern extractor; the binding is the structure root" }),
    protections: withReferents(base.protections),
    prohibitions: withReferents(base.prohibitions),
    statedRelations: structureOf(ledger).relations,        // carried beside the charter; khora has no composition semantics for them yet
  });
}

/** Give every charter row to a hyperlexicon, bound to the root, witnessed by the referents' genesis events. */
export function bindHyperlexicon(charter, ledger, hl = createHyperlexicon({})) {
  const gen = new Map(ledger.events.filter((e) => e.transform === "mint-referent").map((e) => [e.unit, e.event_id]));
  const table = { prohibit: charter.prohibitions, protect: charter.protections };
  let h = hl;
  for (const row of charterAffordances(charter)) {
    const info = table[row.left]?.[row.right];
    const referents = info?.referents ?? [];
    h = giveHyperlexiconAffordance(h, {
      left: row.left, right: row.right, giver: row.giver, binding: charter.sha256,
      witnesses: referents.map((k) => gen.get(k)).filter(Boolean),
      meta: { surfaces: row.surfaces, referents, charterRoot: charter.sha256 },
    });
  }
  return h;
}
