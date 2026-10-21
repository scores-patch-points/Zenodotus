// project.mjs — what a Wiktionary entry says that makes a difference to an answer, and the gate on it.
//
// slimOf(entry): one wiktextract entry (word, lang_code, pos, senses, translations, …) → the slim record. It keeps what
// the default lookup answers from: the word, its language (Wiktionary's code and the fold suite's tag), part of speech,
// the senses' glosses, and translations. It drops what is large and either derivable or only needed on drill-down
// (etymology templates, sounds, categories, inflection tables, descendants, quotations). The source for all of it
// stays in the dump; the drop decides what the default answer reads, nothing is erased.
//
// Inflected-form senses are kept as a pointer to their lemma ({of: lemma, tags}) instead of a copy of the lemma's text.
// wiktextract repeats the parent gloss at every level of a sense ("Terms relating to animals." then "A mammal…"); the
// slim keeps each distinct gloss once, in order.
//
// normalizeWikitext(text): the gate for an EDIT. Strips what the slim projection never reads (comments, <ref>s, category
// and file links, whitespace runs); two revisions whose normalized text is identical cannot change a slim record, so the
// edit is not a difference that makes a difference. It is conservative the one way that matters: an edit it cannot prove
// harmless counts as a change.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SLIM_VERSION = 1;
// No word has one definition, and none is valid in every time and place. So the slim keeps EVERY sense, in Wiktionary's
// order, each with the qualifiers that say where and when it holds (tags: archaic, obsolete, dated, US, UK, Australia,
// dialectal, slang …; raw_tags and topics as written). A cap, if one is ever needed, is declared on the record
// (`more`: how many senses were left out), never silent. MAX_SENSES is a safety valve far above any real entry.
export const MAX_SENSES = 200, MAX_GLOSS_DEPTH = 3, MAX_TRANSLATIONS = 60, MAX_QUALIFIERS = 16;

const here = dirname(fileURLToPath(import.meta.url));
let SUITE = null;
function suiteTags() {
  if (SUITE) return SUITE;
  try { SUITE = JSON.parse(readFileSync(join(here, "suite-tags.json"), "utf8")).tags; } catch { SUITE = {}; }
  return SUITE;
}
/** Wiktionary's language code → the fold suite's tag. Where the suite has no tag for the code, the code stands and the
 *  record says so (`st: 0`): a typed gap, not a guess. */
export function tagOf(code) { return suiteTags()[code] ? { tag: code, inSuite: 1 } : { tag: code, inSuite: 0 }; }

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

export function slimOf(e) {
  if (!e || !e.word) return null;
  if (e.redirect) return { w: e.word, redirect: e.redirect };
  const senses = [];
  const all = e.senses || [];
  for (const s of all) {
    if (senses.length >= MAX_SENSES) break;
    // where and when the sense holds, exactly as Wiktionary states it
    const q = [...new Set([...(s.tags || []), ...(s.raw_tags || [])])].slice(0, MAX_QUALIFIERS);
    const topics = (s.topics || []).slice(0, 8);
    const fo = s.form_of?.[0]?.word ?? s.alt_of?.[0]?.word;
    const ctx = {}; if (q.length) ctx.tags = q; if (topics.length) ctx.topics = topics;
    if (fo) { senses.push({ of: fo, ...ctx }); continue; }
    const g = [...new Set((s.glosses || []).slice(-MAX_GLOSS_DEPTH))];
    if (g.length) senses.push({ g, ...ctx });
  }
  const t = (e.translations || []).slice(0, MAX_TRANSLATIONS).map((x) => [x.lang_code || x.code || "", x.word || ""]).filter((x) => x[1]);
  const { tag, inSuite } = tagOf(e.lang_code);
  const out = { w: e.word, c: e.lang_code, tag, st: inSuite, n: e.lang, p: e.pos, s: senses };
  if (all.length > senses.length) out.more = all.length - senses.length;
  if (t.length) out.t = t;
  return out;
}

export function normalizeWikitext(text) {
  return String(text ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/\[\[\s*(?:Category|Kategorie|File|Image)\s*:[^\]]*\]\]/gi, "")
    .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();
}
export const gateKey = (text) => sha256(normalizeWikitext(text));
