---
source: github.com/curl/curl
commit: 8eb978b9c212068371c39b37be1522904a790811
branch: master
license: curl (MIT-style)
tier: audited
fetched_at: 2026-08-16T16:47:35.756Z
---

# curl/curl — provenance and security record

The data-transfer engine embedded in cars, TVs, servers and billions of devices; one of the most widely deployed C codebases in existence.

## Security review record

Independently audited twice with public reports: Cure53 (2016) and Trail of Bits, coordinated by OSTIF (2022). Continuously fuzzed in Google OSS-Fuzz. Documents its whole vulnerability-handling process in-tree.

- Cure53 penetration test and source audit of curl, 2016 — https://cure53.de/pentest-report_curl.pdf
- Trail of Bits security review of curl, 2022 (OSTIF) — https://github.com/trailofbits/publications
- curl vulnerability disclosure policy (collected in-tree below)

## Files collected at commit 8eb978b9c212068371c39b37be1522904a790811

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| docs/VULN-DISCLOSURE-POLICY.md | 3177 | f7828eb196fdb7c0dfd8baca222db6016fa535d54926c14b0c74b16343ca518b |
| lib/url.c | 8438 | af40462b7534d970b643300336e91251c922273858628c2d659faa148e67de22 |
| lib/http.c | 16884 | 83fbd4f749479bac89f01819c0506c4b3713522e1cec544b1bbfc9f90cedd3f6 |
| COPYING (folded below) | 174 | 82f2f4427d6545ee5aaac4f0b80428da6cc8ba41c2cf5da3a03680ec327b9681 |
| README (folded below) | 213 | 4e3177f14f86cac279e34a80001da61fdf0476f68cf647c9b52f5422d7a132a0 |

## Folded: COPYING

Collected verbatim; under the 600-word floor as a standalone document (174 words).

COPYRIGHT AND PERMISSION NOTICE

Copyright (c) 1996 - 2026, Daniel Stenberg, <daniel@haxx.se>, and many
contributors, see the THANKS file.

All rights reserved.

Permission to use, copy, modify, and distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright
notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF THIRD PARTY RIGHTS. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall not
be used in advertising or otherwise to promote the sale, use or other dealings
in this Software without prior written authorization of the copyright holder.

## Folded: README

Collected verbatim; under the 600-word floor as a standalone document (213 words).

                                  _   _ ____  _
                              ___| | | |  _ \| |
                             / __| | | | |_) | |
                            | (__| |_| |  _ <| |___
                             \___|\___/|_| \_\_____|

README

  Curl is a command line tool for transferring data specified with URL
  syntax. Find out how to use curl by reading the curl.1 man page or the
  MANUAL document. Find out how to install Curl by reading the INSTALL
  document.

  libcurl is the library curl is using to do its job. It is readily
  available to be used by your software. Read the libcurl.3 man page to
  learn how.

  You find answers to the most frequent questions we get in the FAQ.md
  document.

  Study the COPYING file for distribution terms.

  Those documents and more can be found in the docs/ directory.

CONTACT

  If you have problems, questions, ideas or suggestions, please contact us
  by posting to a suitable mailing list. See https://curl.se/mail/

  All contributors to the project are listed in the THANKS document.

WEBSITE

  Visit the curl website for the latest news and downloads:

  https://curl.se/

GIT

  To download the latest source code off the GIT server, do this:

  git clone https://github.com/curl/curl

  (you get a directory named curl, filled with the source code)

SECURITY PROBLEMS

  Report suspected security problems privately and not in public.

  https://curl.se/dev/vuln-disclosure.html
