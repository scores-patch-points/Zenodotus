// udhr-core/hybrid-settle.mjs — the settlement policy for a word the prior does not know: Wiktionary when it speaks with one voice, the sniff when it does not.
//
//   pure     every POS Wiktionary lists for the word in this language is nominal, or none is   -> that verdict ("nominal" | "other")
//   mixed    some are, some are not (noun/verb, adjective/noun ...): a verdict about the WORD, not about THIS sentence   -> the accepted sniff vote, else null
//   unasked  no entry (never looked up, or no entry in this language)                          -> the accepted sniff vote, else null  (provisional)
// Measured on the 64 English UDHR words (sniff-udhr64-gold.mjs): 96.2% agreement with the in-sentence role over the 53 it settles, against 89.1% for the
// type-level rule "nominal iff any listed POS is nominal" over all 64; the English reading is identical under both. `sniffed` holds ACCEPTED votes only.
// Pure and cache-backed like lookup.mjs makeSettler: no network, no embedder. `settle.why(form)` says which branch answered, for the log.
const NOMTAG = new Set(["noun", "proper noun"]);

export function entryKind(entry, wd) {
  const tags = (entry?.[wd] ?? []).map((s) => s.pos).filter(Boolean);
  if (!tags.length) return null;
  const nn = tags.filter((t) => NOMTAG.has(t)).length;
  return nn === tags.length ? "pure-nominal" : nn === 0 ? "pure-other" : "mixed";
}

export function makeHybridSettler(entries, wd, sniffed = new Map()) {
  const get = (f) => (entries instanceof Map ? entries.get(f) : entries[f]);
  const why = (form) => {
    const k = entryKind(get(form), wd);
    if (k === "pure-nominal") return { verdict: "nominal", source: "wiktionary-pure" };
    if (k === "pure-other") return { verdict: "other", source: "wiktionary-pure" };
    const s = sniffed.get(form);
    return s ? { verdict: s, source: k === "mixed" ? "sniff-mixed" : "sniff-unasked" } : null;
  };
  const settle = (form) => why(form)?.verdict ?? null;
  settle.why = (form) => why(form);
  return settle;
}
