// build-fast.mjs — one streaming pass over the dump: fast structural read of every main-namespace page.
//
//   bzcat enwiktionary-latest-pages-articles.xml.bz2 | node build-fast.mjs --out slim-work
//
// Writes slim-work/entries.tsv (`word<TAB>slim json`, one line per language+part-of-speech entry, language still by NAME) and
// slim-work/lang-modules.json (the raw text of Module:languages/data*, Module:etymology languages/data*, Module:families/data*,
// which hold the name → code tables). build-slim.mjs --tsv turns the TSV into sorted, chunked, code-tagged chunks.
// This is the first-pass reader (fast-read.mjs), not wiktextract: senses with an unread template carry `gaps`.
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readPage } from "./fast-read.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const OUT = arg("out", "slim-work"); mkdirSync(OUT, { recursive: true });
const w = createWriteStream(join(OUT, "entries.tsv"));
const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const LANG_MOD = /^Module:(?:languages|etymology languages|families|language-like)\/data/;
const modules = {};
let pages = 0, entries = 0, senses = 0, gapSenses = 0, t0 = Date.now(), buf = "";

function onPage(b) {
  const ns = /<ns>(\d+)<\/ns>/.exec(b)?.[1];
  const title = /<title>([^<]*)<\/title>/.exec(b)?.[1]; if (!title) return;
  const text = /<text[^>]*>([\s\S]*?)<\/text>/.exec(b)?.[1]; if (text == null) return;
  if (ns === "828") { const t = unxml(title); if (LANG_MOD.test(t)) modules[t] = unxml(text); return; }
  if (ns !== "0" || /<redirect /.test(b)) return;
  pages++;
  for (const e of readPage(unxml(title), unxml(text))) {
    entries++;
    for (const s of e.s) { senses++; if (s.gaps) gapSenses++; }
    w.write(`${e.w.replace(/[\t\n]/g, " ")}\t${JSON.stringify({ w: e.w, n: e.n, p: e.p, s: e.s, ...(e.t ? { t: e.t } : {}) })}\n`);
  }
  if (pages % 200000 === 0) console.error(`${pages} pages, ${entries} entries, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) {
  buf += chunk;
  let end;
  while ((end = buf.indexOf("</page>")) >= 0) {
    const start = buf.lastIndexOf("<page>", end);
    if (start >= 0) onPage(buf.slice(start, end));
    buf = buf.slice(end + 7);
  }
}
await new Promise((r) => w.end(r));
writeFileSync(join(OUT, "lang-modules.json"), JSON.stringify(modules));
console.error(`done: ${pages} pages, ${entries} entries, ${senses} senses (${((100 * gapSenses) / Math.max(1, senses)).toFixed(1)}% with an unread template) in ${((Date.now() - t0) / 60000).toFixed(1)} min; ${Object.keys(modules).length} language modules`);
