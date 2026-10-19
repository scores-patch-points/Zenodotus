// How many languages have we actually read, at each grain? Distinct header language codes, not editions.
import { readFileSync, readdirSync } from "node:fs";
import { findPosPrior, priorKind } from "./read-beings.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname;
const log = JSON.parse(readFileSync(new URL("./udhr-core.eot.json", import.meta.url).pathname, "utf8"));
const segmented = new Set(log.sources.map((s) => s.locator.split("/").pop()));
const rows = [];
for (const f of readdirSync(DIR).filter((x) => /^udhr-.+\.txt$/.test(x)).sort()) {
  const raw = readFileSync(DIR + f, "utf8"), stem = f.replace(/^udhr-|\.txt$/g, "");
  const head = raw.split("\n")[1] ?? "", code = (head.match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "", name = head.replace(/^Language:\s*/, "").replace(/\s*\([^()]*\)\s*$/, "");
  const prior = await findPosPrior(code, stem);
  rows.push({ f, stem, code, name, base: code.split(/[-_]/)[0], prior: prior ? priorKind(prior.prior) : null });
}
const distinct = (rs, key) => new Set(rs.map((r) => r[key])).size;
const seg = rows.filter((r) => segmented.has(r.f));
const withPrior = seg.filter((r) => r.prior), indep = withPrior.filter((r) => r.prior !== "projected-from-UDHR");
console.log(JSON.stringify({
  editions: rows.length,
  paragraphStructure: { editions: seg.length, headerCodes: distinct(seg, "code"), baseLanguages: distinct(seg.filter((r) => r.code !== "und"), "base"), undeterminedCodeEditions: seg.filter((r) => r.code === "und").length },
  withAnyPosPrior: { editions: withPrior.length, headerCodes: distinct(withPrior, "code") },
  withIndependentPosPrior: { editions: indep.length, headerCodes: distinct(indep, "code") },
  noPrior: { editions: seg.length - withPrior.length, headerCodes: distinct(seg.filter((r) => !r.prior), "code") },
}, null, 1));
