#!/usr/bin/env node
// Security vetting pass over everything under 09-source-code/.
//
// Two different claims are made about this section, and this script is
// careful to keep them apart:
//
//   1. PROVENANCE — audited-tier projects are chosen because their security
//      posture is externally documented (published audits, formal
//      verification, a continuous audit process). That vetting was done by
//      the named third parties, not by this repository.
//   2. CONTENT — the bytes actually collected here are mechanically scanned:
//      checksums verified against the manifest, and every file checked for
//      the classes of hazard that matter for a *read-only text corpus* —
//      trojan-source bidi controls, invisible codepoints, embedded secrets,
//      binary smuggling. Nothing in this corpus is ever executed; consumers
//      (eochat's Priors tab) read these files as documents.
//
// Check parameters are external standards, not tuned knobs: the bidi set is
// the Unicode control set from the Trojan Source disclosure (CVE-2021-42574);
// the credential patterns are the providers' own documented token prefixes.
// No threshold here was chosen by looking at what it does to the results.
//
// Exit code: 1 if any FAIL survives adjudication, else 0.
// Output: manifests/source-code-vetting.json and 09-source-code/VETTING.md.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CODE_DIR = path.join(ROOT, '09-source-code');
const OUT_JSON = path.join(ROOT, 'manifests', 'source-code-vetting.json');
const OUT_MD = path.join(CODE_DIR, 'VETTING.md');
const AUDITED_MANIFEST = path.join(ROOT, 'manifests', 'audited-code-manifest.json');

// Repo-authored files about the corpus — not collected documents, not scanned.
const AUTHORED = new Set(['README.md', 'VETTING.md']);

// CVE-2021-42574 ("Trojan Source"): bidirectional control characters that can
// make rendered source read differently from what a compiler parses.
const BIDI = /[‪-‮⁦-⁩]/;
// Zero-width and invisible codepoints (legitimate in some prose corpora;
// in a source-code section they warrant a look, so: warn, not fail).
const INVISIBLE = /[​‌‍⁠﻿]/;

// Provider-documented credential shapes. A match is a FAIL unless it is a
// provider's own published example value.
const TOKEN_PATTERNS = [
  { name: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/g, placeholders: ['AKIAIOSFODNN7EXAMPLE'] },
  { name: 'github-token', re: /\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/g, placeholders: [] },
  { name: 'gitlab-token', re: /\bglpat-[A-Za-z0-9_-]{20}\b/g, placeholders: [] },
  { name: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, placeholders: [] },
  { name: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g, placeholders: [] },
];

const PEM_MARKER = /-----BEGIN [A-Z ]*PRIVATE KEY( BLOCK)?-----/g;
const BASE64_LINE = /^[A-Za-z0-9+/=]{40,}$/;

const PIPE_TO_SHELL = /\b(curl|wget)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|da)?sh\b/g;

// Standing adjudications: expected findings, each with the reason it is
// expected. Adjudicated findings are downgraded to ADJUDICATED and shown in
// the report — never hidden.
const ADJUDICATIONS = [
  {
    check: 'private-key-marker',
    file: /openssh_openssh-portable\/sshkey\.c$/,
    reason: 'sshkey.c defines the PEM armor marker constants its own parser recognizes; no key material follows the markers.',
  },
  {
    check: 'pipe-to-shell',
    file: /\.(md|markdown|rst|txt)$|README|PROVENANCE/i,
    reason: 'Installation one-liners quoted inside collected documentation. Nothing in this corpus is executed; the text is the document.',
  },
  {
    check: 'invisible-chars',
    file: /tiangolo_fastapi\/docs_en_docs_async\.md\.txt$/,
    reason: 'U+200D is the joiner inside an emoji ZWJ sequence (the docs\' cook emoji), verified by byte inspection — not a hidden-text vector in prose documentation.',
  },
];

