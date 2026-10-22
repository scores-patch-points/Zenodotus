#!/usr/bin/env node
// pin-treebank-addresses.mjs — regenerate-then-pin for treebank-derived priors.
//
// WHAT THIS DOES. For one prior that was DERIVED from a Universal Dependencies
// CoNLL-U treebank, it (1) re-fetches the exact source bytes, (2) REGENERATES the
// prior's counts from those bytes and checks them against the committed prior,
// (3) PINS the 0-based byte offset of every teaching token line that produced the
// prior, (4) writes an `addresses/<prior>.addresses.json` sidecar, and (5) injects a
// `pinned_addresses` field into the prior JSON.
//
// The pinning convention is the one already committed for the identity priors
// (derived-priors/identity-priors/addresses/*.addresses.json): a value is the
// 0-based byte offset of the first byte of a teaching token line, matched CASE-
// SENSITIVELY against the prior's own form keys. A token whose builder-criterion
// matches but whose exact surface form is absent from the prior (e.g. the builder
// case-folded "Οἱ" into "οἱ") is NOT dropped silently: it is disclosed in
// `disclosed_gap` (see pronoun-grc.addresses.json).
//
// WHY REGENERATE, NOT JUST PIN. A prior whose source bytes were never pinned
// (built from a /tmp file that is now gone) is only as honest as its provenance.
// Re-generating the counts from a pinned source either reproduces the committed
// counts (the prior is then honest), or it does not, and the drift is reported
// TYPED, never silently absorbed.
//
// Usage:
//   node scripts/pin-treebank-addresses.mjs \
//     --type <identity|pronoun|pos|propernoun> \
//     --prior derived-priors/.../<prior>.json \
//     --source <url-or-path> [--source <url-or-path> ...] \
//     [--out-dir derived-priors/.../addresses] \
//     [--write] [--dry-run]
//
// `--source` may be a URL (https://...) or a local file path. Multiple sources
// (e.g. a POS prior built from train+dev+test) are supported; offsets are then
// per-file, and `source_sha256` becomes a per-file map.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

