// live_priors · build-propernoun-prior — Universal Dependencies CoNLL-U in,
// ProperNounPrior@<lang> out: a language's proper-noun FORMS mapped to their
// LEMMAS, DERIVED from the treebank's own LEMMA column rather than hand-typed.
//
// WHY THIS EXISTS. The coreference layer (surfaces.js::namesCorefer) is
// token-identity: "Kutuzov" / "Kutuzovu" / "Kutuzovym" share nothing
// orthographically, so a Russian reader strands one being across its case
// forms (measured, the-fold eval/results/anaphora-ru-RESULTS.md). English
// never hits this because English proper nouns do not inflect for case. The
// fix is a morphological fold — but a hand-typed Russian suffix list is
// exactly the "second hardcoded list standing in for a language it was never
// measured against" this repo already refuses for negation words and pronoun
// classes. The receipt for doing it right already exists in THIS repo: a
// Universal Dependencies treebank (CC BY-SA 4.0) is real human annotation,
// and its LEMMA column IS the case-fold — "Кутузов", "Кутузову", "Кутузовым"
// all share the LEMMA "Кутузов". This script is the same transform
// build-pos-prior.mjs and build-pronoun-prior.mjs already run, aimed at
// PROPN lemmatisation.
//
// THE FEATURE, READ OFF THE TREEBANK (never inferred here). A PROPN token's
// LEMMA is its headword — for a Russian proper noun, the nominative stem that
// every case form (Gen/Dat/Ins/Loc) inflects from. The UPOS column
// distinguishes PROPN from ADJ, and this matters to the fold's hard boundary:
// "Бородино" is PROPN (lemma "Бородино"), but "Бородинский" / "Московский"
// are ADJ — a DIFFERENT part of speech and thus a different word, NOT merged
// onto the place. Because the transform keys on UPOS=PROPN only, derivational
// adjectives never enter the register by construction — the no-over-merge
// boundary is a property of the annotated data, not a rule tuned here.
//
// AMBIGUITY IS PRESERVED, never collapsed (same discipline as the pronoun
// builder). A surface form can be attested under more than one lemma — a
// Russian feminine nominative "Кутузова" (lemma "Кутузова") is homographic
// with the genitive of masculine "Кутузов" (lemma "Кутузов"). Both are
// recorded with their counts. The CONSUMER (a foldToken seam in surfaces.js)
// folds a form to its lemma ONLY when exactly one lemma is attested for it;
// a multi-lemma form is left unfolded (stranded, disclosed) rather than
// guessed onto one being — the same "ambiguous fragment strands as its own
// referent" rule corefersIndividuated already stands on.
//
// THE MATERIAL DECIDES PRESENCE, the prior decides sameness (the standing
// actClosure discipline). The fold only ever merges forms both PRESENT in
// the material being read — coreference happens between surfaces the material
// itself contains. The treebank prior merely says which surface forms are the
// same lemma; it never carries a window anywhere and never adds a surface the
// material did not produce.
//
// SOURCE, FETCHED SEPARATELY (this transform never touches the network).
// Universal Dependencies treebanks are CC BY-SA 4.0; attribution is recorded
// in each output's own provenance. No treebank sentence text is embedded —
// only the tallied form/lemma/case counts.
//
// Usage:
//   node scripts/build-propernoun-prior.mjs \
//     <language> <treebank-name> <in.conllu> derived-priors/propernoun-priors/propernoun-<lang>.json

import { readFileSync, writeFileSync } from "node:fs";

const LANG = process.argv[2];
const TREEBANK = process.argv[3];
const IN = process.argv[4];
const OUT = process.argv[5];

if (!LANG || !TREEBANK || !IN || !OUT) {
  console.error(
    "usage: node scripts/build-propernoun-prior.mjs <language> <treebank-name> <in.conllu> <out.json>",
  );
  process.exit(1);
}

const raw = readFileSync(IN, "utf8");
// form(lower) -> { lemmas: { [lemmaLower]: n }, cases: { [caseLabel]: n }, upos: Set }
const forms = new Map();
let tokensRead = 0;
let propnTokens = 0;
let distinctForms = 0;

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
  if (cols.length !== 10) continue;
  const [id, form, lemma, upos, , featsCell] = cols;
  if (!/^\d+$/.test(id)) continue; // range/empty-node line
  if (!form || !upos) continue;
  tokensRead++;
  if (upos !== "PROPN") continue; // proper nouns only, by design (see header)
  propnTokens++;
  const f = form.toLowerCase();
  const l = String(lemma ?? "").toLowerCase();
  if (!forms.has(f)) forms.set(f, { lemmas: {}, cases: {} });
  const rec = forms.get(f);
  rec.lemmas[l] = (rec.lemmas[l] ?? 0) + 1;
  const c = featsOf(featsCell).Case;
  if (c) rec.cases[c] = (rec.cases[c] ?? 0) + 1;
}
distinctForms = forms.size;

const prior = {
  schema: "ProperNounPrior@1",
  language: LANG,
  provenance: {
    source: `Universal Dependencies ${TREEBANK}`,
    license: "CC BY-SA 4.0",
    built_by: "scripts/build-propernoun-prior.mjs",
    input: IN,
    tokens_read: tokensRead,
    PROPN_tokens: propnTokens,
    distinct_forms: distinctForms,
    note: "LEMMA-derived proper-noun form folding (UPOS=PROPN); multi-lemma (homographic) forms preserved unresolved; adjectives (ADJ) never enter by construction; no treebank sentence text embedded",
  },
  forms: Object.fromEntries(
    [...forms].map(([form, rec]) => [form, { lemmas: rec.lemmas, cases: rec.cases }]),
  ),
};

writeFileSync(OUT, JSON.stringify(prior));
console.log(
  `read ${tokensRead.toLocaleString()} tokens  ` +
    `${propnTokens.toLocaleString()} PROPN  ` +
    `${distinctForms.toLocaleString()} distinct forms -> ${OUT}`,
);
