---
source: github.com/git/git
commit: 745601a9a94110d74769ab605ccd4f61339758d2
branch: master
license: GPL-2.0
tier: audited
fetched_at: 2026-08-16T16:47:37.793Z
---

# git/git — provenance and security record

The version-control system underneath nearly all modern software development.

## Security review record

Full source-code security audit by X41 D-Sec (2023), commissioned by OSTIF with GitLab; report public.

- X41 D-Sec source code audit of Git, 2023 (OSTIF/GitLab) — https://x41-dsec.de/static/reports/X41-OSTIF-Gitlab-Git-Security-Audit-20230117-public.pdf

## Files collected at commit 745601a9a94110d74769ab605ccd4f61339758d2

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| COPYING | 3073 | 5b2198d1645f767585e8a88ac0499b04472164c0d2da22e75ecf97ef443ab32e |
| Documentation/CodingGuidelines | 5112 | 775a38e4d9152784db3eeafa377eab4d5d6d5eea1094c82fa697542b86935ee0 |
| refs.c | 8939 | c0e5406b2d198ff26a9da541c85363a48e39fa6c012bc7e82569c7f60298460b |
| builtin/commit.c | 5095 | 3404e51612fd63c284275c9d9a98b16dd4eeea80d650339643ae60b18207a121 |
| README.md (folded below) | 451 | da0bd9ed3f4ef6046ba391493911a36284db2515f9ee1771d4f02adeb2de8b05 |

## Folded: README.md

Collected verbatim; under the 600-word floor as a standalone document (451 words).

[![GitHub build status](https://github.com/git/git/workflows/CI/badge.svg)](https://github.com/git/git/actions?query=branch%3Amaster+event%3Apush)
[![GitLab build status](https://gitlab.com/git-scm/git/badges/master/pipeline.svg)](https://gitlab.com/git-scm/git/-/pipelines?ref=master)

Git - fast, scalable, distributed revision control system
=========================================================

Git is a fast, scalable, distributed revision control system with an
unusually rich command set that provides both high-level operations
and full access to internals.

Git is an Open Source project covered by the GNU General Public
License version 2 (some parts of it are under different licenses,
compatible with the GPLv2). It was originally written by Linus
Torvalds with help of a group of hackers around the net.

Please read the file [INSTALL][] for installation instructions.

Many Git online resources are accessible from <https://git-scm.com/>
including full documentation and Git related tools.

See [Documentation/gittutorial.adoc][] to get started, then see
[Documentation/giteveryday.adoc][] for a useful minimum set of commands, and
`Documentation/git-<commandname>.adoc` for documentation of each command.
If git has been correctly installed, then the tutorial can also be
read with `man gittutorial` or `git help tutorial`, and the
documentation of each command with `man git-<commandname>` or `git help
<commandname>`.

CVS users may also want to read [Documentation/gitcvs-migration.adoc][]
(`man gitcvs-migration` or `git help cvs-migration` if git is
installed).

The user discussion and development of Git take place on the Git
mailing list -- everyone is welcome to post bug reports, feature
requests, comments and patches to git@vger.kernel.org (read
[Documentation/SubmittingPatches][] for instructions on patch submission
and [Documentation/CodingGuidelines][]).

Those wishing to help with error message, usage and informational message
string translations (localization l10) should see [po/README.md][]
(a `po` file is a Portable Object file that holds the translations).

To subscribe to the list, send an email to <git+subscribe@vger.kernel.org>
(see https://subspace.kernel.org/subscribing.html for details). The mailing
list archives are available at <https://lore.kernel.org/git/>,
<https://marc.info/?l=git> and other archival sites.

Issues which are security relevant should be disclosed privately to
the Git Security mailing list <git-security@googlegroups.com>.

The maintainer frequently sends the "What's cooking" reports that
list the current status of various development topics to the mailing
list.  The discussion following them give a good reference for
project status, development direction and remaining tasks.

The name "git" was given by Linus Torvalds when he wrote the very
first version. He described the tool as "the stupid content tracker"
and the name as (depending on your mood):

 - random three-letter combination that is pronounceable, and not
   actually used by any common UNIX command.  The fact that it is a
   mispronunciation of "get" may or may not be relevant.
 - stupid. contemptible and despicable. simple. Take your pick from the
   dictionary of slang.
 - "global information tracker": you're in a good mood, and it actually
   works for you. Angels sing, and a light suddenly fills the room.
 - "goddamn idiotic truckload of sh*t": when it breaks

[INSTALL]: INSTALL
[Documentation/gittutorial.adoc]: Documentation/gittutorial.adoc
[Documentation/giteveryday.adoc]: Documentation/giteveryday.adoc
[Documentation/gitcvs-migration.adoc]: Documentation/gitcvs-migration.adoc
[Documentation/SubmittingPatches]: Documentation/SubmittingPatches
[Documentation/CodingGuidelines]: Documentation/CodingGuidelines
[po/README.md]: po/README.md
