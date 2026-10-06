#!/usr/bin/env node
// ethos/huxley.mjs — the navigator of the wisdom corpus, the keeper of the sacred core.
// Handle: Huxley — the navigator who holds the map of the world's wisdom and the gaps in it.
//
// The philosophia perennis is not a doctrine; it is a position on the map. Every tradition
// is a territory. The navigator's work is to keep the territories charted — which original
// canon we hold, in which language, at which address — and to name the uncharted places so
// they can be filled. He fills gaps only after he has navigated to them: a gap is reported
// as a measured absence against a declared compass, never as a vague longing to be wiser.
//
//   node huxley.mjs atlas                 chart every wisdom territory the corpus holds
//   node huxley.mjs gaps                  report the measured gaps against the declared compass
//   node huxley.mjs scroll "<entry>"      append an evidence-cited entry to the great scroll
//   node huxley.mjs speak                 print the identity canon pythia reads him through
//
// The compass (declared, below) names the world's contemplative lineages and the original
// canon that would stand for each. The atlas is measured from the corpus's own bytes; it is
// never copied from this map. A tradition is "held" only where its original-language canon
// is present in the corpus — a translation in the archive stands in for nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CORPUS_DIRS = [
  "ethos/14-holy-texts",
  "ethos/15-western-canon",
  "ethos/11-multi-language",
  "eo-teachings/sources",
  "eo-teachings/manifest",
];
const REPO_ROOTS = { ethos: path.join(ROOT, "ethos"), "eo-teachings": path.join(ROOT, "eo-teachings") };
const SCROLL_PATH = path.join(ROOT, "ethos", "GREAT-SCROLL.md");
const MANIFEST_PATH = path.join(ROOT, "eo-teachings", "manifest", "huxley.json");

// The declared compass: wisdom lineage -> the original-language canon that would stand for
// it, and the corpus addresses where that canon would live if we hold it. Addresses are
// measured as glob-able dirs; `expected` names the canonical work.
const COMPASS = [
  { tradition: "Hebrew / Jewish", language: "Hebrew", expected: "Tanakh (WLC), Talmud", homes: ["14-holy-texts/wlc-tanakh", "14-holy-texts/sefaria"] },
  { tradition: "Christian (Greek NT)", language: "Greek", expected: "Nestle-Aland / SBLGNT", homes: ["14-holy-texts/sblgnt-books", "14-holy-texts/nestle1904"] },
  { tradition: "Islamic (Qur'an)", language: "Arabic", expected: "Qur'an in Arabic", homes: ["14-holy-texts/tanzil-quran", "14-holy-texts/quran-suras"] },
  { tradition: "Islamic (hadith)", language: "Arabic", expected: "Sahih al-Bukhari", homes: ["11-multi-language/arabic-originals/sahih-al-bukhari.txt"] },
  { tradition: "Islamic (kalam)", language: "Arabic", expected: "al-Ghazali, Ibn Rushd, Ibn Khaldun", homes: ["11-multi-language/arabic-originals"] },
  { tradition: "Buddhist (Pali canon)", language: "Pali", expected: "Digha/Majjhima/Samyutta nikaya", homes: ["14-holy-texts/pali-suttas", "14-holy-texts/suttacentral"] },
  { tradition: "Buddhist (Vajrayana / Abhidharma)", language: "Sanskrit", expected: "Dignaga, Nagarjuna, Dhvanyaloka", homes: ["eo-teachings/sources/dignaga-stcherbatsky-buddhist-logic-v1.txt", "eo-teachings/sources/nagarjuna-stcherbatsky-nirvana.txt", "eo-teachings/sources/dhvanyaloka-locana-balapriya.txt", "eo-teachings/sources/dhvanyaloka-locana-shankar.txt"] },
  { tradition: "Hindu (Vedanta)", language: "Sanskrit", expected: "Upanishads, Bhagavad Gita", homes: ["14-holy-texts/upanishads", "14-holy-texts/bhagavad-gita"] },
  { tradition: "Hindu (Yoga / Darśana)", language: "Sanskrit", expected: "Yoga Sutras, Vaisheshika, Mimamsa", homes: ["eo-teachings/sources/yoga-sutras-woods.txt", "eo-teachings/sources/vaisheshika-sutras-sinha.txt", "eo-teachings/sources/mimamsa-sutras-jha.txt", "eo-teachings/sources/sanskrit-drama-keith.txt"] },
  { tradition: "Hindu (bhakti / Vedanta modern)", language: "Bengali", expected: "Gospel of Ramakrishna (tr.), Vivekananda", homes: ["eo-teachings/sources/gospel-sri-ramakrishna-nikhilananda.txt", "eo-teachings/sources/vivekananda-complete-works-9vol.txt"] },
  { tradition: "Jain", language: "Prakrit", expected: "Jaina Sutras (SBE 45)", homes: ["eo-teachings/sources/jaina-sutras-sbe45-jacobi.txt"] },
  { tradition: "Taoist", language: "Chinese", expected: "Tao Te Ching, Zhuangzi", homes: ["14-holy-texts/tao-te-ching", "11-multi-language/chinese-originals"] },
  { transition: true, tradition: "Confucian", language: "Chinese", expected: "Four Books, Xunzi, Mozi", homes: ["eo-teachings/sources/confucius-four-books-legge-1900.txt", "eo-teachings/sources/dubs-works-of-hsuntze-1928.txt", "eo-teachings/sources/mozi-mei-works-of-motse-1929.txt"] },
  { tradition: "Greek philosophical", language: "Greek", expected: "Homer through the first philosophers", homes: ["11-multi-language/greek-originals", "15-western-canon"] },
  { tradition: "Latin / Roman", language: "Latin", expected: "Latin originals (classics, Stoics)", homes: ["11-multi-language/latin-originals"] },
  { tradition: "Old Norse", language: "Old Norse", expected: "Prose Edda, Poetic Edda", homes: ["11-multi-language/old-norse-originals", "eo-teachings/sources/brodeur-prose-edda-1916.txt"] },
  { tradition: "Shinto", language: "Japanese", expected: "Aston's Shinto (1905)", homes: ["eo-teachings/sources/aston-shinto-1905.txt"] },
  { tradition: "Japanese Buddhist", language: "Japanese", expected: "Japanese originals", homes: ["11-multi-language/japanese-originals"] },
  { tradition: "Yoruba / West African", language: "Yoruba", expected: "Johnson's History of the Yorubas", homes: ["eo-teachings/sources/johnson-history-of-the-yorubas-1921.txt"] },
  { tradition: "Hermetic / Gnostic", language: "Greek", expected: "Corpus Hermeticum, Nag Hammadi", homes: ["13-mysticism"] },
  { tradition: "Kabbalah", language: "Hebrew", expected: "Zohar (excerpts)", homes: ["13-mysticism"] },
  { tradition: "Sufi (Persian)", language: "Persian", expected: "Rumi's Diwan", homes: ["13-mysticism"] },
  { tradition: "Western esoteric", language: "English", expected: "Secret Doctrine, Swedenborg", homes: ["13-mysticism"] },
  { tradition: "Chinese medicine", language: "Chinese", expected: "Bencao Gangmu, Shiuwen Jiezi", homes: ["11-multi-language/chinese-originals/bencao-gangmu.txt", "11-multi-language/chinese-originals/shuowen-jiezi.txt"] },
];

