// udhr-core/referents.mjs — step 4: mint the nameless referents and record each edition's unit as evidence for one.
//
// A referent has no name in any language and no source: its id is its STRUCTURAL position in the Declaration
// (preamble | article N | paragraph K of article N). Editions are members, never the definition. The structure
// (which referents exist: how many paragraphs each article holds) is the MODE over the frozen edition set, not
// any one edition's count; English is checked against it, not used as it.
// Pure over the ledger: appends events, idempotent by content, no I/O.
export const REFERENT_SCHEMA = "UDHRReferents@1";
export const PREAMBLE = "preamble";
export const articleKey = (n) => `ref:udhr:article:${n}`;
export const paragraphKey = (unit, k) => `ref:udhr:${unit === PREAMBLE ? PREAMBLE : `article:${unit}`}:p:${k}`;
const unitKey = (unit) => (unit === PREAMBLE ? "ref:udhr:preamble" : articleKey(unit));
export const MAJORITY = 0.5;
export const DECLARATION = "ref:udhr:declaration";
const ORDER = [PREAMBLE, ...Array.from({ length: 30 }, (_, i) => i + 1)];

/** The edition units already in the ledger: Map(source_id -> Map(unit -> arrange event)). */
function editionUnits(ledger) {
  const bySource = new Map();
  for (const e of ledger.events) {
    if (e.stage !== "arrange" || !e.unit || e.unit === "title") continue;
    const u = e.unit === "preamble" ? PREAMBLE : +e.unit.slice(8);
    if (!bySource.has(e.source_id)) bySource.set(e.source_id, new Map());
    bySource.get(e.source_id).set(u, e);
  }
  return bySource;
}

/** Mode of the paragraph count per unit over every segmented edition (ties go to the smaller count: determinism). */
export function modalParagraphs(units) {
  const out = new Map();
  for (const u of ORDER) {
    const tally = new Map();
    for (const m of units.values()) { const e = m.get(u); if (e) tally.set(e.detail.paragraphs.length, (tally.get(e.detail.paragraphs.length) ?? 0) + 1); }
    const best = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    out.set(u, { count: best?.[0] ?? 0, support: best?.[1] ?? 0, of: [...units.values()].filter((m) => m.has(u)).length, tally: Object.fromEntries([...tally].sort((a, b) => a[0] - b[0])) });
  }
  return out;
}

export function mintReferents(ledger, { setRoot } = {}) {
  const before = ledger.events.length, units = editionUnits(ledger), modal = modalParagraphs(units);
  const genesis = new Map();                                                    // structural key -> genesis event id
  const mint = (key, kind, extra) => genesis.set(key, ledger.event({ stage: "ground", unit: key, transform: "mint-referent", detail: { schema: REFERENT_SCHEMA, kind, ...extra, setRoot } }));
  mint(DECLARATION, "declaration", {});                                          // the whole: the target of "this Declaration" / "the rights and freedoms set forth herein"
  for (const u of ORDER) {
    const m = modal.get(u), shared = m.of > 0 && m.support / m.of > MAJORITY;   // a plurality is not a shared structure
    mint(unitKey(u), u === PREAMBLE ? "preamble" : "article", { paragraphs: shared ? m.count : null, ...(shared ? {} : { paragraphStructure: "no majority across editions" }) });
    if (shared) for (let k = 1; k <= m.count; k++) mint(paragraphKey(u, k), "paragraph", { of: unitKey(u), k });
    m.shared = shared;
  }
  let members = 0, divergent = 0;
  for (const [source_id, byUnit] of [...units].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const u of ORDER) {
      const ev = byUnit.get(u);
      if (!ev) continue;                                                         // edition lacks this unit (e.g. no preamble): not a member, not an error
      const ev_ = { method: ev.transform.replace("segment:", ""), numberCheck: ev.detail.numberCheck, confidence: ev.detail.confidence };
      const mu = modal.get(u), want = mu.count, have = ev.detail.paragraphs.length, fits = mu.shared && have === want;
      ledger.event({ stage: "ground", source_id, parent: ev.event_id, ibid: genesis.get(unitKey(u)), unit: unitKey(u), range: ev.range, transform: "member", detail: { ...ev_, paragraphs: have, ...(fits ? {} : mu.shared ? { paragraphDivergence: { have, modal: want } } : {}) } });
      members++;
      if (!mu.shared) continue;                                                  // no shared paragraph structure to align to
      if (!fits) { divergent++; continue; }                                      // paragraph structure differs: member at article level only; a variant, not a guess
      ev.detail.paragraphs.forEach(([start, end], i) => {
        ledger.event({ stage: "ground", source_id, parent: ev.event_id, ibid: genesis.get(paragraphKey(u, i + 1)), unit: paragraphKey(u, i + 1), range: { unit: "byte", start, end }, transform: "member", detail: ev_ });
      });
    }
  }
  return { added: ledger.events.length - before, referents: genesis.size, articleMembers: members, paragraphDivergent: divergent, modal };
}

/** Pure fold: per referent, how many editions are members, by segmentation method. */
export function coverage(ledger) {
  const out = new Map();
  for (const e of ledger.events) {
    if (e.stage !== "ground" || e.transform !== "member") continue;
    const c = out.get(e.unit) ?? { editions: new Set(), methods: {} };
    c.editions.add(e.source_id);
    const m = e.detail.method; c.methods[m] = (c.methods[m] ?? 0) + 1;
    out.set(e.unit, c);
  }
  return new Map([...out].map(([k, v]) => [k, { editions: v.editions.size, methods: v.methods }]));
}
