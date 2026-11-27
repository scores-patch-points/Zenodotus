#!/usr/bin/env node
// falsify-corpus-memory.mjs — the falsifiers of the corpus memory (INGEST-CUBE.md), rerunnable on any day and night output.
//
//   F1  every activation span opens onto its own being: the bytes at (start, length) in Zenodotus, folded by the declared
//       instrument below, equal the being's ref (its birth name) or one of the surfaces the reader recorded for it (its
//       aliases; the gate's `being` entries). The second share tests the addresses; the gap between them shows conflation. The instrument is a CHECK ON ADDRESSES, not a reading: it lower-cases and
//       joins letter runs with "_", the way the reader's `ref:auto:` names are written; a span it cannot match is reported
//       with its bytes, never dropped.
//   F2  the corpus-level DMD share: of the beings and notes, how many stand (2 or more documents) after the night.
//   F7  the day is reproducible: two day directories holding the same documents have byte-identical deposits (so an echoed
//       note can be re-opened by re-reading its document at its address).
//
//   node scripts/falsify-corpus-memory.mjs --model <dir>... [--field <dir>] [--again <dir>...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PHAROS = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.join(ROOT, "..", "pharos");
const { open, entries } = await import(path.join(PHAROS, "lib", "pharos.mjs"));

const groups = { "--model": [], "--field": [], "--again": [] }; let cur = null;
for (const a of process.argv.slice(2)) { if (a in groups) cur = a; else if (cur) groups[cur].push(a); }
const read = (d) => entries(open("m", { dir: d, writer: "falsifier", format: "phb" }));
const paths = new Map();
for (const l of fs.readFileSync(path.join(ROOT, "..", "zenodotus-pharos", "ingest-checkpoint.jsonl"), "utf8").split("\n")) if (l) { const j = JSON.parse(l); paths.set(`doc:${j.sha256}`, j.path); }
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase() || (c >= "0" && c <= "9");
const fold = (s) => { let o = "", gap = false; for (const c of s.toLowerCase()) { if (isLetter(c)) { if (gap && o) o += "_"; o += c; gap = false; } else gap = true; } return o; };

const out = {};
// F1
{ let spans = 0, ok = 0, okAlias = 0; const bad = []; const cache = new Map(); const surf = new Map();
  for (const d of groups["--model"]) for (const e of read(d)) if (e.kind === "being") { const set = surf.get(e.addr) ?? new Set(); for (const x of [e.body.surface, ...(e.body.surfaces ?? [])]) set.add(fold(String(x))); surf.set(e.addr, set); }
  for (const d of groups["--model"]) for (const e of read(d)) {
    if (e.kind !== "activation") continue;
    const rows = Array.isArray(e.body.beings) ? e.body.beings : [[e.body.ref, e.body.spans]];
    const p = paths.get(e.body.source); if (!p) continue;
    if (!cache.has(p)) cache.set(p, fs.readFileSync(path.join(ROOT, p)));
    const b = cache.get(p);
    for (const [ref, sp] of rows) for (const [s, l] of sp) { spans++; const got = b.subarray(s, s + l).toString("utf8"); if (`ref:auto:${fold(got)}` === ref) ok++; else if (bad.length < 8) bad.push({ ref, got }); if ((surf.get(ref) ?? new Set()).has(fold(got)) || `ref:auto:${fold(got)}` === ref) okAlias++; }
  }
  out.F1 = { spans, equalsBirthName: ok, equalsARecordedSurface: okAlias, neither: spans - okAlias, birthNameShare: spans ? +(ok / spans).toFixed(4) : null, surfaceShare: spans ? +(okAlias / spans).toFixed(4) : null, notTheBirthName: bad };
}
// F2
if (groups["--field"].length) { const s = JSON.parse(fs.readFileSync(path.join(groups["--field"][0], "night-summary.json"), "utf8")); out.F2 = { beings: s.beings, notes: s.notes, beingStandShare: +(s.beings.field / s.beings.total).toFixed(4), noteStandShare: +(s.notes.field / s.notes.total).toFixed(4) }; }
// F7
if (groups["--again"].length) {
  const dep = (dirs) => { const m = new Map(); for (const d of dirs) for (const e of read(d)) if (e.kind === "deposit") m.set(e.body.source, JSON.stringify(e.body.notes)); return m; };
  const a = dep(groups["--model"]), b = dep(groups["--again"]); let same = 0, diff = 0, missing = 0;
  for (const [k, v] of a) { if (!b.has(k)) missing++; else if (b.get(k) === v) same++; else diff++; }
  out.F7 = { documents: a.size, identical: same, differing: diff, missing };
}
console.log(JSON.stringify(out, null, 1));
