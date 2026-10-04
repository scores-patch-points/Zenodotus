#!/usr/bin/env node
// Fetch the security-audited tier of 09-source-code: projects chosen because
// their security posture is externally documented — a published third-party
// audit, machine-checked formal verification, or a continuous audit process —
// not merely because they are popular.
//
// Unlike fetch-code-repos.mjs (the landmark tier, fetched from moving branch
// heads), every file here is fetched at a PINNED commit: the branch head is
// resolved to a SHA via `git ls-remote` first, the raw fetch names that SHA,
// and the manifest records it next to a sha256 of every byte written. A
// re-fetch at the recorded commit must reproduce the recorded checksums.
//
// Source: raw.githubusercontent.com. Licenses: per repo, recorded per entry.
// Vetting of the fetched bytes is a separate pass: scripts/vet-source-code.mjs.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { get, wordsIn, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '09-source-code');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'audited-code-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// `security.summary` states only what is publicly documented; `security.refs`
// carries the citations (with URLs where the document has a stable address —
// vet-source-code.mjs checks these resolve and records the result rather than
// assuming it). If a claim cannot be cited, it does not belong in this table.
const AUDITED_REPOS = [
  {
    owner: 'curl', repo: 'curl', branch: 'master', lang: 'C', license: 'curl (MIT-style)',
    why: 'The data-transfer engine embedded in cars, TVs, servers and billions of devices; one of the most widely deployed C codebases in existence.',
    security: {
      summary: 'Independently audited twice with public reports: Cure53 (2016) and Trail of Bits, coordinated by OSTIF (2022). Continuously fuzzed in Google OSS-Fuzz. Documents its whole vulnerability-handling process in-tree.',
      refs: [
        { label: 'Cure53 penetration test and source audit of curl, 2016', url: 'https://cure53.de/pentest-report_curl.pdf' },
        { label: 'Trail of Bits security review of curl, 2022 (OSTIF)', url: 'https://github.com/trailofbits/publications' },
        { label: 'curl vulnerability disclosure policy (collected in-tree below)' },
      ],
    },
    files: ['COPYING', 'docs/VULN-DISCLOSURE-POLICY.md', 'lib/url.c', 'lib/http.c', 'README'],
  },
  {
    owner: 'git', repo: 'git', branch: 'master', lang: 'C', license: 'GPL-2.0',
    why: 'The version-control system underneath nearly all modern software development.',
    security: {
      summary: 'Full source-code security audit by X41 D-Sec (2023), commissioned by OSTIF with GitLab; report public.',
      refs: [
        { label: 'X41 D-Sec source code audit of Git, 2023 (OSTIF/GitLab)', url: 'https://x41-dsec.de/static/reports/X41-OSTIF-Gitlab-Git-Security-Audit-20230117-public.pdf' },
      ],
    },
    files: ['COPYING', 'README.md', 'Documentation/CodingGuidelines', 'refs.c', 'builtin/commit.c'],
  },
  {
    owner: 'openssl', repo: 'openssl', branch: 'master', lang: 'C', license: 'Apache-2.0',
    why: 'The TLS and cryptography library terminating most of the encrypted traffic on the internet.',
    security: {
      summary: 'Audited by NCC Group Cryptography Services (2016) under the Linux Foundation Core Infrastructure Initiative, the direct institutional response to Heartbleed. Continuously fuzzed in OSS-Fuzz; security policy published in-tree.',
      refs: [
        { label: 'NCC Group audit of OpenSSL, 2016 (Core Infrastructure Initiative)' },
      ],
    },
    files: ['LICENSE.txt', 'README.md', 'ssl/ssl_lib.c', 'crypto/evp/evp_enc.c'],
  },
  {
    owner: 'openssh', repo: 'openssh-portable', branch: 'master', lang: 'C', license: 'BSD-style (see LICENCE)',
    why: 'The SSH implementation on effectively every Unix system; remote administration of the internet runs through it.',
    security: {
      summary: 'Developed under the OpenBSD project\'s continuous, proactive source-audit process — the longest-running such discipline in open source — with privilege separation as a designed-in mitigation.',
      refs: [
        { label: 'OpenBSD security process', url: 'https://www.openbsd.org/security.html' },
      ],
    },
    files: ['LICENCE', 'README.md', 'PROTOCOL', 'ssh.c', 'sshkey.c'],
  },
  {
    owner: 'jedisct1', repo: 'libsodium', branch: 'master', lang: 'C', license: 'ISC',
    why: 'The misuse-resistant cryptography library that a generation of applications standardized on for NaCl-style crypto.',
    security: {
      summary: 'Independent security assessment (2017), funded by Private Internet Access, with a public report.',
      refs: [
        { label: 'libsodium security assessment, 2017 (funded by Private Internet Access)' },
      ],
    },
    files: ['LICENSE', 'README.markdown', 'src/libsodium/crypto_pwhash/argon2/argon2.c', 'src/libsodium/sodium/utils.c'],
  },
  {
    owner: 'WireGuard', repo: 'wireguard-go', branch: 'master', lang: 'Go', license: 'MIT',
    why: 'The userspace implementation of WireGuard, the VPN protocol that displaced far larger predecessors by being small enough to audit.',
    security: {
      summary: 'The WireGuard protocol carries machine-checked symbolic verification in Tamarin, published by the project; the design paper was peer-reviewed at NDSS 2017. The implementation is deliberately small enough to be read in full.',
      refs: [
        { label: 'WireGuard formal verification (Tamarin)', url: 'https://www.wireguard.com/formal-verification/' },
        { label: 'WireGuard: Next Generation Kernel Network Tunnel, NDSS 2017', url: 'https://www.wireguard.com/papers/wireguard.pdf' },
      ],
    },
    files: ['LICENSE', 'README.md', 'device/noise-protocol.go', 'device/send.go'],
  },
  {
    owner: 'kubernetes', repo: 'kubernetes', branch: 'master', lang: 'Go', license: 'Apache-2.0',
    why: 'The orchestration layer most of the world\'s production container workloads run on.',
    security: {
      summary: 'CNCF-commissioned third-party security audits with public reports: Trail of Bits with Atredis Partners (2019) and a follow-up audit (2023), both published through the Kubernetes security SIG.',
      refs: [
        { label: 'Kubernetes third-party security audits (SIG Security)', url: 'https://github.com/kubernetes/sig-security' },
      ],
    },
    files: ['LICENSE', 'README.md', 'SECURITY_CONTACTS', 'pkg/kubelet/kubelet.go'],
  },
  {
    owner: 'aws', repo: 's2n-tls', branch: 'main', lang: 'C', license: 'Apache-2.0',
    why: 'AWS\'s TLS implementation — a rare example of formal methods running in ordinary production CI rather than in a paper.',
    security: {
      summary: 'Core components (HMAC, DRBG) carry machine-checked correctness proofs in SAW/Cryptol, re-checked continuously in CI ("Continuous formal verification of Amazon s2n", CAV 2018, with Galois).',
      refs: [
        { label: 's2n-tls repository (proofs under tests/saw)', url: 'https://github.com/aws/s2n-tls' },
      ],
    },
    files: ['LICENSE', 'README.md', 'tls/s2n_handshake_io.c', 'api/s2n.h'],
  },
  {
    owner: 'bitcoin', repo: 'bitcoin', branch: 'master', lang: 'C++', license: 'MIT',
    why: 'Consensus-critical code where any exploitable defect is directly monetizable at global scale.',
    security: {
      summary: 'No single commissioned audit; instead the most sustained adversarial review environment in open source — every line of consensus code defends real value, and the project\'s review and disclosure culture is built around that fact (policy in-tree).',
      refs: [
        { label: 'Bitcoin Core security policy (collected in-tree below)' },
      ],
    },
    files: ['COPYING', 'SECURITY.md', 'doc/developer-notes.md', 'src/validation.cpp', 'src/script/interpreter.cpp'],
  },
  {
    owner: 'apache', repo: 'httpd', branch: 'trunk', lang: 'C', license: 'Apache-2.0',
    why: 'The reference HTTP server since 1995; the project the Apache License is named after.',
    security: {
      summary: 'Audited under the European Commission\'s EU-FOSSA pilot (2016), which selected Apache HTTP Server core as one of its two audit targets.',
      refs: [
        { label: 'EU-FOSSA pilot project (European Commission, 2016)' },
      ],
    },
    files: ['LICENSE', 'README', 'server/core.c', 'modules/http/http_request.c'],
  },
  {
    owner: 'signalapp', repo: 'libsignal', branch: 'main', lang: 'Rust', license: 'AGPL-3.0',
    why: 'The protocol library behind Signal\'s (and formerly WhatsApp\'s) end-to-end encryption.',
    security: {
      summary: 'The Signal protocol has published, peer-reviewed formal security analyses: Cohn-Gordon et al. (IEEE EuroS&P 2017) and ProVerif models from the INRIA Prosecco group.',
      refs: [
        { label: 'A Formal Security Analysis of the Signal Messaging Protocol (eprint 2016/1013)', url: 'https://eprint.iacr.org/2016/1013' },
      ],
    },
    files: ['LICENSE', 'README.md', 'rust/protocol/src/lib.rs', 'rust/protocol/src/session.rs'],
  },
];

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Resolve a branch head to a commit SHA. Falls back to HEAD when the
 *  declared branch does not exist (a renamed default branch, not an error
 *  worth dying on — but the resolved ref is recorded either way). */
