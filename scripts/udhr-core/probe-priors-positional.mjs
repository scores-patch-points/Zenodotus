import { loadOrgans } from "../eot-digest.mjs";
import { readFileSync } from "node:fs";
const K = new URL("../../../khora/native/", import.meta.url).pathname, PR = new URL("../../../janus/priors/", import.meta.url).pathname;
const o = await loadOrgans();
const { extractPositionalRelation } = await import(K + "adapters/text/relations-positional.js");
const wc = await import(K + "adapters/text/wordclass.js");
const { RELATION_PRIORS_BY_LANG } = await import(K + "adapters/text/relation-priors-i18n.js");
const J = (f) => { try { return JSON.parse(readFileSync(PR + f, "utf8")); } catch { return null; } };
for (const [iso, code, rc, file, procl] of [["arb", "ar", "role-config-arb.json", "udhr-arb.txt", "proclitics-arb.json"], ["cmn", "zh", "role-config-cmn-hans.json", "udhr-cmn_hans.txt", null], ["spa", "es", "role-config-spa.json", "udhr-spa.txt", null]]) {
  const roleConfig = J(rc), posPrior = o.posGateFor(code)?.posPrior, pri = RELATION_PRIORS_BY_LANG[iso] ?? {};
  const proclitics = procl ? J(procl) : null;
  const body = readFileSync(new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname + file, "utf8").split("\n").slice(4).join("\n");
  const sents = o.spans.splitSentences(body);
  let ok = 0, refused = 0, err = 0; const shown = [];
  for (const s of sents) {
    try {
      const r = extractPositionalRelation(s.text, { roleConfig, posPrior, classifyWord: wc.classifyWord, dominantClass: wc.dominantClass, proclitics, subjectPronouns: pri.subjectPronouns ?? null, auxiliaryVerbs: pri.auxiliaryVerbs ?? null });
      if (r && r.end1 && r.end2) { ok++; if (shown.length < 3) shown.push({ e1: r.end1, l: r.label, e2: r.end2 }); } else refused++;
    } catch (e) { err++; if (err === 1) shown.push("ERR " + e.message.slice(0, 120)); }
  }
  console.log(iso, "sentences", sents.length, "relations", ok, "refused/none", refused, "errors", err, "| proclitics", !!proclitics, "roleConfig", !!roleConfig, "pos", !!posPrior);
  for (const x of shown) console.log("   ", JSON.stringify(x).slice(0, 200));
}
