#!/usr/bin/env node
// lang-registry.mjs — one registry of what received linguistic resources
// exist per language, and one resolver that fetches them ON DEMAND rather
// than vendoring every language ahead of time. User direction, 2026-09-01:
// "can we leave the unimorph on its own site and not bloat our priors
// doc?" then "why don't we do language detection and then vendor from
// unimorph as needed live?"
//
// THE RULE THIS ENCODES: bytes are committed only where something reads
// them; otherwise the recipe plus the source address plus its sha256 IS
// the artifact. `pos-prior-en.json` is committed (loadPosForms reads it
// every run); everything else resolves on demand into a gitignored cache.
// This is POLICIES.md LP10's own rule ("a prior with no consumer is not
// coverage") made mechanical instead of a thing each pass re-decides.
//
// EVERY ROW BELOW WAS VERIFIED LIVE, not assumed from a naming
// convention — full transcript, including the four repo names that had to
// be found rather than guessed, in scripts/multilingual-priors-RESULTS.md.
// A gap is TYPED, never a silent absence, and resolution NEVER falls back
// to another language: reading Arabic with English priors and not noticing
// is precisely the failure this registry exists to make impossible.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(HERE, "..");
const POS_DIR = path.join(ROOT, "derived-priors", "pos-priors");

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// ---- the registry -------------------------------------------------------
// `ud` / `unimorph`: either a real address, or a typed `gap` naming what was
// checked and what was found. `vendored: true` means the built artifact is
// committed because something reads it.

export const REGISTRY = {
  en: {
    iso: "eng", name: "English",
    ud: { repo: "UD_English-EWT", prefix: "en_ewt" },
    unimorph: { repo: "unimorph/eng", file: "eng" },
    pronunciation: { prior: "pronunciation-eng.json", voice: "en-us", builder: "scripts/build-pronunciation-prior.mjs eng" },
    vendored: true,
    consumer: "build-reading-priors.mjs::loadPosForms — headOf's head election, every run",
  },
  ar: {
    iso: "arb", name: "Arabic (Modern Standard)",
    ud: { repo: "UD_Arabic-PADT", prefix: "ar_padt" },
    unimorph: {
      gap: {
        status: "no_matching_register",
        checked: [
          { repo: "unimorph/arb", finding: "404 — does not exist" },
          { repo: "unimorph/arz", finding: "200 — real, but Egyptian Arabic" },
          { repo: "unimorph/afb", finding: "200 — real, but Gulf Arabic" },
        ],
        because: "this corpus is Modern Standard Arabic prose (udhr-arb.txt); only dialectal UniMorph data exists, and a dialect's paradigms substituted for MSA fails silently rather than loudly",
      },
    },
    pronunciation: { prior: "pronunciation-arb.json", voice: "ar", builder: "scripts/build-pronunciation-prior.mjs arb" },
    vendored: false,
  },
  es: {
    iso: "spa", name: "Spanish",
    ud: { repo: "UD_Spanish-AnCora", prefix: "es_ancora" },
    unimorph: { repo: "unimorph/spa", file: "spa" },
    pronunciation: { prior: "pronunciation-spa.json", voice: "es", builder: "scripts/build-pronunciation-prior.mjs spa" },
    vendored: false,
  },
  zh: {
    iso: "cmn_hans", name: "Chinese, Mandarin, Simplified",
    // UD_Chinese-GSD answers 200 on every file but is TRADITIONAL script,
    // where this corpus is Simplified (udhr-cmn_hans) — caught by reading
    // the actual bytes, not by trusting the status code. GSDSimp is UD's
    // own Simplified conversion.
    ud: { repo: "UD_Chinese-GSDSimp", prefix: "zh_gsdsimp" },
    unimorph: {
      gap: {
        status: "no_repository",
        checked: [
          { repo: "unimorph/cmn", finding: "404" }, { repo: "unimorph/zho", finding: "404" },
          { repo: "unimorph/lzh", finding: "404" }, { repo: "unimorph/wuu", finding: "404" },
          { repo: "unimorph/yue", finding: "404" },
          { search: "org-wide search for 'chinese'", finding: "zero results" },
        ],
        because: "no UniMorph repository exists for any Chinese variety — read as principled rather than an oversight: UniMorph's schema is inflectional paradigms, and Chinese is near-isolating, so there is very little for it to tabulate",
      },
    },
    pronunciation: { prior: "pronunciation-cmn_hans.json", voice: "cmn", unit: "clause", builder: "scripts/build-pronunciation-prior.mjs cmn_hans" },
    vendored: false,
  },
  sw: {
    iso: "swh", name: "Swahili",
    ud: {
      gap: {
        status: "no_usable_data",
        checked: [
          { repo: "UD_Swahili-UCB", finding: "does not exist — an unverified guess, refused rather than retried under variant spellings" },
          { repo: "UD_Swahili-OPUSGV", finding: "the only real Swahili entry in the UD org; ships CONTRIBUTING.md, LICENSE.txt, README.md and NO .conllu file anywhere — confirmed by two independent listings — despite its own README claiming 'Data available since: UD v2.8'" },
        ],
        because: "an upstream defect: a registered treebank whose annotation was never actually published",
      },
    },
    unimorph: {
      gap: {
        status: "no_matching_register",
        checked: [
          { repo: "unimorph/swa", finding: "404" }, { repo: "unimorph/swh", finding: "404" },
          { repo: "unimorph/swc", finding: "200 — real, but Congo Swahili, a distinct variety from the Kiswahili standard this corpus reads" },
        ],
        because: "same reasoning as Arabic — a variety exists, the register this corpus reads does not, and the two are not silently interchangeable",
      },
    },
    pronunciation: {
      gap: {
        status: "no_udhr_corpus",
        checked: [{ finding: "the Rosetta reads exactly eng, fra, spa, rus, arb, cmn_hans (udhr-rosetta.mjs LANGUAGES) — Swahili has no UDHR text in that reading and no word list to synthesize, so no PronunciationPrior@1 row exists" }],
        because: "the pronunciation prior is corpus-driven (a prior with no consumer is not coverage, LP10); there is no Swahili text in the Rosetta to take a word list from",
      },
    },
    vendored: false,
  },
};

