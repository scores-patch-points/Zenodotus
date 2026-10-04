# name-priors

`NamePartsPrior@1` is a RECEIVED lexicon of the PARTS a personal name is made
of in a language — titles that precede a head, particles that link parts of
one name, and the patronymic suffixes that mark a part as derived from the
father's given name. Not a measurement of any text in this corpus. Each file
declares its `language`, its giver, and its own parameters (the patronymic
floor `minLength` is the Russian file's, declared there, never a constant in
the consuming organ).

Moved here 2026-09-28 from eoreader7's `native/adapters/text/priors.js`
(`HONORIFIC_TITLES`) and `native/adapters/text/name-spans.js`
(`NAME_PARTICLES`, `PATRONYMIC_RU`) on the direction that specialty-fit
organs should be reading priors: a reader of an English translation of a
Russian novel COMPOSES `en` + `mul` + `ru` and hands the composition to the
name organ (`name-spans.js::namePartsFrom(...priors)`), which knows the
SHAPE of a name (a tree: head, given, patronymic, title, particle) and
nothing about any language's own classes. Adding a language is adding a
file, not editing an organ.

| file | carries |
|---|---|
| `name-parts-en.json` | 53 titles (honorific, noble, royal, military) |
| `name-parts-mul.json` | 20 nobiliary/linking particles |
| `name-parts-es.json` | 14 Spanish honorifics (don/doña, señor/señora/señorita, abbreviations, fray/sor) — E6: added as one file, the organ untouched |
| `name-parts-ru.json` | patronymic endings, transliterated and Cyrillic, as a CANDIDATE class with a floor — the organ decides by position or by an established father's given name, never by the ending (Aldrich began as a patronymic too) |

The code-side defaults in eoreader7 remain byte-identical for callers that
pass nothing; they are the same lists, kept so an organ loads with no file
on disk. The prior is the authoritative copy from here on.
