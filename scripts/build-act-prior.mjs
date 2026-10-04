#!/usr/bin/env node
// build-act-prior.mjs — transform VerbNet 3 (NLTK data mirror, verbnet3.zip:
// 325 class XML files, Levin-numbered) into ActPrior@1: every member verb
// FORM mapped to which of the NINE ACTS (the engine's own operators, cube.js)
// its VerbNet class's semantics perform — DR1 of live_priors/goldens/reading/
// DERIVED-RULES.md, built the same one-fetch-one-script way the legacy engine.1's
// build-pos-prior.mjs already proved for POS.
//
// MOVED HERE FROM the-fold (2026-08-29) — this is a received-lexicon build
// (fetch once, transform once, commit the DATA), the same kind as this
// repo's own scripts/fetch-*.mjs, not app logic; the-fold's `eval/fixtures/`
// had accumulated multiple megabytes of exactly this kind of content
// (UniMorph tables, this file's own 704KB output) with no the-fold-specific
// meaning in any of it. The CONSUMING CODE (phasepost.js) moved the other
// way, to eoreader7's `native/adapters/text/` — a repo split by KIND (code
// vs. received content), not by convenience.
//
// THE MAPPING IS A DECLARED TRANSLATION, NOT A DISCOVERY — THRAX_MAP's own
// precedent (the legacy engine.1 wordclass.js: UD tags → Thrax's eight, every entry
// naming where the schemes agree and where they do not). Here: Levin/VerbNet
// class semantics → RULE.md Part II's mode×domain question ("what does the
// act do to its object, and where does it operate"). Each row carries a
// one-line because; a family whose classes straddle acts gets exact-class
// rows; a class whose reading is genuinely arguable carries `alt` — P56's
// asymmetric discipline (refusable, never confirmable) applied to acts.
//
// GRAIN IS DELIBERATELY ABSENT. RULE.md's own framing: the grain is
// occurrence-level — what THIS transformation lands on — read from the
// clause, never from the verb's type. ActPrior@1 answers the TYPE question
// (which act); phasepost.js's grainOf answers the occurrence question.
//
// AMBIGUITY IS KEPT, NEVER COLLAPSED (POSPrior@1's own discipline): a form
// in classes mapping to different acts lands `contested` with every act and
// its classes listed; phasepost.js treats that as a candidate set.
//
// Usage: node scripts/build-act-prior.mjs <path-to-extracted-verbnet3-dir>
// Writes derived-priors/act-priors/act-prior-en.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VN_DIR = process.argv[2];
if (!VN_DIR || !fs.existsSync(VN_DIR)) {
  console.error("usage: node eval/build-act-prior.mjs <verbnet3-dir>");
  process.exit(1);
}

