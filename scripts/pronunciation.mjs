#!/usr/bin/env node
// pronunciation.mjs — the PronunciationPrior@1 lookup API: given a Rosetta
// language and a surface word, return the SOUND (WAV bytes) with full
// provenance. Dependency-free (node:http for the probe server, node:fs for
// the manifest + cache), local-only, mirroring the fold's explore-server.mjs
// posture.
//
// WHAT IS SERVED. The WAV is the surface — the exact bytes of the sound.
// The IPA beside it is a DERIVED annotation from the same engine (kept so a
// caller can read a pronunciation without decoding audio, never as the
// record). The sha256 lets a caller verify the bytes it got against the
// committed manifest.
//
// THE RESOLVE DISCIPLINE (lang-registry.mjs's own, applied to audio):
//   1. manifest lookup — is the word in the committed prior? No -> typed
//      refusal (a word absent from the manifest is a GAP, never a silent
//      synthesis from nowhere; and a word absent in one language is NEVER
//      answered from another language).
//   2. cache hit — is <sha256>.wav on disk? Serve it.
//   3. cache miss — re-synthesize deterministically from the manifest's own
//      recipe (espeak-ng voice + word), verify sha256 against the manifest,
//      cache, serve. A re-synthesis that drifts from the pinned hash is a
//      reported drift, never a silently-served different sound.
//
// The probe server:
//   GET  /pronunciation/:lang/:word            -> WAV bytes (audio/wav) +
//        x-er7-pron-ipa, x-er7-pron-sha256, x-er7-pron-source headers
//   GET  /pronunciation/:lang/:word/meta       -> {ipa, sha256, bytes,
//        source, unit, inManifest} JSON
//   GET  /health                               -> the manifest coverage
//   GET  /                                     -> self-describing map
//   POST /pronunciation/:lang                  -> body {word} -> same as GET
//
//   node scripts/pronunciation.mjs serve [--port=11439]
// Or import:
//   import { resolvePronunciation, manifestOf, coverage } from "./pronunciation.mjs";

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cachePath, LANGUAGES } from "./build-pronunciation-prior.mjs";

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "..", "derived-priors", "pronunciation-priors");
const manifestPath = (lang) => path.join(OUT_DIR, `pronunciation-${lang}.json`);

const espeak = () => process.env.ESpeakNG || (() => { try { return execFileSync("which", ["espeak-ng"], { encoding: "utf8" }).trim(); } catch { return null; } })();

