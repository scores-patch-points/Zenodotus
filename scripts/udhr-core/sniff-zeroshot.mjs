// udhr-core/sniff-zeroshot.mjs — a FROZEN sniff applied, with no retraining, to another language's treebank. Usage:
//   node sniff-zeroshot.mjs <name> <treebank.conllu>... -- <model.json>...
// Occurrences are built as for every other treebank test (lower-case alphabetic words of >= 3 letters, NOUN/PROPN against VERB ADJ ADV AUX NUM PRON ADP DET CCONJ
// PART SCONJ, sentences of 6 to 40 tokens, at most 3 occurrences per word). Each treebank file is a TEST set; nothing is trained on it.
//
// PRE-REGISTERED before the first run (2026-10-20), for Haitian Creole (French-lexified; UD Adolphe test and UD Autogramm test) with the frozen English,
// Spanish and Portuguese Sniff@2 models, for each model x test set:
//   Z1  accuracy exceeds the MAXIMUM over 200 label shuffles.
//   Z2  calibration: top-third accuracy minus bottom-third exceeds the MAXIMUM over 200 margin shuffles.
//   Z3  reported, not claimed: accuracy, per-class recall, accepted accuracy at the model's own threshold with coverage, and which source language does best
//       (the lexifier is French, which we hold no sniff for; Spanish and Portuguese are its Romance relatives, English is the language the creole sits beside).
//   Z4  the creole's OWN sniff (build-sniff2.mjs on the Adolphe training file) is reported beside them: the question being how far zero-shot transfer is from
//       a model with 55,000 tokens of the language's own labelled text.
import { readFileSync, writeFileSync } from "node:fs";
import { shuffle, mulberry } from "./ring1.mjs";
import { score2, deltaMargin, norm } from "./sniff.mjs";
const args = process.argv.slice(2), sep = args.indexOf("--"), name = args[0], files = args.slice(1, sep), models = args.slice(sep + 1);
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434") + "/api/embed", MASK = "___", WORD = /^\p{Ll}{3,}$/u;
const NOM = new Set(["NOUN", "PROPN"]), OTHER = new Set(["VERB", "ADJ", "ADV", "AUX", "NUM", "PRON", "ADP", "DET", "CCONJ", "PART", "SCONJ"]);
const embed = async (texts) => { const out = []; for (let i = 0; i < texts.length; i += 32) { for (let a = 0; ; a++) { try { const r = await fetch(OLLAMA, { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 32) }) }); if (!r.ok) throw new Error(r.status); out.push(...(await r.json()).embeddings); break; } catch (e) { if (a >= 4) throw e; await new Promise((r) => setTimeout(r, 5000)); } } } return out; };
const out = {};
for (const file of files) {
  const sentences = []; let cur = null;
  for (const line of readFileSync(new URL(file, import.meta.url), "utf8").split("\n")) { if (!line.trim()) { if (cur?.length) sentences.push(cur); cur = null; continue; } if (line.startsWith("#")) continue; cur ??= []; const c = line.split("\t"); if (/^\d+$/.test(c[0])) cur.push({ form: c[1], upos: c[3] }); }
  const byWord = new Map();
  for (const s of sentences) { if (s.length < 6 || s.length > 40) continue; const forms = s.map((t) => t.form); s.forEach((t, idx) => { if (!WORD.test(t.form)) return; const truth = NOM.has(t.upos) ? "nominal" : OTHER.has(t.upos) ? "other" : null; if (!truth) return; const k = byWord.get(t.form) ?? []; if (k.length < 3) { k.push({ forms, idx, truth, word: t.form, prev: (forms[idx - 1] ?? "<s>").toLowerCase(), next: (forms[idx + 1] ?? "</s>").toLowerCase() }); byWord.set(t.form, k); } }); }
  const occ = [...byWord.values()].flat();
  const A = (await embed(occ.map((u) => u.forms.join(" ")))).map(norm), B = (await embed(occ.map((u) => u.forms.slice(0, u.idx).concat(MASK, u.forms.slice(u.idx + 1)).join(" ")))).map(norm);
  const D = occ.map((u, i) => norm(A[i].map((v, j) => v - B[i][j])));
  out[file] = { sentences: sentences.length, occurrences: occ.length, nominalShare: +(occ.filter((u) => u.truth === "nominal").length / occ.length).toFixed(3) };
  for (const mf of models) {
    const M = JSON.parse(readFileSync(new URL(`./${mf}`, import.meta.url), "utf8")), rnd = mulberry(5);
    const rows = occ.map((u, i) => { const s = score2(M, D[i], u.word, u.prev, u.next); return { truth: u.truth, cls: s >= 0 ? "nominal" : "other", cs: Math.abs(s) }; });
    const acc = (xs) => xs.filter((x) => x.cls === x.truth).length / xs.length, nulls = Array.from({ length: 200 }, () => { const lab = shuffle(rows.map((x) => x.truth), rnd); return rows.filter((x, i) => x.cls === lab[i]).length / rows.length; });
    const byS = [...rows].sort((a, b) => a.cs - b.cs), third = Math.floor(rows.length / 3), gap = (xs) => acc(xs.slice(-third)) - acc(xs.slice(0, third));
    const gn = Array.from({ length: 200 }, () => { const sc = shuffle(rows.map((x) => x.cs), rnd); return gap(rows.map((x, i) => ({ ...x, cs: sc[i] })).sort((a, b) => a.cs - b.cs)); });
    const above = M.threshold == null ? [] : rows.filter((x) => x.cs >= M.threshold), rec = (c) => { const xs = rows.filter((x) => x.truth === c); return +(xs.filter((x) => x.cls === c).length / xs.length).toFixed(3); };
    out[file][mf] = { Z1: { accuracy: +acc(rows).toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), holds: acc(rows) > Math.max(...nulls) }, Z2: { top: +acc(byS.slice(-third)).toFixed(3), bottom: +acc(byS.slice(0, third)).toFixed(3), gap: +gap(byS).toFixed(3), nullMax: +Math.max(...gn).toFixed(3), holds: gap(byS) > Math.max(...gn) }, Z3: { recallNominal: rec("nominal"), recallOther: rec("other"), acceptedAccuracy: above.length ? +acc(above).toFixed(3) : null, coverage: +(above.length / rows.length).toFixed(3) } };
  }
}
console.log(JSON.stringify(out, null, 1)); writeFileSync(new URL(`./sniff-zeroshot-${name}-report.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
