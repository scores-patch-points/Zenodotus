// live_priors · build-pronoun-prior — Universal Dependencies CoNLL-U in,
// PronounPrior@<lang> out: a language's third-person pronoun closed class,
// DERIVED from the treebank's own FEATS rather than hand-typed.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A SECOND HAND-TYPED LIST. The English
// third-person pronoun set in perceiver/text/priors.js
// (THIRD_PERSON_SINGULAR) was hand-typed: eight words, `lang/en`, received
// as a fact about English. The moment a second language wants the same
// closed class, hand-typing it once per language is exactly the
// "second hardcoded list standing in for a language it was never measured
// against" that relations.js's own header records this repo already refuse
// for negation words (bin/priors/lang/<lang>.json's seam vs. a re-typed
// English list). The receipt for doing it right already exists in THIS
// repo, two registers over — scripts/build-pos-prior.mjs tallies a real
// human-annotated Universal Dependencies treebank into a giver-named prior
// (POSPrior@1), never seeing our documents at build time. This script is
// that same transform, aimed at the pronoun class it was always able to
// derive and never asked for.
//
// THE FEATURE, READ OFF THE TREEBANK (never inferred here). CoNLL-U's
// FEATS column is real human annotation. A pronoun token's FEATS include,
// when the language marks them, PronType=Prs, Person=3, Number=Sing|Plur,
// Gender=Masc|Fem|Neut, Case=Nom|Acc|Gen|Dat|Ins|Loc|Voc and (for
// possessives) Poss=Yes. We keep tokens that are third-person personal
// pronouns: UPOS=PRON AND Person=3. PronType=Prs is a STRENGTHENING signal,
// NOT a requirement — and that decision was measured, not assumed: running
// the first strict filter (PronType=Prs AND Person=3) against real UD
// Russian-GSD found ZERO personal pronoun tokens, because that treebank
// marks Person=3 without ever writing PronType=Prs, while UD_English-EWT
// marks both. Treebanks differ in FEATS coverage; a derivation that hinges
// on one convention silently returns an empty class for every language
// whose treebank omits it. The filter below therefore keys on the two
// features every personal third-person pronoun in every treebank carries
// (the UPOS tag and Person=3) and tallies PronType=Prs only as a recorded
// signal. Each distinct FORM tallies its gender/number ambiguity preserved
// the same way build-pos-prior.mjs preserves UPOS ambiguity (a form
// attested as both Masc and Neut keeps both, never a silent collapse).
//
// WHAT IS KEPT, BY DESIGN. The output maps FORM -> { genders, numbers },
// and additionally exposes the treebank's own Gender push for assessing
// a language's usefulness. It deliberately does NOT decide the mapping
// from gender to a resolution-compatible label — English THIRD_PERSON_
// SINGULAR uses m/f only; a language with clusivity, evidential
// pronouns, or animacy splits will surface its own categories here verbatim,
// and the CONSUMER (resolvePronouns) maps them or refuses to bind rather
// than guessing.
//
// PRO-DROP IS A STRUCTURALLY DIFFERENT GAP, NAMED NOT SOLVED. Japanese,
// Korean, Spanish and many other languages routinely omit the third-person
// pronoun rather than using one. A treebank-derived word list cannot help
// there — there is no token to bind. This script still runs on them (their
// treebanks list few/no third-person personal pronoun forms, and the
// register honestly reports the near-empty set), but resolving their
// omitted subjects is zero-anaphora resolution, real future work, disclosed
// here the same way CJK word segmentation is disclosed in this repo's
// retrieve() fix (P62).
//
// SOURCE, FETCHED SEPARATELY (same purity discipline as build-pos-prior.mjs
// — this transform never touches the network). Universal Dependencies
// treebanks are CC BY-SA 4.0; attribution is recorded in each output's own
// provenance. No treebank sentence text is embedded — only the tallied
// pronoun forms and their gender/number counts.
//
// Usage:
//   node scripts/build-pronoun-prior.mjs \
//     <language> <treebank-name> <in.conllu> derived-priors/pronoun-priors/pronoun-<lang>.json

import { readFileSync, writeFileSync } from "node:fs";

const LANG = process.argv[2];
const TREEBANK = process.argv[3];
const IN = process.argv[4];
const OUT = process.argv[5];

if (!LANG || !TREEBANK || !IN || !OUT) {
  console.error(
    "usage: node scripts/build-pronoun-prior.mjs <language> <treebank-name> <in.conllu> <out.json>",
  );
  process.exit(1);
}

const raw = readFileSync(IN, "utf8");
const forms = new Map(); // form -> { gender: { [g]: n }, number: { [n]: n } }
let tokensRead = 0;
let prsTokens = 0;
let thirdPersonTokens = 0;
let prsMarked = 0;
let linesSkipped = 0;

const featsOf = (featsCell) => {
  if (!featsCell || featsCell === "_") return {};
  const out = {};
  for (const pair of featsCell.split("|")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
};

for (const line of raw.split("\n")) {
  if (!line || line[0] === "#") continue;
  const cols = line.split("\t");
  if (cols.length !== 10) { linesSkipped++; continue; }
  const [id, form, , upos, , featsCell] = cols;
  if (!/^\d+$/.test(id)) { linesSkipped++; continue; } // range/empty-node line
  if (!form) { linesSkipped++; continue; }
  tokensRead++;
  if (upos !== "PRON") continue; // not a pronoun at all — our measured filter, see header
  prsTokens++;
  const feats = featsOf(featsCell);
  if (feats.PronType === "Prs") prsMarked++;
  if (String(feats.Person) !== "3") continue; // not third person
  thirdPersonTokens++;

  const f = form.toLowerCase();
  if (!forms.has(f)) forms.set(f, { gender: {}, number: {} });
  const rec = forms.get(f);
  const g = feats.Gender || "_";
  const num = feats.Number || "_";
  rec.gender[g] = (rec.gender[g] ?? 0) + 1;
  rec.number[num] = (rec.number[num] ?? 0) + 1;
}

const prior = {
  schema: "PronounPrior@1",
  language: LANG,
  provenance: {
    source: `Universal Dependencies ${TREEBANK}`,
    license: "CC BY-SA 4.0",
    built_by: "scripts/build-pronoun-prior.mjs",
    input: IN,
    tokens_read: tokensRead,
    lines_skipped: linesSkipped,
    PRON_tokens: prsTokens,
    PronType_Prs_marked: prsMarked,
    third_person_pronoun_tokens: thirdPersonTokens,
    distinct_forms: forms.size,
    note: "FEATS-derived third-person pronoun forms (UPOS=PRON AND Person=3); PronType=Prs tallied as a signal, not required; gender/number ambiguity preserved, no treebank sentence text embedded",
  },
  forms: Object.fromEntries(
    [...forms].map(([form, stats]) => [form, { gender: stats.gender, number: stats.number }]),
  ),
};

writeFileSync(OUT, JSON.stringify(prior));
console.log(
  `read ${tokensRead.toLocaleString()} tokens (${linesSkipped.toLocaleString()} skipped)  ` +
    `${prsTokens.toLocaleString()} personal-pronoun  ${thirdPersonTokens.toLocaleString()} third-person\n` +
    `kept ${forms.size.toLocaleString()} distinct third-person pronoun forms -> ${OUT}`,
);
