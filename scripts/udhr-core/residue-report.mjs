// Print the residue with enough context to decide: the paragraph, and the text of each candidate span.
import { readFileSync, writeFileSync } from "node:fs";
const C = new URL("../../06-government-legal/un-udhr/", import.meta.url);
const residue = JSON.parse(readFileSync(new URL("gold/residue.json", import.meta.url), "utf8"));
const rowsOf = (c) => readFileSync(new URL(`gold/udhr-${c}.spans.jsonl`, import.meta.url), "utf8").trim().split("\n").map(JSON.parse);
const cache = {}; const out = [];
residue.forEach((x, n) => {
  const rows = (cache[x.edition] ??= rowsOf(x.edition)), r = rows.find((y) => y.id === x.id);
  const buf = readFileSync(new URL(`udhr-${x.edition}.txt`, C));
  const para = buf.subarray(r.window[0], r.window[1]).toString("utf8").replace(/\s+/g, " ").trim();
  const cands = x.candidates.map((rs, i) => `${i + 1}. «${rs.map(([s, e]) => buf.subarray(s, e).toString("utf8")).join(" … ")}» [${rs[0][0]},${rs.at(-1)[1]}]`);
  out.push(`### ${n + 1}. ${x.edition} · ${x.prop} (${x.ground}) · ${x.slot} · ${x.status}\ngold surface: «${x.surface}»${r.subjectBasis === "resolved" && x.slot === "subject" ? " (subjectBasis: resolved)" : ""}\nparagraph: ${para}\n${cands.length ? "candidates:\n" + cands.join("\n") : "candidates: none found"}\n`);
});
writeFileSync(new URL("gold/RESIDUE.md", import.meta.url), "# Residue: slots a person must decide\n\n" + out.join("\n"));
console.log(out.join("\n"));