// ── the declared table ──────────────────────────────────────────────────
// Keyed by exact class id first, then by family prefix (the Levin top
// number, longest match wins: "26.6" before "26"). op ∈ the engine's nine;
// alt discloses a genuinely arguable second reading.
const ACT = [
  // ── Existence · Differentiate = NUL (absence, ceasing, asking-open) ──
  ["42", { op: "NUL", because: "murder/poison/die — causing or undergoing the cessation of a being" }],
  ["44", { op: "NUL", because: "destroy — the thing ceases to exist (break-45.1, where it persists damaged, is SEG)" }],
  ["48.2", { op: "NUL", because: "disappearance — presence ends" }],
  ["52", { op: "NUL", because: "avoid — keeping absent from contact or relation" }],
  ["106", { op: "NUL", because: "void/invalidate — making null" }],
  ["69", { op: "NUL", because: "refrain — withholding one's own act" }],
  ["75.1", { op: "NUL", because: "neglect — absence of due attention" }],
  ["16", { op: "NUL", alt: "SIG", because: "concealment — making absent from perception; alt SIG as negated showing" }],
  ["39", { op: "NUL", alt: "CON", because: "eat/devour/dine — consumption makes the object absent; alt CON as incorporation. LOW CONFIDENCE, flagged" }],
  ["66", { op: "NUL", alt: "CON", because: "consume — as 39" }],
  ["55.4", { op: "NUL", because: "stop — an activity ceases" }],
  ["64.1", { op: "NUL", alt: "DEF", because: "allow — clearing space for another's act (the engine's own Clearing stance is Differentiate·Ground); alt DEF as a bound granted" }],
  ["64.2", { op: "NUL", alt: "DEF", because: "let — as allow" }],
  ["64.3", { op: "NUL", alt: "DEF", because: "admit(entry) — letting in, a clearing" }],
  ["105.2.2", { op: "NUL", because: "disfunction — working-ness absent" }],
  ["37.1.2", { op: "NUL", because: "inquire — asking opens a void to be filled (grid.js's own vocabulary: NUL asks)" }],
  ["37.1.3", { op: "NUL", because: "interrogate — as inquire" }],

  // ── Existence · Relate = SIG (presence-in-relation: perception, appearance, signs, motion, speech) ──
  ["30", { op: "SIG", because: "see/sight/peer/encounter — perception is presence held in relation to a perceiver" }],
  ["43", { op: "SIG", because: "light/sound/smell/substance emission — emitting signs of presence" }],
  ["38", { op: "SIG", because: "animal sounds — sign emission" }],
  ["40", { op: "SIG", because: "bodily processes and gestures (wink, breathe, flinch, hurt) — states and signs showing in a body" }],
  ["47", { op: "SIG", because: "exist/modes of being/swarm/meander — presence itself, and presence-in-configuration" }],
  ["48.1.1", { op: "SIG", because: "appear — coming into view (presence-to-a-perceiver, not birth: INS is 28/26.4)" }],
  ["48.1.2", { op: "SIG", because: "reflexive appearance — as 48.1.1" }],
  ["48.3", { op: "SIG", because: "occur — an event presents itself" }],
  ["109", { op: "SIG", because: "seem — appearing-as (become-109.1 is INS, exact row)" }],
  ["11", { op: "SIG", because: "send/carry/bring — caused translocation: presence moved (A5)" }],
  ["17", { op: "SIG", because: "throw/pelt — sending through space (A5)" }],
  ["49", { op: "SIG", because: "body motion in place — presence in motion" }],
  ["51", { op: "SIG", because: "escape/leave/run/roll/vehicle/chase — translocation (A5); leave's departure reading alt SEG carried on the class" }],
  ["53", { op: "SIG", because: "linger/rush — manner of moving/staying (A5)" }],
  ["35", { op: "SIG", because: "hunt/search/stalk/rummage — scouting (grid.js's own vocabulary: SIG scouts)" }],
  ["37", { op: "SIG", because: "say/tell/talk/lecture/complain — speech emits signs (the golden's own Rabbit-said precedent); exceptions carried as exact rows" }],
  ["46", { op: "SIG", because: "lodge — dwelling as located presence" }],
  ["56", { op: "SIG", because: "weekend/holiday — located presence in a time" }],
  ["57", { op: "SIG", because: "weather verbs — conditions presenting" }],
  ["78", { op: "SIG", because: "indicate — pointing, the sign act itself" }],
  ["87.1", { op: "SIG", because: "focus — directing attention (presence-to-attention)" }],
  ["104", { op: "SIG", because: "spend time — presence through a duration" }],
  ["110.1", { op: "SIG", because: "representation — standing-for" }],
  ["113", { op: "SIG", because: "respond — answering sign" }],
  ["114", { op: "SIG", because: "act/behave — conducting one's presence as" }],
  ["54.1", { op: "SIG", because: "register (the gauge read 90) — indicating" }],
  ["107.4", { op: "SIG", because: "attend — presence at" }],
  ["84", { op: "SIG", alt: "EVA", because: "discover — something comes into view; alt EVA as the finding-out" }],
  ["29.6", { op: "SIG", because: "masquerade — presence under a guise" }],
  ["29.8", { op: "SIG", because: "captain (serve as) — standing-as a role" }],
  ["105.2.1", { op: "SIG", alt: "SYN", because: "function — operating-as; alt SYN as the working of a made whole" }],

  // ── Existence · Generate = INS (coming into being) ──
  ["28", { op: "INS", because: "birth/calve — beings come into being" }],
  ["27", { op: "INS", because: "engender/result — causation brings into being" }],
  ["26.4", { op: "INS", because: "create — bringing into existence (build-26.1, assembling a whole, is SYN)" }],
  ["26.2.1", { op: "INS", because: "grow — coming into being over time" }],
  ["109.1", { op: "INS", because: "become — entering a new state or kind" }],
  ["55.1", { op: "INS", because: "begin — inception" }],
  ["55.5", { op: "INS", because: "establish — founding" }],
  ["14", { op: "INS", alt: "EVA", because: "learn — knowledge comes into being in the knower; alt EVA as the epistemic act" }],
  ["50", { op: "INS", because: "assuming position (sit, stand, kneel) — a new bodily state arises (the golden's own started-to-her-feet precedent)" }],
  ["31.1", { op: "INS", because: "amuse-type (stimulus subject) — an emotional state is produced in the experiencer" }],
  ["29.90", { op: "INS", because: "render — making-become" }],

  // ── Structure · Differentiate = SEG (cutting, removing, bounding structure) ──
  ["10", { op: "SEG", because: "remove/banish/steal/mine/fire — taking apart from an arrangement or possession" }],
  ["21", { op: "SEG", because: "cut/carve — structural division" }],
  ["23", { op: "SEG", because: "separate/split/disassemble/differ — parting an arrangement" }],
  ["45.1", { op: "SEG", because: "break — structure broken, the thing persists (destroy-44, where it ceases, is NUL)" }],
  ["45.8", { op: "SEG", alt: "NUL", because: "break down — structural failure; alt NUL where the working ceases" }],
  ["76", { op: "SEG", because: "limit — drawing a structural bound" }],
  ["80", { op: "SEG", because: "free — releasing from constraint" }],
  ["82", { op: "SEG", because: "withdraw — removing oneself" }],
  ["92", { op: "SEG", because: "confine — bounding movement" }],
  ["107.3", { op: "SEG", because: "exclude — cutting from a set" }],
  ["77.2", { op: "SEG", alt: "DEF", because: "reject — cutting away an offer; alt DEF as a refusal declared" }],
  ["13.7", { op: "SEG", because: "berry/nut-gather — removing from a source" }],
  ["29.7", { op: "SEG", because: "orphan — depriving of a relation" }],

  // ── Structure · Relate = CON (holding in arrangement: possession, contact, social bonds, part-whole) ──
  ["9", { op: "CON", alt: "SYN", because: "put/pour/fill/spray — causing a positional relation to hold; alt SYN as the arrangement produced" }],
  ["12", { op: "CON", alt: "SIG", because: "push/pull — force through contact; alt SIG where motion results" }],
  ["13", { op: "CON", because: "give/get/exchange/hire — possession is a structural relation changing hands" }],
  ["15", { op: "CON", because: "hold/keep/support/contain — maintained structural relations" }],
  ["18", { op: "CON", because: "hit/swat/bump — forceful contact is a relation made" }],
  ["19", { op: "CON", because: "poke — contact" }],
  ["20", { op: "CON", because: "touch — contact" }],
  ["22", { op: "CON", because: "tape/cling/attach default for the family's attachment classes; mix-22.1/amalgamate-22.2/shake-22.3 override to SYN as exact rows" }],
  ["22.1", { op: "SYN", because: "mix — combining into a new whole" }],
  ["22.2", { op: "SYN", because: "amalgamate — as mix" }],
  ["22.3", { op: "SYN", alt: "CON", because: "shake (together) — combining; alt CON as agitation contact" }],
  ["36", { op: "CON", because: "marry/meet/correspond/battle — social relations made and held" }],
  ["41", { op: "CON", because: "dress/groom — arranging a covering-relation on a body" }],
  ["47.8", { op: "CON", because: "contiguous location — borders/adjoins" }],
  ["54.3", { op: "CON", because: "fit — a matching relation" }],
  ["68", { op: "CON", because: "pay — transfer of possession" }],
  ["70", { op: "CON", because: "rely — dependence held" }],
  ["71", { op: "CON", because: "conspire — acting-with" }],
  ["72", { op: "CON", because: "help/benefit/defend — support relations" }],
  ["73", { op: "CON", because: "cooperate/work(with) — acting-with" }],
  ["75.2", { op: "CON", alt: "EVA", because: "caring/tending — a maintained relation of care (the engine's own Tending stance); alt EVA as valuing" }],
  ["79", { op: "CON", because: "dedicate — binding to a purpose" }],
  ["83", { op: "CON", because: "cope — managing a relation with difficulty" }],
  ["86", { op: "CON", because: "correlate/relate — relations between matters" }],
  ["93", { op: "CON", because: "adopt — taking into one's own relation" }],
  ["95", { op: "CON", because: "acquiesce/subordinate/supervise/employ — institutional relations" }],
  ["96", { op: "CON", because: "addict — dependence" }],
  ["97.1", { op: "CON", because: "base — grounding one thing on another" }],
  ["98", { op: "CON", because: "confront — facing relation" }],
  ["100.1", { op: "CON", because: "own — possession held" }],
  ["105.1", { op: "CON", because: "use — instrumental relation" }],
  ["107.1", { op: "CON", because: "involve — part-in-whole" }],
  ["107.2", { op: "CON", because: "comprise — whole-of-parts" }],
  ["111.1", { op: "CON", because: "conduct (an affair) — carrying a relation through" }],
  ["112", { op: "CON", because: "reciprocate — returning a relation" }],
  ["77.1", { op: "CON", alt: "EVA", because: "accept — receiving into relation; alt EVA as the judging yes" }],
  ["51.7", { op: "CON", because: "accompany — going WITH: co-presence held (RULE.md's own table lists it under CON)" }],
  ["37.13", { op: "CON", because: "promise — a pledge binds (the golden's own UDHR pledged-precedent; the engine's CON·Figure stance is literally Binding)" }],
  ["26.2.2", { op: "CON", alt: "INS", because: "rear (children/animals) — sustained tending; alt INS as growth caused" }],
  ["55.3", { op: "CON", because: "continue — maintaining" }],
  ["55.6", { op: "CON", because: "sustain — maintaining" }],
  ["88", { op: "EVA", because: "care(about)/empathize — holding a valuation toward" }],

  // ── Structure · Generate = SYN (producing wholes and arrangements) ──
  ["26", { op: "SYN", because: "build/prepare/perform/knead/adjust — producing a whole (family default; create/grow/rear/turn overridden as exact rows)" }],
  ["26.6.1", { op: "SYN", alt: "REC", because: "turn (X into Y) — a new whole from old material; alt REC as re-grounding" }],
  ["26.6.2", { op: "SYN", alt: "REC", because: "convert (material) — as turn; belief-conversion (a REC) is not this class" }],
  ["24", { op: "SYN", because: "coloring — producing a surface" }],
  ["25", { op: "SYN", because: "scribble/illustrate/transcribe — producing marks and images" }],
  ["45.2", { op: "SYN", alt: "SEG", because: "bend — re-forming shape; alt SEG as deformation" }],
  ["45.3", { op: "SYN", because: "cooking — producing the dish" }],
  ["45.4", { op: "SYN", alt: "REC", because: "generic change of state — a new state produced; heterogeneous family, LOW CONFIDENCE, flagged" }],
  ["45.5", { op: "SYN", alt: "REC", because: "entity-specific change of state — as 45.4" }],
  ["45.6", { op: "SYN", alt: "REC", because: "calibratable change of state (rise, fall) — as 45.4" }],
  ["45.7", { op: "SYN", because: "remedy/fix — repair is revision (the project's own build-log precedent, golden A6)" }],
  ["55.2", { op: "SYN", because: "complete — the whole finishes" }],
  ["55.7", { op: "SYN", alt: "EVA", because: "satisfy (conditions) — the whole's requirements met; alt EVA as the judgment they are" }],
  ["74", { op: "SYN", alt: "EVA", because: "succeed — the undertaking completes; alt EVA as the outcome judged" }],
  ["102", { op: "SYN", because: "promote — producing an advanced standing (the golden's own have-made-him precedent)" }],
  ["108", { op: "EVA", because: "multiply/calculate — working out a value is an evaluative act" }],

  // ── Interpretation · Differentiate = DEF (bounding meaning, claims, resolves, directives) ──
  ["29.1", { op: "DEF", because: "appoint — fixing someone into a defined role" }],
  ["29.2", { op: "DEF", because: "characterize — bounding what something is taken as" }],
  ["29.3", { op: "DEF", because: "dub — naming-as" }],
  ["29.3.1", { op: "DEF", because: "pronounce — declaring-as" }],
  ["29.4", { op: "DEF", because: "declare — the boundary-drawing speech act (the golden's own proclaims-precedent)" }],
  ["29.10", { op: "DEF", because: "classify — placing under a bound" }],
  ["58", { op: "DEF", alt: "CON", because: "urge/beg/order — directives impose bounds on another's action; alt CON as the social pressure relation" }],
  ["59", { op: "DEF", because: "compel/trick/lure/bully — imposing on another's will (heterogeneous: trick's produced misbelief noted, not separately mapped)" }],
  ["61.2", { op: "DEF", because: "intend — forming a resolve (the golden's own determined-to precedent)" }],
  ["63", { op: "DEF", because: "enforce — imposing a rule's bound" }],
  ["64.4", { op: "DEF", because: "forbid — the prohibiting bound" }],
  ["99", { op: "DEF", because: "ensure — binding an outcome to hold" }],
  ["101", { op: "DEF", because: "patent — legal bounding" }],
  ["103", { op: "DEF", because: "require — imposing a condition" }],

  // ── Interpretation · Relate = EVA (judging, assessing, believing, testing, valuing) ──
  ["33", { op: "EVA", because: "judgment/prosecute — holding conduct against a standard" }],
  ["34", { op: "EVA", because: "assess/estimate — measuring against a scale" }],
  ["31", { op: "EVA", because: "admire/marvel/appeal — evaluative stances held (amuse-31.1, stimulus-subject, overridden INS)" }],
  ["32", { op: "EVA", because: "want/long — desiderative valuation" }],
  ["29.5", { op: "EVA", because: "conjecture — holding a tentative claim" }],
  ["29.9", { op: "EVA", because: "consider — weighing (the golden's own was-considering precedent)" }],
  ["35.4", { op: "EVA", alt: "SIG", because: "investigate — systematic examination; alt SIG as the scouting it rides on" }],
  ["54.2", { op: "EVA", because: "cost — a value relation stated" }],
  ["54.4", { op: "EVA", because: "price — valuation" }],
  ["54.5", { op: "EVA", because: "bill — valuation asserted" }],
  ["54.6", { op: "EVA", because: "earn — value accrued and reckoned" }],
  ["61.1", { op: "EVA", because: "try — testing (the material's own tried-the-key shape)" }],
  ["62", { op: "EVA", because: "wish — holding a desire toward" }],
  ["81", { op: "EVA", because: "suspect — holding a doubted claim" }],
  ["85", { op: "EVA", because: "cognize/know — epistemic holding" }],
  ["87.2", { op: "EVA", alt: "INS", because: "comprehend — grasping meaning; alt INS as understanding arising" }],
  ["90", { op: "EVA", because: "exceed — comparative judgment" }],
  ["91", { op: "EVA", because: "matter — importance held" }],
  ["94", { op: "EVA", because: "risk — weighing stakes" }],
  ["97.2", { op: "EVA", because: "deduce — inferring under a standard" }],
  ["105.3", { op: "EVA", because: "trifle — treating lightly (a valuation)" }],

  // ── Interpretation · Generate = REC (a new frame produced) ──
  // VerbNet has no clean re-frame family — belief-conversion, recanting and
  // reinterpretation live scattered inside speech/cognition classes. That
  // absence is DISCLOSED here rather than papered over: REC enters this
  // prior only through the alt readings above (26.6, 45.4-6) and through
  // phasepost.js's mechanical re- prefix note. A future FrameNet-backed
  // giver could close it; VerbNet alone cannot.
];