export const posPriorPath = (lang) => path.join(POS_DIR, `pos-prior-${lang}.json`);

// ---- the lockfile -------------------------------------------------------
// Fetching on demand is only safe if a later fetch can be told apart from
// the one that was actually measured against. This is small, committed, and
// plays the role package-lock plays: it pins the sha256 of every upstream
// file a resolve consumed, so upstream drift is REPORTED, never silently
// absorbed into a prior that some result document already cited.

export const LOCK_PATH = path.join(POS_DIR, "resolved.lock.json");

export function readLock() {
  if (!fs.existsSync(LOCK_PATH)) return { schema: "PosPriorLock@1", resolved: {} };
  return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
}

export function writeLock(lock) {
  fs.mkdirSync(POS_DIR, { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 1));
}

/** Compare freshly-fetched sources against the lock. Returns typed drift, never a silent pass. */
export function checkDrift(lang, sources, lock = readLock()) {
  const prev = lock.resolved?.[lang];
  if (!prev) return { status: "new" };
  const changed = sources.filter((s) => {
    const was = prev.source?.find((p) => p.file === s.file);
    return was && was.sha256 !== s.sha256;
  }).map((s) => ({ file: s.file, was: prev.source.find((p) => p.file === s.file).sha256, now: s.sha256 }));
  return changed.length ? { status: "drifted", changed, resolvedAt: prev.resolvedAt } : { status: "unchanged" };
}

// ---- CONLL-U -> POSPrior@1 ---------------------------------------------
// FORM = column 2, UPOS = column 4; comment lines, multiword ranges (id with
// '-') and empty nodes (id with '.') skipped; forms lowercased.

