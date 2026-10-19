// udhr-core/variants.mjs — step 6: divergent readings as first-class events hanging off the referents.
//
// Textual criticism separates scribal error from real revision. What this pass can see is limited to what the
// segmenter measures: how many paragraphs an edition gives a unit, and whether it has the unit at all (clause-level
// wording is not aligned yet). Variants are therefore typed by EVIDENCE, and the textual-criticism reading is
// offered as a hypothesis, not asserted:
//
//   attested        >= 2 editions, from >= 2 language stems, read DIRECTLY (by the source's own layout or numbered
//                   headings, not inferred from the template). A revision-candidate.
//   singular        one directly-read edition, or all carriers share one language stem. An error-candidate.
//   artifact-suspect  no carrier was read directly: only the structural DP, which leans on the template, saw it.
//   unsettled       the unit has no majority structure (the preamble): every observed count is filed, none is "the" one.
//   omission        the edition has no such unit at all.
//
// "Independent" is weaker than it sounds: the language stem (code before "_") is the only independence proxy in the
// repo; shared ancestry between translations is not recoverable from the sidecars. Attested is not proven independent.
export const VARIANT_SCHEMA = "UDHRVariant@1";
export const DIRECT = new Set(["layout", "numbered"]);

/** Pure: type a variant from its evidence. */
export function classify({ editions, languageStems, directRead }) {
  if (directRead === 0) return "artifact-suspect";
  if (directRead >= 2 && languageStems >= 2) return "attested";
  return "singular";
}
const CRITICISM = { attested: "revision-candidate", singular: "error-candidate" };
const stemOf = (locator) => locator.split("/").pop().replace(/^udhr-|\.txt$/g, "").split("_")[0].replace(/\d+$/, "") || locator;

export function fileVariants(ledger) {
  const before = ledger.events.length;
  const gen = new Map(ledger.events.filter((e) => e.transform === "mint-referent").map((e) => [e.unit, e]));
  const loc = new Map([...ledger.sources.values()].map((s) => [s.source_id, s.locator]));
  const groups = new Map();                                            // referent|kind|value -> { modal, unsettled, rows[] }
  const add = (referent, kind, value, row, extra = {}) => {
    const k = `${referent}\0${kind}\0${value}`;
    if (!groups.has(k)) groups.set(k, { referent, kind, value, ...extra, rows: [] });
    groups.get(k).rows.push(row);
  };
  const units = new Map();                                             // source_id -> Set(unit) for omissions
  for (const e of ledger.events) {
    if (e.transform !== "member" || !/^ref:udhr:(preamble|article:\d+)$/.test(e.unit)) continue;
    if (!units.has(e.source_id)) units.set(e.source_id, new Set());
    units.get(e.source_id).add(e.unit);
    const row = { source_id: e.source_id, method: e.detail.method };
    const g = gen.get(e.unit);
    if (e.detail.paragraphDivergence) add(e.unit, "paragraph-count", e.detail.paragraphDivergence.have, row, { modal: e.detail.paragraphDivergence.modal });
    else if (g.detail.paragraphs == null) add(e.unit, "paragraph-count", e.detail.paragraphs, row, { modal: null, unsettled: true });
  }
  for (const [source_id, have] of units) if (!have.has("ref:udhr:preamble")) add("ref:udhr:preamble", "omission", "absent", { source_id, method: null }, { modal: null, omission: true });
  for (const g of [...groups.values()].sort((a, b) => (`${a.referent}${a.kind}${a.value}` < `${b.referent}${b.kind}${b.value}` ? -1 : 1))) {
    const eds = [...new Set(g.rows.map((r) => r.source_id))].sort();
    const methods = g.rows.reduce((m, r) => (r.method && (m[r.method] = (m[r.method] ?? 0) + 1), m), {});
    const directRead = g.rows.filter((r) => DIRECT.has(r.method)).length;
    const stems = new Set(eds.map((s) => stemOf(loc.get(s)))).size;
    const type = g.omission ? "omission" : g.unsettled ? "unsettled" : classify({ editions: eds.length, languageStems: stems, directRead });
    ledger.event({
      stage: "ground", unit: g.referent, parent: gen.get(g.referent).event_id, transform: "variant",
      detail: { schema: VARIANT_SCHEMA, kind: g.kind, value: g.value, modal: g.modal ?? null, type, textualCriticism: CRITICISM[type] ?? null, support: { editions: eds.length, languageStems: stems, directRead }, segmentation: methods, editions: eds },
    });
  }
  return { added: ledger.events.length - before };
}
