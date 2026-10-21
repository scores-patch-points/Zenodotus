// fetch-wiktionary-slim.mjs — install the packed English Wiktionary dictionary (all languages) on this machine.
//
//   node scripts/wiktionary/fetch-wiktionary-slim.mjs [--dir ~/.cache/live_priors/wiktionary] [--url <override>]
//
// Reads 11-multi-language/wiktionary/manifest.json (name, bytes, sha256, url), downloads the single .pack file, RESUMES a partial
// download (HTTP Range), verifies the sha256, then renames it into place. A pack that fails its hash is deleted, never used.
// Idempotent: a verified pack already in place is left alone. Prints the path; open it with scripts/wiktionary/lookup.mjs
// (`new Dictionary({ pack })`). The pack is a derived artifact, rebuildable from the Wikimedia dump (LP1: the dump is the source).
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, renameSync, rmSync, statSync, createWriteStream, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const man = JSON.parse(readFileSync(join(here, "..", "..", "11-multi-language", "wiktionary", "manifest.json"), "utf8"));
const url = arg("url", man.url);
if (!url) { console.error("manifest.json has no url yet: the pack has not been published. Pass --url, or build it with scripts/wiktionary/build-fast.mjs."); process.exit(3); }
const dir = arg("dir", join(homedir(), ".cache", "live_priors", "wiktionary")); mkdirSync(dir, { recursive: true });
const dest = join(dir, man.name), part = `${dest}.part`;

const sha = (p) => new Promise((res, rej) => { const h = createHash("sha256"); createReadStream(p).on("data", (d) => h.update(d)).on("end", () => res(h.digest("hex"))).on("error", rej); });
if (existsSync(dest) && (await sha(dest)) === man.sha256) { console.log(dest); process.exit(0); }

const have = existsSync(part) ? statSync(part).size : 0;
let res;
try { res = await fetch(url, { headers: have ? { range: `bytes=${have}-` } : {}, redirect: "follow" }); }
catch (e) { console.error(`download failed: ${e.cause?.code || e.message} (${url})`); process.exit(4); }
if (!(res.status === 200 || res.status === 206)) { console.error(`download failed: HTTP ${res.status}`); process.exit(4); }
const out = createWriteStream(part, { flags: res.status === 206 ? "a" : "w" });
let got = res.status === 206 ? have : 0, lastPct = -1;
for await (const chunk of res.body) {
  out.write(chunk); got += chunk.length;
  const pct = Math.floor((100 * got) / man.bytes); if (pct !== lastPct && pct % 10 === 0) { console.error(`${pct}%`); lastPct = pct; }
}
await new Promise((r) => out.end(r));
if ((await sha(part)) !== man.sha256) { rmSync(part); console.error("sha256 mismatch: partial file removed, nothing installed"); process.exit(5); }
renameSync(part, dest);
console.log(dest);