// longest-prefix resolution: exact class id, else longest numeric-prefix row
const exact = new Map();
const prefixes = [];
for (const [key, val] of ACT) {
  prefixes.push([key, val]);
}
prefixes.sort((a, b) => b[0].length - a[0].length);

function actForClass(classId) {
  // classId like "give-13.1" — the numeric part is after the last hyphen
  // BEFORE the first number segment... actually the convention is
  // name-NUMBER(.SUB)* — take everything after the first hyphen-digit.
  const m = classId.match(/-(\d[\d.]*)$/);
  if (!m) return null;
  const num = m[1];
  for (const [key, val] of prefixes) {
    if (num === key || num.startsWith(key + ".")) return { ...val, matched: key };
  }
  return null;
}

// ── parse the XMLs ──────────────────────────────────────────────────────
const files = fs.readdirSync(VN_DIR).filter((f) => f.endsWith(".xml"));
const forms = new Map(); // form -> Map(op -> {classes:[], because, alt})
const unmapped = [];
let classCount = 0, memberCount = 0;

for (const f of files) {
  const classId = f.replace(/\.xml$/, "");
  const xml = fs.readFileSync(path.join(VN_DIR, f), "utf8");
  const act = actForClass(classId);
  classCount += 1;
  if (!act) { unmapped.push(classId); continue; }
  // MEMBER name="..." — VerbNet's XML is regular enough for this; grouping
  // markers like "?" prefixes do not occur in member names in this release.
  for (const mm of xml.matchAll(/<MEMBER[^>]*\bname="([^"]+)"/g)) {
    const form = mm[1].toLowerCase().replace(/_/g, " ");
    memberCount += 1;
    if (!forms.has(form)) forms.set(form, new Map());
    const byOp = forms.get(form);
    if (!byOp.has(act.op)) byOp.set(act.op, { classes: [], alt: act.alt ?? null });
    byOp.get(act.op).classes.push(classId);
  }
}

