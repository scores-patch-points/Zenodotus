// Every word the live run looked up: is it unknown to its language's POS prior? (A lookup for a known word would be a bug.)
import { readFileSync } from "node:fs";
import { findPosPrior, isUnknownWord } from "./read-beings.mjs";
const CODE = { eng: "en", spa: "es", arb: "ar", cmn_hans: "zh", swh: "sw" };
const lines = readFileSync(new URL("./_live.log", import.meta.url), "utf8").split("\n").filter((l) => l.startsWith('{"stem"')).map((l) => JSON.parse(l));
const priors = {};
for (const s of Object.keys(CODE)) priors[s] = (await findPosPrior(CODE[s], s)).prior;
const known = lines.filter((l) => !isUnknownWord(priors[l.stem], l.word));
const inForms = lines.filter((l) => priors[l.stem].forms[l.word]).length;
console.log(JSON.stringify({ lookups: lines.length, knownToThePrior: known.length, absentFromPriorForms: lines.length - inForms, knownList: known.map((l) => `${l.stem}:${l.word}`) }));
