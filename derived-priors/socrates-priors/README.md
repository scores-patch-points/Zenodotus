# socrates-priors

`SocratesSays@2` — every utterance Socrates actually speaks in the polytonic
Greek Plato corpus, extracted mechanically, byte-addressed, and typed by the
**elenctic move** it performs. Plus the *flow*: each `consumption` move records
the interlocutor answer it opens by restating.

This is the memory half of the Pythia design — the source of ground for a
Socratic archon. The method half (test a claim with a swarm, pronounce only
survivors) is the Pythia function, which belongs to the Fold, not to this
corpus.

## Giver

`live_priors/11-multi-language/greek-originals/` — polytonic Ancient Greek,
public domain (Greek Wikisource).

## Recipe (exact, reproducible)

`socrates-says.py` (this repo root). Mechanical speaker-tag extraction; no
model (L5). Three conventions routed by the corpus's own structure:

1. **Spelled markers** (Gorgias, Meno): a `Σωκράτης:` marker unit, then
   content until the next speaker marker → one Socratic turn.
2. **Abbreviated inline** (Crito, Phaedrus, Sophist, Theaetetus): rows
   starting `ΣΩ.`/`ΣΩΚΡ.`/`Σω.` → one Socratic turn.
3. **First-person narration** (Republic, Phaedo): Socrates narrates as
   `εἶπον`/`ἔφην`/`ἦν δ᾽ ἐγώ` ("I said"); interlocutors as `ἔφη` ("he said").
   The grammatical 1st/3rd-person split tags the turns; both sides are kept so
   the consumption pairing connects them.
4. **Apology**: one continuous speech (all Socrates).
5. Parmenides, Symposium, Timaeus: no reliable speaker tags in the current
   corpus text — recorded as partial (empty), never guessed.

## Move types (closed vocabulary, mechanical)

| move | signature | meaning |
|---|---|---|
| `consumption` | οὐκοῦν νυνδὴ ἔλεγες / εἰ οὖν / μετὰ ταῦτα / ἄρτι / τοίνυν | opens by RESTATING the prior answer — the Terry Gross listening move; pairs with the consumed answer |
| `aporia` | οὐκ οἶδα / ὃ δὲ μὴ οἶδα / ἐγὼ οὐκ εἰδώς | declares not-knowing |
| `question` | ἆρα / τί / πῶς / πότερον / οὐκοῦν / εἰπέ / φῂς | asks |
| `refutation` | οὐκοῦν / ἆρ᾽ οὖν / συμβαίνει / πῶς οὖν | draws the contradiction |
| `premise` | ἔστω / ὑπόθες / φαμέν / ὁμολογοῦμεν | states a ground / received premise |
| `method` | οὐδὲν διδάσκω ἀλλ᾽ ἐρωτῶ / ἀνάμνησις / ἔλεγχος | names the method |
| `midwifery` | τί φῇς / εἰπέ μοι / σκόπει / ἴδωμεν / πειρῶ | hands the birth back |
| `other` | — | not one of the above |

## Coverage (2026-09-20 run)

| dialogue | Socratic turns | consumption | questions | refutations |
|---|---|---|---|---|
| apology | 1 (continuous) | 0 | 0 | 0 |
| crito | 43 | 2 | 11 | 1 |
| gorgias | 527 | 22 | 104 | 104 |
| meno | 283 | 24 | 56 | 56 |
| phaedo | 9 | 0 | 3 | 0 |
| phaedrus | 160 | 14 | 23 | 1 |
| republic | 449 | 48 | 98 | 61 |
| sophist | 5 | 1 | 2 | 0 |
| theaetetus | 420 | 36 | 55 | 5 |
| parmenides / symposium / timaeus | — | — | — | partial (no reliable tags) |

Total Socratic turns: **~1,897** (excluding the 3 partial dialogues).

## Known limitation

The `consumption` pairing in the narration convention (Republic) keys on the
grammatical person split; a clause containing both a 3rd-person narration
frame and Socrates's own first-person verb may be tagged once (the regex
takes the frame after the verb). This is a disclosed approximation, not a
silent one — a model is never used to disambiguate.

## Falsifying control

Re-run `python3 socrates-says.py` from this repo root: the counts above must
reproduce exactly (deterministic recipe, no model). A change in the giver
texts or the recipe is a new recension, never a silent edit.