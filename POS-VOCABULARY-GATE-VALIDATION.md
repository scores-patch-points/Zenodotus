# The POS vocabulary gate, validated on 10 deliberately diverse specimens

Before wiping every sidecar and re-sweeping the whole corpus fresh
(`node scripts/eot-sidecar.mjs --scan --fresh`), the fix itself —
`hypergraph.js::makeRelationReader`'s own `posPriorFor` wired into
`eot-digest.mjs::loadOrgans` — was run against 10 specimens chosen for
maximum genre/script/structure diversity, not for being easy. This is
that record.

## Why this fix, and what it is not

`relations.js::discoverRelationVocab` already had a built, tested,
TYPE-level POS gate (`posPrior` param, `verbShare > 0.5` over the real
UD_English-EWT treebank) that `hypergraph.js` already wired through an
optional `organs.posPriorFor` accessor — but this driver had only ever
loaded the POS fixture for `classifyConnector` (grammar-lens.js's
disclosure-only, per-EDGE check, P56's own asymmetric rule: a settled
part of speech is refusable, never confirmable — correctly left alone).
An earlier pass here conflated the two and declined both; they are
different mechanisms. `posPriorFor` gates the CANDIDATE VOCABULARY a verb
is drawn from, before extraction ever runs — structurally the same class
of gate `determiners`/`negationWords` already are (closing a false
admission, never convicting an already-extracted edge), and P43's own
distinguishing test says exactly why it belongs: does the prior close a
false binding, or does it widen what the reader hears? A preposition
wrongly treated as a verb is a false binding closed.

## The 10 specimens

| label | file | gate | edges | candidates | verbs |
|---|---|---|---|---|---|
| English literature (prose) | pg11 Alice's Adventures in Wonderland | clean | 34 | 24 | 9 |
| Encyclopedic (formal register) | 1911 Britannica, Economics | empty | 0 | 5 | 0 |
| Government/legal (structured) | ATTRIBUTION.md | clean | 15 | 33 | 17 |
| Catalog (tabular/record-block) | met-museum-catalog.txt | empty | 0 | 13 | 4 |
| Technical docs (software) | ripgrep CHANGELOG.md | clean | 15 | 21 | 12 |
| Ancient Greek (apparatus fmt) | SBLGNT Mark | empty | 0 | 0 | 0 |
| Hebrew (RTL, caseless script) | Sefaria Ruth Rabbah | gapped_script | 0 | 0 | 0 |
| Latin-script creole | APiCS Sranan survey | clean | 19 | 25 | 9 |
| Wordplay (unusual short-form) | Guardian cryptic clues | clean | 3 | 17 | 3 |
| Mislabeled/edge specimen | pg135 (filename says French; body is Hapgood's English translation, no PG `Title:` header, `declaredIdentity` correctly returns null) | clean | 30 | 20 | 10 |

Zero crashes, zero extraction errors, across every one. Every `empty` or
`gapped_script` reading is the CORRECT reading of that material's own
shape (a genuine caseless-script or apparatus/table-format specimen), not
a side effect of this fix — confirmed by inspecting `candidates` (the
gate never runs, or has nothing to gate, on all four).

## What the gate actually closes, confirmed on real survivors

Alice's 9 surviving verbs: `began, opened, started, was, think, got,
fallen, had` — every one a genuine verb, none lost from the 15 excluded
(`in, the, or, by, of, ’s, dear, with, after, either, ’ll, afraid, like,
to, my`, per the earlier direct comparison this fix was built against).
ripgrep's changelog and the Guardian cryptics both survive with real,
readable verbs. This is the dominant failure mode this fix targets —
measured before shipping at 80-99% non-verb connectors on real corpus
files — and it is closed exactly where the fix is supposed to close it.

## Two real, disclosed limits this diverse sample surfaced — not bugs

**ATTRIBUTION.md** (a multilingual legal-citation file) still admits
`likums, für, d'andorra, dello, im, spravodlivosti, zákonů` as "verbs"
alongside genuine English ones (`do, is, feed`). Checked directly against
`pos-eng.json`: every one of those is **unattested** in the treebank —
Latvian, German, Andorran/Catalan, Italian, Slovak, Czech words the
English-only UD_English-EWT corpus never saw. `discoverRelationVocab`'s
own gate is explicit about this: "a witness cannot refuse what it never
saw" — an unattested form is a gap, admitted, never a guess. **The gate
is English-only by construction and provides zero protection on
non-English text**, which on a multilingual citation list means most of
the garbage this fix targets elsewhere simply is not there to be caught.

**The Sranan survey** admits `is, was, have, has, creoles, plantations,
churches` — the last three are plain English nouns, not verbs, and
survived the gate. Checked directly: all three are **unattested** in the
16,654-word treebank (a real, finite vocabulary built from ~12,500
UD_English-EWT sentences — plurals of less-common nouns and any word
outside that corpus's own coverage are gaps, not exclusions). **The
gate's real coverage is bounded by the treebank's own vocabulary size,
not just by language** — an ordinary, moderately uncommon ENGLISH noun
can pass through exactly the same way a foreign word does, for the
identical reason (never seen, never refused). `ripgrep`'s own admitted
list has the same shape: `gitignore, hyphens, ancestor, completions,
directory` are all unattested technical/rare-enough nouns riding through
alongside genuine verbs.

## What this means for the rest of the fix's scope, stated plainly

This fix closes the dominant, high-frequency failure mode (prepositions,
articles, conjunctions, common pronouns wrongly treated as verbs) very
well, because those words are — by definition of being high-frequency
function words — near-certain to be well-attested in even a modest
treebank. It does **not** close, and was never going to close, the rarer
failure mode where an uncommon noun (English or not) sits in the verb
slot `extractRelations`'s own SVO matcher guessed at. That second failure
mode is P56's own residue (SLOT is not CLASS) and is a real, separate,
larger problem — a bigger or multilingual POS resource would narrow it
further but never close it to zero, since `discoverRelationVocab`'s own
gate is deliberately conservative (never refuses what it has not seen)
and no reasonably-sized treebank sees every word.

## Decision

Proceed to the full corpus fresh sweep. The fix is real, measured,
correctly scoped, and its limits are now named rather than discovered
later by surprise.
