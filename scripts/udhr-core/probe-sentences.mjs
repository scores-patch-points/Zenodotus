// Exploratory: does sentence structure within the shared paragraphs converge, and does punctuation predict propositions?
import { readFileSync, readdirSync } from "node:fs";
import { segmentEdition } from "./segment.mjs";
import { sentencesOf, loadGold, GOLD_EDITIONS } from "./probe-gold.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const files = readdirSync(DIR).filter((f) => /^udhr-.+\.txt$/.test(f)).sort();

// A. sentence count of every paragraph, per edition
const per = new Map(), editions = [];
for (const f of files) {
  const text = readFileSync(new URL(f, DIR), "utf8"), buf = Buffer.from(text, "utf8"), seg = segmentEdition(text);
  if (seg.gap) continue;
  const row = new Map();
  for (const u of seg.units) u.paragraphs.forEach((p, i) => row.set(`${u.unit}/${i + 1}`, sentencesOf(buf, p).length));
  per.set(f, { row, unitParas: new Map(seg.units.map((u) => [u.unit, u.paragraphs.length])) });
  editions.push(f);
}
const MODAL_PARAS = (() => { const t = {}; for (const f of editions) for (const [u, n] of per.get(f).unitParas) (t[u] ??= {})[n] = (t[u][n] ?? 0) + 1; return Object.fromEntries(Object.entries(t).map(([u, m]) => [u, +Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]])); })();
const keys = [...new Set(editions.flatMap((f) => [...per.get(f).row.keys()]))].filter((k) => !k.startsWith("preamble"));
const stat = [];
for (const k of keys) {
  const [u] = k.split("/");
  const members = editions.filter((f) => per.get(f).unitParas.get(u) === MODAL_PARAS[u] && per.get(f).row.has(k));   // only editions whose paragraph structure fits
  const tally = {}; for (const f of members) { const n = per.get(f).row.get(k); tally[n] = (tally[n] ?? 0) + 1; }
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (!best) continue;                                                                 // a paragraph only non-modal editions have
  stat.push({ k, mode: +best[0], share: +(best[1] / members.length).toFixed(3), members: members.length, tally });
}
const settled = stat.filter((s) => s.share > 0.5);
console.log(`paragraph referents (articles): ${stat.length}; sentence count has a majority in ${settled.length}; share>=0.9 in ${stat.filter((s) => s.share >= 0.9).length}`);
console.log("softest:", stat.sort((a, b) => a.share - b.share).slice(0, 8).map((s) => `${s.k} mode=${s.mode} share=${s.share} ${JSON.stringify(s.tally)}`).join("\n         "));
// gold check: the English gold's per-paragraph sentence counts against the all-edition mode
const gold = loadGold("eng"); const goldN = new Map(); for (const p of gold.props) if (p.start && !p.start.heading && p.start.n) goldN.set(`${p.start.unit}/${p.start.p}`, p.start.n);
let agree = 0, comp = 0; for (const [k, n] of goldN) { const s = stat.find((x) => x.k === k); if (s) { comp++; if (s.mode === n) agree++; } }
console.log(`English gold sentence counts vs all-edition mode: ${agree}/${comp} paragraphs agree`);
// editions with the most departures from the mode
const dep = editions.map((f) => { let d = 0, t = 0; for (const s of stat) if (per.get(f).unitParas.get(s.k.split("/")[0]) === MODAL_PARAS[s.k.split("/")[0]] && per.get(f).row.has(s.k)) { t++; if (per.get(f).row.get(s.k) !== s.mode) d++; } return [f.replace(/^udhr-|\.txt$/g, ""), d, t]; }).sort((a, b) => b[1] - a[1]);
console.log("editions departing from the mode (dep/of):", dep.slice(0, 12).map((x) => `${x[0]} ${x[1]}/${x[2]}`).join("  "));
console.log("editions with zero departures:", dep.filter((x) => x[1] === 0).length, "of", dep.length);

// B. gold propositions per sentence vs clause punctuation per sentence
const CLAUSE = /[,;:،؛、，；：]/gu;
const rows = [];
for (const c of GOLD_EDITIONS) {
  const g = loadGold(c); const bySpan = new Map();
  for (const p of g.props) { const k = p.at.join(); bySpan.set(k, (bySpan.get(k) ?? { n: 0, at: p.at, h: p.start?.heading }).n++ ? bySpan.get(k) : bySpan.get(k)); }
  const spans = new Map(); for (const p of g.props) { const k = p.at.join(); const r = spans.get(k) ?? { props: 0, at: p.at }; r.props++; spans.set(k, r); }
  const xs = [], ys = [];
  for (const r of spans.values()) { const t = g.buf.subarray(r.at[0], r.at[1]).toString("utf8"); xs.push(r.props); ys.push((t.match(CLAUSE) ?? []).length); }
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0), vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  rows.push(`${c}: r=${(cov / Math.sqrt(vx * vy)).toFixed(2)} over ${xs.length} spans`);
}
console.log("correlation of gold propositions per span with clause punctuation per span:", rows.join("  "));