export async function buildPosPriorFor(lang, { log = () => {} } = {}) {
  const entry = REGISTRY[lang];
  if (!entry) return { refused: { type: "unknown_language", detail: `no registry row for "${lang}"` } };
  if (entry.ud?.gap) return { refused: { type: entry.ud.gap.status, detail: entry.ud.gap.because, checked: entry.ud.gap.checked } };

  // Object.create(null), never {}: a real corpus token can collide with an
  // Object.prototype key ("constructor" is a genuine attested Spanish word
  // in UD_Spanish-AnCora — measured, and it cost this artifact one distinct
  // form before it was caught).
  const forms = Object.create(null);
  const sources = [];
  let tokens = 0, sentences = 0;
  const base = `https://raw.githubusercontent.com/UniversalDependencies/${entry.ud.repo}/master`;

  for (const split of ["train", "dev", "test"]) {
    const file = `${entry.ud.prefix}-ud-${split}.conllu`;
    const url = `${base}/${file}`;
    const res = await fetch(url);
    if (!res.ok) return { refused: { type: "fetch_failed", detail: `${res.status} ${url}` } };
    const text = await res.text();
    sources.push({ file, url, sha256: sha256(text), bytes: Buffer.byteLength(text) });
    for (const line of text.split("\n")) {
      if (!line || line.startsWith("#")) { if (line.startsWith("# sent_id")) sentences++; continue; }
      const cols = line.split("\t");
      if (cols.length < 5) continue;
      const id = cols[0];
      if (id.includes("-") || id.includes(".")) continue;
      const form = cols[1].toLowerCase();
      const upos = cols[3];
      if (!form || !upos || upos === "_") continue;
      (forms[form] ??= Object.create(null))[upos] = (forms[form][upos] ?? 0) + 1;
      tokens++;
    }
  }

  const artifact = {
    schema: "POSPrior@1",
    language: entry.iso,
    giver: {
      resource: `Universal Dependencies ${entry.ud.repo}`,
      resourceLicense: "CC BY-SA 4.0",
      url: `https://github.com/UniversalDependencies/${entry.ud.repo}`,
      files: sources,
      note: "per-form UPOS attestation counts; ambiguity preserved, no winner picked at build time — the consumer collapses only at a caller-declared share floor",
    },
    counts: { forms: Object.keys(forms).length, tokens, sentences },
    forms,
    builtAt: new Date().toISOString(),
  };

  fs.mkdirSync(POS_DIR, { recursive: true });
  fs.writeFileSync(posPriorPath(lang), JSON.stringify(artifact, null, 1));

  const lock = readLock();
  const drift = checkDrift(lang, sources, lock);
  if (drift.status === "drifted") {
    log(`  ⚠ upstream drift since ${drift.resolvedAt}: ${drift.changed.map((c) => c.file).join(", ")} — the lock has been updated, but any result document citing the previous resolve was measured against different bytes`);
  }
  lock.resolved[lang] = {
    repo: entry.ud.repo, iso: entry.iso,
    counts: artifact.counts,
    source: sources.map(({ file, url, sha256, bytes }) => ({ file, url, sha256, bytes })),
    resolvedAt: artifact.builtAt,
    vendored: !!entry.vendored,
  };
  writeLock(lock);

  log(`POSPrior@1[${lang}] built: ${artifact.counts.forms} forms, ${tokens} tokens, ${sentences} sentences (${drift.status})`);
  return { artifact, sources, drift };
}

// ---- resolution ---------------------------------------------------------
// local cache -> fetch on demand -> TYPED REFUSAL. Never another language.

export async function resolvePosPrior(lang, { allowFetch = true, log = () => {} } = {}) {
  const entry = REGISTRY[lang];
  if (!entry) return { refused: { type: "unknown_language", detail: `no registry row for "${lang}"` } };

  const p = posPriorPath(lang);
  if (fs.existsSync(p)) {
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    return { forms: d.forms, counts: d.counts, from: entry.vendored ? "committed" : "cache" };
  }
  if (entry.ud?.gap) {
    return { refused: { type: entry.ud.gap.status, detail: entry.ud.gap.because, checked: entry.ud.gap.checked } };
  }
  if (!allowFetch) {
    return { refused: { type: "not_cached", detail: `no local ${path.relative(ROOT, p)}; re-run with fetching enabled to resolve it from ${entry.ud.repo}` } };
  }
  const built = await buildPosPriorFor(lang, { log });
  if (built.refused) return built;
  return { forms: built.artifact.forms, counts: built.artifact.counts, from: "fetched" };
}

export function unimorphFor(lang) {
  const entry = REGISTRY[lang];
  if (!entry) return { refused: { type: "unknown_language", detail: `no registry row for "${lang}"` } };
  if (entry.unimorph?.gap) {
    return { refused: { type: entry.unimorph.gap.status, detail: entry.unimorph.gap.because, checked: entry.unimorph.gap.checked } };
  }
  return { url: `https://raw.githubusercontent.com/${entry.unimorph.repo}/master/${entry.unimorph.file}`, repo: entry.unimorph.repo };
}

// ---- CLI ----------------------------------------------------------------
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const langs = process.argv.slice(2);
  if (!langs.length) {
    console.log("languages in the registry:");
    for (const [code, e] of Object.entries(REGISTRY)) {
      const ud = e.ud?.gap ? `UD: ${e.ud.gap.status}` : `UD: ${e.ud.repo}`;
      const um = e.unimorph?.gap ? `UniMorph: ${e.unimorph.gap.status}` : `UniMorph: ${e.unimorph.repo}`;
      const cached = fs.existsSync(posPriorPath(code));
      console.log(`  ${code} (${e.iso}) — ${ud}; ${um}; POS prior ${e.vendored ? "committed" : cached ? "cached" : "not resolved"}; pronunciation ${e.pronunciation?.prior ?? (e.pronunciation?.gap?.status ?? "none")}`);
    }
    console.log("\nusage: node scripts/lang-registry.mjs <lang>...   (resolves, fetching if needed)");
  } else {
    for (const lang of langs) {
      const r = await resolvePosPrior(lang, { log: (m) => console.log("  " + m) });
      if (r.refused) console.log(`${lang}: REFUSED ${r.refused.type} — ${r.refused.detail}`);
      else console.log(`${lang}: ${r.counts.forms} forms (${r.from})`);
    }
  }
}
