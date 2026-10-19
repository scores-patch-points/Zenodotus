// Which UDHR editions have no POS prior, and does any OTHER priors folder on this machine hold one for them?
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { hearingFor } from "./read-beings.mjs";
const DIR = new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname;
const OTHERS = (process.env.OTHER_PRIOR_DIRS ?? "").split(":").filter(Boolean);   // other folders to look for POS priors in
const files = readdirSync(DIR).filter((f) => /^udhr-.+\.txt$/.test(f)).sort();
const miss = [];
for (const f of files) {
  const raw = readFileSync(DIR + f, "utf8"), stem = f.replace(/^udhr-|\.txt$/g, "");
  const head = raw.split("\n")[1] ?? "", code = (head.match(/\(([^()]*)\)\s*$/) ?? [])[1] ?? "", name = head.replace(/^Language:\s*/, "").replace(/\s*\([^()]*\)\s*$/, "");
  const h = await hearingFor(code, raw.slice(300, 900), stem);
  if (!h.gap) continue;
  const other = OTHERS.filter((d) => existsSync(d) && [stem, code, stem.replace(/_/g, "-")].some((c) => c && existsSync(`${d}pos-${c}.json`)));
  miss.push({ stem, code, name, other: other.length });
}
console.log(`unhearable editions: ${miss.length}; with a prior in another folder: ${miss.filter((m) => m.other).length}`);
console.log(miss.map((m) => `${m.stem}[${m.code}]=${m.name}${m.other ? "*" : ""}`).join("; "));
