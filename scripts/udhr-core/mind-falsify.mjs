// udhr-core/mind-falsify.mjs — try to BREAK three claims about the mind. Run: node mind-falsify.mjs
//   THE MIND = the log (../mnemosyne/mind.eot) + the artifacts its roots name + mind-priors.mjs, which verifies them.
//
// PRE-REGISTERED before the first run (2026-10-20). Budgets are mine (none were given); a claim is FALSIFIED when its test fails:
//   S1  SIZE AT USE: for the need "english reading" (charter data + ring-1 sets + associates) the bytes that must be resident (log + the artifacts those domains name) are <= 1 MB.
//   S2  SHALLOW LOAD: loadMind (no deep) returns in <= 5 s and peak RSS growth <= 200 MB.
//   S3  DEEP VERIFICATION (recompute every root incl. the Declaration's structure and the beings): <= 120 s and peak RSS <= 2 GB.
//   U1  USABLE, TRANSFER: the associates (learned on 21-anti-colonial and 20-first-person-voices) concentrate on their assigned units in CORAAL, an admitted corpus NOT used to learn them,
//       more than a permutation of the assignments does (mean lift above the maximum of 200 permutations; words with >= 5 CORAAL paragraphs).
//   U2  USABLE, PREDICTION: the first-person over-indexed units (4,16,23,25,27) predict which units CORAAL over-indexes (23,25,26,21,6): overlap larger than chance, hypergeometric p < 0.05.
//   U3  DETERMINISM: two shallow loads return byte-identical priors.
//   A1  ACTIVATION: loading for a need reads ONLY the artifacts of the domains that need requires. Needs: "spanish reading" (charter only: no ring-1 English sets, no associates);
//       "english reading" (charter + ring-1 sets + associates). The measure is the set of artifact files actually opened.
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import syncBuiltin from "node:module";
const here = new URL("./", import.meta.url).pathname, LOG = new URL("../../../mnemosyne/mind.eot", import.meta.url).pathname, kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const out = {};

// ---- S1: bytes ----
const NAMED = { "udhr-core (charter data)": ["referents.json", "relations.json"], "ring1-english": ["ring1-genre-gated-report.json", "coraal-units-report.json"], "ring1-associates": ["ring1-spiral3-report.json", "ring1-spiral3-check-report.json"] };
const sz = (f) => (existsSync(here + f) ? statSync(here + f).size : 0), logBytes = statSync(LOG).size;
const perDomain = Object.fromEntries(Object.entries(NAMED).map(([k, fs]) => [k, fs.reduce((a, f) => a + sz(f), 0)]));
const englishNeed = logBytes + Object.values(perDomain).reduce((a, b) => a + b, 0), spanishNeed = logBytes + perDomain["udhr-core (charter data)"];
out.S1 = { logBytes, perDomainBytes: perDomain, englishReadingBytes: englishNeed, spanishReadingBytes: spanishNeed, budget: 1048576, holds: englishNeed <= 1048576 };
const ledger = here + "udhr-core.eot.json"; out.deepResources = { rebuiltEventLog: existsSync(ledger) ? kb(statSync(ledger).size) : "absent", udhrEditions: `${readdirSync(here + "../../06-government-legal/un-udhr").filter((f) => /^udhr-.*\.txt$/.test(f)).length} files` };

// ---- S2: shallow load ----
{ const { loadMind } = await import("./mind-priors.mjs"); const r0 = process.memoryUsage().rss, t0 = Date.now(); await loadMind({ logPath: LOG }); out.S2 = { seconds: +((Date.now() - t0) / 1000).toFixed(2), rssGrowthMB: +((process.memoryUsage().rss - r0) / 1048576).toFixed(1), holds: (Date.now() - t0) <= 5000 && process.memoryUsage().rss - r0 <= 200 * 1048576 }; }
// ---- S3: deep, in a child process so its peak RSS is its own ----
{ const t0 = Date.now(), r = spawnSync("/usr/bin/time", ["-l", "node", "-e", `import("${here}mind-priors.mjs").then(async (m) => { const r = await m.loadMind({ logPath: "${LOG}", deep: true }); console.log("VERIFIED", Object.values(r.domains).filter((d) => d.verified).length); })`], { cwd: here, encoding: "utf8", maxBuffer: 1 << 26, timeout: 400000 });
  const rss = /(\d+)\s+maximum resident set size/.exec(r.stderr ?? ""), secs = (Date.now() - t0) / 1000, mb = rss ? +rss[1] / 1048576 : null;
  out.S3 = { seconds: +secs.toFixed(1), peakRssMB: mb == null ? null : +mb.toFixed(0), verifiedDomains: /VERIFIED (\d+)/.exec(r.stdout ?? "")?.[1] ?? "none", holds: mb != null && secs <= 120 && mb <= 2048, note: rss ? "" : "could not read peak RSS" }; }

// ---- U3: determinism ----
const { loadMind } = await import("./mind-priors.mjs");
const ser = (m) => JSON.stringify({ o: m.overIndexed, a: m.associates && [...m.associates.byWord].sort((x, y) => (x[0] < y[0] ? -1 : 1)), d: Object.fromEntries(Object.entries(m.domains).map(([k, v]) => [k, v.verified])) });
const a1 = ser(await loadMind({ logPath: LOG })), a2 = ser(await loadMind({ logPath: LOG }));
out.U3 = { hash1: createHash("sha256").update(a1).digest("hex").slice(0, 16), hash2: createHash("sha256").update(a2).digest("hex").slice(0, 16), holds: a1 === a2 };

