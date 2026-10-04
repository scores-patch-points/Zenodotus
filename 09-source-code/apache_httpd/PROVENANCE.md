---
source: github.com/apache/httpd
commit: dec51f1f869a8ebd7b805c6900b419f802f09680
branch: trunk
license: Apache-2.0
tier: audited
fetched_at: 2026-08-16T16:47:51.892Z
---

# apache/httpd — provenance and security record

The reference HTTP server since 1995; the project the Apache License is named after.

## Security review record

Audited under the European Commission's EU-FOSSA pilot (2016), which selected Apache HTTP Server core as one of its two audit targets.

- EU-FOSSA pilot project (European Commission, 2016)

## Files collected at commit dec51f1f869a8ebd7b805c6900b419f802f09680

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENSE | 3700 | 47b8c2b6c3309282a99d4a3001575c790fead690cc14734628c4667d2bbffc43 |
| server/core.c | 17448 | 41c37fefbdb39627bc4ddaee508ae7d9bae5aa056736f2732e247ee1e8ba83fb |
| modules/http/http_request.c | 3165 | a7095295e2915727f0d0a23e05bebce21914c51b54ba4e08a039e1522b7a4363 |
| README (folded below) | 598 | daa00b5c04882402fe0f228d8ca7f55b387b88c0c481a4b9966fdf1eb44c8e6d |

## Folded: README

Collected verbatim; under the 600-word floor as a standalone document (598 words).


# Apache HTTP Server

##  What is it?

The Apache HTTP Server is a powerful, flexible, HTTP/1.1 and HTTP/2 compliant, and widely deployed
web server.  Originally designed as a replacement for the NCSA HTTP
Server, it has been in continuous development since 1995 and remains
one of the foundational projects of the Apache Software Foundation. The
developers aim to collaboratively develop and maintain a robust,
commercial-grade, standards-based server with freely available
source code.

## The Latest Version

Details of the latest version can be found on the [Apache HTTP
server project page](https://httpd.apache.org/).

## Documentation

The documentation available as of the date of this release is
included in HTML format in the docs/manual/ directory.  The most
up-to-date documentation can be found at
[https://httpd.apache.org/docs/trunk/](https://httpd.apache.org/docs/trunk/).

## Installation

Please see the file called `INSTALL`.  Platform specific notes can be
found in `README.platforms`.

## Licensing

Please see the file called `LICENSE`.

## Cryptographic Software Notice

This distribution may include software that has been designed for use
with cryptographic software.  The country in which you currently reside
may have restrictions on the import, possession, use, and/or re-export
to another country, of encryption software.  BEFORE using any encryption
software, please check your country's laws, regulations and policies
concerning the import, possession, or use, and re-export of encryption
software, to see if this is permitted.  See 
[https://www.wassenaar.org/](https://www.wassenaar.org/)
for more information.

The U.S. Government Department of Commerce, Bureau of Industry and
Security (BIS), has classified this software as Export Commodity 
Control Number (ECCN) 5D002.C.1, which includes information security
software using or performing cryptographic functions with asymmetric
algorithms.  The form and manner of this Apache Software Foundation
distribution makes it eligible for export under the License Exception
ENC Technology Software Unrestricted (TSU) exception (see the BIS 
Export Administration Regulations, Section 740.13) for both object 
code and source code.

The following provides more details on the included files that
may be subject to export controls on cryptographic software:

Apache httpd 2.0 and later versions include the mod_ssl module under
`modules/ssl/`
for configuring and listening to connections over SSL encrypted
network sockets by performing calls to a general-purpose encryption
library, such as OpenSSL or the operating system's platform-specific
SSL facilities.

In addition, some versions of apr-util provide an abstract interface
for symmetrical cryptographic functions that make use of a
general-purpose encryption library, such as OpenSSL, NSS, or the
operating system's platform-specific facilities. This interface is
known as the `apr_crypto` interface, with implementation beneath the
`/crypto` directory. The `apr_crypto` interface is used by the
`mod_session_crypto` module available under
`modules/session`
for optional encryption of session information.

Some object code distributions of Apache httpd, indicated with the
word "crypto" in the package name, may include object code for the
OpenSSL encryption library as distributed in open source form from
[https://www.openssl.org/source/](https://www.openssl.org/source/).

The above files are optional and may be removed if the cryptographic
functionality is not desired or needs to be excluded from redistribution.
Distribution packages of Apache httpd that include the word "nossl"
in the package name have been created without the above files and are
therefore not subject to this notice.

##  Contacts

   * If you want to be informed about new code releases, bug fixes,
     security fixes, general news and information about the Apache server
     subscribe to the announce@httpd.apache.org mailing list as described under
     [https://httpd.apache.org/lists.html#http-announce](https://httpd.apache.org/lists.html#http-announce)

   * If you want freely available support for running Apache please see the
     resources at 
     [https://httpd.apache.org/support.html](https://httpd.apache.org/support.html)

   * If you have a concrete bug report for Apache please see the instructions
     for bug reporting at 
     [https://httpd.apache.org/bug_report.html](https://httpd.apache.org/bug_report.html)

   * If you want to participate in actively developing Apache please
     subscribe to the `dev@httpd.apache.org` mailing list as described at
     [https://httpd.apache.org/lists.html#http-dev](https://httpd.apache.org/lists.html#http-dev)
