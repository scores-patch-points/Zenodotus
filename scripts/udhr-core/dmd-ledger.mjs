// udhr-core/dmd-ledger.mjs — the EOT log records only the DIFFERENCES THAT MAKE A DIFFERENCE (Bateson; kernel/activation.js
// states it in those words). A reading is kept to the depth at which forgetting everything older no longer changes the
// conclusion; past that depth it "makes no difference" and need not be an event. Here the conclusion is the charter root
// (the referent structure + stated relations). Three measurements, none typed in:
//   1. WINDOW   khora's own dmdWindow over the editions, at dyadic depths, under many seeded orders (the editions have no
//               natural order, so one order would be an accident). The shallowest depth that reproduces the whole's root.
//   2. PIVOTS   leave-one-out: does removing any single edition change the conclusion?
//   3. MARGINS  per unit: how many modal-carrying editions must go before the conclusion moves (the soft spots).
// These feed build-mind.mjs, which writes the ONE log (mind.eot). The per-edition agreement events (the bulk of the full
// event log) are recoverable by build.mjs from the manifest and are not records.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadLedger, LOG, MANIFEST } from "./build.mjs";
import { countsOf, deriveStructure, margins } from "./convergence.mjs";
import { structureOf, structureRoot } from "./charter.mjs";
import { dmdWindow } from "../../../khora/native/kernel/activation.js";

export const DMD_SCHEMA = "UDHRDMDLedger@1";
const ORDERS = 200;                                 // default number of seeded orders
const dyadic = (n) => { const out = []; for (let d = 2; d < n; d *= 2) out.push(d); out.push(n); return out; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

export function measure(counts, { seed = "udhr-core-dmd", orders = ORDERS } = {}) {
  const ids = [...counts.keys()].sort();
  const whole = deriveStructure(counts, ids);
  const rootOf = (set) => deriveStructure(counts, set).root, articleOf = (set) => deriveStructure(counts, set).articleKey;
  const rnd = mulberry(parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16));
  const win = { root: [], article: [], stable: [], stableArticle: [] }; let gaps = 0;
  // dmdWindow returns the FIRST depth that agrees; a lucky early agreement can be undone one candidate later. The stable window is the shallowest depth from which EVERY deeper candidate also agrees.
  const stableDepth = (order, derive, cands, whole) => { let d = null; for (const k of [...cands].reverse()) { if (derive(order.slice(0, k)) === whole) d = k; else break; } return d; };
  for (let o = 0; o < orders; o++) {
    const order = shuffle(ids, rnd);
    const w = dmdWindow(order, rootOf, { candidates: dyadic(ids.length) }), a = dmdWindow(order, articleOf, { candidates: dyadic(ids.length) });
    if (w.window == null) gaps++; else win.root.push(w.window);
    const sd = stableDepth(order, rootOf, dyadic(ids.length), whole.root), sa = stableDepth(order, articleOf, dyadic(ids.length), whole.articleKey);
    if (sd != null) win.stable.push(sd); if (sa != null) win.stableArticle.push(sa);
    if (a.window != null) win.article.push(a.window);
  }
  // PIVOTS: a single edition whose absence changes the conclusion
  const pivotal = ids.filter((id) => rootOf(ids.filter((x) => x !== id)) !== whole.root);
  const summ = (xs) => xs.length ? { median: quantile(xs, 0.5), p95: quantile(xs, 0.95), max: Math.max(...xs), min: Math.min(...xs), n: xs.length } : null;
  return { editions: ids.length, charterRoot: whole.root, window: { firstAgreement: { charterRoot: summ(win.root), articleStructure: summ(win.article) }, stable: { charterRoot: summ(win.stable), articleStructure: summ(win.stableArticle) }, orders, noWindowFound: gaps }, pivotalEditions: pivotal, margins: margins(counts, ids) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const m = measure(countsOf(full));
  if (m.charterRoot !== structureRoot(full)) throw new Error("the measured conclusion is not the charter root");

  writeFileSync(new URL("./dmd-ledger.json", import.meta.url), JSON.stringify(m, null, 1) + "\n");
  console.log(JSON.stringify({ ...m, margins: undefined, softest: m.margins.filter((x) => x.majority).sort((a, b) => a.margin - b.margin).slice(0, 5).map((x) => `${x.unit}: ${x.margin}`) }, null, 1));
}