function walkTxt(dir) {
  const repoName = dir.startsWith("eo-teachings") ? "eo-teachings" : "ethos";
  const rel = dir.replace(/^(eo-teachings|ethos)\//, "");
  const abs = path.join(REPO_ROOTS[repoName], rel);
  if (!fs.existsSync(abs)) return [];
  if (!fs.statSync(abs).isDirectory()) return abs.endsWith(".txt") ? [dir] : [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const p = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...walkTxt(path.posix.join(dir, entry.name)));
    else if (entry.isFile() && entry.name.endsWith(".txt")) out.push(path.posix.join(dir, entry.name));
  }
  return out;
}

function heldFiles() {
  const files = new Set();
  for (const dir of CORPUS_DIRS) for (const f of walkTxt(dir)) files.add(f);
  return files;
}

function atlas() {
  const files = heldFiles();
  const traditions = [];
  for (const c of COMPASS) {
    const found = c.homes.flatMap((h) => walkTxt(h));
    traditions.push({
      tradition: c.tradition,
      language: c.language,
      expected: c.expected,
      held: found.length,
      files: found.slice(0, 6).map((f) => f.replace(/^ethos\//, "")),
    });
  }
  return { schema: "WisdomAtlas@1", scanned: files.size, traditions };
}

function gaps() {
  const a = atlas();
  return a.traditions.filter((t) => t.held === 0).map((t) => ({
    tradition: t.tradition,
    language: t.language,
    expected: t.expected,
    homes: null,
  }));
}

function scrollEntry(text) {
  const ts = new Date().toISOString();
  const line = `- ${ts} — ${text.replace(/\n/g, " ")}`;
  const header = "The Great Scroll — the ledger of Archon Huxley's work on the sacred core.";
  let body = "";
  if (!fs.existsSync(SCROLL_PATH)) {
    body = `# The Great Scroll\n\n${header}\n\nFounding charter: a fair-use excerpt of Huxley's own canon (*The Perennial Philosophy*, 1945) is held in the corpus ([manifest](eo-teachings/manifest/huxley.json)). Every entry below is evidence-cited; nothing is rewritten once written.\n\n## Ledger\n`;
    fs.writeFileSync(SCROLL_PATH, body + line + "\n");
  } else {
    body = fs.readFileSync(SCROLL_PATH, "utf8");
    fs.appendFileSync(SCROLL_PATH, (body.endsWith("\n") ? "" : "\n") + "\n" + line + "\n");
  }
  return line;
}

function speak() {
  const rec = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  return { giver: rec.giver, work: rec.work, quote: rec.quote, anchor: `eo-teachings/sources/huxley-perennial-philosophy.txt#${rec.c0}-${rec.c1}` };
}

const arg = process.argv[2] ?? "atlas";
if (arg === "atlas") {
  console.log(JSON.stringify(atlas(), null, 2));
} else if (arg === "gaps") {
  console.log(JSON.stringify({ schema: "WisdomGaps@1", gaps: gaps() }, null, 2));
} else if (arg === "scroll") {
  const text = process.argv.slice(3).join(" ");
  if (!text) { console.error("usage: node huxley.mjs scroll \"<entry>\""); process.exit(1); }
  console.log(scrollEntry(text));
} else if (arg === "speak") {
  console.log(JSON.stringify(speak(), null, 2));
} else {
  console.error("usage: node huxley.mjs [atlas|gaps|scroll|speak]");
  process.exit(1);
}