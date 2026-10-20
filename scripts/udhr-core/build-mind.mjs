// udhr-core/build-mind.mjs — write the system's mind, for the UDHR reading, as an EOTM binary log.
// Editions are read one at a time in a canonical order (file name). A record is appended ONLY when reading an edition
// changes the conclusion (the charter root); it carries the Bayesian surprise of that edition and the surprise absorbed
// since the last record without changing anything. Everything that did not change the conclusion is not a record.
import { readFileSync, writeFileSync } from "node:fs";
import { loadLedger, LOG, MANIFEST } from "./build.mjs";
import { countsOf, deriveStructure } from "./convergence.mjs";
import { structureRoot } from "./charter.mjs";
import { makeModel } from "./surprise.mjs";
import * as E from "./eotm.mjs";

export const DOMAIN = E.domainOf("udhr-core");
const NONE = "00".repeat(16);
const unitId = (u) => (u === "preamble" ? 0 : +String(u).replace("article:", ""));

export function buildMind(out) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const full = loadLedger(JSON.parse(readFileSync(LOG, "utf8")));
  const counts = countsOf(full);
  const order = [...counts.keys()].sort((a, b) => (full.sources.get(a).locator < full.sources.get(b).locator ? -1 : 1));
  const units = [...counts.get(order[0]).keys()].length ? ["preamble", ...Array.from({ length: 30 }, (_, i) => i + 1)] : [];
  const model = makeModel(units.map((u) => (u === "preamble" ? 0 : u)));
  const asNumKey = (m) => new Map([...m].map(([u, c]) => [u === "preamble" ? 0 : u, c]));

  E.create(out);
  let prev = { root: NONE, shared: new Map() }, absorbed = 0, written = 0;
  const seen = [];
  const steps = [];
  order.forEach((id, step) => {
    seen.push(id);
    const s = model.observe(asNumKey(counts.get(id)));
    const now = deriveStructure(counts, seen);
    if (now.root === prev.root) { absorbed += s; return; }
    const changes = [];
    for (const u of ["preamble", ...Array.from({ length: 30 }, (_, i) => i + 1)]) {
      const a = prev.shared.get(u) ?? null, b = now.shared.get(u) ?? null;
      if (a !== b) changes.push({ unit: unitId(u === "preamble" ? "preamble" : `article:${u}`), from: a ?? -1, to: b ?? -1 });
    }
    E.append(out, E.KIND.DMD, E.enc.dmd({ domain: DOMAIN, step, source: id.replace(/^src_/, ""), before: prev.root, after: now.root, surpriseBits: s, absorbedBits: absorbed, changes }));
    steps.push({ step, file: full.sources.get(id).locator.split("/").pop(), surpriseBits: +s.toFixed(3), absorbedBits: +absorbed.toFixed(3), changes: changes.length });
    absorbed = 0; written++; prev = { root: now.root, shared: now.shared };
  });

  const m = JSON.parse(readFileSync(new URL("./dmd-ledger.json", import.meta.url), "utf8"));
  const w = m.window;
  E.append(out, E.KIND.WINDOW, E.enc.window({ domain: DOMAIN, rootP50: w.stable.charterRoot.median, rootP95: w.stable.charterRoot.p95, rootMax: w.stable.charterRoot.max, artP50: w.stable.articleStructure.median, artP95: w.stable.articleStructure.p95, artMax: w.stable.articleStructure.max, orders: w.orders, pivotal: m.pivotalEditions.length }));
  E.append(out, E.KIND.MARGINS, E.enc.margins(m.margins.map((r) => ({ unit: unitId(r.unit), mode: r.mode ?? -1, support: r.support, of: r.of, margin: r.margin })), DOMAIN));
  const root = structureRoot(full);
  if (prev.root !== root) throw new Error(`the last DMD record's root (${prev.root}) is not the charter root (${root})`);
  E.append(out, E.KIND.GROUND, E.enc.ground({ domain: DOMAIN, root, setRoot: manifest.root, editions: order.length, units: 31 }));
  return { dmdRecords: written, steps, absorbedAfterLast: absorbed, root };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = new URL("./mind.eot", import.meta.url).pathname;
  const r = buildMind(out);
  console.log(JSON.stringify({ dmdRecords: r.dmdRecords, bytes: readFileSync(out).length, root: r.root, absorbedAfterLast: +r.absorbedAfterLast.toFixed(3) }));
  for (const s of r.steps) console.log(JSON.stringify(s));
}