function sha256Bytes(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function adjudicate(check, rel, matchText) {
  for (const a of ADJUDICATIONS) {
    if (a.check !== check) continue;
    if (a.file && !a.file.test(rel)) continue;
    if (a.match && a.match !== matchText) continue;
    return a.reason;
  }
  return null;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scanFile(abs, rel) {
  const buf = fs.readFileSync(abs);
  const findings = [];
  const digest = sha256Bytes(buf);

  // Binary / encoding integrity. A text corpus document must be valid UTF-8
  // with no NUL bytes; anything else could smuggle content past text review.
  if (buf.includes(0)) {
    findings.push({ check: 'nul-bytes', severity: 'FAIL', detail: 'NUL byte present — not a text document' });
    return { sha256: digest, bytes: buf.length, findings, status: 'FAIL' };
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    findings.push({ check: 'utf8', severity: 'FAIL', detail: 'not valid UTF-8' });
    return { sha256: digest, bytes: buf.length, findings, status: 'FAIL' };
  }

  const bidi = text.match(BIDI);
  if (bidi) {
    findings.push({
      check: 'bidi-controls', severity: 'FAIL',
      detail: `bidirectional control character U+${bidi[0].codePointAt(0).toString(16).toUpperCase()} at line ${lineOf(text, text.search(BIDI))} (CVE-2021-42574 class)`,
    });
  }

  const invisIdx = text.slice(1).search(INVISIBLE); // a leading BOM alone is tolerated
  if (invisIdx !== -1) {
    const ch = text.slice(1).match(INVISIBLE)[0];
    const reason = adjudicate('invisible-chars', rel, ch);
    findings.push({
      check: 'invisible-chars', severity: reason ? 'ADJUDICATED' : 'WARN',
      detail: `invisible codepoint U+${ch.codePointAt(0).toString(16).toUpperCase()} at line ${lineOf(text, invisIdx + 1)}${reason ? ` — ${reason}` : ''}`,
    });
  }

  for (const t of TOKEN_PATTERNS) {
    for (const m of text.matchAll(t.re)) {
      const isPlaceholder = t.placeholders.includes(m[0]);
      const reason = isPlaceholder
        ? 'provider\'s own published example value'
        : adjudicate(t.name, rel, m[0]);
      findings.push({
        check: t.name,
        severity: reason ? 'ADJUDICATED' : 'FAIL',
        detail: `credential-shaped string at line ${lineOf(text, m.index)}${reason ? ` — ${reason}` : ''}`,
      });
    }
  }

  for (const m of text.matchAll(PEM_MARKER)) {
    // A marker string in source code is expected; a marker followed by
    // base64 body lines is actual key material and always fails.
    const after = text.slice(m.index + m[0].length).split('\n').slice(1, 4);
    const hasBody = after.filter(l => BASE64_LINE.test(l.trim())).length >= 2;
    if (hasBody) {
      findings.push({ check: 'private-key-material', severity: 'FAIL', detail: `private key block with body at line ${lineOf(text, m.index)}` });
    } else {
      const reason = adjudicate('private-key-marker', rel, m[0]);
      findings.push({
        check: 'private-key-marker',
        severity: reason ? 'ADJUDICATED' : 'WARN',
        detail: `PEM private-key marker (no body) at line ${lineOf(text, m.index)}${reason ? ` — ${reason}` : ''}`,
      });
    }
  }

  for (const m of text.matchAll(PIPE_TO_SHELL)) {
    const reason = adjudicate('pipe-to-shell', rel, m[0]);
    findings.push({
      check: 'pipe-to-shell',
      severity: reason ? 'ADJUDICATED' : 'WARN',
      detail: `download-piped-to-shell text at line ${lineOf(text, m.index)}${reason ? ` — ${reason}` : ''}`,
    });
  }

  const status = findings.some(f => f.severity === 'FAIL') ? 'FAIL'
    : findings.some(f => f.severity === 'WARN') ? 'WARN'
    : findings.length ? 'ADJUDICATED' : 'OK';
  return { sha256: digest, bytes: buf.length, findings, status };
}

/** Verify the audited manifest's recorded checksums against the bytes on
 *  disk — the tamper-evidence half of pinning. */
function verifyAuditedManifest(fileResults) {
  if (!fs.existsSync(AUDITED_MANIFEST)) return { present: false, checked: 0, mismatches: [] };
  const manifest = JSON.parse(fs.readFileSync(AUDITED_MANIFEST, 'utf8'));
  const mismatches = [];
  let checked = 0;
  for (const repo of manifest.repos) {
    for (const f of repo.files ?? []) {
      const onDisk = fileResults.get(f.local);
      checked++;
      if (!onDisk) mismatches.push({ file: f.local, problem: 'missing on disk' });
      else if (onDisk.sha256 !== f.sha256) mismatches.push({ file: f.local, problem: 'sha256 drift from manifest' });
    }
  }
  return { present: true, checked, mismatches };
}

async function checkRefUrls() {
  // Reachability of the cited audit documents — recorded, not assumed. An
  // unreachable URL (this environment sits behind a proxy) demotes nothing;
  // it is simply reported as unverified-from-here.
  if (!fs.existsSync(AUDITED_MANIFEST)) return [];
  const manifest = JSON.parse(fs.readFileSync(AUDITED_MANIFEST, 'utf8'));
  const results = [];
  for (const repo of manifest.repos) {
    for (const ref of repo.security?.refs ?? []) {
      if (!ref.url) continue;
      let status = 'unreachable-from-here';
      try {
        const res = await fetch(ref.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(20000) });
        status = res.ok ? 'ok' : `http-${res.status}`;
      } catch { /* recorded as unreachable */ }
      results.push({ repo: `${repo.owner}/${repo.repo}`, label: ref.label, url: ref.url, status });
    }
  }
  return results;
}

async function main() {
  const files = walk(CODE_DIR).filter(p => !AUTHORED.has(path.relative(CODE_DIR, p)));
  const fileResults = new Map();
  const rows = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    const r = scanFile(abs, path.relative(CODE_DIR, abs));
    fileResults.set(rel, r);
    rows.push({ file: rel, ...r });
  }

  // Per-directory licence/provenance presence.
  const dirs = fs.readdirSync(CODE_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  const licenseGaps = [];
  for (const d of dirs) {
    const names = fs.readdirSync(path.join(CODE_DIR, d));
    const ok = names.some(n => /^(LICENSE|LICENCE|COPYING|LICENSE\.txt|PROVENANCE\.md)/i.test(n));
    if (!ok) licenseGaps.push(d);
  }

  const integrity = verifyAuditedManifest(fileResults);
  const urlChecks = await checkRefUrls();

  const summary = {
    files_scanned: rows.length,
    ok: rows.filter(r => r.status === 'OK').length,
    adjudicated: rows.filter(r => r.status === 'ADJUDICATED').length,
    warn: rows.filter(r => r.status === 'WARN').length,
    fail: rows.filter(r => r.status === 'FAIL').length,
    license_gaps: licenseGaps,
    manifest_integrity: integrity,
  };

  const report = {
    vetted_at: new Date().toISOString(),
    scope: '09-source-code/ (collected documents only; repo-authored README.md and VETTING.md excluded)',
    checks: {
      'nul-bytes / utf8': 'binary smuggling — FAIL',
      'bidi-controls': 'Unicode bidi control set per CVE-2021-42574 (Trojan Source) — FAIL',
      'invisible-chars': 'zero-width/invisible codepoints — WARN',
      'credential tokens': TOKEN_PATTERNS.map(t => t.name).join(', ') + ' — FAIL unless provider example',
      'private-key-material': 'PEM marker followed by base64 body — FAIL; bare marker — WARN',
      'pipe-to-shell': 'download piped to shell in text — WARN',
      'license presence': 'each repo directory carries LICENSE/COPYING/PROVENANCE.md',
    },
    summary,
    url_checks: urlChecks,
    files: rows,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(OUT_MD, renderMarkdown(report), 'utf8');

  console.log(`vetted ${summary.files_scanned} files: ${summary.ok} ok, ${summary.adjudicated} adjudicated, ${summary.warn} warn, ${summary.fail} fail`);
  if (licenseGaps.length) console.log(`license gaps (directories with no licence/provenance file): ${licenseGaps.join(', ')}`);
  if (integrity.present) console.log(`manifest integrity: ${integrity.checked} checksums checked, ${integrity.mismatches.length} mismatches`);
  console.log(`report: ${OUT_MD}`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

function renderMarkdown(report) {
  const L = [];
  const s = report.summary;
  L.push('# 09-source-code — vetting record');
  L.push('');
  L.push(`Generated by \`scripts/vet-source-code.mjs\` at ${report.vetted_at}. Do not edit by hand; re-run the script.`);
  L.push('');
  L.push('## What "vetted" means here — two claims, kept apart');
  L.push('');
  L.push('**Provenance vetting** (audited tier): each project was selected because its');
  L.push('security posture is externally documented — a published third-party audit,');
  L.push('machine-checked formal verification, or a continuous audit process. That work');
  L.push('was done by the named auditors, not by this repository; the citations live in');
  L.push('each repo directory\'s `PROVENANCE.md` and in `manifests/audited-code-manifest.json`.');
  L.push('');
  L.push('**Content vetting** (every file in this section, both tiers): the bytes on');
  L.push('disk are mechanically scanned for hazards that matter for a read-only text');
  L.push('corpus — trojan-source bidi controls (CVE-2021-42574), invisible codepoints,');
  L.push('credential-shaped strings, private-key material, binary smuggling — and');
  L.push('audited-tier files are re-checksummed against their pinned-commit manifest.');
  L.push('');
  L.push('Neither claim is a line-by-line code review by this repository, and nothing');
  L.push('in this corpus is ever executed: consumers read these files as documents.');
  L.push('');
  L.push('## Scan parameters (declared, not tuned)');
  L.push('');
  for (const [k, v] of Object.entries(report.checks)) L.push(`- **${k}** — ${v}`);
  L.push('');
  L.push('These parameters are external standards (the Unicode bidi control set, the');
  L.push('providers\' own documented token prefixes); none was chosen by looking at');
  L.push('what it does to this corpus\'s results.');
  L.push('');
  L.push('## Result');
  L.push('');
  L.push(`${s.files_scanned} files scanned: **${s.ok} clean**, ${s.adjudicated} adjudicated, ${s.warn} warn, **${s.fail} fail**.`);
  L.push('');
  if (s.manifest_integrity.present) {
    L.push(`Pinned-manifest integrity: ${s.manifest_integrity.checked} recorded checksums verified against disk, ${s.manifest_integrity.mismatches.length} mismatches.`);
    for (const m of s.manifest_integrity.mismatches) L.push(`- MISMATCH: ${m.file} — ${m.problem}`);
    L.push('');
  }
  const flagged = report.files.filter(f => f.status !== 'OK');
  if (flagged.length) {
    L.push('### Findings (nothing is hidden — adjudicated means expected, with the reason)');
    L.push('');
    L.push('| file | status | finding |');
    L.push('|---|---|---|');
    for (const f of flagged) {
      for (const fd of f.findings) {
        L.push(`| ${f.file} | ${fd.severity} | ${fd.check}: ${fd.detail} |`);
      }
    }
    L.push('');
  }
  if (s.license_gaps.length) {
    L.push('### Licence gaps');
    L.push('');
    L.push('Directories with no LICENSE/COPYING/PROVENANCE.md file (a landmark-tier gap,');
    L.push('reported rather than papered over):');
    for (const d of s.license_gaps) L.push(`- ${d}`);
    L.push('');
  }
  if (report.url_checks.length) {
    L.push('### Cited audit documents — reachability from this environment');
    L.push('');
    L.push('An unreachable URL demotes nothing; it means the citation could not be');
    L.push('re-verified from behind this environment\'s proxy at vetting time.');
    L.push('');
    L.push('| repo | citation | status |');
    L.push('|---|---|---|');
    for (const u of report.url_checks) L.push(`| ${u.repo} | ${u.label} | ${u.status} |`);
    L.push('');
  }
  L.push('## Known limits');
  L.push('');
  L.push('- The landmark tier (the original 20 repos) was fetched 2026-08-03 from moving');
  L.push('  branch heads, before pinning existed; its origin commits are unknown. Its');
  L.push('  bytes are checksummed in `manifests/source-code-vetting.json` as of this run,');
  L.push('  so they are tamper-evident from now on, but not reproducible from upstream.');
  L.push('- The audited tier is pinned: commit SHA recorded at fetch, sha256 per file,');
  L.push('  re-verified by this script on every run.');
  L.push('- Full per-file results: `manifests/source-code-vetting.json`.');
  L.push('');
  return L.join('\n');
}

main().catch(err => { console.error(err); process.exit(1); });
