// udhr-core/wiktionary-section.mjs — the parts of speech en.wiktionary.org lists for a word UNDER A NAMED LANGUAGE HEADING, from the page's wikitext.
// Why: the REST definition API labels only the languages it knows and puts every other language (Haitian Creole among them) into one unlabeled "other"
// bucket, so a Haitian word cannot be judged from it. Same host (en.wiktionary.org), same pace (PACE ms between requests), cached in wiktionary-section-cache.json.
// Returns { found: bool, pos: [..] } where pos are the level-3/4 headings under "==<heading>==" that name a part of speech.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { PACE } from "./wikidata-pilot.mjs";
const CACHE = new URL("./wiktionary-section-cache.json", import.meta.url).pathname, cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const UA = "udhr-core-pilot/0.1 (research on the Universal Declaration of Human Rights; github.com/scores-patch-points)";
const POS = new Set(["noun", "proper noun", "verb", "adjective", "adverb", "pronoun", "preposition", "postposition", "conjunction", "determiner", "article", "numeral", "particle", "interjection", "contraction", "prefix", "suffix", "phrase", "symbol", "letter", "participle", "affix", "infix", "circumfix", "interfix", "proverb", "idiom"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function sectionPos(term, heading) {
  const key = `${heading}|${term}`; if (key in cache) return cache[key];
  const url = `https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=${encodeURIComponent(term)}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    let res; try { res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } }); } catch { await sleep(5000); continue; }
    if (res.status === 429 || res.status === 503) { const ra = Number(res.headers.get("retry-after")); await sleep(1000 * ((Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) : 10) + 5 * attempt)); continue; }
    if (!res.ok) throw new Error(`wiktionary ${res.status} for ${term}`);
    const page = (await res.json())?.query?.pages?.[0], text = page?.revisions?.[0]?.slots?.main?.content ?? "";
    let out = { found: false, pos: [], pageExists: !page?.missing };
    const m = new RegExp(`^==\\s*${heading}\\s*==\\s*$`, "m").exec(text);
    if (m) { const rest = text.slice(m.index + m[0].length), next = /^==[^=].*==\s*$/m.exec(rest), body = next ? rest.slice(0, next.index) : rest; out = { found: true, pageExists: true, pos: [...body.matchAll(/^={3,5}\s*([^=]+?)\s*={3,5}\s*$/gm)].map((x) => x[1].toLowerCase()).filter((h) => POS.has(h)) }; }
    cache[key] = out; writeFileSync(CACHE, JSON.stringify(cache)); await sleep(PACE); return out;
  }
  throw new Error(`wiktionary gave up on ${term}`);
}