// collapse: unanimous op -> primary; else contested with every op kept
const out = {};
let unanimous = 0, contested = 0;
for (const [form, byOp] of forms) {
  const ops = [...byOp.entries()].map(([op, v]) => ({ op, classes: v.classes, alt: v.alt }));
  if (ops.length === 1) {
    out[form] = { op: ops[0].op, classes: ops[0].classes, alt: ops[0].alt, standing: "unanimous" };
    unanimous += 1;
  } else {
    ops.sort((a, b) => b.classes.length - a.classes.length);
    out[form] = { standing: "contested", candidates: ops };
    contested += 1;
  }
}

const fixture = {
  schema: "ActPrior@1",
  giver: {
    resource: "VerbNet 3 (NLTK data mirror, verbnet3.zip — 325 Levin-numbered class files)",
    resourceLicense: "VerbNet license (verbs.colorado.edu) via NLTK data distribution",
    mapping: "declared translation, this file's own ACT table: Levin/VerbNet class semantics -> the nine acts of live_priors/goldens/reading/RULE.md Part II (mode x domain, eoreader7 native cube.js's own operators) — THRAX_MAP's precedent, every row carrying its because",
  },
  disclosed: {
    grainAbsent: "grain is occurrence-level by RULE.md's own framing; this prior answers the TYPE question only",
    recSparse: "VerbNet has no clean re-frame family; REC enters only through alt readings (26.6, 45.4-6) — a real absence, named",
    lowConfidence: ["39 (eat: NUL alt CON)", "66 (consume)", "45.4-6 (generic change of state: SYN alt REC)"],
    unmappedClasses: unmapped,
  },
  counts: { classes: classCount, memberEntries: memberCount, forms: Object.keys(out).length, unanimous, contested },
  forms: out,
};

const outPath = path.join(HERE, "..", "derived-priors", "act-priors", "act-prior-en.json");
fs.writeFileSync(outPath, JSON.stringify(fixture, null, 1));
console.log(`classes ${classCount} (unmapped ${unmapped.length}${unmapped.length ? ": " + unmapped.join(", ") : ""})`);
console.log(`member entries ${memberCount} -> forms ${Object.keys(out).length} (unanimous ${unanimous}, contested ${contested})`);
console.log(`wrote ${path.relative(process.cwd(), outPath)}`);
