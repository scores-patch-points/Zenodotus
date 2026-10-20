// udhr-core/sniff-udhr64.mjs — would the sniff have settled the 64 UDHR words the way Wiktionary did, and would the English reading differ?
//
// For each of the 64 English words the prior does not know, the sniff gets ONE real UDHR sentence (the live case) and votes; a vote is ACCEPTED only
// above the saved threshold. The reader's `settle` is then built three ways and the English edition is re-read under each:
//   none      no settlement (what the log holds today)
//   wikt      every word settled by its cached Wiktionary verdict (nominal iff any listed POS is nominal: lookup.mjs makeSettler)
//   sniff     only the ACCEPTED sniff votes settle; the rest stay needs
//
// PRE-REGISTERED before the first run (2026-10-19):
//   W1  Among accepted sniff votes, agreement with the Wiktionary verdict is at least 0.85.
//   W2  The English nearest-neighbour map under `sniff` equals the one under `wikt` (all 31 units identical).
//   W3  Reported, not claimed: how many of the 64 were accepted (lookups saved), and how many units differ between `none` and `wikt` (the effect to match).
//   Control  W2 is only meaningful if `wikt` differs from `none`; if it does not, W2 is reported as vacuous, not as a pass.
import { readFileSync } from "node:fs";
import { readAll } from "./build-mind-beings.mjs";
import { readUnits, isUnknownWord } from "./read-beings.mjs";
import { makeSettler } from "./lookup.mjs";
import { cache } from "./wiktionary-pilot.mjs";
import { sniff } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed";
const embed = async (texts) => { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts }) }); if (!r.ok) throw new Error(r.status); return (await r.json()).embeddings; };
const model = JSON.parse(readFileSync(new URL("./sniff-eng.json", import.meta.url), "utf8"));
const report = JSON.parse(readFileSync(new URL("./live-lookup-64-report.json", import.meta.url), "utf8"));
const { rows: every } = await readAll({ settle: () => null });
const row = every.find((r) => r.kind !== "projected-from-UDHR" && r.file === "udhr-eng.txt");
const P = row.hearing.posPrior, TOK = /\p{L}+(?:['’]\p{L}+)?/gu;
const sentenceOf = (w) => { for (const f of row.frames) for (const s of f.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+/)) if ((s.match(TOK) ?? []).some((t) => t.toLowerCase() === w)) return s; return null; };

const wikt = makeSettler(cache, "en"), votes = [];
for (const { word } of report.results) {
  const s = sentenceOf(word); if (!s || !isUnknownWord(P, word)) continue;
  votes.push({ ...(await sniff(model, P, word, s, embed)), wikt: wikt(word) });
}
const accepted = votes.filter((v) => v.accept), agree = accepted.filter((v) => v.cls === v.wikt);
const sniffMap = new Map(accepted.map((v) => [v.word, v.cls]));
const re = (settle) => readUnits(row.frames, row.hearing, { settle }).nn;
const nnNone = re(() => null), nnWikt = re(wikt), nnSniff = re((w) => sniffMap.get(w) ?? null);
const diff = (a, b) => a.filter((v, u) => v !== b[u]).length;
const out = {
  words: votes.length,
  W1_acceptedAgreement: { accepted: accepted.length, agree: agree.length, rate: accepted.length ? +(agree.length / accepted.length).toFixed(3) : null, minimum: 0.85, holds: accepted.length > 0 && agree.length / accepted.length >= 0.85 },
  W2_sameReading: { unitsDifferingSniffVsWikt: diff(nnSniff, nnWikt), vacuous: diff(nnNone, nnWikt) === 0, holds: diff(nnNone, nnWikt) > 0 && diff(nnSniff, nnWikt) === 0 },
  W3: { acceptedOf64: `${accepted.length}/${votes.length}`, unitsDifferingNoneVsWikt: diff(nnNone, nnWikt), unitsDifferingNoneVsSniff: diff(nnNone, nnSniff) },
  disagreements: accepted.filter((v) => v.cls !== v.wikt).map((v) => `${v.word}: sniff ${v.cls} (${v.score}), wiktionary ${v.wikt}`),
  notAccepted: votes.filter((v) => !v.accept).length,
};
console.log(JSON.stringify(out, null, 1));
