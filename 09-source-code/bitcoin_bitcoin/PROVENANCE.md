---
source: github.com/bitcoin/bitcoin
commit: c90c23d388f66b7eef67f4c6f69184c088727d6a
branch: master
license: MIT
tier: audited
fetched_at: 2026-08-16T16:47:50.250Z
---

# bitcoin/bitcoin — provenance and security record

Consensus-critical code where any exploitable defect is directly monetizable at global scale.

## Security review record

No single commissioned audit; instead the most sustained adversarial review environment in open source — every line of consensus code defends real value, and the project's review and disclosure culture is built around that fact (policy in-tree).

- Bitcoin Core security policy (collected in-tree below)

## Files collected at commit c90c23d388f66b7eef67f4c6f69184c088727d6a

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| doc/developer-notes.md | 5991 | 89cd8efadc27eb20d8b0f1fb4d22edad0099a5192becbe3b5bfe98bc0d5d87ca |
| src/validation.cpp | 27987 | f96522f7528393e09462faa1ac2e5c89f4f2a149ec554ff978a331a8edec852b |
| src/script/interpreter.cpp | 4722 | 57a6f328c7e6202f499e48366a86eb26e09c8ebb78e92eef7e839207230be333 |
| COPYING (folded below) | 178 | b028769f3852a9368ab10bd754ff01ebb741f84a2fa658c9aff82a631bc6ecfc |
| SECURITY.md (folded below) | 130 | c2a2223402183e8673bb1d9e157afddfee496c32366d5cdc45a5ca3ce6e78c57 |

## Folded: COPYING

Collected verbatim; under the 600-word floor as a standalone document (178 words).

The MIT License (MIT)

Copyright (c) 2009-2026 The Bitcoin Core developers
Copyright (c) 2009-2026 Bitcoin Developers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Folded: SECURITY.md

Collected verbatim; under the 600-word floor as a standalone document (130 words).

# Security Policy

## Supported Versions

See our website for versions of Bitcoin Core that are currently supported with
security updates: https://bitcoincore.org/en/lifecycle/#schedule

## Reporting a Vulnerability

To report security issues send an email to security@bitcoincore.org (not for support).

The following keys may be used to communicate sensitive information to developers:

| Name | Fingerprint |
|------|-------------|
| Michael Ford | E777 299F C265 DD04 7930  70EB 944D 35F9 AC3D B76A |
| Ava Chow | 1528 1230 0785 C964 44D3  334D 1756 5732 E08E 5E41 |
| Niklas Gögge | 2CBB F208 E594 BF43 9B5F 276C 7465 CFFF 6793 242E |

You can import a key by running the following command with that individual’s fingerprint: `gpg --keyserver hkps://keys.openpgp.org --recv-keys "<fingerprint>"` Ensure that you put quotes around fingerprints containing spaces.
