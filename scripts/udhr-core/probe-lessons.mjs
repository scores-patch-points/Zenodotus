// Two checks the hand reading suggested: (1) does subjectBasis explain the "not found" subjects? (2) does the golden `anchor`
// disambiguate repeats, and does a monotone-order rule agree with it?
import { readFileSync } from "node:fs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const PRI = new URL("../../../janus/priors/", import.meta.url);
const EDS = { eng: "udhr.golden.json", spa: "udhr-spa.golden.json", arb: "udhr-arb.golden.json", cmn_hans: "udhr-cmn_hans.golden.json", swh: "udhr-swh.golden.json" };
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const find = (para, s) => { const rx = new RegExp(s.normalize("NFC").trim().split(/\s+/).map(esc).join("\\s+"), "gu"); return [...para.matchAll(rx)].map((m) => [m.index, m.index + m[0].length]); };
for (const [c, gf] of Object.entries(EDS)) {
  const buf = readFileSync(new URL(`udhr-${c}.txt`, DIR));
  const obs = readFileSync(new URL(`udhr-${c}.txt.hand.eot.jsonl`, DIR), "utf8").trim().split("\n").map(JSON.parse).filter((r) => r.schema === "EOTObservation@1");
  const gold = JSON.parse(readFileSync(new URL(gf, PRI), "utf8")).rows;
  const byProp = new Map(); for (const g of gold) { const k = g.prop + "|" + g.ground; byProp.set(k, g); }
  // (1) subjectBasis vs findability of the subject slot
  const sb = {}; const tally = (b, f) => { const k = `${b}:${f}`; sb[k] = (sb[k] ?? 0) + 1; };
  // (2) anchor-based disambiguation vs monotone rule
  let amb = 0, byAnchor = 0, monoAgree = 0, monoTried = 0, noAnchor = 0; let prevPara = null, prevStart = {};
  for (const o of obs) {
    if (!o.end1 && !o.end2) continue;
    const para = buf.subarray(o.at[0], o.at[1]).toString("utf8");
    const g = byProp.get(o.prop + "|" + o.ground);
    if (o.end1) tally(o.subjectBasis, find(para, o.end1).length === 0 ? "absent" : "present");
    const key = o.at.join(); if (key !== prevPara) { prevPara = key; prevStart = {}; }
    for (const [slot, s] of [["end1", o.end1], ["label", o.label], ["end2", o.end2]]) {
      if (!s) continue;
      const hits = find(para, s);
      if (hits.length < 2) { if (hits.length === 1) prevStart[slot] = hits[0][0]; continue; }
      amb++;
      const anchorHit = g?.anchor ? find(para, g.anchor)[0] : null;
      if (!anchorHit) { noAnchor++; continue; }
      const inAnchor = hits.filter(([a, b]) => a >= anchorHit[0] && b <= anchorHit[1]);
      if (inAnchor.length === 1) {
        byAnchor++;
        // monotone: first occurrence not before the previous row's same slot (or a reuse of it)
        const mono = hits.find(([a]) => a >= (prevStart[slot] ?? -1)) ?? hits[0];
        monoTried++; if (mono[0] === inAnchor[0][0]) monoAgree++;
        prevStart[slot] = inAnchor[0][0];
      }
    }
  }
  console.log(c.padEnd(9), "subject basis×present:", JSON.stringify(sb), `\n          repeats ${amb}: resolved by golden anchor ${byAnchor}, no usable anchor ${noAnchor}; monotone-order rule agrees with the anchor on ${monoAgree}/${monoTried}`);
}
