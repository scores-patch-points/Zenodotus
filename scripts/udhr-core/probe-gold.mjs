// Exploratory: what do the hand-adjudicated readings (eng, spa, arb, cmn_hans, swh) say about clause-level referents?
import { readFileSync } from "node:fs";
import { segmentEdition } from "./segment.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url);
export const GOLD_EDITIONS = ["eng", "spa", "arb", "cmn_hans", "swh"];

export function sentencesOf(buf, [s, e]) {            // sentence byte ranges inside one paragraph, by Unicode sentence terminals
  const text = buf.subarray(s, e).toString("utf8");
  const out = []; let from = 0, bytes = 0, startByte = 0;
  const re = /[\p{STerm}]["'”’)\]]*(?=\s|$)/gu;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    out.push([s + Buffer.byteLength(text.slice(0, from)), s + Buffer.byteLength(text.slice(0, end))]);
    from = end; while (/\s/.test(text[from] ?? "x")) from++;
  }
  if (from < text.length) out.push([s + Buffer.byteLength(text.slice(0, from)), e]);
  return out;
}

export function loadGold(code) {
  const text = readFileSync(new URL(`udhr-${code}.txt`, DIR), "utf8"), buf = Buffer.from(text, "utf8");
  const seg = segmentEdition(text);
  const obs = readFileSync(new URL(`udhr-${code}.txt.hand.eot.jsonl`, DIR), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1");
  // paragraph + sentence address of a byte offset
  const addr = (b) => {
    while (buf[b] === 0x20 || buf[b] === 0x0a) b++;                 // gold spans begin at the indent; blocks are trimmed
    for (const u of seg.units) {
      if (b < u.range.start || b >= u.range.end) continue;
      const pi = u.paragraphs.findIndex(([s, e]) => b >= s && b < e);
      if (pi < 0) return { unit: u.unit, p: 0, s: 0, heading: true };
      const sents = sentencesOf(buf, u.paragraphs[pi]);
      return { unit: u.unit, p: pi + 1, s: sents.findIndex(([s, e]) => b >= s && b < e) + 1, n: sents.length };
    }
    return null;
  };
  return { code, seg, buf, props: obs.map((o) => ({ prop: o.prop, ground: o.ground, at: o.at, label: o.label, start: addr(o.at[0]), end: addr(o.at[1] - 1) })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const g = Object.fromEntries(GOLD_EDITIONS.map((c) => [c, loadGold(c)]));
  const by = new Map();
  for (const c of GOLD_EDITIONS) for (const p of g[c].props) { if (!by.has(p.prop)) by.set(p.prop, {}); (by.get(p.prop)[c] ??= []).push(p); }
  const hist = {}; let ident = 0, tot = 0;
  for (const [, m] of by) {
    const langs = Object.keys(m); hist[langs.length] = (hist[langs.length] ?? 0) + 1;
    if (langs.length < 4) continue;
    const keys = langs.map((c) => { const a = m[c][0].start; return a ? `${a.unit}/${a.p}/${a.s}` : "none"; });
    tot++; if (!keys.includes("none") && new Set(keys).size === 1) ident++;
  }
  console.log("props by number of editions carrying them:", hist);
  console.log(`props in >=4 editions: ${tot}; same unit/paragraph/sentence in all of them (every one resolved): ${ident}`);
  console.log("unresolved addresses:", GOLD_EDITIONS.map((c) => `${c} ${g[c].props.filter((p) => !p.start).length}`).join("  "));
  const uniqueSpans = (c) => new Set(g[c].props.map((p) => p.at.join())).size;
  console.log("distinct spans vs props:", GOLD_EDITIONS.map((c) => `${c} ${uniqueSpans(c)}/${g[c].props.length}`).join("  "));
}
