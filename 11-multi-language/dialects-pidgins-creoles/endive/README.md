# ENDIVE (EnDive) — pocket README

**Status: gated / skipped.** No raw dialect-translated text is staged in
this directory. See `dataset-description.txt` for a from-scratch
description of the dataset and its methodology (sourced from the
introducing paper and the HuggingFace repositories' own public metadata),
and `manifests/endive-manifest.json` for the full license-verification
record.

## Why nothing was fetched

The pocket brief asked to verify the license on HuggingFace before
staging. Verification was done directly against:

- all 14 HuggingFace dataset repositories under the `abhaygupta1266`
  account (API metadata + raw `README.md` YAML frontmatter for each),
- the introducing paper (arXiv:2504.07100, HTML and PDF),
- its OpenReview listing (id `C7Mwox3C1u`),
- its ACL Anthology page (Findings of ACL: EMNLP 2025).

**None of these sources state a license, terms of use, or redistribution
grant for the dialect-translated text.** No `license` tag exists on any
of the 14 repos; no license/availability statement was found in the
paper's readable text at any of the three venues checked. This is not a
dataset marked "research use only" with a clear (if restrictive) tag —
it is simply silent, at every source checked.

Per this repo's staging rule 2 ("if you cannot determine the license... do
not fetch or stage the raw content... mark it gated/skipped with the
reason, rather than guessing in either direction"), no parquet/CSV row
content was downloaded from any of the 14 repos, and none is reproduced
here. What is staged is a metadata-level description built from the
paper's own text and each repo's own schema/row-count metadata (which is
itself public API metadata, not dataset content).

## What a future pass could do

Contact the paper's authors directly to ask for an explicit license
grant or redistribution terms for the dialect-translated text, or check
back on the HuggingFace repos for a license tag being added later. Until
then this pocket stays metadata-only.
