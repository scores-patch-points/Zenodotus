# 09 — Source Code

Collected source files, licences and substantive upstream documentation from
major open-source projects. This file is repo-authored (an index, not a
prior); everything else in this section except `VETTING.md` is collected
upstream material.

## Two tiers

**Audited tier** — projects selected because their security posture is
*externally documented*: a published third-party audit, machine-checked
formal verification, or a continuous audit process. Fetched by
`scripts/fetch-audited-code.mjs` at **pinned commits**: the branch head is
resolved to a SHA before fetching, every file's sha256 is recorded in
`manifests/audited-code-manifest.json`, and `scripts/vet-source-code.mjs`
re-verifies the bytes on disk against those checksums on every run. Each
directory carries a `PROVENANCE.md` with the pinned commit, the security
review record with citations, per-file checksums, and any short collected
documents (licences, security policies) folded in rather than dropped.

| repo | why it is here |
|---|---|
| `curl_curl` | Audited by Cure53 (2016) and Trail of Bits/OSTIF (2022); fuzzed continuously |
| `git_git` | Full source audit by X41 D-Sec (2023, OSTIF/GitLab) |
| `openssl_openssl` | NCC Group audit (2016, Core Infrastructure Initiative) |
| `openssh_openssh-portable` | OpenBSD's continuous proactive audit process |
| `jedisct1_libsodium` | Independent assessment (2017, funded by Private Internet Access) |
| `WireGuard_wireguard-go` | Protocol formally verified in Tamarin; NDSS 2017 |
| `kubernetes_kubernetes` | CNCF audits: Trail of Bits + Atredis (2019), follow-up (2023) |
| `aws_s2n-tls` | Machine-checked proofs (SAW/Cryptol) running in CI |
| `bitcoin_bitcoin` | Sustained adversarial review; defects directly monetizable |
| `apache_httpd` | EU-FOSSA pilot audit target (2016) |
| `signalapp_libsignal` | Signal protocol formally analyzed (EuroS&P 2017, ProVerif) |

**Landmark tier** — the original 20 repos (Linux, CPython, PostgreSQL, Go,
TypeScript, ripgrep, and so on), fetched 2026-08-03 by
`scripts/fetch-code-repos.mjs` from branch heads *without* pinning. Their
origin commits are unknown; their bytes are checksummed by the vetting pass,
so they are tamper-evident from now on but not reproducible from upstream.
That asymmetry is a known limit, stated in `VETTING.md`, not papered over.

## Vetting

`VETTING.md` (generated — do not edit by hand) is the section's security
record. It keeps two claims apart: *provenance* vetting (the named third
parties audited these projects — their work, cited per repo) and *content*
vetting (this repo's mechanical scan of the collected bytes: trojan-source
bidi controls per CVE-2021-42574, invisible codepoints, credential-shaped
strings, private-key material, binary smuggling, checksum verification).
Findings are never deleted — expected ones are adjudicated with the reason
printed next to them. Nothing in this corpus is ever executed; consumers
read these files as documents.

```bash
node scripts/fetch-audited-code.mjs   # re-fetch audited tier (re-pins)
node scripts/vet-source-code.mjs      # re-vet everything; exit 1 on FAIL
```

Both run as part of `scripts/run-all.mjs`.
