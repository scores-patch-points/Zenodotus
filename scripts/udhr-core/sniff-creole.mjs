// udhr-core/sniff-creole.mjs — does the English sniff carry over to English-lexified CREOLES, with no retraining?
//
// Data (in the repo, Zenodotus/11-multi-language/dialects-pidgins-creoles/creoleval): Naija Pidgin UD (pcm_nsc, spoken, three SAMPLE files) and the Singlish
// STB-ACL gold-POS treebank (written, three files). The English models are applied FROZEN: Sniff@2 (sniff-eng2.json) and Sniff@1 (sniff-eng.json) for the
// no-context comparison. Occurrences are built exactly as for the English treebank: lower-case alphabetic words of >= 3 letters, nominal = NOUN, PROPN versus
// other = VERB ADJ ADV AUX NUM PRON ADP DET CCONJ PART SCONJ (PUNCT, X, SYM, INTJ dropped), sentences of 6 to 40 tokens, at most 3 occurrences per word.
// Each file is used whole as a TEST set: nothing here is trained on creole text.
//
// PRE-REGISTERED before the first run (2026-10-20), for each creole separately:
//   K1  frozen Sniff@2 accuracy exceeds the MAXIMUM over 200 label shuffles.
//   K2  calibration: top-third accuracy minus bottom-third exceeds the MAXIMUM over 200 margin shuffles.
//   K3  reported, not claimed: accuracy of Sniff@2, Sniff@1, delta alone, spelling alone; per-class recall; the drop from the English held-out 86.7%.
//   K4  accepted accuracy at the ENGLISH threshold (0.518) is at least 0.85; coverage reported.
//   K5  reported: the 15 most frequent words among the errors (creole function words, "na", "dey", "wey", "lah", "kena", would show here).
//   Cautions fixed in advance: the Naija sample is small and nominal-poor (143 nominals in 1,418 test tokens), so K1/K2 there have little power and a pass
//   is weak evidence; Singlish includes proper-noun-heavy news text. The creole's own UDHR editions (bis, crs, hat, kri, pap, pcm) have no treebank here.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { score, score2, suffixLogOdds, deltaMargin, ctxLogOdds, neighbours, deltaOf, norm } from "./sniff.mjs";

const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___", WORD = /^[a-z]{3,}$/;
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const m2 = JSON.parse(readFileSync(new URL("./sniff-eng2.json", import.meta.url), "utf8")), m1 = JSON.parse(readFileSync(new URL("./sniff-eng.json", import.meta.url), "utf8"));
const DIR = new URL("../Zenodotus/11-multi-language/dialects-pidgins-creoles/creoleval/", import.meta.url).pathname;
const SETS = { naija: ["pos_ud_naija_pcm", /\.conllu$/], singlish: ["pos_singlish", /\.conll$/] };

function occurrences(dir, re) {
  const sentences = []; let cur = null;
  for (const f of readdirSync(DIR + dir).filter((x) => re.test(x)).sort()) {
    for (const line of readFileSync(DIR + dir + "/" + f, "utf8").split("\n")) {
      if (!line.trim()) { if (cur?.length) sentences.push(cur); cur = null; continue; }
      if (line.startsWith("#")) continue; cur ??= [];
      const c = line.split("\t"); if (/^\d+$/.test(c[0])) cur.push({ form: c[1], upos: c[3] });
    }
    if (cur?.length) sentences.push(cur); cur = null;
  }
  const byWord = new Map();
  for (const s of sentences) {
    if (s.length < 6 || s.length > 40) continue;
    const forms = s.map((t) => t.form);
    s.forEach((t, idx) => {
      if (!WORD.test(t.form)) return;
      const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return;
      const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form, sentence: forms.join(" ") }); byWord.set(t.form, k); }
    });
  }
  return { sentences: sentences.length, occ: [...byWord.values()].flat() };
}
const results = {};
for (const [name, [dir, re]] of Object.entries(SETS)) {
  const { sentences, occ } = occurrences(dir, re), rnd = mulberry(5);
  const A = (await embed(occ.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(occ.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm);
  const rows = occ.map((u, i) => {
    const d = norm(A[i].map((v, j) => v - B[i][j])), nb = { prev: (u.forms[u.idx - 1] ?? "<s>").toLowerCase(), next: (u.forms[u.idx + 1] ?? "</s>").toLowerCase() };
    const s2 = score2(m2, d, u.word, nb.prev, nb.next), s1 = score(m1, d, u.word), dm = deltaMargin(d, m2.centroids), sp = suffixLogOdds(m2.suffix, u.word);
    return { word: u.word, truth: u.truth, V2: s2 >= 0 ? "nominal" : "other", V1: s1 >= 0 ? "nominal" : "other", D: dm >= 0 ? "nominal" : "other", S: sp >= 0 ? "nominal" : "other", cs: Math.abs(s2) };
  });
  const acc = (xs, k) => xs.filter((x) => x.truth === x[k]).length / xs.length;
  const nulls = Array.from({ length: 200 }, () => { const lab = shuffle(rows.map((x) => x.truth), rnd); return rows.filter((x, i) => x.V2 === lab[i]).length / rows.length; });
  const byS = [...rows].sort((a, b) => a.cs - b.cs), third = Math.floor(rows.length / 3), gap = (xs) => acc(xs.slice(-third), "V2") - acc(xs.slice(0, third), "V2");
  const gnulls = Array.from({ length: 200 }, () => { const sc = shuffle(rows.map((x) => x.cs), rnd); return gap(rows.map((x, i) => ({ ...x, cs: sc[i] })).sort((a, b) => a.cs - b.cs)); });
  const above = rows.filter((x) => x.cs >= m2.threshold), recall = (c) => { const xs = rows.filter((x) => x.truth === c); return xs.length ? +(xs.filter((x) => x.V2 === c).length / xs.length).toFixed(3) : null; };
  const errs = {}; for (const x of rows) if (x.V2 !== x.truth) errs[x.word] = (errs[x.word] ?? 0) + 1;
  results[name] = {
    sentences, occurrences: rows.length, nominal: rows.filter((x) => x.truth === "nominal").length,
    K1: { accuracy: +acc(rows, "V2").toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), holds: acc(rows, "V2") > Math.max(...nulls) },
    K2: { top: +acc(byS.slice(-third), "V2").toFixed(3), bottom: +acc(byS.slice(0, third), "V2").toFixed(3), gap: +gap(byS).toFixed(3), nullMax: +Math.max(...gnulls).toFixed(3), holds: gap(byS) > Math.max(...gnulls) },
    K3: { sniff2: +acc(rows, "V2").toFixed(3), sniff1: +acc(rows, "V1").toFixed(3), deltaOnly: +acc(rows, "D").toFixed(3), spellingOnly: +acc(rows, "S").toFixed(3), recallNominal: recall("nominal"), recallOther: recall("other"), dropFromEnglishHeldOut: +(0.867 - acc(rows, "V2")).toFixed(3) },
    K4: { threshold: m2.threshold, acceptedAccuracy: above.length ? +acc(above, "V2").toFixed(3) : null, coverage: +(above.length / rows.length).toFixed(3), holds: above.length > 0 && acc(above, "V2") >= 0.85 },
    K5_topErrorWords: Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w, n]) => `${w}:${n}`).join(" "),
  };
}
console.log(JSON.stringify(results, null, 1)); writeFileSync(new URL("./sniff-creole-report.json", import.meta.url), JSON.stringify(results, null, 1) + "\n");
