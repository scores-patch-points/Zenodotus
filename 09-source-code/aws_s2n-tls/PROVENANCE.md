---
source: github.com/aws/s2n-tls
commit: 72f5db1fb96635a655ec90569ade0d500ea0555c
branch: main
license: Apache-2.0
tier: audited
fetched_at: 2026-08-16T16:47:48.192Z
---

# aws/s2n-tls — provenance and security record

AWS's TLS implementation — a rare example of formal methods running in ordinary production CI rather than in a paper.

## Security review record

Core components (HMAC, DRBG) carry machine-checked correctness proofs in SAW/Cryptol, re-checked continuously in CI ("Continuous formal verification of Amazon s2n", CAV 2018, with Galois).

- s2n-tls repository (proofs under tests/saw) — https://github.com/aws/s2n-tls

## Files collected at commit 72f5db1fb96635a655ec90569ade0d500ea0555c

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENSE | 1581 | cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30 |
| README.md | 1416 | 8dc63513011b3cb7193250ebba1e93b17bffab9b0b81a8e3ea0a7d525d1c71e9 |
| tls/s2n_handshake_io.c | 5495 | 658b60edfc2c47bb81fd348baba943af6f608e2a456a6167820c458259c54a8c |
| api/s2n.h | 12825 | afc2dd1ccd9c53528707a0780c962b2f4bfa725d5fb884837aa1d4c9292a045a |
