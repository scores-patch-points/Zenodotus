// udhr-core/mind-why.mjs — can every record in the mind log be traced to the source that made it believe that? Run: node mind-why.mjs [path to mind.eot]
// PRE-REGISTERED before the first run (2026-10-20):
//   Q1  the log contains only differences (DMD, DMDN, REVISE) plus the records that frame them (GROUND = the standing tip, WINDOW and MARGINS = statistics of a domain's convergence). Report the counts by kind;
//       report every difference record whose before-root equals its after-root (there must be none).
//   Q2  the log is binary: report its bytes, its magic, and bytes per record.
//   W1  WHY, one hop: every DMD, DMDN and REVISE record carries a `source`; it resolves to a FILE in the published repos (sha256 prefix equals the source) for at least 95% of those records.
//   W2  WHY, to the documents: for each domain, the resolved source names the documents it came from (by path or by hash), so that the evidence can be re-read. Judged per domain, yes/no, from what the artifact holds.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import * as E from "./eotm.mjs";
const LOG = process.argv[2] ?? new URL("../../../mnemosyne/mind.eot", import.meta.url).pathname, here = new URL("./", import.meta.url).pathname;
const buf = readFileSync(LOG), scan = E.scan(buf), recs = scan.records.map(E.decode), sha = (b) => createHash("sha256").update(b).digest("hex");
const names = { "udhr-core": "structure", "udhr-core/propositions": "propositions", "udhr-core/beings": "beings", "udhr-core/beings-independent": "beings-independent", "udhr-core/ring1-english": "ring1-english", "udhr-core/ring1-associates": "ring1-associates" }, dom = Object.fromEntries(Object.keys(names).map((n) => [E.domainOf(n), names[n]]));
const kinds = {}; for (const r of recs) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
const diffs = recs.filter((r) => ["DMD", "DMDN", "REVISE"].includes(r.kind)), nonDiff = diffs.filter((r) => r.before === r.after);
console.log(JSON.stringify({ Q1: { kinds, differenceRecords: diffs.length, framingRecords: recs.length - diffs.length, differencesThatChangedNothing: nonDiff.length }, Q2: { bytes: buf.length, magic: buf.subarray(0, 4).toString(), bytesPerRecord: +(buf.length / recs.length).toFixed(1), chainVerifies: scan.ok } }));

// index every candidate artifact by sha256 prefix
const index = new Map(), add = (p, label) => { try { const b = readFileSync(p); const h = sha(b); for (const n of [20, 32]) index.set(h.slice(0, n), label); } catch {} };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); const s = statSync(p); return s.isDirectory() ? (f.startsWith("_") || f === "node_modules" || f.startsWith("data-") ? [] : walk(p)) : [p]; });
for (const p of walk(here)) add(p, `udhr-core/${p.slice(here.length)}`);
const UD = here + "../../06-government-legal/un-udhr/"; for (const f of readdirSync(UD)) if (/^udhr-.*\.txt$/.test(f)) add(UD + f, `Zenodotus/06-government-legal/un-udhr/${f}`);
// UDHR editions: the ledger's source id is stableProvenanceId({kind:"udhr-edition", locator: REL + file}, "src") = "src_" + sha256(JSON.stringify(that)).slice(0,20): a hash of the LOCATOR, with the
// bytes' sha256 kept in the manifest (manifest.json: file, sha256). So the log's source resolves to a file by this recipe and the file's integrity is checked against the manifest.
const REL = "06-government-legal/un-udhr/" /* as in build.mjs */, man = JSON.parse(readFileSync(here + "manifest.json", "utf8"));
for (const e of man.editions) { const id = sha(JSON.stringify({ kind: "udhr-edition", locator: REL + e.file })).slice(0, 20); let ok = false; try { ok = sha(readFileSync(UD + e.file)) === e.sha256; } catch {} index.set(id, `${REL}${e.file}${ok ? " (bytes match manifest sha256)" : " (BYTES DO NOT MATCH the manifest)"}`); }
// the co-core charters (charters/): the source is the edition text's sha256 prefix; the file is Zenodotus/06-government-legal/charters/<charter>/<code>.txt
const CH = here + "../../06-government-legal/charters/", chDom = {};
for (const c of readdirSync(CH).filter((f) => existsSync(CH + f + "/manifest.json"))) { chDom[E.domainOf(`charters/${c}/articles`)] = `charters/${c}`; for (const e of JSON.parse(readFileSync(CH + c + "/manifest.json", "utf8")).editions.filter((x) => x.status === "ok")) add(CH + `${c}/${e.code}.txt`, `06-government-legal/charters/${c}/${e.code}.txt`); }
// CORAAL admitted-files root (the ring1-english step-2 source is a root over file hashes, not a file)
const { admitted } = await import("./perspective-gate.mjs"), w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : []));
const cor = w2(here + "../Zenodotus/11-multi-language/dialects-pidgins-creoles/coraal").filter((p) => admitted(p).admit).sort(); index.set(sha(cor.map((p) => sha(readFileSync(p))).join("\n")).slice(0, 20), `ROOT over the ${cor.length} admitted CORAAL files (Zenodotus/11-multi-language/dialects-pidgins-creoles/coraal/*)`);

