// fast-read.mjs — a structural reader for Wiktionary wikitext: a first pass without template expansion.
//
// A page is a tree: `==Language==` › `===Part of speech===` › `#` senses (nested by `##`), with `{{t|fr|chat}}` translation
// pairs under `====Translations====`. This reads that tree directly. Templates are COLLAPSED TO TOKENS, not expanded:
//   {{lb|en|archaic|slang}} {{q|…}}    → the qualifiers of the sense (where and when it holds), kept, not lost in the gloss
//   {{plural of|en|cat}} {{… of|…}}    → a form-of pointer {of: cat}
//   {{n-g|x}} {{gloss|x}} {{l|en|x}}   → their text
// Anything else it cannot read is counted per sense (`gaps`): a typed gap, so a page it did not fully read is known and can
// be sent to wiktextract, the exact path. It never guesses a gloss. No word has one definition and none holds everywhere, so
// every sense is kept, in order, with its qualifiers.
//
// Output entries mirror the slim record shape of project.mjs, with `n` (language NAME). The language CODE comes from a
// name→code table built from wiktextract's own output (`--codes`), because the names are on the page and the codes are not.
const POS = new Set(["Noun", "Proper noun", "Verb", "Adjective", "Adverb", "Pronoun", "Preposition", "Postposition", "Conjunction", "Interjection",
  "Determiner", "Article", "Particle", "Numeral", "Number", "Prefix", "Suffix", "Infix", "Circumfix", "Interfix", "Affix", "Phrase", "Proverb", "Idiom",
  "Prepositional phrase", "Contraction", "Abbreviation", "Initialism", "Acronym", "Symbol", "Letter", "Character", "Han character", "Hanzi", "Kanji", "Hanja",
  "Classifier", "Counter", "Root", "Combining form", "Diacritical mark", "Punctuation mark", "Syllable", "Ideophone", "Participle", "Romanization", "Verb form"]);
// Wiktionary heading → wiktextract's part-of-speech name, so the two readers' entries can be compared and merged
const POS_NAME = { "Proper noun": "name", Adjective: "adj", Adverb: "adv", Preposition: "prep", Postposition: "postp", Conjunction: "conj", Interjection: "intj",
  Pronoun: "pron", Determiner: "det", Numeral: "num", Number: "num", Abbreviation: "abbrev", Initialism: "abbrev", Acronym: "abbrev", Letter: "character", Character: "character",
  "Han character": "character", Hanzi: "character", Kanji: "character", Hanja: "character", "Prepositional phrase": "prep_phrase", "Combining form": "combining_form",
  "Verb form": "verb", Participle: "verb", "Diacritical mark": "diacritical", "Punctuation mark": "punct" };
const LABEL = /^(?:lb|lbl|label|a|accent|q|qual|qualifier|i|qf|qualifier-form|sense|s)$/i;
const SKIP_LABEL = new Set(["and", "or", "_", ",", ";", "also", "with", "except", "chiefly", "mostly", "usually", "often", "sometimes", "now", "rare", "especially"]);
// a form-of template is named "<kind> of" ("plural of", "alternative form of", "past participle of") or one of a few short names
const isOfTemplate = (name) => /(?:^|[ -])of$/.test(name) || /^(?:infl of|alt form|alt sp|altform|alt-form|form of|alter)$/.test(name);

const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function splitArgs(inner) {
  const out = []; let depth = 0, cur = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i], two = inner.substr(i, 2);
    if (two === "{{" || two === "[[") { depth++; cur += two; i++; continue; }
    if (two === "}}" || two === "]]") { depth--; cur += two; i++; continue; }
    if (c === "|" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur); return out;
}

/** One gloss line → {text, tags, of, gaps}. Templates collapse to tokens; unreadable ones are counted. */
export function readGloss(raw) {
  const tags = [], st = { of: null, gaps: 0, unread: [] };
  let s = raw, prev;
  for (let guard = 0; guard < 8 && s !== prev; guard++) {   // innermost templates first
    prev = s;
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const a = splitArgs(inner).map((x) => x.trim()); const name = (a[0] || "").toLowerCase();
      if (LABEL.test(name)) { for (const t of a.slice(2)) { const v = t.replace(/^\w+=.*$/, "").trim(); if (v && !SKIP_LABEL.has(v)) tags.push(v); } return ""; }
      if (/^(?:n-g|non-gloss|ng|gloss|gl|nongloss|def-date|vern|w|pedia|pedlink|l|link|m|mention|ll|m-self|l-self|1|small)$/.test(name)) return name === "w" ? a[a.length - 1] ?? "" : (a.length > 2 ? a[a.length - 1] : a[1] ?? "");
      if (isOfTemplate(name)) { if (!st.of) st.of = (a[2] || a[1] || "").replace(/^\w+=.*$/, ""); return ""; }
      if (/^(?:senseid|ref|rfdef|rfv|rfc|attention|rfquote-sense|uxi|ux|usex|quote|syn|ant|hyper|hypo|cln|c|topics|catlangname|cat|categories|catlangcode|top\d?|c2|c3|ws|wikipedia|wp|enum|desc|unk|sup|sub|ib)$/.test(name)) return "";
      st.gaps++; if (st.unread.length < 4 && name) st.unread.push(name); return "";
    });
  }
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/\s+([,;:.])/g, "$1").trim();
  return { text: s.replace(/^[,;:\s]+/, ""), tags: [...new Set(tags)], of: st.of, gaps: st.gaps, unread: st.unread };
}


