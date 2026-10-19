import { loadOrgans } from "../eot-digest.mjs";
import { readFileSync } from "node:fs";
const K = new URL("../../../khora/native/", import.meta.url).pathname;
const o = await loadOrgans();
const { makeRelationReader } = await import(K + "organs/hypergraph.js");
const { relationPriorOptionsFor, RELATION_PRIORS_BY_LANG } = await import(K + "adapters/text/relation-priors-i18n.js");
const CASES = [["arb", "ar", "udhr-arb.txt"], ["cmn", "zh", "udhr-cmn_hans.txt"], ["spa", "es", "udhr-spa.txt"], ["eng", "en", "udhr-eng.txt"]];
for (const [iso, code, file] of CASES) {
  const pri = relationPriorOptionsFor(iso), P = RELATION_PRIORS_BY_LANG[iso];
  const posO = o.posGateFor(code)?.posPrior ?? null;
  const dets = P ? new Set([...(P.definiteDeterminers ?? []), ...(P.indefiniteDeterminers ?? [])]) : new Set([...o.priors.DEFINITE_DETERMINERS, ...o.priors.INDEFINITE_DETERMINERS]);
  const reader = makeRelationReader({
    ...(o.morphologyFor(code) ?? {}),
    splitSentences: o.spans.splitSentences, extractSurfaces: o.surfaces.extractSurfaces, discoverReferents: o.surfaces.discoverReferents,
    namesCorefer: o.surfaces.namesCorefer, diaNorm: o.surfaces.diaNorm,
    discoverRelationVocab: (a, opts = {}) => o.relations.discoverRelationVocab(a, { ...opts, ...(pri ?? {}) }),
    extractRelations: (t, opts = {}) => o.relations.extractRelations(t, { ...opts, ...(pri ?? {}) }),
    tokenize: o.material.tokenize, determiners: dets, negationWords: P?.negationWords ?? o.priors.NEGATION_WORDS,
    posPriorFor: posO ? () => posO : null,
  });
  const raw = readFileSync(new URL("../../06-government-legal/un-udhr/", import.meta.url).pathname + file, "utf8"), body = raw.split("\n").slice(4).join("\n");
  const p = { ref: file, text: body };
  let r; try { r = reader([p], { pool: [p] }); } catch (e) { r = { error: e.message, edges: [] }; }
  console.log(iso, "priors", pri ? "i18n" : "default", "edges", (r.edges ?? []).length, r.error ? "ERR " + r.error : "");
  for (const e of (r.edges ?? []).slice(0, 3)) console.log("   ", JSON.stringify({ e1: e.end1, l: e.label, e2: e.end2, sp: (e.spans ?? []).map((s) => [s.start, s.end]) }).slice(0, 190));
}
