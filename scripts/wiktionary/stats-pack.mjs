// stats-pack.mjs — what the pack carries: counts of senses/entries with each field, overall and for one language.
//   node stats-pack.mjs --pack <file> [--lang en]
import { Dictionary } from "./lookup.mjs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const d = new Dictionary({ pack: arg("pack"), learned: "/dev/null", changed: "/dev/null", delta: "/dev/null" });
const LANG = arg("lang", "en"), KINDS = ["syn", "ant", "hyper", "hypo"];
const z = () => ({ entries: 0, senses: 0, entriesWithT: 0, sensesTags: 0, sensesGaps: 0, ...Object.fromEntries(KINDS.flatMap((k) => [[`sense_${k}`, 0], [`entry_${k}`, 0]])) });
const all = z(), one = z();
for (const c of d.manifest.chunks) for (const line of d.loadChunk(c)) for (const e of JSON.parse(line).e) {
  for (const t of e.c === LANG ? [all, one] : [all]) {
    t.entries++; if (e.t) t.entriesWithT++;
    for (const s of e.s) { t.senses++; if (s.tags) t.sensesTags++; if (s.gaps) t.sensesGaps++; for (const k of KINDS) if (s[k]) t[`sense_${k}`]++; }
    for (const k of KINDS) if (e.rel?.[k]) t[`entry_${k}`]++;
  }
}
console.log(JSON.stringify({ all, [LANG]: one }, null, 1));