function resolveCommit(owner, repo, branch) {
  const url = `https://github.com/${owner}/${repo}.git`;
  for (const ref of [`refs/heads/${branch}`, 'HEAD']) {
    try {
      const out = execSync(`git ls-remote ${url} ${ref}`, { encoding: 'utf8', timeout: 60000 });
      const sha = out.split(/\s/)[0];
      if (/^[0-9a-f]{40}$/.test(sha)) return { sha, ref };
    } catch {
      /* try the next ref */
    }
  }
  return null;
}

async function main() {
  console.log('=== Audited-tier source code fetcher (pinned commits) ===\n');
  const manifest = {
    source: 'Security-audited open source repositories',
    tier: 'audited',
    fetched_at: new Date().toISOString(),
    pinning: 'branch head resolved to a commit SHA via git ls-remote; every file fetched at that SHA; sha256 recorded per file',
    min_words_floor: MIN_WORDS,
    repos: [],
  };

  for (const spec of AUDITED_REPOS) {
    const { owner, repo, branch } = spec;
    console.log(`\n${owner}/${repo} (${spec.lang}, ${spec.license})`);

    const resolved = resolveCommit(owner, repo, branch);
    if (!resolved) {
      console.log('  !! could not resolve a commit — repo skipped, recorded as missing');
      manifest.repos.push({ owner, repo, branch, error: 'unresolvable', files: [], missing: spec.files });
      continue;
    }
    const { sha } = resolved;
    console.log(`  pinned: ${sha} (${resolved.ref})`);

    const repoDir = path.join(OUTPUT_DIR, `${owner}_${repo}`);
    fs.mkdirSync(repoDir, { recursive: true });

    const entry = {
      owner, repo, branch,
      commit: sha,
      lang: spec.lang,
      license: spec.license,
      tier: 'audited',
      why: spec.why,
      security: spec.security,
      github_url: `https://github.com/${owner}/${repo}`,
      raw_base: `https://raw.githubusercontent.com/${owner}/${repo}/${sha}`,
      files: [],
      folded: [],
      missing: [],
    };

    // Fetch every declared file at the pinned SHA. Files at or above the
    // corpus floor stand alone; shorter ones (licences, short READMEs,
    // security policies) are folded into PROVENANCE.md below rather than
    // discarded — the same move consolidate-media-catalogs.mjs made for
    // per-item media metadata.
    const folded = [];
    for (const filePath of spec.files) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${filePath}`;
      const content = await get(url);
      if (content === null) {
        console.log(`  MISS ${filePath}`);
        entry.missing.push(filePath);
        continue;
      }
      const words = wordsIn(content, filePath);
      const digest = sha256(content);
      if (words >= MIN_WORDS) {
        const localName = filePath.replace(/\//g, '_');
        fs.writeFileSync(path.join(repoDir, localName), content, 'utf8');
        entry.files.push({
          path: filePath, chars: content.length, words, sha256: digest,
          local: `09-source-code/${owner}_${repo}/${localName}`,
        });
        console.log(`  ${filePath}: ${content.length} chars, ${words} words`);
      } else {
        folded.push({ path: filePath, content, words, sha256: digest });
        entry.folded.push({ path: filePath, chars: content.length, words, sha256: digest });
        console.log(`  ${filePath}: ${words} words — folded into PROVENANCE.md`);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    const provenance = renderProvenance(entry, folded);
    fs.writeFileSync(path.join(repoDir, 'PROVENANCE.md'), provenance, 'utf8');
    entry.provenance = {
      local: `09-source-code/${owner}_${repo}/PROVENANCE.md`,
      sha256: sha256(provenance),
      words: wordsIn(provenance, 'PROVENANCE.md'),
    };
    console.log(`  PROVENANCE.md: ${entry.provenance.words} words`);

    manifest.repos.push(entry);
  }

  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  const fetched = manifest.repos.reduce((n, r) => n + (r.files?.length ?? 0), 0);
  const foldedN = manifest.repos.reduce((n, r) => n + (r.folded?.length ?? 0), 0);
  const missing = manifest.repos.reduce((n, r) => n + (r.missing?.length ?? 0), 0);
  console.log(`\n=== Done: ${manifest.repos.length} repos, ${fetched} standalone files, ${foldedN} folded, ${missing} missing ===`);
  if (missing) console.log('Missing upstream paths are recorded per-repo in the manifest — nothing is dropped silently.');
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

function renderProvenance(entry, folded) {
  const lines = [];
  lines.push('---');
  lines.push(`source: github.com/${entry.owner}/${entry.repo}`);
  lines.push(`commit: ${entry.commit}`);
  lines.push(`branch: ${entry.branch}`);
  lines.push(`license: ${entry.license}`);
  lines.push(`tier: audited`);
  lines.push(`fetched_at: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${entry.owner}/${entry.repo} — provenance and security record`);
  lines.push('');
  lines.push(entry.why);
  lines.push('');
  lines.push('## Security review record');
  lines.push('');
  lines.push(entry.security.summary);
  lines.push('');
  for (const ref of entry.security.refs) {
    lines.push(ref.url ? `- ${ref.label} — ${ref.url}` : `- ${ref.label}`);
  }
  lines.push('');
  lines.push(`## Files collected at commit ${entry.commit}`);
  lines.push('');
  lines.push('Every file below was fetched at the pinned commit; re-fetching that commit');
  lines.push('must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies');
  lines.push('them against the bytes on disk.');
  lines.push('');
  lines.push('| upstream path | words | sha256 |');
  lines.push('|---|---|---|');
  for (const f of entry.files) lines.push(`| ${f.path} | ${f.words} | ${f.sha256} |`);
  for (const f of entry.folded) lines.push(`| ${f.path} (folded below) | ${f.words} | ${f.sha256} |`);
  if (entry.missing.length) {
    lines.push('');
    lines.push(`Not present upstream at this commit (recorded, not silently dropped): ${entry.missing.join(', ')}.`);
  }
  for (const f of folded) {
    lines.push('');
    lines.push(`## Folded: ${f.path}`);
    lines.push('');
    lines.push(`Collected verbatim; under the ${MIN_WORDS}-word floor as a standalone document (${f.words} words).`);
    lines.push('');
    lines.push(f.content.trimEnd());
  }
  lines.push('');
  return lines.join('\n');
}

main().catch(err => { console.error(err); process.exit(1); });
