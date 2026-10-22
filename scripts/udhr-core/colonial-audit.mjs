// udhr-core/colonial-audit.mjs — the evidence that the "colonized peoples" perspective label on 21-anti-colonial is the FOLDER's, not each document's. Objective facts only (counts, distinct values, titles and authors,
// distinctive nouns from perspective-profiles-report.json); the reader's indicative estimate is included but marked unverified. Writes colonial-studies-audit.json; its hash is the `source` of the revision records.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { walk, frontmatter, ROOT } from "./ring1.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex"), isEn = (l) => /^(en|english)\b/i.test(l ?? ""), rd = (p) => readFileSync(p, "utf8");
const files = walk(join(ROOT, "21-anti-colonial")).sort(), vals = new Map(), folders = {}, india = [];
for (const p of files) { const { meta, body } = frontmatter(rd(p)); const sub = p.slice(join(ROOT, "21-anti-colonial").length + 1).split("/")[0]; folders[sub] = (folders[sub] ?? 0) + 1; if (meta.perspective) vals.set(meta.perspective, (vals.get(meta.perspective) ?? 0) + 1);
  if (isEn(meta.language) && /^india/i.test(meta.region ?? "")) { const t = body.slice(0, 120000).toLowerCase(), n = (t.match(/\b(regiment|cavalry|detachment|verandah|mutiny)\b/g) ?? []).length; india.push({ militaryWords: n, title: String(meta.title ?? "").slice(0, 70), author: String(meta.author_catalog ?? meta.author ?? "?").slice(0, 40) }); } }
india.sort((a, b) => b.militaryWords - a.militaryWords || (a.title < b.title ? -1 : 1));
const prof = JSON.parse(rd(new URL("./perspective-profiles-report.json", import.meta.url))).out, top = (g) => prof[g].top20.slice(0, 10).map((s) => s.split(" (")[0]);
const sheet = readFileSync(new URL("./gold/colonial-studies-audit-sample.md", import.meta.url));
const out = { schema: "ColonialAudit@1", date: "2026-10-20",
  finding: "The perspective label 'colonized peoples' is identical on every labelled file of 21-anti-colonial: it is a collection label, not evidence about a document.",
  facts: { filesIn21: files.length, filesWithPerspective: [...vals.values()].reduce((a, b) => a + b, 0), distinctPerspectiveValues: vals.size, values: Object.fromEntries(vals), filesPerSubfolder: folders },
  indiaGroup: { documents: india.length, usingMilitaryVocabularyAtLeast5Times: india.filter((x) => x.militaryWords >= 5).length, mostMilitary: india.slice(0, 12) },
  regionGroupsOwnMostDistinctiveNouns: { "anticolonial-global": top("anticolonial-global"), "anticolonial-africa": top("anticolonial-africa"), "anticolonial-india": top("anticolonial-india"), "anticolonial-caribbean": top("anticolonial-caribbean") },
  labellingSheet: { path: "gold/colonial-studies-audit-sample.md", sha256: sha(sheet), documents: 60, status: "UNLABELLED: awaiting a second reader" },
  readerEstimate_UNVERIFIED: "from titles and authors of the 60 sampled documents, by the model that wrote this file: about one in six colonized, enslaved or abolitionist voices; about a third imperial or settler side; the rest neither (treatises, histories, science fiction). Replace with the sheet's marks." };
writeFileSync(new URL("./colonial-studies-audit.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ filesIn21: out.facts.filesIn21, withPerspective: out.facts.filesWithPerspective, distinctValues: out.facts.distinctPerspectiveValues, subfolders: out.facts.filesPerSubfolder, india: [out.indiaGroup.documents, out.indiaGroup.usingMilitaryVocabularyAtLeast5Times], sha: sha(readFileSync(new URL("./colonial-studies-audit.json", import.meta.url))).slice(0, 20) }));
