// GATED RERUN (2026-10-20): identical to ring1-genre.mjs except that the anti-colonial and first-person documents are limited to those perspective-gate.mjs ADMITS (declared
// perspective; undeclared files are controls). Claims, thresholds and seeds unchanged; the question is whether the units that survived the genre control survive the gate.
// udhr-core/ring1-genre.mjs — does the anti-colonial over-indexing survive a GENRE-MATCHED control?
//
// Ring 1 compared the voices of the dispossessed with neutral English literature (novels). A difference there could be genre, not stance: political and
// legal prose speaks of rights more than novels do, whoever writes it. The control here is state-side, rights-adjacent English prose already in the repo:
//   G = the English statutes of the UK (the former imperial centre) and the US (06-government-legal/world-legislation/uk, us) and the 1911 Britannica
//       articles on Law, Economics, Sociology and Philosophy (02-encyclopedic/1911-britannica), written at the height of the empire.
// IT IS AN IMPERFECT CONTROL, and the header says so: modern statutes are not colonial-administrator tracts, and an encyclopedia is not a speech. The repo
// holds almost no imperial-side political prose (the CIA Factbook was removed from the corpus on purpose, to balance empire-POV weight).
//
// PRE-REGISTERED before the first run (2026-10-19); the model, scoring and profile are exactly ring1.mjs's (C0 passed there and is not rerun):
//   C3  anti-colonial documents profile differently from G: TV(profile A, profile G) exceeds the MAXIMUM over 200 draws that reassign documents between A and G
//       at random (sizes kept).
//   C4  the same for first-person voices (B) against G.
//   S   a unit SURVIVES for corpus X iff share_X[u] > share_G[u] in at least 190 of 200 bootstrap resamples of documents (resampled with replacement within
//       each corpus). The units tested are those ring 1 over-indexed against novels: anti-colonial 4, 21, 13, 7, 8; first-person 4, 25, 16, 23, 27.
//   Reported, not claimed: TV(G, N) (how much of the first result was genre alone) and the units where X most exceeds G.
//   RUN 1 (same day) loaded only 4 documents for G: the statutes are .md files and the loader read .txt only. A loader bug, found before any claim was changed;
//   claims C3, C4, S and thresholds stand exactly as written. Run 1 is kept in _ring1-genre-run1.log; the headline numbers below are run 2 (statutes included).
//   Control  each claim is reversed by a null draw reaching the real value; a unit that fails S is reported as NOT surviving, whatever its ring-1 lift was.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { admitted } from "./perspective-gate.mjs";
import { modelOf, profileDocument, meanOf, tv, permutationTest, walk, frontmatter, gutenbergBody, shuffle, mulberry, ROOT, tokensOf } from "./ring1.mjs";

const UNIT = /[\p{L}\p{M}\p{N}'’]+/gu;
const m = await modelOf("eng");
const prior = m.hearing.posPrior.forms;
const walkMd = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walkMd(p) : /\.(txt|md)$/.test(p) ? [p] : []; });
const load = (dir, keep) => walkMd(join(ROOT, dir)).map((p) => { const { meta, body } = frontmatter(readFileSync(p, "utf8")); return { p, meta, text: gutenbergBody(body) }; }).filter(keep);
const isEn = (l) => /^(en|english)\b/i.test(l ?? "");
const known = (t) => { const w = t.slice(0, 200000).toLowerCase().match(UNIT) ?? []; return w.length ? w.filter((x) => prior[x]).length / w.length : 0; };
const prof = (docs) => docs.map((d) => ({ d, r: profileDocument(d.text, m) })).filter((x) => x.r);

const docsA = load("21-anti-colonial", (d) => isEn(d.meta.language) && admitted(d.p).admit), docsB = load("20-first-person-voices", (d) => isEn(d.meta.language) && admitted(d.p).admit);
const docsN = load("01-literature-books", (d) => known(d.text) >= 0.5);
const docsG = [
  ...load("06-government-legal/world-legislation/uk", (d) => known(d.text) >= 0.5),
  ...load("06-government-legal/world-legislation/us", (d) => known(d.text) >= 0.5),
  ...load("02-encyclopedic/1911-britannica", (d) => /Law|Economics|Sociology|Philosophy/.test(d.p)),
];
const [PA, PB, PN, PG] = [docsA, docsB, docsN, docsG].map(prof);
const profs = (P) => P.map((x) => x.r.profile);
console.log(JSON.stringify({ documents: { anticolonial: PA.length, firstPerson: PB.length, neutralNovels: PN.length, genreControl: PG.length, genreControlFiles: PG.map((x) => x.d.p.split("/").slice(-2).join("/")).slice(0, 8) } }));

const c3 = permutationTest(profs(PA), profs(PG)), c4 = permutationTest(profs(PB), profs(PG));
const tvGN = tv(meanOf(profs(PG)), meanOf(profs(PN))), tvAN = tv(meanOf(profs(PA)), meanOf(profs(PN))), tvBN = tv(meanOf(profs(PB)), meanOf(profs(PN)));

function survival(PX, PGg, units, reps = 200, seed = 21) {
  const rnd = mulberry(seed), X = profs(PX), G = profs(PGg), wins = Object.fromEntries(units.map((u) => [u, 0]));
  const boot = (arr) => Array.from({ length: arr.length }, () => arr[Math.floor(rnd() * arr.length)]);
  for (let r = 0; r < reps; r++) { const mx = meanOf(boot(X)), mg = meanOf(boot(G)); for (const u of units) if (mx[u] > mg[u]) wins[u]++; }
  const mx = meanOf(X), mg = meanOf(G);
  return units.map((u) => ({ unit: u, shareX: +mx[u].toFixed(4), shareG: +mg[u].toFixed(4), ratio: mg[u] ? +(mx[u] / mg[u]).toFixed(2) : null, bootstrapWins: wins[u], survives: wins[u] >= 190 }));
}
const sA = survival(PA, PG, [4, 21, 13, 7, 8]), sB = survival(PB, PG, [4, 25, 16, 23, 27]);
const top = (PX) => { const mx = meanOf(profs(PX)), mg = meanOf(profs(PG)); return mx.map((x, u) => ({ unit: u, diff: +(x - mg[u]).toFixed(4), ratio: mg[u] ? +(x / mg[u]).toFixed(2) : null })).sort((a, b) => b.diff - a.diff).slice(0, 6).map((x) => `${x.unit === 0 ? "preamble" : "art " + x.unit} +${(x.diff * 100).toFixed(1)}pp (x${x.ratio})`).join(", "); };
const out = { C3_anticolonial_vs_genre: c3, C4_firstPerson_vs_genre: c4, tv: { genre_vs_novels: +tvGN.toFixed(4), anticolonial_vs_novels: +tvAN.toFixed(4), firstPerson_vs_novels: +tvBN.toFixed(4) }, survival: { anticolonial: sA, firstPerson: sB }, mostAboveGenre: { anticolonial: top(PA), firstPerson: top(PB) } };
console.log(JSON.stringify(out, null, 1));
import("node:fs").then((fs) => fs.writeFileSync(new URL("./ring1-genre-gated-report.json", import.meta.url), JSON.stringify(out, null, 1) + "\n"));
