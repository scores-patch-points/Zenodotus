// battery.mjs — does the slim dictionary answer what the full extract answers?
//
//   node battery.mjs --extract extract/enwiktionary-extract.jsonl --slim slim [--sample 20000]
//
// The bar is fixed BEFORE any field is dropped and never tuned to pass: for a sample of entries, every question below
// asked of the slim dictionary must give the same answer as asked of the full entry.
//   lang    the word has an entry in this language                          (language set equal)
//   pos     the word has this part of speech in this language               (pos set equal)
//   gloss   EVERY sense's last gloss is found in the slim sense list (or the sense is a form-of pointer to the same lemma)
//   qual    EVERY qualifier of every sense (tags, raw_tags: the times and places it holds in) is carried on that sense
//   xlat    each of the first MAX_TRANSLATIONS translations is found
// Reports per-question pass rate and prints the first few failures. A question that fails on the slim is a gap to fix in
// project.mjs (never a threshold to lower).
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Dictionary } from "./lookup.mjs";
import { MAX_TRANSLATIONS } from "./project.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const dict = new Dictionary({ dir: arg("slim", "slim"), learned: "/dev/null" });
dict.teach = () => false; // the battery measures the slim, it does not teach
const SAMPLE = Number(arg("sample", 20000));
const tally = { lang: [0, 0], pos: [0, 0], gloss: [0, 0], qual: [0, 0], xlat: [0, 0] }, fails = [];
const miss = (q, e, why) => { tally[q][1]++; if (fails.length < 12) fails.push({ q, word: e.word, lang: e.lang_code, pos: e.pos, why }); };
const ok = (q) => { tally[q][0]++; tally[q][1]++; };

let n = 0;
for await (const line of createInterface({ input: createReadStream(arg("extract")), crlfDelay: Infinity })) {
  if (!line || (n++ % Math.max(1, Math.floor(Number(arg("every", 1))))) ) continue;
  if (tally.lang[1] >= SAMPLE) break;
  const e = JSON.parse(line); if (!e.word || e.redirect) continue;
  const r = dict.resolve(e.word, { learn: false });
  if (!r.found) { miss("lang", e, "word absent"); continue; }
  const mine = r.entries.filter((s) => s.c === e.lang_code);
  if (!mine.length) { miss("lang", e, "language absent"); continue; } ok("lang");
  const same = mine.filter((s) => s.p === e.pos);
  if (!same.length) { miss("pos", e, "pos absent"); continue; } ok("pos");
  const slimGlosses = new Set(same.flatMap((s) => s.s.flatMap((x) => x.g || (x.of ? [`of:${x.of}`] : []))));
  const slimQual = new Map(); // gloss key → qualifiers the slim holds for it
  for (const sl of same) for (const x of sl.s) slimQual.set(x.g ? x.g[x.g.length - 1] : `of:${x.of}`, new Set(x.tags || []));
  for (const s of e.senses || []) {
    const fo = s.form_of?.[0]?.word ?? s.alt_of?.[0]?.word, g = (s.glosses || []).slice(-1)[0], key = fo ? `of:${fo}` : g;
    if (!key) continue;
    slimGlosses.has(key) ? ok("gloss") : miss("gloss", e, key.slice(0, 60));
    const want = [...new Set([...(s.tags || []), ...(s.raw_tags || [])])];
    if (want.length && slimQual.has(key)) { const have = slimQual.get(key); const lost = want.filter((t) => !have.has(t)); lost.length ? miss("qual", e, `${key.slice(0, 40)} lost ${lost.join(",")}`) : ok("qual"); }
  }
  const slimT = new Set(same.flatMap((s) => (s.t || []).map((x) => `${x[0]}|${x[1]}`)));
  for (const t of (e.translations || []).slice(0, MAX_TRANSLATIONS)) {
    if (!t.word) continue;
    slimT.has(`${t.lang_code || t.code || ""}|${t.word}`) ? ok("xlat") : miss("xlat", e, `${t.lang_code}:${t.word}`);
  }
}
for (const [q, [p, t]] of Object.entries(tally)) console.log(`${q.padEnd(6)} ${p}/${t} = ${t ? ((100 * p) / t).toFixed(2) : "n/a"}%`);
if (fails.length) console.log("first failures:", JSON.stringify(fails, null, 1));