// ── CoNLL-U reading, byte-offset aware ──────────────────────────────────────────────
// Returns an array of token records with byte offsets, plus sentence count. Only
// surface tokens (plain integer ID, no '-' range, no '.' empty node, non-empty FORM).
function scanTokens(buf) {
  const tokens = [];
  let sentences = 0;
  let pos = 0;
  while (pos < buf.length) {
    let nl = buf.indexOf(10, pos);
    if (nl === -1) nl = buf.length;
    const line = buf.slice(pos, nl).toString("utf8");
    if (line.length > 0 && line[0] === "#") {
      if (line.startsWith("# sent_id") || line.startsWith("# sent_id =") || /^#\s*sent_id\b/.test(line)) sentences++;
      pos = nl + 1;
      continue;
    }
    if (line.length > 0) {
      const t = line.split("\t");
      if (t.length >= 6) {
        const id = t[0];
        if (/^\d+$/.test(id)) {
          tokens.push({ offset: pos, form: t[1], upos: t[3], feats: t[5] ?? "", cols: t });
        }
      }
    }
    pos = nl + 1;
  }
  return { tokens, sentences };
}

const featsOf = (cell) => {
  if (!cell || cell === "_") return {};
  const out = {};
  for (const pair of cell.split("|")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
};

// ── regenerate: recompute a prior's counts from tokens, per type ─────────────────────
// Each returns { ok, counts, prior, diffs } where diffs lists typed mismatches.
function regenerate(type, tokens, prior) {
  if (type === "pos") {
    const forms = Object.create(null);
    let tokensTallied = 0;
    for (const t of tokens) {
      const form = t.form.toLowerCase();
      const upos = t.upos;
      if (!form || !upos || upos === "_") continue;
      (forms[form] ??= Object.create(null))[upos] = (forms[form][upos] ?? 0) + 1;
      tokensTallied++;
    }
    const diffs = [];
    const p = prior.provenance ?? {};
    const c = prior.counts ?? {};
    const expected = {
      forms: c.forms ?? p.distinct_forms ?? null,
      tokens: c.tokens ?? p.tokens_read ?? null,
      sentences: c.sentences ?? p.sentences_read ?? null,
    };
    const got = { forms: Object.keys(forms).length, tokens: tokensTallied, sentences: null };
    for (const [f, exp] of Object.entries({ forms: expected.forms, tokens: expected.tokens })) {
      if (exp != null && exp !== got[f]) diffs.push({ field: f, committed: exp, regenerated: got[f] });
    }
    return { ok: diffs.length === 0, counts: got, prior: { ...p, ...c }, diffs, forms };
  }
  if (type === "pronoun") {
    let tokensRead = 0, prs = 0, prsMarked = 0, third = 0;
    const forms = new Map();
    for (const t of tokens) {
      if (!t.form) continue;
      tokensRead++;
      if (t.upos !== "PRON") continue;
      prs++;
      const feats = featsOf(t.feats);
      if (feats.PronType === "Prs") prsMarked++;
      if (String(feats.Person) !== "3") continue;
      third++;
      const f = t.form.toLowerCase();
      if (!forms.has(f)) forms.set(f, { gender: {}, number: {} });
      const rec = forms.get(f);
      rec.gender[feats.Gender || "_"] = (rec.gender[feats.Gender || "_"] ?? 0) + 1;
      rec.number[feats.Number || "_"] = (rec.number[feats.Number || "_"] ?? 0) + 1;
    }
    const p = prior.provenance ?? {};
    const diffs = [];
    const fields = { tokens_read: tokensRead, PRON_tokens: prs, PronType_Prs_marked: prsMarked, third_person_pronoun_tokens: third, distinct_forms: forms.size };
    for (const [f, expected] of Object.entries({ tokens_read: p.tokens_read, PRON_tokens: p.PRON_tokens, PronType_Prs_marked: p.PronType_Prs_marked, third_person_pronoun_tokens: p.third_person_pronoun_tokens, distinct_forms: p.distinct_forms })) {
      if (expected != null && expected !== fields[f]) diffs.push({ field: f, committed: expected, regenerated: fields[f] });
    }
    return { ok: diffs.length === 0, counts: fields, prior: p, diffs, forms: Object.fromEntries(forms) };
  }
  if (type === "propernoun") {
    let tokensRead = 0, propn = 0;
    const forms = new Map();
    for (const t of tokens) {
      if (!t.form || !t.upos) continue;
      tokensRead++;
      if (t.upos !== "PROPN") continue;
      propn++;
      const f = t.form.toLowerCase();
      const l = String(t.cols[2] ?? "").toLowerCase();
      if (!forms.has(f)) forms.set(f, { lemmas: {}, cases: {} });
      const rec = forms.get(f);
      rec.lemmas[l] = (rec.lemmas[l] ?? 0) + 1;
      const c = featsOf(t.feats).Case;
      if (c) rec.cases[c] = (rec.cases[c] ?? 0) + 1;
    }
    const p = prior.provenance ?? {};
    const diffs = [];
    const fields = { tokens_read: tokensRead, PROPN_tokens: propn, distinct_forms: forms.size };
    for (const [f, expected] of Object.entries({ tokens_read: p.tokens_read, PROPN_tokens: p.PROPN_tokens, distinct_forms: p.distinct_forms })) {
      if (expected != null && expected !== fields[f]) diffs.push({ field: f, committed: expected, regenerated: fields[f] });
    }
    return { ok: diffs.length === 0, counts: fields, prior: p, diffs, forms: Object.fromEntries(forms) };
  }
  if (type === "identity") {
    const target = new Set([...(prior.determiners ?? []), ...(prior.copula ?? [])]);
    const counts = Object.create(null);
    for (const t of tokens) {
      if (!target.has(t.form)) continue;
      (counts[t.form] ??= Object.create(null))[t.upos] = (counts[t.form][t.upos] ?? 0) + 1;
    }
    // compare against determinerCounts/copulaCounts
    const diffs = [];
    for (const map of [["determiners", prior.determinerCounts], ["copula", prior.copulaCounts]]) {
      for (const [form, expectedTags] of Object.entries(map[1] ?? {})) {
        const got = counts[form] ?? {};
        for (const [tag, n] of Object.entries(expectedTags)) {
          if (got[tag] !== n) diffs.push({ field: `${map[0]}.${form}.${tag}`, committed: n, regenerated: got[tag] ?? 0 });
        }
        for (const tag of Object.keys(got)) if (expectedTags[tag] == null) diffs.push({ field: `${map[0]}.${form}.${tag}`, committed: null, regenerated: got[tag] });
      }
    }
    return { ok: diffs.length === 0, counts, prior, diffs, forms: null };
  }
  throw new Error(`unknown prior type "${type}"`);
}

// ── pin: byte offsets per teaching token line ─────────────────────────────────────────
// The match key is the BUILDER's own key: the builders LOWER-CASE surface forms before
// counting (build-pos-prior.mjs, build-pronoun-prior.mjs, build-propernoun-prior.mjs all
// call form.toLowerCase()), so a POS/pronoun/propernoun prior's forms map is lowercased,
// and "The" teaches the same entry as "the". The identity (closed-class) prior stores
// forms as the treebank wrote them (exact), so it is matched exactly.
function pin(type, tokens, prior) {
  let targetForms;
  if (type === "identity") targetForms = new Set([...(prior.determiners ?? []), ...(prior.copula ?? [])]);
  else targetForms = new Set(Object.keys(prior.forms ?? {}));

  const fold = type !== "identity";
  const byForm = Object.create(null);
  let total = 0;
  for (const t of tokens) {
    const matchForm = fold ? t.form.toLowerCase() : t.form;
    if (!targetForms.has(matchForm)) continue;
    let key;
    if (type === "identity") key = t.upos;
    else if (type === "pronoun") {
      if (t.upos !== "PRON" || !/(?:^|\|)Person=3(?:$|\|)/.test(t.feats)) continue;
      key = "PRON.Person=3";
    } else if (type === "pos") key = t.upos;
    else if (type === "propernoun") {
      if (t.upos !== "PROPN") continue;
      key = "PROPN";
    } else throw new Error(`unknown type ${type}`);
    (byForm[matchForm] ??= Object.create(null));
    (byForm[matchForm][key] ??= []).push(t.offset);
    total++;
  }

  const forms = {};
  for (const form of Object.keys(byForm).sort()) {
    const entry = {};
    let ft = 0;
    for (const key of Object.keys(byForm[form]).sort()) {
      entry[key] = byForm[form][key].sort((a, b) => a - b);
      ft += entry[key].length;
    }
    entry.total = ft;
    forms[form] = entry;
  }
  return { forms, total_instances: total };
}

// ── disclosed gap: builder-counted tokens the pinner could not pin ─────────────────────
// For identity (closed-class) priors the forms are stored exact, so a surface form that
// the builder counted under a case-folded form is a genuine disclosure (see the committed
// pronoun-grc/Οἱ precedent). For the lower-cased prior types the fold is the builder's own
// documented behaviour and is folded silently, exactly as the builder folded it.
function disclosedGaps(type, tokens, prior) {
  if (type !== "identity") return [];
  const target = new Set([...(prior.determiners ?? []), ...(prior.copula ?? [])]);
  const gaps = [];
  for (const t of tokens) {
    if (!target.has(t.form)) {
      if (target.has(t.form.toLowerCase())) gaps.push({ form: t.form, offset: t.offset, folded_to: t.form.toLowerCase() });
    }
  }
  return gaps;
}

// ── main ──────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { type: null, prior: null, sources: [], outDir: null, write: false, dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--type") args.type = argv[++i];
    else if (a === "--prior") args.prior = argv[++i];
    else if (a === "--source") args.sources.push(argv[++i]);
    else if (a === "--out-dir") args.outDir = argv[++i];
    else if (a === "--write") args.write = true;
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

export async function pinTreebankPrior({ type, priorPath, sources, outDir, write = false, fetchImpl = globalThis.fetch }) {
  const prior = JSON.parse(fs.readFileSync(priorPath, "utf8"));
  const files = [];
  for (const src of sources) {
    let buf;
    let name;
    if (/^https?:\/\//.test(src)) {
      const res = await fetchImpl(src);
      if (!res.ok) throw new Error(`fetch ${res.status}: ${src}`);
      buf = Buffer.from(await res.arrayBuffer());
      name = src.split("/").pop();
    } else {
      buf = fs.readFileSync(src);
      name = path.basename(src);
    }
    files.push({ name, source: src, buf, sha256: sha256(buf) });
  }

  // regenerate across all files (a prior may be built from several)
  const allTokens = [];
  for (const f of files) {
    const { tokens } = scanTokens(f.buf);
    for (const t of tokens) allTokens.push(t);
  }
  const regen = regenerate(type, allTokens, prior);

  // pin across all files (offsets are per-file: only meaningful within one file)
  let sidecarForms, totalInstances;
  if (files.length === 1) {
    const p = pin(type, allTokens, prior);
    sidecarForms = p.forms;
    totalInstances = p.total_instances;
  } else {
    // multi-file: offset each file separately and key by { file, form, tag }
    const perFile = {};
    totalInstances = 0;
    let offset0 = 0;
    for (const f of files) {
      const { tokens } = scanTokens(f.buf);
      const p = pin(type, tokens, prior);
      perFile[f.name] = { source_sha256: f.sha256, total_instances: p.total_instances, forms: p.forms };
      totalInstances += p.total_instances;
      offset0 += f.buf.length;
    }
    sidecarForms = perFile;
  }

  const gaps = disclosedGaps(type, allTokens, prior);

  const sidecar = {
    prior: path.basename(priorPath),
    schema: prior.schema,
    language: prior.language,
    source: files.length === 1 ? files[0].source : files.map((f) => f.source),
    source_sha256: files.length === 1 ? files[0].sha256 : Object.fromEntries(files.map((f) => [f.name, f.sha256])),
    convention: "Each value is the 0-based byte offset of the first byte of a teaching token line in the source file pinned by source_sha256. Lists are complete (not sampled); a form's `total` equals the token count that produced its prior entry.",
    criterion: criterionText(type),
    pinned_at: new Date().toISOString().slice(0, 10),
    total_instances: totalInstances,
    forms: sidecarForms,
  };
  if (gaps.length) sidecar.disclosed_gaps = gaps;

  const outPrior = path.basename(priorPath);
  const outDirResolved = outDir ?? path.join(path.dirname(priorPath), "addresses");
  const sidecarPath = path.join(outDirResolved, `${path.basename(priorPath, ".json")}.addresses.json`);

  // pinned_addresses field: sha256 is of the sidecar file itself
  const sidecarBytes = Buffer.from(JSON.stringify(sidecar, null, 1) + "\n");
  const pinnedAddresses = {
    status: "pinned",
    added: new Date().toISOString().slice(0, 10),
    file: path.join(path.relative(path.dirname(priorPath), outDirResolved) || "addresses", `${path.basename(priorPath, ".json")}.addresses.json`).split(path.sep).join("/"),
    sha256: sha256(sidecarBytes),
    note: "per-instance byte offsets into the source treebank pinned by the sidecar's source_sha256.",
  };

  if (write) {
    fs.mkdirSync(outDirResolved, { recursive: true });
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 1) + "\n");
    const priorWithPin = { ...prior, pinned_addresses: pinnedAddresses };
    fs.writeFileSync(priorPath, JSON.stringify(priorWithPin, null, 1) + "\n");
  }

  return { regen, sidecar, pinnedAddresses, sidecarPath, priorPath, write };
}

