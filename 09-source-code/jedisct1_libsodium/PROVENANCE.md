---
source: github.com/jedisct1/libsodium
commit: e6324db75c453ee8de91065f48b692362c0c2b65
branch: master
license: ISC
tier: audited
fetched_at: 2026-08-16T16:47:43.058Z
---

# jedisct1/libsodium — provenance and security record

The misuse-resistant cryptography library that a generation of applications standardized on for NaCl-style crypto.

## Security review record

Independent security assessment (2017), funded by Private Internet Access, with a public report.

- libsodium security assessment, 2017 (funded by Private Internet Access)

## Files collected at commit e6324db75c453ee8de91065f48b692362c0c2b65

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| src/libsodium/crypto_pwhash/argon2/argon2.c | 811 | 1e85bab3b4195fe16bdf5b37acae3e788b8bd3674b6a085673d4bbd0f5fb9852 |
| src/libsodium/sodium/utils.c | 1460 | a1c5d4bca5af3f7535c390ea41e0850d235817b4c2f624a9190b9b76993f6871 |
| LICENSE (folded below) | 136 | 508a76d186356c0dd807a670ef510964f8724557024796a2c426c6c0e19ab683 |
| README.markdown (folded below) | 304 | 912320deaa456b6f3b43f3ab5467cb5870da98160552d6a1cfdb7a59179f45dc |

## Folded: LICENSE

Collected verbatim; under the 600-word floor as a standalone document (136 words).

/*
 * ISC License
 *
 * Copyright (c) 2013-2026
 * Frank Denis <j at pureftpd dot org>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

## Folded: README.markdown

Collected verbatim; under the 600-word floor as a standalone document (304 words).

[![GitHub CI](https://github.com/jedisct1/libsodium/workflows/CI/badge.svg)](https://github.com/jedisct1/libsodium/actions)
[![Coverity Scan Build Status](https://scan.coverity.com/projects/2397/badge.svg)](https://scan.coverity.com/projects/2397)
[![Azure build status](https://jedisct1.visualstudio.com/Libsodium/_apis/build/status/jedisct1.libsodium?branchName=stable)](https://jedisct1.visualstudio.com/Libsodium/_build/latest?definitionId=3&branchName=stable)
[![CodeQL scan](https://github.com/jedisct1/libsodium/workflows/CodeQL%20scan/badge.svg)](https://github.com/jedisct1/libsodium/actions)

# ![libsodium](https://raw.github.com/jedisct1/libsodium/master/logo.png)

Sodium is an easy-to-use software library that provides a wide range of cryptographic operations including encryption, decryption, digital signatures, and secure password hashing.

It is a portable, cross-compilable, installable, and packageable fork of [NaCl](http://nacl.cr.yp.to/). While maintaining API compatibility, libsodium extends functionality to improve usability and simplify the development of secure applications.

---

## Key Features

- **Encryption & Decryption:** Securely encrypt and decrypt data with modern algorithms.
- **Digital Signatures:** Create and verify signatures to ensure data authenticity.
- **Cross-Platform Compatibility:** Supported on Windows (MinGW and Visual Studio, x86, x64 and arm64), iOS, Android, JavaScript, and WebAssembly.
- **User-Friendly API:** Designed to provide all core cryptographic operations while remaining easy to integrate into your projects.

---

## Documentation

- [Installation](https://doc.libsodium.org/installation)
- [Quickstart](https://doc.libsodium.org/quickstart)
- [Full Documentation](https://doc.libsodium.org)
- [Releases](https://download.libsodium.org/libsodium/releases/)
- [Integrity Checking](https://doc.libsodium.org/installation#integrity-checking)

---

## Versioning

libsodium uses a two-tier release system:

- **Point releases** (e.g., 1.0.19, 1.0.20, 1.0.21) are tagged when new features are added or significant changes are made.
- **Stable releases** are frequent maintainance updates between point releases. They fix minor issues while remaining fully compatible with their parent point release. No new features, no breaking changes.

If your application depends on a specific point release, stable updates are safe to apply. Security fixes go to the `stable` branch immediately, with a new point release tagged shortly after.

---

## Contributors

### Code Contributors

This project thrives thanks to the valuable contributions from our community. View all the [contributors](https://github.com/jedisct1/libsodium/graphs/contributors):

<a href="https://github.com/jedisct1/libsodium/graphs/contributors">
  <img src="https://opencollective.com/libsodium/contributors.svg?width=890&button=false" alt="Contributors">
</a>

### Financial Contributors

Your financial support helps us sustain and further develop libsodium.

- [Become a Financial Contributor](https://opencollective.com/libsodium/contribute)

#### Individuals

<a href="https://opencollective.com/libsodium">
  <img src="https://opencollective.com/libsodium/individuals.svg?width=890" alt="Individual Contributors">
</a>

#### Organizations

Support libsodium with your organization and gain visibility through your logo and website link.

- [Support with Your Organization](https://opencollective.com/libsodium/contribute)

<a href="https://opencollective.com/libsodium/organization/0/website">
  <img src="https://opencollective.com/libsodium/organization/0/avatar.svg" alt="Organization Contributor">
</a>

---

## License

This project is distributed under the [ISC license](https://en.wikipedia.org/wiki/ISC_license).
