# alias-priors

`AliasDeclarationPrior@1` is a MEASURED prior, like `fold-reading-priors/`
and unlike the received lexicons in `pronoun-priors/`: it is computed from
this corpus's own numbered source categories, and every shape it ships
carries the count that earned it.

## The question it answers

A reader eventually has to know that two surfaces name one thing.
eoreader7's `surfaces.js::namesCorefer` already folds a name shortened by
DROPPING WORDS, and measurably does not fold one shortened by INITIALS:

    namesCorefer("Regional Transit Authority", "Transit Authority") -> true
    namesCorefer("RTA", "Regional Transit Authority")                -> false

The obvious patch — build an initialism and compare it — is refused on this
project's own grounds: a rule that DERIVES a name is a rule that can INVENT
one, and referent identity has never been safe to decide from the shape of a
string (L2's capitalisation veto; the cube refused as a content classifier).

Prose does not ask us to guess. It introduces its own short forms, in a
small number of recurring SHAPES, at addresses:

    "the Regional Transit Authority (RTA)"
    "the Central Zoning Board (CZB)"

So the shapes are what this prior carries, and an acronym needs no rule of
its own — it is one subtype of alias, admitted on exactly the same evidence
as a nickname, a short form, or a case caption.

## What was measured, and how

`scripts/build-alias-prior.mjs` reads the corpus and tests eight CANDIDATE
shapes. They are candidates, never an answer: a shape FIRES when it matches,
and is CONFIRMED when the form it introduced is then used in the same
document at least `min_uses` times (the declaration counting as one) —
because a gloss the document never uses again is an aside, not a name.
`confirm_rate` is confirmed / fires.

Over 900 files and 20.8MB of `02-encyclopedic`, `06-government-legal`,
`15-western-canon` and `05-academic-papers`:

| shape | fires | confirmed | rate |
|---|---|---|---|
| parenthetical `X (Y)` | 23,375 | 11,163 | 0.478 |
| also-known-as | 10 | 1 | 0.100 |
| known-as | 6 | 1 | 0.167 |
| or `X, or Y,` | 13 | 3 | 0.231 |
| abbreviated | 1 | 0 | 0.000 |
| formerly | 3 | 0 | 0.000 |
| short-for | 0 | 0 | — |
| d/b/a | 0 | 0 | — |

The result is worth stating plainly: **one shape does essentially all the
work in written English, and the connective phrases a person would think to
list first are close to absent.** Hand-listing them would have shipped seven
rules that never fire beside the one that does, with nothing to say which
was which. The near-zeros are kept in the file rather than pruned — a
consumer that widens its floor should be able to see exactly what it is
admitting.

## What a consumer owes it

`eoreader7/native/organs/aliases.js` receives this prior and holds no
declaration vocabulary of its own. Both floors are the CALLER's
(`minConfirmRate`, `minFires`) — this prior measures, it does not decide —
and the consuming organ additionally walls every admitted gloss against the
material's own use of it and re-reads the declaring sentence's byte span
before shipping an alias (P5.2). An alias is evidence like anything else,
and it is citable.

## Limits, named

- English only. The shapes are English prose's; `language` says so. Another
  language needs its own run over its own material, not a translation of
  this file.
- The corpus skews encyclopedic and governmental, which is where glossed
  abbreviations live. A conversational or literary corpus would very likely
  fire far less often, and the rate here should not be read as a rate for
  prose in general.
- `confirm_rate` is not precision. A parenthetical that fires and is
  confirmed may still be a parenthetical aside whose words happen to recur;
  the wall against that is the consumer's, not this file's.
