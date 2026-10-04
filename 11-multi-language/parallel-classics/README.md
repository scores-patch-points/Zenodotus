# Parallel classics — same work, independently translated

Every subdirectory here is ONE public-domain work, fetched in several
languages, verified so each language edition actually carries the declared
work: `scripts/fetch-parallel-classics.mjs` reads each download's own
Project Gutenberg header (`Title:`/`Author:`) or opening text before
saving it, and refuses anything that doesn't match — see that script's
header comment and `digested/CORPUS-INTEGRITY-FINDING.md` for why this
check exists (a sibling directory, `gutenberg-non-en/`, has every one of
its 20 files mislabeled because no such check was run when it was built).

Unlike the rest of live_priors — where a given novel, statute or article
exists in one original language — these are meant for direct cross-language
comparison at the level of a whole work: the same events, the same
sentences in different clothing, chapter for chapter.

## Works (7 works, 31 editions, 8 languages)

| Work | Author | Languages |
|---|---|---|
| Alice's Adventures in Wonderland | Lewis Carroll | en, de, fr, it |
| The Adventures of Pinocchio | Carlo Collodi | it, en, fi |
| Grimms' Fairy Tales | Jacob Grimm | en, de, fr, hu, fi |
| Robinson Crusoe | Daniel Defoe | en, fr, nl, fi, de |
| Gulliver's Travels | Jonathan Swift | en, fr, it, nl, fi, hu |
| Faust, Part 1 | Johann Wolfgang von Goethe | de, en, fr, es, nl |
| Perrault's Fairy Tales | Charles Perrault | en, de, fi |

## Rejected

0 candidate edition(s) were fetched but not saved,
either because the downloaded text's own declared identity didn't match what
it was fetched for, or because it fell under the corpus's 600-word floor.
Full detail in `manifests/parallel-classics-manifest.json` under
`rejected` — nothing here was silently dropped.

## License

Public domain — every edition is a Project Gutenberg-hosted text (mostly
pre-1929 US publication, per the convention already used by
`fetch-gutenberg.mjs` for the rest of this corpus). Gutenberg ids were
resolved live against [Gutendex](https://gutendex.com) rather than typed
from memory.
