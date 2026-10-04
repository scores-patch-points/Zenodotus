# TwitterAAE — staged as metadata-only (gated)

This pocket is staged **metadata-only**. No raw tweet text and no tweet IDs
from the actual TwitterAAE release are included in this directory. See
`../../../manifests/twitteraae-manifest.json` for the full manifest and the
reasoning below in more compressed, machine-readable form.

## Why this is gated rather than staged with real tweet bodies

Two independent checks, both done directly against primary sources rather
than assumed from the pocket's starting-point note, converged on the same
conclusion:

1. **The dataset's own site states a research-only restriction with no
   named open license.** slanglab.cs.umass.edu/TwitterAAE (fetched and read
   directly, 2026-08-19) says, verbatim, twice, once for each corpus it
   hosts: *"This dataset is made available for research purposes only."*
   No CC license, no public-domain statement, no redistribution grant of
   any kind accompanies that sentence. (The GitHub repository
   `github.com/slanglab/twitteraae` carries an MIT license, but that MIT
   grant covers the *code* — the demographic classifier model and its
   Python implementation — not the tweet *data*, which is hosted
   separately as a zip on the lab's own site and is never mentioned in the
   repository's license file.)

2. **The paper's own release plan was IDs-only, and current platform ToS
   is tighter than it was in 2016.** The source paper (Blodgett, Green, and
   O'Connor, EMNLP 2016, "Demographic Dialectal Variation in Social Media:
   A Case Study of African-American English," read in full from the ACL
   Anthology PDF) says exactly this about its own two derived corpora:
   *"Our two resulting user corpora contain 830,000 and 7.3 million
   tweets, for which we are making their message IDs available for further
   research (in conformance with the Twitter API's Terms of Service)."*
   That is the authors' own stated distribution plan in the paper that
   introduced this dataset: message IDs, not raw text, specifically
   because of Twitter's ToS — in 2016. A live check of X's current
   developer terms (2026) confirms the restriction has only tightened
   since then: full tweet text/tweet objects are not licensed for
   redistribution outside X's own API, and even ID-only redistribution for
   research is now gated behind an X-approved academic-research status,
   not an open grant to any redistributor. The 5.5&nbsp;GB
   `TwitterAAE-full-v1.zip` currently linked from the lab's site is
   described there only as "messages and our model's inferences" — its
   actual contents (full tweet text vs. IDs-plus-scores) were not
   independently verified here, because doing so would have required
   downloading the file itself, which is exactly the crossing this pocket
   is declining to make.

Given both of those findings, this is precisely the "genuinely ambiguous,
err toward gated" case the staging brief describes. Nothing in
`TwitterAAE-full-v1.zip` was downloaded, decompressed, or inspected as
part of this pass.

## What is staged instead

`dataset-description.txt` — a from-scratch description of the dataset,
written by reading the actual EMNLP 2016 paper (via its ACL Anthology PDF)
and the lab's own site directly, not reconstructed from memory. It covers:
what the corpus is, how the demographic-alignment methodology works
(Census block-group cross-referencing, the mixed-membership
demographic-language model, the four demographic categories and why only
two are considered reliable), the corpus's real construction numbers as
stated in the paper, and the citation the authors ask users to give. This
document contains no tweet text and no tweet IDs — it is a description
*about* the dataset and its method, safe to redistribute regardless of the
dataset's own gating, the same way a review or a methods summary of a
restricted dataset is not itself restricted.

## What was deliberately not staged

- Raw tweet bodies from `TwitterAAE-full-v1.zip` — gated, see above.
- Tweet IDs for later re-hydration — the pocket brief allows staging IDs
  "if the dataset provides them for later re-hydration rather than raw
  text," but obtaining even the ID list requires downloading the same
  gated zip this pocket declined to fetch. No ID list is republished here
  on a guess; this is named as a real, disclosed gap rather than
  papered over (see the manifest's `not_staged` field).
- The `TwitterAAE-deps-v1.zip` and `TwitterAAE-UD-v1.zip` annotation
  bundles (Universal Dependencies parses over 250+250 AAE/MAE tweets) —
  same "research purposes only" restriction on the same site, same
  reasoning, not fetched.
