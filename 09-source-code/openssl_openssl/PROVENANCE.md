---
source: github.com/openssl/openssl
commit: 17bf6c48ea8a6af1cb90f2f2aab4bb4b9e2adfc5
branch: master
license: Apache-2.0
tier: audited
fetched_at: 2026-08-16T16:47:39.537Z
---

# openssl/openssl — provenance and security record

The TLS and cryptography library terminating most of the encrypted traffic on the internet.

## Security review record

Audited by NCC Group Cryptography Services (2016) under the Linux Foundation Core Infrastructure Initiative, the direct institutional response to Heartbleed. Continuously fuzzed in OSS-Fuzz; security policy published in-tree.

- NCC Group audit of OpenSSL, 2016 (Core Infrastructure Initiative)

## Files collected at commit 17bf6c48ea8a6af1cb90f2f2aab4bb4b9e2adfc5

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENSE.txt | 1413 | 7d5450cb2d142651b8afa315b5f238efc805dad827d91ba367d8516bc9d49e7a |
| README.md | 917 | 64464d90ab175816fb57d9241bd241d3c95f2f5229644854a3e98ae5dc888e9a |
| ssl/ssl_lib.c | 21065 | ed49d5e61d0d7b35f41fcc61229f1ab2e30aed8e7172bcdb5e54c64938b852c3 |
| crypto/evp/evp_enc.c | 4233 | 8afacee7fae28f3d42c0b43a7616a8ede4d75c53a4d98f53dabb7b262a521a26 |
