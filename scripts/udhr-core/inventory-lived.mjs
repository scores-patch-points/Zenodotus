// udhr-core/inventory-lived.mjs — where the repo holds LIVED-EXPERIENCE material (first-person, testimony, community voices) in the languages we can read
// (English, Spanish, Portuguese, Haitian Creole). Reads frontmatter and the first 4 KB of each file; counts only. Language: the frontmatter `language`, else a
// stop-word vote over the first 4 KB (es, pt, ht, fr, en), reported as "detected". No text is printed.
import { readdirSync, readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname, DIRS = ["19-organic-community", "20-first-person-voices", "21-anti-colonial", "23-healing", "22-teaching", "11-multi-language/dialects-pidgins-creoles/coraal", "11-multi-language/dialects-pidgins-creoles/twitteraae", "11-multi-language/dialects-pidgins-creoles/creoleval/mt_mit_haiti"];
const SW = { es: "de la que el en los se del las por un para con una su al lo como más pero sus le ya o este", pt: "de que não uma os se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito", ht: "yo nan ak pou sa a li se te pa ki nou mwen ou tout gen lè sou men si", fr: "de la le les des et en un une du que est pour qui dans ce il pas sur au avec", en: "the of and to in a is that it was for on with as he be at by this had not are" };
const sets = Object.fromEntries(Object.entries(SW).map(([k, v]) => [k, new Set(v.split(" "))]));
const head = (p, n = 4000) => { const fd = openSync(p, "r"), b = Buffer.alloc(n), r = readSync(fd, b, 0, n, 0); closeSync(fd); return b.toString("utf8", 0, r); };
const walk = (d) => { try { return readdirSync(d).flatMap((f) => { const p = join(d, f), s = statSync(p); return s.isDirectory() ? walk(p) : /\.(txt|md|tsv|trg)$/.test(f) ? [[p, s.size]] : []; }); } catch { return []; } };
const detect = (t) => { const w = t.toLowerCase().match(/\p{L}+/gu) ?? []; if (w.length < 40) return null; const sc = Object.entries(sets).map(([k, s]) => [k, w.filter((x) => s.has(x)).length / w.length]).sort((a, b) => b[1] - a[1]); return sc[0][1] > 0.08 ? sc[0][0] : null; };
const norm = (l) => { l = (l ?? "").toLowerCase().split(/[;,( ]/)[0]; return { english: "en", spanish: "es", portuguese: "pt", french: "fr", haitian: "ht", hat: "ht", spa: "es", por: "pt", eng: "en", fra: "fr" }[l] ?? l; };
for (const d of DIRS) {
  const tally = {}; let n = 0;
  for (const [p, size] of walk(join(ROOT, d))) {
    const t = head(p), m = /^---\n([\s\S]*?)\n---/.exec(t), lf = m ? /^language:\s*(.*)$/m.exec(m[1]) : null;
    const lang = lf ? norm(lf[1]) : (detect(t.replace(/^---[\s\S]*?\n---/, "")) ?? "?") + "*"; n++;
    const e = (tally[lang] ??= { docs: 0, mb: 0 }); e.docs++; e.mb += size / 1e6;
  }
  console.log(`${d}: ${n} files; ` + Object.entries(tally).sort((a, b) => b[1].docs - a[1].docs).slice(0, 8).map(([k, v]) => `${k} ${v.docs} (${v.mb.toFixed(1)} MB)`).join(", "));
}
console.log("(* = detected by stop words, not declared)");