function criterionText(type) {
  if (type === "identity") return "token lines whose FORM is in the prior's determiner/copula lists, grouped by UPOS tag";
  if (type === "pronoun") return "token lines whose FORM is in the prior's forms and whose UPOS=PRON and FEATS carries Person=3 (the builder's own criterion)";
  if (type === "pos") return "token lines whose FORM is in the prior's forms (lowercased), grouped by UPOS tag";
  if (type === "propernoun") return "token lines whose FORM is in the prior's forms (UPOS=PROPN, the builder's own criterion)";
  return type;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.type || !args.prior || !args.sources.length) {
    console.error("usage: node scripts/pin-treebank-addresses.mjs --type <identity|pronoun|pos|propernoun> --prior <prior.json> --source <url-or-path> [--source ...] [--out-dir <dir>] [--write]");
    process.exit(1);
  }
  const r = await pinTreebankPrior({ type: args.type, priorPath: args.prior, sources: args.sources, outDir: args.outDir, write: args.write });
  console.log(`prior: ${path.basename(args.prior)}  type: ${args.type}`);
  console.log(`regenerate: ${r.regen.ok ? "OK — counts reproduce" : "DRIFT — see diffs"}`);
  if (!r.regen.ok) console.log("diffs:", JSON.stringify(r.regen.diffs, null, 1));
  console.log(`pinned: ${r.sidecar.total_instances} instances across ${Object.keys(r.sidecar.forms).length} form(s)`);
  if (r.sidecar.disclosed_gaps?.length) console.log(`disclosed_gaps: ${r.sidecar.disclosed_gaps.length} case-folded form(s) not in the prior`);
  if (args.write) console.log(`wrote sidecar ${r.sidecarPath} and injected pinned_addresses into ${r.priorPath}`);
  else console.log("(dry run — pass --write to write the sidecar and inject pinned_addresses)");
}