export function manifestOf(lang) {
  const p = manifestPath(lang);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/** coverage(lang) — how much of the prior's own corpus is resolvable to
 *  sound on THIS machine right now: manifest words vs WAV bytes on disk. */
export function coverage(lang, manifest = manifestOf(lang)) {
  if (!manifest) return { refused: { type: "no_manifest", detail: `no PronunciationPrior@1 for "${lang}"` } };
  const total = manifest.counts?.words ?? Object.keys(manifest.words).length;
  let cached = 0;
  for (const w of Object.values(manifest.words)) {
    const p = cachePath(lang, w.sha256);
    if (fs.existsSync(p) && fs.statSync(p).size === w.bytes) cached++;
  }
  return { total, cached, missing: total - cached, resolvable: manifest.counts?.synthesized ?? total };
}

/**
 * resolvePronunciation(lang, word, {allowSynthesis}) -> the sound + provenance.
 * Returns the WAV bytes as a Buffer. Never another language, never a
 * fabricated word: absent from the manifest is a typed refusal. Synthesis is
 * OFF by default (a lookup should not suddenly shell out and spend a
 * machine's CPU); callers that want on-demand cache repair pass
 * allowSynthesis: true.
 */
export function resolvePronunciation(lang, word, { allowSynthesis = false, manifest = manifestOf(lang) } = {}) {
  if (!LANGUAGES[lang]) return { refused: { type: "unknown_language", detail: `no registry row for "${lang}"` } };
  if (!manifest) return { refused: { type: "no_manifest", detail: `no PronunciationPrior@1 for "${lang}"` } };
  const entry = manifest.words?.[word];
  if (!entry) return { refused: { type: "word_gap", detail: `"${word}" is not in the PronunciationPrior@1 for ${lang} — a gap, never silently answered from another language` } };
  const p = cachePath(lang, entry.sha256);
  if (fs.existsSync(p)) {
    const bytes = fs.readFileSync(p);
    if (bytes.length === entry.bytes) return { wav: bytes, ipa: entry.ipa, sha256: entry.sha256, bytes: entry.bytes, source: entry.source, unit: entry.unit, from: "cache" };
    return { refused: { type: "cache_corrupt", detail: `${p} is ${bytes.length} bytes, manifest pins ${entry.bytes}` } };
  }
  if (!allowSynthesis) return { refused: { type: "not_cached", detail: `${path.relative(HERE, p)} absent; re-run with allowSynthesis to rebuild the cache deterministically from the manifest's own recipe` } };
  const bin = espeak();
  if (!bin) return { refused: { type: "espeak_ng_unavailable", detail: "no espeak-ng binary; set ESpeakNG" } };
  const tmp = path.join(process.env.TMPDIR ?? "/tmp", `er7-pron-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  try {
    execFileSync(bin, ["-v", entry.source.voice, "-w", tmp, word], { maxBuffer: 1 * 1024 * 1024 });
    const wav = fs.readFileSync(tmp);
    const hash = sha256(wav);
    if (hash !== entry.sha256) return { refused: { type: "synthesis_drift", detail: `re-synthesis of "${word}" hashed ${hash}, manifest pins ${entry.sha256} — refused rather than served` } };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, wav);
    return { wav, ipa: entry.ipa, sha256: hash, bytes: wav.length, source: entry.source, unit: entry.unit, from: "synthesized" };
  } catch (e) {
    return { refused: { type: "synthesis_failed", detail: `${bin} -v ${entry.source.voice} ${JSON.stringify(word)}: ${e.message}` } };
  } finally {
    try { fs.rmSync(tmp, { force: true }); } catch {}
  }
}

// ---- probe server ---------------------------------------------------------
// Dependency-free, local-only, no-store — the fold's explore-server posture.
export function startProbeServer({ port = 11439 } = {}) {
  const send = (res, code, body) => {
    if (Buffer.isBuffer(body)) { res.writeHead(code, { "content-type": "audio/wav", "content-length": body.length, "cache-control": "no-store" }); return res.end(body); }
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  return http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://127.0.0.1:${port}`);
    const p = u.pathname;
    const m = p === "/" || p === "";
    if (req.method === "GET" && m) {
      return send(res, 200, {
        service: "eoreader7 PronunciationPrior@1 probe",
        resolve: "GET /pronunciation/:lang/:word — WAV bytes + x-er7-pron-* headers",
        meta: "GET /pronunciation/:lang/:word/meta — {ipa, sha256, bytes, source, unit}",
        post: "POST /pronunciation/:lang  { \"word\": \"...\" }",
        health: "GET /health — per-language coverage",
        languages: Object.fromEntries(Object.entries(LANGUAGES).map(([k, v]) => [k, v.voice])),
        note: "The WAV is the surface; the IPA is a derived annotation from the same engine. A word absent from the manifest is a typed gap, never answered from another language.",
      });
    }
    if (req.method === "GET" && p === "/health") {
      return send(res, 200, Object.fromEntries(Object.keys(LANGUAGES).map((l) => [l, coverage(l)])));
    }
    const mm = /^\/pronunciation\/([a-z_]+)\/(.+?)(\/meta)?$/.exec(p);
    if (req.method === "GET" && mm) {
      const [, lang, word, meta] = mm;
      const r = resolvePronunciation(lang, decodeURIComponent(word));
      if (r.refused) return send(res, 400, r);
      if (meta) return send(res, 200, { language: lang, word: decodeURIComponent(word), ipa: r.ipa, sha256: r.sha256, bytes: r.bytes, source: r.source, unit: r.unit, from: r.from });
      res.setHeader("x-er7-pron-ipa", Buffer.from(r.ipa ?? "", "utf8").toString("base64"));
      res.setHeader("x-er7-pron-sha256", r.sha256);
      res.setHeader("x-er7-pron-source", `${r.source.kind}/${r.source.engine}/${r.source.voice}`);
      res.setHeader("x-er7-pron-unit", r.unit ?? "");
      return send(res, 200, r.wav);
    }
    if (req.method === "POST" && /^\/pronunciation\/([a-z_]+)$/.test(p)) {
      let body = ""; for await (const c of req) body += c;
      let word; try { word = JSON.parse(body || "{}").word; } catch { return send(res, 400, { error: "body must be JSON {\"word\": \"...\"}" }); }
      if (!word) return send(res, 400, { error: "body must carry {\"word\": \"...\"}" });
      const lang = /^\/pronunciation\/([a-z_]+)$/.exec(p)[1];
      const r = resolvePronunciation(lang, word);
      if (r.refused) return send(res, 400, r);
      res.setHeader("x-er7-pron-ipa", Buffer.from(r.ipa ?? "", "utf8").toString("base64"));
      res.setHeader("x-er7-pron-sha256", r.sha256);
      return send(res, 200, r.wav);
    }
    return send(res, 404, { error: "not found — GET / for the map" });
  }).listen(port, "127.0.0.1", () => console.log(`pronunciation probe on http://127.0.0.1:${port}`));
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const port = Number(args.find((a) => a.startsWith("--port="))?.slice(7) ?? 11439);
  if (args[0] === "serve") startProbeServer({ port });
  else if (args[0] === "coverage") {
    for (const lang of args.slice(1).length ? args.slice(1) : Object.keys(LANGUAGES)) {
      console.log(lang, coverage(lang));
    }
  } else {
    console.log("usage: node scripts/pronunciation.mjs serve [--port=11439] | coverage [lang...]");
  }
}