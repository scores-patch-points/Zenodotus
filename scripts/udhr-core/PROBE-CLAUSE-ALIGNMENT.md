# Probe: how far mechanical methods get below the paragraph

Question: can the leave-k-out convergence test cover *wording* (clauses), not just paragraph structure?
Scripts: `probe-gold.mjs`, `probe-sentences.mjs` (exploratory, no model, no pivot language).

## What exists to score against

The hand-adjudicated readings `udhr-{eng,spa,arb,cmn_hans,swh}.txt.hand.eot.jsonl` (sha256 matches the current files; offsets are valid UTF-8 byte offsets). Each holds 125-138 propositions with a shared id (`udhr:enjoy-freedoms`) and a clause-tree address (`ground: preamble.2.2.1`).

- 117 proposition ids are carried by all five editions; 8 by only one to three of them.
- Each edition's propositions sit on 89 distinct byte spans: 31 headings + 58 **paragraph-level** spans. The gold does not give sub-paragraph byte spans. So it can say which propositions a paragraph holds, but not where inside the paragraph each one is.
- Of the 124 propositions carried by four or more editions, 115 land in the same (unit, paragraph) in every edition that has them. The other 9 are the known paragraph-structure variants: preamble recitals merged or split (Arabic, Chinese, Swahili) and Article 21's third paragraph merged in Swahili. No proposition changes sentence within a paragraph both editions share, but the gold spans are paragraphs, so this checks little at sentence grain.

## What mechanical methods reach

| grain | method | result |
|---|---|---|
| paragraph | layout / numbered / structural | done (steps 2-4); convergent at k=16 |
| sentence | Unicode sentence terminals (`\p{STerm}`) inside aligned paragraphs | a majority sentence count exists for all 50 article paragraphs and agrees with the English gold on 50/50. But only 26/50 reach 90% agreement across editions, and only 82 of 515 editions have zero departures from the mode. Softest: Article 26 p1 (55%), Article 26 p2 (61%), Article 18 p1 (62%). |
| clause / proposition | clause punctuation (`, ; :` and CJK/Arabic variants) per paragraph vs gold propositions per paragraph | correlation r = 0.30 (eng), 0.49 (spa), 0.25 (arb), 0.59 (cmn_hans), 0.31 (swh). Too weak to place propositions. |

Sentence counts are a noisy cue: the same paragraph is 1, 2 or 3 sentences depending on orthography and on translator choice, and the splitter cannot tell which. Where an edition departs from the mode, this probe cannot say whether the translation differs or the punctuation did.

## Conclusion

- Mechanical methods reach the sentence grain only weakly and the clause grain not at all with the data on hand.
- The gold cannot score a sub-paragraph aligner, because it has no sub-paragraph spans. Wording-level convergence therefore cannot be run honestly yet.
- A correction made during the probe: an early check reported 124/124 propositions at the same sentence address. It was vacuous, because unresolved addresses all compared equal. After fixing the address lookup the figure is 115/124, and what the 9 misses show is paragraph variants, not sentence variants.

## What would unlock it (not done)

1. Span-level annotation: add byte spans for the propositions inside paragraphs in the five gold editions, then score any aligner against them.
2. Build the aligner from the stack's own readers (eoreader7 plus the per-language `derived-priors`) rather than from punctuation, and score it on (1).
3. Until then, wording can enter the structure only as the 117 hand-adjudicated proposition referents with five witness editions each. That is a hand-adjudicated inventory, not a mechanical convergence over 515.
