// udhr-core/mind.mjs — step 11: "the mind" is the log folded at a cursor. A pure function; no new store.
//   mindAt(ledger, { cursor, epochs }) -> { cursor, charterRoot, referents, stated, candidates, variants, convergence, judgment }
// What stands = the charter root and the relations the text states. What is withheld = interpretive candidates.
// What is refuted = epochs on penelope's record that came out refuted (none so far). Variants stay beside the referents.
import { structureOf, structureRoot } from "./charter.mjs";
import { witnesses } from "./relations.mjs";
import { renderJudgment } from "../../../penelope/organs/hyperlexicon-record.mjs";

export function mindAt(ledger, { cursor = ledger.events.length, epochs = [] } = {}) {
  const view = { events: ledger.events.slice(0, cursor), sources: ledger.sources };
  const st = structureOf(view);
  const rels = witnesses(view);
  const stated = rels.filter((r) => r.standing === "stated"), candidates = rels.filter((r) => r.standing === "candidate");
  const variants = view.events.filter((e) => e.transform === "variant");
  const byType = variants.reduce((m, e) => (m[e.detail.type] = (m[e.detail.type] ?? 0) + 1, m), {});
  const conv = view.events.filter((e) => e.transform === "convergence").at(-1)?.detail ?? null;
  const refuted = epochs.filter((e) => e.status === "refuted").map((e) => e.id);
  const root = st.referents.length ? structureRoot(view) : null;
  const earned = root ? [`charter:udhr@${root}`, ...stated.map((r) => r.id)] : [];
  const judgment = renderJudgment({ earned, candidates: candidates.map((r) => r.id), refuted, priorEntries: st.referents });
  return {
    cursor, charterRoot: root,
    referents: st.referents.length,
    stated: stated.map((r) => ({ id: r.id, editions: r.editions })),
    candidates: candidates.map((r) => ({ id: r.id, editions: r.editions })),
    variants: { total: variants.length, byType },
    convergence: conv && { holds: conv.holds, claimK: conv.claimK, draws: conv.draws, articleExactAtClaim: conv.curve.find((c) => c.k === conv.claimK)?.articleExact, softest: conv.softest },
    refuted,
    judgment,
  };
}
