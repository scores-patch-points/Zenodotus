// lookup.mjs — resolve a word against the slim dictionary, and learn it.
//
// Order of resolution (first hit wins):
//   1. LEARNED   words this mind has already looked up, recorded in learned.eot.jsonl. Served without touching a chunk.
//                A learned word is stale — and skipped — once the watcher has logged a change to that title after the
//                moment it was learned (changed.jsonl); the fresh answer is then learned over it, parent-linked.
//   2. DELTA     delta.jsonl: slim records re-extracted after edits that made a difference (latest per word wins).
//   3. CHUNK     manifest binary search → one brotli chunk → binary search inside it. Chunks are cached decompressed.
//   4. GAP       typed: {found:false, gap:"absent_in_slim", word}. Never an empty "no" that reads like a fact.
//
// Learning is one EOT event per word (Provenance@2 shape, content-addressed, parent = the previous event for the same
// word): a `source` row holding the slim entries under src_<sha256[:20]>, and an `evt_` row of stage "learn". A word
// whose answer is identical to what is already learned adds nothing (the id repeats), so re-reading is free.
import { appendFileSync, closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { dirname, join } from "node:path";
import { sha256 } from "./project.mjs";

const idOf = (value, prefix) => `${prefix}_${sha256(JSON.stringify(value)).slice(0, 20)}`;
const readLines = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

export class Dictionary {
  // Open either a slim directory (`dir`) or a single packed file (`pack`, see pack-slim.mjs). The pack's footer holds the index.
  constructor({ dir = null, pack = null, base = dir ?? dirname(pack), learned = join(base, "..", "learned.eot.jsonl"), changed = join(base, "..", "changed.jsonl"), delta = join(base, "..", "delta.jsonl"), cacheChunks = 8 } = {}) {
    this.dir = dir; this.learnedPath = learned; this.changedPath = changed; this.deltaPath = delta;
    if (pack) {
      this.fd = openSync(pack, "r"); const size = statSync(pack).size, foot = Buffer.alloc(8);
      readSync(this.fd, foot, 0, 8, size - 8);
      if (foot.readUInt32LE(4) !== 0x57534c31) throw new Error("not a wiktionary-slim pack (bad footer)");
      const idx = Buffer.alloc(foot.readUInt32LE(0)); readSync(this.fd, idx, 0, idx.length, size - 8 - idx.length);
      this.manifest = JSON.parse(idx.toString("utf8"));
    } else this.manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    this.chunkCache = new Map(); this.cacheMax = cacheChunks;
    this.stats = { learned: 0, delta: 0, chunk: 0, gap: 0, taught: 0 };
    this.reload();
  }
  close() { if (this.fd != null) closeSync(this.fd); }
  reload() {
    this.learned = new Map(); this.tip = new Map(); this.seen = new Set();
    for (const r of readLines(this.learnedPath)) {
      if (r.type === "source") this.seen.add(r.source_id);
      else if (r.type === "event") { this.seen.add(r.event_id); this.tip.set(r.unit, r.event_id); }
      if (r.type === "source") this.learned.set(r.locator.word, { entries: r.entries, at: r.at, source_id: r.source_id });
    }
    this.changed = new Map();
    for (const r of readLines(this.changedPath)) this.changed.set(r.title, Math.max(this.changed.get(r.title) ?? 0, Date.parse(r.at) || 0));
    this.delta = new Map();
    for (const r of readLines(this.deltaPath)) this.delta.set(r.w, r.e);
  }

  /** The chunk that would hold `word`, or null if it sorts outside every chunk's range. */
  chunkFor(word) {
    const cs = this.manifest.chunks; let lo = 0, hi = cs.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (word < cs[mid].first) hi = mid - 1; else if (word > cs[mid].last) lo = mid + 1; else return cs[mid]; }
    return null;
  }
  loadChunk(c) {
    let lines = this.chunkCache.get(c.sha256);
    if (lines) { this.chunkCache.delete(c.sha256); this.chunkCache.set(c.sha256, lines); return lines; }
    let blob;
    if (this.fd != null) { blob = Buffer.alloc(c.bytes); readSync(this.fd, blob, 0, c.bytes, c.off); } // one ranged read of the pack
    else blob = readFileSync(join(this.dir, "chunks", `${c.sha256}.br`));
    lines = brotliDecompressSync(blob).toString("utf8").split("\n").filter(Boolean);
    this.chunkCache.set(c.sha256, lines);
    if (this.chunkCache.size > this.cacheMax) this.chunkCache.delete(this.chunkCache.keys().next().value);
    return lines;
  }
  fromChunk(word) {
    const c = this.chunkFor(word); if (!c) return null;
    const lines = this.loadChunk(c); let lo = 0, hi = lines.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; const row = JSON.parse(lines[mid]); if (word < row.w) hi = mid - 1; else if (word > row.w) lo = mid + 1; else return row.e; }
    return null;
  }

  teach(word, entries, from) {
    const source_id = idOf({ kind: "wiktionary-slim", locator: { word, entries } }, "src");
    const at = new Date().toISOString();
    const cur = this.learned.get(word);
    if (cur?.source_id === source_id && !this.isStale(word, cur)) return false;
    if (!this.seen.has(source_id)) { appendFileSync(this.learnedPath, JSON.stringify({ type: "source", source_id, kind: "wiktionary-slim", locator: { word }, entries, at }) + "\n"); this.seen.add(source_id); }
    const parent = this.tip.get(word) ?? null;
    const event_id = idOf({ stage: "learn", source_id, unit: word, parent }, "evt");
    if (!this.seen.has(event_id)) {
      appendFileSync(this.learnedPath, JSON.stringify({ type: "event", event_id, stage: "learn", source_id, parent, unit: word, transform: "slim→mind", position: { at }, detail: { from, tags: [...new Set(entries.map((e) => e.tag).filter(Boolean))] } }) + "\n");
      this.seen.add(event_id); this.tip.set(word, event_id);
    }
    this.learned.set(word, { entries, at, source_id }); this.stats.taught++;
    return true;
  }
  isStale(word, rec) { const ch = this.changed.get(word); return ch != null && ch > (Date.parse(rec.at) || 0); }

  /** resolve(word, {lang}) → {found, entries, from, ...}. `lang` filters on Wiktionary's code or the suite tag. */
  resolve(word, { lang = null, learn = true } = {}) {
    const keep = (es) => (lang ? es.filter((e) => e.c === lang || e.tag === lang) : es);
    const hit = (entries, from) => {
      const es = keep(entries);
      // the word exists but not in this language: a typed gap, never an empty "found"
      return es.length ? { found: true, word, from, entries: es } : { found: false, gap: "no_entry_in_language", word, lang, from, languages: [...new Set(entries.map((e) => e.tag).filter(Boolean))] };
    };
    const rec = this.learned.get(word);
    if (rec && !this.isStale(word, rec)) { this.stats.learned++; return hit(rec.entries, "learned"); }
    let entries = this.delta.get(word), from = "delta";
    if (entries) this.stats.delta++; else { entries = this.fromChunk(word); from = "chunk"; if (entries) this.stats.chunk++; }
    if (!entries) { this.stats.gap++; return { found: false, gap: "absent_in_slim", word, drill: "extract/enwiktionary-extract.jsonl on the VM, then the dump" }; }
    if (learn) this.teach(word, entries, from);
    return hit(entries, from);
  }
}

if (process.argv[1]?.endsWith("lookup.mjs") && process.argv[2]) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
  const d = new Dictionary(arg("pack") ? { pack: arg("pack") } : { dir: arg("dir", "slim") });
  const t0 = process.hrtime.bigint();
  const r = d.resolve(process.argv[2], { lang: arg("lang", null) });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(JSON.stringify(r, null, 1).slice(0, 4000)); console.error(`${ms.toFixed(2)} ms from ${r.from ?? "gap"}`);
}
