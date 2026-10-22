// Where did each POS prior used for the beings reading come from? A prior projected from English through the UDHR's own parallel
// translation is not independent evidence about that language: the "beings" it hears are English-derived for that edition.
import { readFileSync, readdirSync } from "node:fs";
import { findPosPrior } from "./read-beings.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname;
const kind = (p) => {
  const g = String(p?.provenance?.giver ?? p?.giver ?? ""), src = String(p?.provenance?.source ?? "");
  if (/projected from the UDHR/i.test(g)) return "projected-from-UDHR";
  if (/treebank|universal dependencies|UD_/i.test(g + src)) return "UD-treebank";
  if (/unimorph/i.test(g + src)) return "UniMorph";
  if (/wiktionary|kaikki/i.test(g + src)) return "Wiktionary";
  return `other: ${(g || src).slice(0, 50)}`;
};
const byKind = new Map(), editions = { total: 0 }, perEdition = [];
for (const f of readdirSync(DIR).filter((x) => /^udhr-.+\.txt$/.test(x)).sort()) {
  const raw = readFileSync(DIR + f, "utf8"), stem = f.replace(/^udhr-|\.txt$/g, "");
  const code = ((raw.split("\n")[1] ?? "").match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "";
  const r = await findPosPrior(code, stem);
  if (!r) continue;
  const k = kind(r.prior);
  editions.total++; byKind.set(k, (byKind.get(k) ?? 0) + 1);
  perEdition.push({ stem, prior: r.name, kind: k });
}
console.log(JSON.stringify({ editionsWithAPrior: editions.total, byKind: Object.fromEntries([...byKind].sort((a, b) => b[1] - a[1])) }, null, 1));