// ---- U2: prediction (hypergeometric) ----
{ const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }, fp = [4, 16, 23, 25, 27], cr = [6, 21, 23, 25, 26], k = fp.filter((u) => cr.includes(u)).length;
  let p = 0; for (let x = k; x <= Math.min(fp.length, cr.length); x++) p += (C(fp.length, x) * C(31 - fp.length, cr.length - x)) / C(31, cr.length);
  out.U2 = { overlap: k, of: cr.length, expectedByChance: +((fp.length * cr.length) / 31).toFixed(2), p: +p.toFixed(3), holds: p < 0.05 }; }

// ---- U1: associates transfer to CORAAL ----
{ const { modelOf, scoreTokens, tokensOf, shuffle, mulberry } = await import("./ring1.mjs"), { admitted } = await import("./perspective-gate.mjs");
  const mind = await loadMind({ logPath: LOG }), by = mind.associates.byWord, m = await modelOf("eng"), rd = (p) => readFileSync(p, "utf8");
  const w2 = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? w2(join(d, e.name)) : /\.txt$/.test(e.name) ? [join(d, e.name)] : []));
  const files = w2(here + "../Zenodotus/11-multi-language/dialects-pidgins-creoles/coraal").filter((p) => admitted(p).admit);
  const lines = files.flatMap((p) => rd(p).split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.replace(/\/[A-Za-z0-9-]+\//g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).filter((l) => l.length > 3));
  const acc = new Map(), cnt = new Map(), base = new Array(31).fill(0); let W = 0;
  for (const l of lines) { const toks = tokensOf(l, m.hearing.ear), sc = scoreTokens(toks, m); if (!sc) continue; const tot = sc.s.reduce((a, b) => a + b, 0); if (!tot) continue; W += sc.mass; sc.s.forEach((x, u) => (base[u] += sc.mass * (x / tot)));
    for (const w of new Set(toks)) if (by.has(w)) { const v = acc.get(w) ?? new Float64Array(31); sc.s.forEach((x, u) => (v[u] += sc.mass * (x / tot))); acc.set(w, v); cnt.set(w, (cnt.get(w) ?? 0) + 1); } }
  const b = base.map((x) => x / W), usable = [...by].filter(([w]) => (cnt.get(w) ?? 0) >= 5), lift = (w, units) => { const v = acc.get(w), t = v.reduce((x, y) => x + y, 0); return units.map((u) => v[u] / t / b[u]); };
  const real = usable.flatMap(([w, us]) => lift(w, us.map((x) => x.unit))), mean = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length, rnd = mulberry(9), words = usable.map(([w]) => w), shape = new Map(usable.map(([w, us]) => [w, us.map((x) => x.unit)]));
  const nulls = Array.from({ length: 200 }, () => { const sh = shuffle(words, rnd); return mean(words.flatMap((w, i) => lift(w, shape.get(sh[i])))); });
  out.U1 = { associatesWithEnoughCoraal: `${usable.length} of ${by.size}`, meanLift: +mean(real).toFixed(3), nullMax: +Math.max(...nulls).toFixed(3), nullMean: +mean(nulls).toFixed(3), holds: usable.length >= 10 && mean(real) > Math.max(...nulls) }; }

// ---- A1: activation: which artifact files does a load actually open, for each need? (second run, after `needs` was added; the first run, with no such option, FAILED: _mind-falsify-before.log) ----
{ const fs = (await import("node:fs")).default, orig = fs.readFileSync, opened = new Set(); fs.readFileSync = function (p, ...r) { if (typeof p === "string" && p.startsWith(here) && p.endsWith(".json")) opened.add(p.slice(here.length)); return orig.call(this, p, ...r); }; syncBuiltin.syncBuiltinESMExports();
  const { loadMind: lm } = await import("./mind-priors.mjs?spy"), jobs = { "spanish reading": { needs: ["charter"], want: ["referents.json", "relations.json"] }, "english reading": { needs: ["charter", "overIndexed", "associates"], want: [...NAMED["udhr-core (charter data)"], ...NAMED["ring1-english"], ...NAMED["ring1-associates"]] }, "ring-1 sets only": { needs: ["overIndexed"], want: NAMED["ring1-english"] } }, res = {};
  for (const [name, j] of Object.entries(jobs)) { opened.clear(); const m = await lm({ logPath: LOG, needs: j.needs }); const o = [...opened].filter((f) => /referents|relations|ring1|coraal/.test(f)).sort(), want = new Set(j.want);
    const bytes = o.reduce((a, f) => a + sz(f), 0) + logBytes; res[name] = { needs: j.needs, opened: o, onlyWhatIsNeeded: o.length === want.size && o.every((f) => want.has(f)), residentBytes: bytes, verifiedDomains: Object.entries(m.domains).filter(([, v]) => v.verified).map(([k]) => k.replace("udhr-core/", "")) }; }
  fs.readFileSync = orig; syncBuiltin.syncBuiltinESMExports();
  out.A1 = { ...res, holds: Object.values(res).every((x) => x.onlyWhatIsNeeded) }; }

console.log(JSON.stringify(out, null, 1));
