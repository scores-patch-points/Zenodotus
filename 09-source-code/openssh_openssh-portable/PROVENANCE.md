---
source: github.com/openssh/openssh-portable
commit: 9ee20dd69537b13558ec56a37afc64920bc6ddbc
branch: master
license: BSD-style (see LICENCE)
tier: audited
fetched_at: 2026-08-16T16:47:41.447Z
---

# openssh/openssh-portable — provenance and security record

The SSH implementation on effectively every Unix system; remote administration of the internet runs through it.

## Security review record

Developed under the OpenBSD project's continuous, proactive source-audit process — the longest-running such discipline in open source — with privilege separation as a designed-in mitigation.

- OpenBSD security process — https://www.openbsd.org/security.html

## Files collected at commit 9ee20dd69537b13558ec56a37afc64920bc6ddbc

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENCE | 3114 | 5bb5b160726ef5756e4f32fe95b35249c294962419650f48d05134b486d27ccb |
| PROTOCOL | 3441 | 4a9e7f6d26d3f59deae825ab11ca34a4ffb260b47a19b5a174ddfd1ee009bca4 |
| ssh.c | 5024 | bb830a224536e1b6797448f04da408bdf2c1c8d44413bdce5be0d7f7d3bbd1f9 |
| sshkey.c | 9805 | e80e13a6494ae19175f6598b9fe448fdb9ebca40b38da57cad45207074698efe |
| README.md (folded below) | 555 | a7d14381e5bffeb73c3b83c89f72223dc82e05b7de76aef37c8301b0e3c79cd2 |

## Folded: README.md

Collected verbatim; under the 600-word floor as a standalone document (555 words).

# Portable OpenSSH

[![C/C++ CI](../../actions/workflows/c-cpp.yml/badge.svg)](../../actions/workflows/c-cpp.yml)
[![VM CI](../../actions/workflows/vm.yml/badge.svg)](../../actions/workflows/vm.yml)
[![C/C++ CI self-hosted](https://github.com/openssh/openssh-portable-selfhosted/actions/workflows/selfhosted.yml/badge.svg)](https://github.com/openssh/openssh-portable-selfhosted/actions/workflows/selfhosted.yml)
[![CIFuzz](../../actions/workflows/cifuzz.yml/badge.svg)](../../actions/workflows/cifuzz.yml)
[![Fuzzing Status](https://oss-fuzz-build-logs.storage.googleapis.com/badges/openssh.svg)](https://issues.oss-fuzz.com/issues?q="Project:+openssh"+is:open)
[![Coverity Status](https://scan.coverity.com/projects/21341/badge.svg)](https://scan.coverity.com/projects/openssh-portable)

OpenSSH is a complete implementation of the SSH protocol (version 2) for secure remote login, command execution and file transfer. It includes a client ``ssh`` and server ``sshd``, file transfer utilities ``scp`` and ``sftp`` as well as tools for key generation (``ssh-keygen``), run-time key storage (``ssh-agent``) and a number of supporting programs.

This is a port of OpenBSD's [OpenSSH](https://openssh.com) to most Unix-like operating systems, including Linux, OS X and Cygwin. Portable OpenSSH polyfills OpenBSD APIs that are not available elsewhere, adds sshd sandboxing for more operating systems and includes support for OS-native authentication and auditing (e.g. using PAM).

## Documentation

The official documentation for OpenSSH are the man pages for each tool:

* [ssh(1)](https://man.openbsd.org/ssh.1)
* [sshd(8)](https://man.openbsd.org/sshd.8)
* [ssh-keygen(1)](https://man.openbsd.org/ssh-keygen.1)
* [ssh-agent(1)](https://man.openbsd.org/ssh-agent.1)
* [scp(1)](https://man.openbsd.org/scp.1)
* [sftp(1)](https://man.openbsd.org/sftp.1)
* [ssh-keyscan(8)](https://man.openbsd.org/ssh-keyscan.8)
* [sftp-server(8)](https://man.openbsd.org/sftp-server.8)

## Stable Releases

Stable release tarballs are available from a number of [download mirrors](https://www.openssh.com/portable.html#downloads). We recommend the use of a stable release for most users. Please read the [release notes](https://www.openssh.com/releasenotes.html) for details of recent changes and potential incompatibilities.

## Building Portable OpenSSH

### Dependencies

Portable OpenSSH is built using autoconf and make. It requires a working C compiler, standard library and headers.

``libcrypto`` from one of [LibreSSL](https://www.libressl.org/), [OpenSSL](https://www.openssl.org), [AWS-LC](https://github.com/aws/aws-lc) or [BoringSSL](https://github.com/google/boringssl) may also be used.  OpenSSH may be built without any of these, but the resulting binaries will have only a subset of the cryptographic algorithms normally available.

[zlib](https://www.zlib.net/) is optional; without it transport compression is not supported.

FIDO security token support needs [libfido2](https://github.com/Yubico/libfido2) and its dependencies and will be enabled automatically if they are found.

In addition, certain platforms and build-time options may require additional dependencies; see README.platform for details about your platform.

### Building a release

Release tarballs and release branches in git include a pre-built copy of the ``configure`` script and may be built using:

```
tar zxvf openssh-X.YpZ.tar.gz
cd openssh
./configure # [options]
make && make tests
```

See the [Build-time Customisation](#build-time-customisation) section below for configure options. If you plan on installing OpenSSH to your system, then you will usually want to specify destination paths.

### Building from git

If building from the git master branch, you'll need [autoconf](https://www.gnu.org/software/autoconf/) installed to build the ``configure`` script. The following commands will check out and build portable OpenSSH from git:

```
git clone https://github.com/openssh/openssh-portable # or https://anongit.mindrot.org/openssh.git
cd openssh-portable
autoreconf
./configure
make && make tests
```

### Build-time Customisation

There are many build-time customisation options available. All Autoconf destination path flags (e.g. ``--prefix``) are supported (and are usually required if you want to install OpenSSH).

For a full list of available flags, run ``./configure --help`` but a few of the more frequently-used ones are described below. Some of these flags will require additional libraries and/or headers be installed.

Flag | Meaning
--- | ---
``--with-pam`` | Enable [PAM](https://en.wikipedia.org/wiki/Pluggable_authentication_module) support. [OpenPAM](https://www.openpam.org/), [Linux PAM](http://www.linux-pam.org/) and Solaris PAM are supported.
``--with-libedit`` | Enable [libedit](https://www.thrysoee.dk/editline/) support for sftp.
``--with-kerberos5`` | Enable Kerberos/GSSAPI support. Both [Heimdal](https://www.h5l.org/) and [MIT](https://web.mit.edu/kerberos/) Kerberos implementations are supported.
``--with-selinux`` | Enable [SELinux](https://en.wikipedia.org/wiki/Security-Enhanced_Linux) support.

## Development

Portable OpenSSH development is discussed on the [openssh-unix-dev mailing list](https://lists.mindrot.org/mailman/listinfo/openssh-unix-dev) ([archive mirror](https://marc.info/?l=openssh-unix-dev)). Bugs and feature requests are tracked on our [Bugzilla](https://bugzilla.mindrot.org/).

## Reporting bugs

_Non-security_ bugs may be reported to the developers via [Bugzilla](https://bugzilla.mindrot.org/) or via the mailing list above. Security bugs should be reported to [openssh@openssh.com](mailto:openssh.openssh.com).
