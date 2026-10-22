// udhr-core/build.mjs — steps 1-3: freeze the edition set, segment by article, ingest into a Provenance@2 log.
//   node build.mjs            -> writes manifest.json and udhr-core.eot.json next to this file
// The log is the store; the manifest is a projection of the source files (and cross-checked against the sidecars).
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { ProvenanceLedger, byteRange } from "../../../penelope/organs/generation/provenance.mjs";
import { segmentEdition, sha256 } from "./segment.mjs";
import { mintReferents, coverage } from "./referents.mjs";
import { relate, witnesses } from "./relations.mjs";
import { fileRoot, structureRoot } from "./charter.mjs";
import { fileVariants } from "./variants.mjs";

export const CORPUS = new URL("../../06-government-legal/un-udhr/", import.meta.url);
export const MANIFEST = new URL("./manifest.json", import.meta.url);
export const LOG = new URL("./udhr-core.eot.json", import.meta.url);
export const ARTIFACT = "udhr-core";
const REL = "06-government-legal/un-udhr/";

const short = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);   // project short-digest convention

/** Step 1 — the frozen edition set: one row per udhr-*.txt, hashed from the bytes and checked against its sidecar. */
export function freezeManifest(corpus = CORPUS) {
  const files = readdirSync(corpus).filter((f) => /^udhr-.+\.txt$/.test(f)).sort();
  const editions = files.map((file) => {
    const buf = readFileSync(new URL(file, corpus));
    const text = buf.toString("utf8");
    const lang = (text.split("\n")[1] ?? "").replace(/^Language:\s*/, "").trim();
    const code = (lang.match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? null;
    const sc = new URL(`${file}.eot.json`, corpus);
    let sidecarSha = null;
    if (existsSync(sc)) { try { sidecarSha = JSON.parse(readFileSync(sc, "utf8")).source?.sha256 ?? null; } catch { /* unreadable sidecar is recorded as null */ } }
    return {
      file, language: lang, code, bytes: buf.length, sha256: sha256(buf),
      sidecar: sidecarSha == null ? "absent" : sidecarSha === sha256(buf) ? "matches" : "differs",
      official: null,                                                  // UN official-language flag: unknown from the repo, filled from outside
    };
  });
  const root = short(editions.map((e) => `${e.file}\0${e.sha256}`).join("\n"));
  return { schema: "UDHRCoreEditionSet@1", count: editions.length, root, editions };
}

/** Steps 2-3 — segment each edition and append source / read / arrange (or gap) events. Idempotent by content. */
export function ingest(ledger, manifest, corpus = CORPUS) {
  const before = ledger.events.length, stats = { layout: 0, numbered: 0, structural: 0, gaps: 0, noPreamble: 0 };
  for (const e of manifest.editions) {
    const text = readFileSync(new URL(e.file, corpus), "utf8");
    const source_id = ledger.source({ kind: "udhr-edition", locator: REL + e.file, meta: { sha256: e.sha256, bytes: e.bytes, code: e.code, language: e.language } });
    const read = ledger.event({ stage: "read", source_id, range: byteRange(0, e.bytes), transform: "read:utf8", detail: { sidecar: e.sidecar } });
    const seg = segmentEdition(text);
    if (seg.gap) {
      stats.gaps++;
      ledger.event({ stage: "gap", source_id, parent: read, transform: "segment", detail: { reason: seg.gap } });
      continue;
    }
    stats[seg.method]++;
    if (!seg.preamble) stats.noPreamble++;
    if (seg.title) ledger.event({ stage: "arrange", source_id, parent: read, unit: "title", range: byteRange(seg.title.start, seg.title.end), transform: `segment:${seg.method}` });
    for (const u of seg.units) {
      ledger.event({
        stage: "arrange", source_id, parent: read, unit: u.unit, range: u.range, transform: `segment:${seg.method}`,
        detail: { heading: [u.heading.start, u.heading.end], paragraphs: u.paragraphs, confidence: seg.confidence, numberCheck: seg.numberCheck },
      });
    }
  }
  return { added: ledger.events.length - before, ...stats };
}

/** Rebuild a ledger from a saved Provenance@2 file so a second ingest can prove it adds nothing. */
export function loadLedger(eot) {
  const l = new ProvenanceLedger({ artifact: eot.artifact, encoding: eot.addressSpace?.encoding ?? "utf8", position: eot.position ?? null });
  for (const s of eot.sources) l.sources.set(s.source_id, structuredClone(s));
  for (const ev of eot.events) {
    l.events.push(structuredClone(ev));
    l.byKey.set(JSON.stringify({ stage: ev.stage, source_id: ev.source_id ?? null, parent: ev.parent ?? null, unit: ev.unit ?? null, range: ev.range ?? null, transform: ev.transform ?? null, ibid: ev.ibid ?? null, detail: ev.detail ?? null, position: ev.position ?? null }), ev.event_id);
  }
  return l;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = freezeManifest();
  const ledger = new ProvenanceLedger({ artifact: ARTIFACT });
  const stats = ingest(ledger, manifest);
  const ref = mintReferents(ledger, { setRoot: manifest.root });
  const rel = relate(ledger, { corpus: CORPUS });
  fileRoot(ledger, { setRoot: manifest.root });
  const vr = fileVariants(ledger);
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  writeFileSync(LOG, JSON.stringify(ledger.eot({ root: ledger.events.at(-1)?.event_id })) + "\n");
  const sc = manifest.editions.reduce((m, e) => (m[e.sidecar] = (m[e.sidecar] ?? 0) + 1, m), {});
  writeFileSync(new URL("./relations.json", import.meta.url), JSON.stringify({ schema: "UDHRRelationReport@1", setRoot: manifest.root, relations: witnesses(ledger) }, null, 1) + "\n");
  console.log({ variants: vr.added, charterRoot: structureRoot(ledger), relations: rel, referents: ref.referents, articleMembers: ref.articleMembers, paragraphDivergent: ref.paragraphDivergent });
  writeFileSync(new URL("./referents.json", import.meta.url), JSON.stringify({ schema: "UDHRReferentReport@1", setRoot: manifest.root, modal: Object.fromEntries([...ref.modal].map(([u, m]) => [u, m])), coverage: Object.fromEntries([...coverage(ledger)]) }, null, 1) + "\n");
  console.log({ editions: manifest.count, root: manifest.root, sidecars: sc, sources: ledger.sources.size, events: ledger.events.length, ...stats });
}
