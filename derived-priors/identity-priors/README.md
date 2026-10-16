# identity-priors

Priors for learning **identity from documents**: how a text marks that two
surfaces name one being, and how the closed classes that carry that marking
(determiners, copula, pronouns, notation tokens) were measured from source
material. This kind sits beside the received/measured identity lexicons already
here (`name-priors/`, `alias-priors/`, `pronoun-priors/`,
`propernoun-priors/`, `act-priors/`); together they are the identity suite a
reader composes when it meets a text.

Every file states its schema, giver, and what taught it. The three
treebank-derived files additionally carry **per-instance byte addresses**: each
derived form is pinned to the exact token lines in the source treebank that
produced it, so a claim is verifiable at an address, not just by a count.

## What is pinned, and how

The `addresses/` sidecars are the byte-pinned record. A sidecar maps each form
to the complete (not sampled) list of 0-based byte offsets of its teaching
token lines in the source file, pinned by that file's `source_sha256`. The
convention is stated in each sidecar's own `convention` field. A reader
refetches the source, verifies the hash, and jumps to any offset to see the
token and its tag. The text itself is never embedded here (it stays in the
source, whose licence travels in each prior's `provenance`).

The falsifying control for a pinned prior is a sidecar whose `source_sha256`
no longer matches the refetched source, or a form whose pinned offsets, when
read back, do not carry the tag the prior claims for it.

## The files

### `identity-classes-{arb,heb}.json` — `IdentityClosedClasses@1`

The closed classes that mark identity in Arabic and Hebrew: determiners (forms
the treebank tags DET at or above a declared `min_count`) and the overt copula
(forms tagged AUX). Mechanically derived from the same received POS priors the
rest of this corpus uses; never a hand-typed word list.

- **arb** — taught by Universal Dependencies `UD_Arabic-PADT`, train split
  (`ar_padt-ud-train.conllu`), 11,444 teaching token lines pinned across 24
  distinct forms (the surface `ما` is both determiner and copula; it is pinned
  once, under both tags).
- **heb** — taught by `UD_Hebrew-HTB`, train split (`he_htb-ud-train.conllu`),
  13,831 teaching token lines pinned across 18 forms.

Disclosed gap, stated here and in the files: neither language marks present
tense "X is Y" with any overt token (a zero-copula nominal sentence), so this
derivation structurally cannot cover that construction. No token to tag, no
prior.

### `pronoun-grc.json` — `PronounPrior@1`

Third-person pronoun forms of Ancient Greek (UPOS=PRON and Person=3, from
FEATS), taught by `UD_Ancient_Greek-PROIEL` test split
(`grc_proiel-ud-test.conllu`). 508 teaching token lines pinned across the 55
declared forms. Gender/number ambiguity is preserved, never resolved.

Disclosed gap: the source holds 56 case-distinct forms and 509 Person=3 PRON
tokens; the prior declares 55 forms and 509 tokens. The one surface not in the
prior, capitalized `Οἱ`, is recorded with its byte offset in the sidecar's
`disclosed_gap` rather than silently dropped (the builder appears to have
case-folded `Οἱ` into `οἱ`). Pinned as found, not repaired.

### `notation-{chess_pgn,taxonomy,uml_bpmn}-identity.json` — `NotationIdentityPrior@1` / `TaxonomyIdentity@1`

Identity as it appears in three notation systems: chess PGN, biological
taxonomy, and UML/BPMN diagrams. These carry what taught them in `givers`
(the PGN Standard 1.1 and FIDE Laws of Chess; Plazi training windows;
flowable-engine and Activiti BPMN corpora), but their per-instance teaching
addresses are **not byte-pinned**: the training corpora and the builder
(`native/eval/notation-competence/*`) are not in this repo, so the specific
windows cannot be re-addressed here. Each file says this in its own
`pinned_addresses` field, typed as `not-pinned`, rather than pretending a
pointer it does not have.

## What a consumer owes it

A reader composes these closed classes with the name and alias kinds and hands
the composition to the organs that know each shape. The priors measure; they do
not decide. Identity itself lives in the referent, never in a string: a
determiner or copula is evidence of how a text marks identity, not the identity.

## Limits, named

- **English has no identity-closed-class file** because English marks present
  identity with an overt copula that is already handled as ordinary prose, not
  a closed class worth a separate prior; nothing here should be read as
  "English is uncovered".
- The notation priors are the three systems built so far, not a general
  notation theory; another notation needs its own run over its own material.