const byDomain = {};
for (const r of diffs) { const d = dom[r.domain] ?? chDom[r.domain] ?? "?", e = (byDomain[d] ??= { records: 0, resolved: 0, targets: new Map() }); e.records++; const hit = index.get(r.source); if (hit) { e.resolved++; e.targets.set(hit, (e.targets.get(hit) ?? 0) + 1); } }
const total = diffs.length, resolved = Object.values(byDomain).reduce((a, x) => a + x.resolved, 0);
console.log(JSON.stringify({ W1: { differenceRecords: total, resolvedToAFile: resolved, share: +(resolved / total).toFixed(3), holds: resolved / total >= 0.95, byDomain: Object.fromEntries(Object.entries(byDomain).map(([k, v]) => [k, `${v.resolved}/${v.records} -> ${[...v.targets].slice(0, 3).map(([t, n]) => `${t} (${n})`).join("; ") || "unresolved"}${v.targets.size > 3 ? `; +${v.targets.size - 3} more files` : ""}`])) } }, null, 1));

// ---- W2: from the resolved source to the DOCUMENTS ----
// A manifest lists the documents a report read (path, sha256, bytes). W2 holds for a domain iff its source's manifest exists and EVERY listed document still hashes to what the manifest says.
const verifyManifest = (file) => { const p = here + file; if (!existsSync(p)) return { present: false }; const m = JSON.parse(readFileSync(p, "utf8")), sets = m.sets ? Object.values(m.sets) : [m], files = sets.flatMap((s) => s.files);
  let ok = 0, bad = 0, missing = 0; for (const f of files) { const q = here + "../Zenodotus/" + f.path; if (!existsSync(q)) { missing++; continue; } if (sha(readFileSync(q)) === f.sha256) ok++; else bad++; }
  return { present: true, documents: files.length, hashMatch: ok, changed: bad, missing, certified: m.certified ?? null, logSource: m.logSource ?? null }; };
const wTwo = { "ring1-english steps 0 and 1 (ring1-report.json, ring1-genre-report.json)": verifyManifest("provenance/ring1-docs.json"), "ring1-english step 2 (CORAAL)": verifyManifest("provenance/coraal-docs.json"), "ring1-associates (ring1-spiral3-report.json)": verifyManifest("ring1-spiral3-docs.json"), "Declaration domains (structure, propositions, beings x2)": { present: true, via: "manifest.json lists every edition's sha256; the resolution above already checks each file's bytes against it" } };
const corM = wTwo["ring1-english step 2 (CORAAL)"]; if (corM.present) corM.logSourceMatchesLog = [...index.keys()].includes(corM.logSource);
console.log(JSON.stringify({ W2: { holds: Object.values(wTwo).every((x) => x.present && (x.changed ?? 0) === 0 && (x.missing ?? 0) === 0), byDomain: wTwo } }, null, 1));
