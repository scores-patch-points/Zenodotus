#!/usr/bin/env node
// build-alhazen-vision-prior.mjs — compile VisionPrior@1 for the Alhazen optics
// reader, following derived-priors' discipline: a family of POINTERS (never
// copies) to the source of the reader's priors, pinned by sha256, with the small
// taxonomies (eyes, schemas, value formats) EXTRACTED from the source by regex,
// not hand-retyped. The corpus cites the reader; it does not hold it.
//
//   node scripts/build-alhazen-vision-prior.mjs
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ZEN = path.resolve(HERE, "..");
const ROOT = path.resolve(ZEN, "..");                 // /Users/mlacy/Documents/3.0
const sha256 = (p) => { try { return createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } catch { return null; } };
const exists = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

const ALHAZEN = path.join(ROOT, "Alhazen/alhazen.js");
const VENDORED = path.join(ROOT, "holodeck/vendor/alhazen/alhazen.js");
const VENDOR_REC = path.join(ROOT, "holodeck/vendor/alhazen/ALHAZEN-VENDOR.json");
const EO_READ = path.join(ROOT, "eo-docread/read.mjs");
const VIDEO = path.join(ROOT, "eo-docread/video-read.mjs");
const LIVE = path.join(ROOT, "holodeck/alhazen-live.html");

if (!exists(ALHAZEN)) { console.error("no Alhazen source at", ALHAZEN); process.exit(1); }
const src = fs.readFileSync(ALHAZEN, "utf8");
const uniq = (a) => [...new Set(a)];

// extract the classifications from the source (measurement, not a hand list)
const schemas = uniq([...src.matchAll(/schema:\s*"([A-Za-z0-9@]+)"/g)].map((m) => m[1])).sort();
const eyeAssigned = [...src.matchAll(/EYES\.([A-Za-z0-9_]+)\s*=/g)].map((m) => m[1]);
const eyeLiteral = (src.match(/const EYES\s*=\s*\{([\s\S]*?)\};/)?.[1] || "").split(",").map((s) => s.split(":")[0].trim()).filter(Boolean);
const eyes = uniq([...eyeLiteral, ...eyeAssigned]).sort();
const valueFormats = uniq([...src.matchAll(/return\s+"(empty|currency|date|time|email|phone|choice|identifier|integer|decimal|name|free-text|text)"/g)].map((m) => m[1]));
const sceneKinds = uniq([...src.matchAll(/return\s+"(blank|photograph|screenshot|chart|diagram|document|unknown)"/g)].map((m) => m[1]));
const layerRoles = uniq([...src.matchAll(/const order\s*=\s*\[([^\]]+)\]/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().replace(/['"]/g, "")))).filter((s) => /^(paper|faint|wash|figure|ink)$/.test(s));

let vendoredCommit = null;
try { vendoredCommit = JSON.parse(fs.readFileSync(VENDOR_REC, "utf8")).commit || null; } catch {}

const pointer = (id, what, home, extra) => ({ id, what, home: path.relative(ZEN, home), exists: exists(home), sha256: sha256(home), ...extra });

const prior = {
  schema: "VisionPrior@1",
  family: "alhazen",
  giver: "opencode, 2026-10-08 (Alhazen build session)",
  recipe: "regex-extract the eye registry, schemas and taxonomies from scores-patch-points/Alhazen/alhazen.js; POINTER (never copy) to the source and its vendored copy, sha256-pinned; list the corpora the reader was measured on",
  standing: "CANDIDATE — a pointer index, not a measured accuracy claim",
  what_this_is: "where the no-model optics reader's priors live: the source, its vendored copies, the nested-document reader, and the corpora it reads. Pointers only; the corpus does not hold the reader.",
  pointers: [
    pointer("alhazen-source", "the canonical optics reader (pure JS, no model)", ALHAZEN, { repo: "scores-patch-points/Alhazen", note: "loads as ESM/CommonJS/script; exposes window.Alhazen" }),
    pointer("alhazen-vendored", "the byte-identical copy the holodeck surface loads", VENDORED, { pin: vendoredCommit, note: "vendor-alhazen.mjs from scores-patch-points/Alhazen" }),
    pointer("eo-nested-reader", "the EO nested document reader (page>section>field, typed values, EOT ledger)", EO_READ, { schema: "EODocRead@1" }),
    pointer("video-reader", "the 4D/video harness (frames -> trails, tracks, motion blur)", VIDEO, {}),
    pointer("live-widget", "the live in-browser reader (webcam/file/capture -> overlay)", LIVE, {}),
  ],
  eyes,
  schemas,
  valueFormats,
  sceneKinds,
  layerRoles,
  learned: [
    { name: "rule ledger", schema: "AlhazenRules@1", note: "learnFrom(reading, truth) -> key/format rules; createRuleLedger(); append-only with falsify()" },
    { name: "pheromone board", schema: "AlhazenPheromone@1", note: "eyelevel stigmergy keyed by sceneKind; deposit/evaporate/recommend" },
    { name: "online background/salience", schema: "AlhazenSalience@1", note: "learnSalience(frames): per-pixel background learned on the fly, subject = persistent deviation; NO skin/face/class prior" },
    { name: "sign vocabulary", schema: "AlhazenSigns@1", note: "readSigns(frames): a sign is 4D (handshape + signing-space location + movement path/direction/repetition) -> movement-episode segmentation -> online clustering; no lexicon, no language" },
  ],
  corpora_measured_on: [
    { id: "funsd", home: "ab/corpus/data/_funsd/dataset", note: "199 scanned forms, question->answer links (English)" },
    { id: "xfund-fr", home: "ab/corpus/data/xfund/xf", note: "French forms (Latin), FUNSD-shaped GT" },
    { id: "xfund-zh", home: "ab/corpus/data/xfund/xf", note: "Chinese forms (non-Latin), FUNSD-shaped GT" },
    { id: "naf", home: "ab/corpus/data/naf", note: "US National Archives forms + handwriting (annotations; images in a 753MB release)" },
  ],
  falsifying_control: "a pointer whose sha256 no longer matches its source (the reader moved and this index went stale), or an EYES/schema name in this file that the source no longer declares, breaks the index.",
  at: new Date().toISOString(),
};

const outDir = path.join(ZEN, "derived-priors/vision-priors");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "alhazen-vision-prior-v1.json");
fs.writeFileSync(outFile, JSON.stringify(prior, null, 1) + "\n");
console.log(`wrote ${path.relative(ZEN, outFile)}: ${eyes.length} eyes, ${schemas.length} schemas, ${prior.pointers.length} pointers`);
