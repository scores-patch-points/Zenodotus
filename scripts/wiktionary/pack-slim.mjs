// pack-slim.mjs — fold the slim directory (manifest.json + chunks/*.br) into ONE file for release/install.
//
//   node pack-slim.mjs --slim slim --out dist/wiktionary-slim-2026-10-01.pack [--snapshot 2026-10-01]
//
// Layout (all integers little-endian):
//   "WSLMPACK"                       8 bytes magic
//   chunk blobs, back to back        (brotli JSON-lines, exactly the bytes of chunks/<sha256>.br)
//   index JSON (utf8)                the manifest, each chunk gaining `off` (byte offset in this file)
//   u32 index length, u32 0x57534c31 the footer: a reader seeks to size-8, reads the index, then reads only the chunks it needs
// Because the footer is at the END, a reader needs just two reads to open the file, and a chunk is one ranged read
// (a local fs read, or an HTTP Range request against the release asset). Writes `<out>.sha256` and `<out>.json` (the small
// install manifest: version, size, sha256, counts, licence), which is what the installer checks the download against.
import { createReadStream, mkdirSync, openSync, readFileSync, writeSync, closeSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

export const MAGIC = Buffer.from("WSLMPACK"), FOOT = 0x57534c31;
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };

if (process.argv[1]?.endsWith("pack-slim.mjs")) {
  const SLIM = arg("slim", "slim"), OUT = arg("out", "dist/wiktionary-slim.pack"), SNAP = arg("snapshot", "unknown");
  mkdirSync(dirname(OUT), { recursive: true });
  const manifest = JSON.parse(readFileSync(join(SLIM, "manifest.json"), "utf8"));
  const fd = openSync(OUT, "w"); let off = 0;
  const put = (b) => { writeSync(fd, b); off += b.length; };
  put(MAGIC);
  const chunks = manifest.chunks.map((c) => {
    const b = readFileSync(join(SLIM, "chunks", `${c.sha256}.br`));
    if (createHash("sha256").update(b).digest("hex") !== c.sha256) throw new Error(`chunk ${c.sha256} does not match its name`);
    const entry = { ...c, off }; put(b); return entry;
  });
  const index = Buffer.from(JSON.stringify({ ...manifest, snapshot: SNAP, packVersion: 1, chunks }));
  put(index);
  const foot = Buffer.alloc(8); foot.writeUInt32LE(index.length, 0); foot.writeUInt32LE(FOOT, 4); put(foot);
  closeSync(fd);
  const h = createHash("sha256");
  await new Promise((res, rej) => createReadStream(OUT).on("data", (d) => h.update(d)).on("end", res).on("error", rej));
  const sha = h.digest("hex"), size = statSync(OUT).size;
  writeFileSync(`${OUT}.sha256`, `${sha}  ${OUT.split("/").pop()}\n`);
  writeFileSync(`${OUT}.json`, JSON.stringify({ name: OUT.split("/").pop(), snapshot: SNAP, packVersion: 1, bytes: size, sha256: sha, chunks: chunks.length,
    entries: manifest.entriesKept, reader: manifest.reader, licence: manifest.licence }, null, 1));
  console.log(`${OUT}: ${(size / 1e6).toFixed(1)} MB, ${chunks.length} chunks, sha256 ${sha.slice(0, 16)}…`);
}