// ── related words: synonyms, antonyms, hypernyms, hyponyms ──────────────────────────────────────────────────────────────
// Per sense, from `#: {{syn|en|a|b}}` lines under a sense (and the same templates inline in a gloss line); per entry, from the
// ====Synonyms==== / ====Antonyms==== / ====Hypernyms==== / ====Hyponyms==== sections, where a `{{sense|x}}` label says which sense a
// bullet is about (kept as the qualifier). A word is a string, or [word, qualifier] where one is given (`word<q:rare>`, `{{q|…}}`, a sense label).
const REL_KEY = { syn: "syn", synonym: "syn", synonyms: "syn", ant: "ant", antonym: "ant", antonyms: "ant", hyper: "hyper", hypernym: "hyper", hypernyms: "hyper", hypo: "hypo", hyponym: "hypo", hyponyms: "hypo",
  holonym: "holo", holonyms: "holo", meronym: "mero", meronyms: "mero", "derived terms": "derived", "coordinate terms": "coord" };
const REL_MAX = 40, REL_MAX_BY = { derived: 80 };
const addRel = (into, kind, word, q) => {
  word = String(word ?? "").replace(/#.*$/, "").trim(); if (!word || /^(?:Category|File|Image|w|wikipedia):/i.test(word)) return;
  if (!/[\p{L}\p{N}]/u.test(word)) return; // a separator or markup that leaked in as a "word"
  const list = (into[kind] ??= []); if (list.length >= (REL_MAX_BY[kind] ?? REL_MAX)) return;
  if (!list.some((x) => (Array.isArray(x) ? x[0] : x) === word)) list.push(q ? [word, q] : word);
};
/** Relation templates in one line → {syn?, ant?, hyper?, hypo?}. `{{syn|lang|w1|w2<q:x>|q1=…}}`: positional args after the language code. */
export function readRel(text) {
  const out = {};
  for (const m of String(text).matchAll(/\{\{\s*(syn|synonyms?|ant|antonyms?|hyper|hypernyms?|hypo|hyponyms?)\s*\|([^{}]*)\}\}/gi)) {
    const kind = REL_KEY[m[1].toLowerCase()]; const a = splitArgs(m[2]).map((x) => x.trim());
    for (const arg of a.slice(1)) {
      if (/^[\w-]+=/.test(arg)) continue; // named parameters (q1=, t1=, sc= …) are not words
      const w = /^([^<]*)((?:<[^>]*>)*)$/.exec(arg); if (!w) continue;
      const q = /<q:([^>]*)>/.exec(w[2])?.[1];
      addRel(out, kind, w[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1"), q);
    }
  }
  return out;
}
const mergeRel = (into, rel) => { for (const [k, list] of Object.entries(rel)) for (const x of list) addRel(into, k, Array.isArray(x) ? x[0] : x, Array.isArray(x) ? x[1] : null); };
/** One bullet of a Synonyms/Antonyms/… section → [word, qualifier?] list. */
function bulletWords(line) {
  const sense = /\{\{\s*(?:sense|s|sens)\s*\|([^{}|]*)/i.exec(line)?.[1]?.trim() || null;
  const q = /\{\{\s*(?:q|qual|qualifier|i)\s*\|([^{}]*)\}\}/i.exec(line)?.[1]?.split("|").join(", ") || null;
  const out = [];
  for (const m of line.matchAll(/\{\{\s*(?:l|link|m|mention|ll)\s*\|[^|{}]*\|([^|{}]+)/gi)) out.push(m[1].trim());
  for (const m of line.matchAll(/\{\{\s*(?:col|der|rel|cot|top)\d?[^|{}]*\|[^|{}]*\|([^{}]*)\}\}/gi)) for (const w of splitArgs(m[1])) if (!/^[\w-]+=/.test(w) && w.trim()) out.push(w.replace(/<[^>]*>/g, "").trim());
  if (!out.length) for (const m of line.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)) out.push(m[1].trim());
  return { words: out, q: sense || q };
}

/** wikitext of one page → entries [{w, n, p, s:[{g|of, tags?, gaps?}], t?}] */
export function readPage(title, wikitext, codes = {}) {
  const entries = [];
  const langs = wikitext.split(/^==(?!=)\s*([^=\n]+?)\s*==\s*$/m);
  for (let i = 1; i < langs.length; i += 2) {
    const name = langs[i], body = langs[i + 1] || "";
    const parts = body.split(/^(={3,6})\s*([^=\n]+?)\s*\1\s*$/m);
    let cur = null;
    for (let j = 1; j < parts.length; j += 3) {
      const head = parts[j + 1], text = parts[j + 2] || "";
      if (POS.has(head)) {
        cur = { w: title, n: name, p: POS_NAME[head] ?? head.toLowerCase(), s: [] };
        if (codes[name]) cur.c = codes[name];
        let parent = [];
        for (const line of text.split("\n")) {
          // `#: {{syn|en|…}}` under a sense: that sense's related words
          const rl = /^#+:\s*(.*)$/.exec(line);
          if (rl && cur.s.length) { const r = readRel(rl[1]); if (Object.keys(r).length) mergeRel(cur.s[cur.s.length - 1], r); continue; }
          const m = /^(#+)(?![#*:])\s*(.*)$/.exec(line); if (!m) continue;
          const depth = m[1].length, g = readGloss(m[2]), inlineRel = readRel(m[2]);
          parent = parent.slice(0, depth - 1); parent[depth - 1] = g.text;
          // a sense whose whole gloss is a template this reader cannot expand ({{place}}, {{surname}}, {{letter}} …) still EXISTS:
          // keep it as a typed gap that names the templates, never drop the sense (and with it the whole language entry)
          if (!g.text && !g.of && !g.unread.length) continue;
          const sense = g.of ? { of: g.of } : (g.text ? { g: [...new Set(parent.filter(Boolean))].slice(-3) } : { g: [], tpl: g.unread });
          if (g.tags.length) sense.tags = g.tags; if (g.gaps) sense.gaps = g.gaps;
          if (Object.keys(inlineRel).length) mergeRel(sense, inlineRel);
          cur.s.push(sense);
        }
        entries.push(cur);
      } else if (/^(?:Synonyms|Antonyms|Hypernyms|Hyponyms|Holonyms|Meronyms|Derived terms|Coordinate terms)$/i.test(head) && cur) {
        const kind = REL_KEY[head.toLowerCase()], rel = (cur.rel ??= {});
        for (const line of text.split("\n")) { if (!/^\s*[*:]/.test(line) && !/\{\{\s*(?:col|der|rel|cot|top)\d?/i.test(line)) continue; const { words, q } = bulletWords(line); for (const w of words) addRel(rel, kind, w, q); }
        if (!Object.keys(cur.rel).length) delete cur.rel;
      } else if (/^Translations$/i.test(head) && cur) {
        const t = []; for (const m of text.matchAll(/\{\{t\+?\|([^|}]+)\|([^|}]+)/g)) t.push([m[1], m[2]]);
        if (t.length) cur.t = (cur.t || []).concat(t);
      }
    }
  }
  return entries.filter((e) => e.s.length);
}

/** Stream a MediaWiki export XML file → pages (ns 0 only). */
export function* pagesOf(xml) {
  const re = /<page>([\s\S]*?)<\/page>/g; let m;
  while ((m = re.exec(xml))) {
    const b = m[1]; if (!/<ns>0<\/ns>/.test(b) || /<redirect /.test(b)) continue;
    const title = /<title>([^<]*)<\/title>/.exec(b)?.[1], tx = /<text[^>]*>([\s\S]*?)<\/text>/.exec(b)?.[1];
    if (title && tx) yield { title: unxml(title), text: unxml(tx) };
  }
}

if (process.argv[1]?.endsWith("fast-read.mjs")) {
  const { readFileSync } = await import("node:fs");
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
  if (arg("wikitext")) { console.log(JSON.stringify(readPage(arg("title", "x"), readFileSync(arg("wikitext"), "utf8")), null, 1)); }
  else {
    const xml = readFileSync(arg("xml"), "utf8"); const t0 = Date.now(); let pages = 0, entries = 0, senses = 0, gaps = 0, gapSenses = 0;
    for (const p of pagesOf(xml)) { pages++; for (const e of readPage(p.title, p.text)) { entries++; for (const s of e.s) { senses++; if (s.gaps) { gaps += s.gaps; gapSenses++; } } } }
    const sec = (Date.now() - t0) / 1000;
    console.log(`${pages} pages, ${entries} entries, ${senses} senses in ${sec.toFixed(1)} s = ${(pages / sec).toFixed(0)} pages/s; ${gapSenses} senses (${(100 * gapSenses / senses).toFixed(1)}%) hit an unread template`);
  }
}
