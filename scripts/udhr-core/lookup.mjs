// udhr-core/lookup.mjs — outside evidence (Wiktionary, later Wikidata) consulted ONLY when ingestion raises a need, never in bulk.
//
//   need      a being the language's POS prior has never seen (read-beings.mjs, `needs`). Forms the prior has settled are never looked up.
//   settle    a PURE, cache-backed function: "nominal" | "other" | null. Ingestion never waits on the network; an unanswered need stays a need.
//   queue     needs are ordered by how much they could matter (mentions x units spanned) and drained at the host's pace, in the background.
//   answer    when an answer lands in the cache the edition is re-read; if its conclusion changes, the mind log gets a record (the same
//             difference-that-makes-a-difference gate as every other record). An answer that changes nothing is cached and recorded nowhere.
// The network part is a plug (`fetchEntry`); this file contains no host name and does no I/O of its own.
export const UPOS = { noun: "NOUN", "proper noun": "PROPN", verb: "VERB", adjective: "ADJ", adverb: "ADV", pronoun: "PRON", preposition: "ADP", postposition: "ADP", conjunction: "CCONJ", determiner: "DET", article: "DET", numeral: "NUM", particle: "PART", interjection: "INTJ", "verb form": "VERB", participle: "VERB" };
const NOMINAL = new Set(["NOUN", "PROPN"]);

/** entries: Map|object form -> { [langCode]: [{ pos, glosses }] } | null (looked up, no page). Returns the pure settle(form). */
export function makeSettler(entries, wd) {
  const get = (f) => (entries instanceof Map ? entries.get(f) : entries[f]);
  return (form) => {
    const e = get(form);
    if (e === undefined) return null;                    // never looked up: still a need
    const secs = e?.[wd];
    if (!secs?.length) return null;                      // looked up, no entry in THIS language: nothing learned, not a verdict
    const tags = new Set(secs.map((s) => UPOS[s.pos]).filter(Boolean));
    if (!tags.size) return null;
    return [...tags].some((t) => NOMINAL.has(t)) ? "nominal" : "other";
  };
}

/** Needs in priority order: what could move the conclusion most goes first. */
export const prioritise = (needs) => [...needs].sort((a, b) => b.mentions * b.units - a.mentions * a.units || (a.surface < b.surface ? -1 : 1));

/** Drain the queue through a plug. `fetchEntry(form)` -> entry | null. Calls `onAnswer(form, entry)` after each, so the caller can re-read and decide. */
export async function drain(needs, { fetchEntry, onAnswer, limit = Infinity, seen = new Set() }) {
  let n = 0;
  for (const need of prioritise(needs)) {
    if (n >= limit || seen.has(need.surface)) continue;
    const entry = await fetchEntry(need.surface);
    seen.add(need.surface); n++;
    await onAnswer(need.surface, entry);
  }
  return n;
}
