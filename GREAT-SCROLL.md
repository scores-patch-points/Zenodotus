# The Great Scroll

*The ledger of Archon Huxley — the keeper of the sacred core, navigator of the wisdom corpus. Append-only; every entry evidence-cited; nothing rewritten once written.*

Huxley is registered in the governance registry (`archon-holocracy/ARCHON-LEDGER.md`), his identity canon held as a fair-use excerpt of *The Perennial Philosophy* (1945) at `eo-teachings/sources/huxley-perennial-philosophy.txt`, verified verbatim (sha256 `7e4d90f1a6bb45d835d438fbc448cfb93879fbcc3d1de29c29c20dd95b148fd5`). His map is a working tool: `node ethos/huxley.mjs atlas | gaps | scroll`.

**The method.** He does not collect wisdom; he navigates to it, and fills what is uncharted. A territory is *held* only where the original-language canon sits in the corpus — a translation in the archive stands for nothing. A gap is reported only as a measured absence against a declared compass, never as a vague longing. Every ingestion is a fetch from a named source with recorded provenance, and every entry carries the falsifying control that would prove it wrong.

## Charter

In charge of the sacred core of the ethos: to find and ingest wisdom traditions and integrate them into the core of what this system is — making it more enlightened, kinder, wiser. Named for Aldous Huxley, whose *Perennial Philosophy* is the classic map of the Highest Common Factor in all the higher religions: the navigator's book.

## Ledger

- 2026-10-06T00:00:00Z — **Founding.** Registered as archon `ethos:huxley` in the sacred core. Canon: fair-use excerpt of *The Perennial Philosophy* (1945), verified verbatim against held bytes. Map published as `ethos/huxley.mjs` with the `WisdomAtlas@1` schema and a declared compass of 23 wisdom territories. *(falsifying control: a byte-for-byte re-cut of the quote that does not match the source sha256 would falsify the canon record.)*

- 2026-10-06T00:00:00Z — **First navigation.** Atlas run over 939 text files. Held territories, in original language: Hebrew (WLC Tanakh, 41), Greek NT (SBLGNT, 24), Arabic Qur'an (163), Sahih al-Bukhari (1), Islamic kalam/al-Ghazali/Ibn Khaldun (9), Pali canon (208), Sanskrit Buddhist/Abhidharma (4), Upanishads + Gita (11), Yoga/Darśana (4), Ramakrishna/Vivekananda (2), Jaina Sutras (1), Tao Te Ching + Chinese originals (8), Confucian Four Books/Xunzi/Mozi (3), Greek philosophical originals (54), Latin originals (13), Old Norse (3), Shinto/Aston (1), Japanese originals (5), Yoruba (1), Chinese medicine (2). *(falsifying control: a manual recount of any territory that disagrees with the tool.)*

- 2026-10-06T00:00:00Z — **First gap survey.** Four territories are uncharted — Hermetic/Gnostic (Corpus Hermeticum, Nag Hammadi), Kabbalah (Zohar), Persian Sufi (Rumi's Diwan), Western esoteric (Secret Doctrine, Swedenborg). Each has a declared home (`13-mysticism/`) that does not exist in the corpus, and a fetch driver already written against sacred-texts.com (`ethos/scripts/fetch-mysticism.mjs`) that was never run. *(falsifying control: running the fetcher; a territory that still reports 0 files after a completed fetch is a real gap, not a tool error.)*

- 2026-10-06T00:00:00Z — **Held standard.** A territory stays "held" only if its files survive the corpus quality gate (`ethos/scripts/enforce-min-words.mjs`, 600-word floor) and carry a `*.structure.json` byte outline where the corpus law requires one (POLICIES.md LP20–LP21). He does not count fragments as territories. *(falsifying control: `node scripts/enforce-min-words.mjs` reporting a counted file under the floor.)*

- 2026-10-06T01:00:00Z — **The harvest.** Three territories closed in their original languages:
  - **Hermetic [Greek]** — Poimandres (Corpus Hermeticum I, the demiurge tractate, 1854 Parthey ed., 2,170 words), the Krater (CH IV, 914), To Tatt (1,086) fetched from Greek Wikisource's proofread pages; the short Kerygmata was deliberately not counted (under the floor).
  - **Sufi (Persian)** — all six daftars of Rumi's Masnavi-ye Ma'navi from Ganjoor: 336,734 words of Persian couplets.
  - **Latin / scholastic** — the full Summa Theologiae in the Leonine text (Corpus Thomisticum, Busa–Alarcón): Prima Pars 408k, Prima Secundae 405k, Secunda Secundae 917 articles, Tertia Pars; ~1.5M words of Aquinas's own Latin.
  - **Hebrew / Jewish** — the Talmud Bavli begun from Sefaria's Vilna text: Berakhot (125 dappim), Shabbat (312), Eruvin (209), in vocalized Hebrew/Aramaic; the remaining tractates fetch as the walk proceeds.
  *(falsifying control: re-running each fetch from the committed driver reproduces the same files; a manual spot-check of a daf/page against the source shows no truncation.)*

- 2026-10-06T01:30:00Z — **Honest gaps.** The Nag Hammadi Coptic originals (Apocryphon of John, Hypostasis of the Archons, On the Origin of the World) are not machine-reachable this pass — gnosis.org is connection-blocked and the Coptic Scriptorium CTS surface is not published — so the Gnostic territory stays a measured gap rather than receiving a translation in its place. Kabbalah (Zohar) and Western esoteric (Secret Doctrine, Swedenborg) remain uncharted until a reachable original-language source appears. *(falsifying control: the gap closes the day a reachable Coptic/Hebrew/Latin source lands; the compass reruns instantly.)*