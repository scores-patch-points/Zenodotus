---
source: github.com/kubernetes/kubernetes
commit: a231bf3f37761e8955eefba61855da1a526a3eb9
branch: master
license: Apache-2.0
tier: audited
fetched_at: 2026-08-16T16:47:46.537Z
---

# kubernetes/kubernetes — provenance and security record

The orchestration layer most of the world's production container workloads run on.

## Security review record

CNCF-commissioned third-party security audits with public reports: Trail of Bits with Atredis Partners (2019) and a follow-up audit (2023), both published through the Kubernetes security SIG.

- Kubernetes third-party security audits (SIG Security) — https://github.com/kubernetes/sig-security

## Files collected at commit a231bf3f37761e8955eefba61855da1a526a3eb9

Every file below was fetched at the pinned commit; re-fetching that commit
must reproduce these checksums. `scripts/vet-source-code.mjs` re-verifies
them against the bytes on disk.

| upstream path | words | sha256 |
|---|---|---|
| LICENSE | 1581 | cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30 |
| pkg/kubelet/kubelet.go | 11070 | c29e8a38ccc588d881e77efd7520d20d07c6b21bdca5db3826bdc03e620a9b85 |
| README.md (folded below) | 435 | ca72a02de7afff935feb2beb5c670b758617eac433a8473703ed151f9641bb62 |
| SECURITY_CONTACTS (folded below) | 87 | 0cbc1bd2cd1c38d1692c78dfa85ece3c78de7a36d014ca95807402c08c7e973b |

## Folded: README.md

Collected verbatim; under the 600-word floor as a standalone document (435 words).

# Kubernetes (K8s)

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/569/badge)](https://bestpractices.coreinfrastructure.org/projects/569) [![Go Report Card](https://goreportcard.com/badge/github.com/kubernetes/kubernetes)](https://goreportcard.com/report/github.com/kubernetes/kubernetes) ![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/kubernetes/kubernetes?sort=semver)

<img src="https://github.com/kubernetes/kubernetes/raw/master/logo/logo.png" width="100">

----

Kubernetes, also known as K8s, is an open source system for managing [containerized applications]
across multiple hosts. It provides basic mechanisms for the deployment, maintenance,
and scaling of applications.

Kubernetes builds upon a decade and a half of experience at Google running
production workloads at scale using a system called [Borg],
combined with best-of-breed ideas and practices from the community.

Kubernetes is hosted by the Cloud Native Computing Foundation ([CNCF]).
If your company wants to help shape the evolution of
technologies that are container-packaged, dynamically scheduled,
and microservices-oriented, consider joining the CNCF.
For details about who's involved and how Kubernetes plays a role,
read the CNCF [announcement].

----

## To start using K8s

See our documentation on [kubernetes.io].

Take a free course on [Scalable Microservices with Kubernetes].

To use Kubernetes code as a library in other applications, see the [list of published components](https://git.k8s.io/kubernetes/staging/README.md).
Use of the `k8s.io/kubernetes` module or `k8s.io/kubernetes/...` packages as libraries is not supported.

## To start developing K8s

The [community repository] hosts all information about
building Kubernetes from source, how to contribute code
and documentation, who to contact about what, etc.

If you want to build Kubernetes right away there are two options:

##### You have a working [Go environment].

```
git clone https://github.com/kubernetes/kubernetes
cd kubernetes
make
```

##### You have a working [Docker environment].

```
git clone https://github.com/kubernetes/kubernetes
cd kubernetes
make quick-release
```

For the full story, head over to the [developer's documentation].

## Support

If you need support, start with the [troubleshooting guide],
and work your way through the process that we've outlined.

That said, if you have questions, reach out to us
[one way or another][communication].

[announcement]: https://cncf.io/news/announcement/2015/07/new-cloud-native-computing-foundation-drive-alignment-among-container
[Borg]: https://research.google.com/pubs/pub43438.html?authuser=1
[CNCF]: https://www.cncf.io/about
[communication]: https://git.k8s.io/community/communication
[community repository]: https://git.k8s.io/community
[containerized applications]: https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/
[developer's documentation]: https://git.k8s.io/community/contributors/devel#readme
[Docker environment]: https://docs.docker.com/engine
[Go environment]: https://go.dev/doc/install
[kubernetes.io]: https://kubernetes.io
[Scalable Microservices with Kubernetes]: https://www.udacity.com/course/scalable-microservices-with-kubernetes--ud615
[troubleshooting guide]: https://kubernetes.io/docs/tasks/debug/

## Community Meetings 

The [Calendar](https://www.kubernetes.dev/resources/calendar/) has the list of all the meetings in the Kubernetes community in a single location.

## Adopters

The [User Case Studies](https://kubernetes.io/case-studies/) website has real-world use cases of organizations across industries that are deploying/migrating to Kubernetes.

## Governance 

Kubernetes project is governed by a framework of principles, values, policies and processes to help our community and constituents towards our shared goals.

The [Kubernetes Community](https://github.com/kubernetes/community/blob/master/governance.md) is the launching point for learning about how we organize ourselves.

The [Kubernetes Steering community repo](https://github.com/kubernetes/steering) is used by the Kubernetes Steering Committee, which oversees governance of the Kubernetes project.

## Roadmap 

The [Kubernetes Enhancements repo](https://github.com/kubernetes/enhancements) provides information about Kubernetes releases, as well as feature tracking and backlogs.

## Folded: SECURITY_CONTACTS

Collected verbatim; under the 600-word floor as a standalone document (87 words).

# Defined below are the security contacts for this repo.
#
# They are the contact point for the Security Response Committee (SRC) to reach out
# to for triaging and handling of incoming issues.
#
# The below names agree to abide by the
# [Embargo Policy](https://git.k8s.io/security/private-distributors-list.md#embargo-policy)
# and will be removed and replaced if they violate that agreement.
#
# To contact the SRC, please see https://github.com/kubernetes/committee-security-response#contacting-the-src
#
# DO NOT REPORT SECURITY VULNERABILITIES DIRECTLY TO THESE NAMES, FOLLOW THE
# INSTRUCTIONS AT https://kubernetes.io/security/

committee-security-response
