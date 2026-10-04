# CV look-loop reading — Computational methods for estimation of parameters in hyperbolic systems

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 560 chars)
```
NASA Contractor Report 172234

ICASE

COMPUTATIONAL METHODS FOR ESTIMATION OF
PARAMETERS IN HYPERBOLIC SYSTEMS

H. T. Banks
K. Ito
K. A. Murphy

Contract Nos. NAS1-15810, NAS1-16394, NAS1-17070

NAS1-17130
September 1983

NASA ~CR-1 72,234

NASA-CR-172234
19830028501

INSTITUTE FOR COMPUTER APPLICATIONS IN SCIENCE AND ENGINEERING
NASA Langley Research Center, Hampton, Virginia 23665

Operated by the Universities Space Research Association

NASA

National Aeronautics and
Space Administration

Langley Research Center
Hampton, Virginia 23665

BTON, VIRGINIA
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 1277 chars)
```
COMPUTATIONAL METHODS FOR ESTIMATION OF
PARAMETERS IN HYPERBOLIC SYSTEMS

H. T. Banks*
Brown University
and
Southern Methodist University

Ke to**

Institute for Computer Applications in Science and Engineering

K. A. Murphy”
Brown University
and
Southern Methodist University

ABSTRACT

We discuss approximation techniques for estimating spatially varying
coefficients and unknown boundary parameters in second order hyperbolic
systems. Methods for state approximation (cubic splines, tau-Legendre) and
approximation of function space parameters (interpolatory splines) are
outlined and numerical findings for use of the resulting schemes in model "1-D

seismic inversion" problems are summarized.

*part of this research was carried out while the first author was a visitor at
ICASE, NASA Langley Research Center, Hampton, VA, which is operated under NASA
Contract Nos. NAS1-15810 and NAS1-16394. This research was also supported in
part by NSF Grant No. MCS-8205335, by AFOSR Contract No. 81-0198, and ARO
Contract No. ARO-DAAG-29-79-C-0161.

**Research supported by the National Aeronautics and Space Administration

under NASA Contract Nos. NAS1-17070 and NASI-17130 while the author was in
resi
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 1685 chars)
```
1. Introduction. We discuss here some of our continuing efforts
on the development of computational techniques for estimation or
"identification" of parameters in second order hyperbolic systems (e.g.,
the acoustic wave equation). The parameters of interest include bound-
ary parameters such as coefficients of elasticity and source terms in
elastic boundary conditions as well as spatially varying moduli of
elasticity in the partial differential equation itself. Among the
features of our approach are the following: We do not require an impulse
or delta function for the source term; indeed the source term need not
even be parameterized a priori (although it is in the numerical examples
presented below). Furthermore, the elastic moduli in the system
equations can be estimated with or without a priori parameterization
(i.e., assumption of a specific form or shape class). Our ideas are
in principle, applicable to vector systems in appropriately defined
multidimensional domains.

We combine results from the theory of dissipative operators, linear
semigroups, approximation theory (splines, spectral methods), and
optimization techniques in our attempts to develop theoretically sound
and nu
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 1711 chars)
```
~2-

Here p is the medium mass density and E is an elastic modulus in (1)
while the boundary condition (2) is an elastic surface (x=0) condition
involving a restoring force parameter ky as well as a parameter (q)

dependent source term S. This source term is assumed to be the result
of a perturbing shock to the medium which occurs on the surface at some
distance from the point of observation. The medium is initially at rest
(initial conditions (4)) and it is assumed that no waves are reflected
at a finite lower boundary (x=1); this is given by the absorbing bound-
ary condition (3)--(this condition can be obtained formally by factoring

the equation (1) at x=1 and taking ky = ¥ E(1)/p(1)). We make the
physically motivated assumptions ky <0, ky > 0 throughout

Our model problem consists of using observations of the system (1) -
(4) to estimate the parameters q = (0,E,k,,k,,4). More precisely
we consider the mathematical problem of minimizing the fit-to-data

criterion

“ 2
(5) Sq) = J Jace, x59) - y,,1
Pa J
i,j >
over a given admissible parameter set Q. Here we assume we have obser-
vations Yj for u(t, 5x5 )-> (the "bore hole" problem)--or for u(t, ,0)--
(the “surface seismic" probl
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 1374 chars)
```
As our state space we choose Z = (0,1) x #°(0,1) with parameter
dependent inner product

1 1
= ‘wt -
<ZsW? 4 J Ez wy dx E(0)k, 2, (0)w, (0) + f pz wodx 7

for z= (24 529)> we (wy Wy) in Z. Under reasonable assumptions on
po, E and ki

alent to the usual xt x #° topology. The transformed system (6) can
then be written in abstract form as (we don't distinguish between a
vector and its transpose)

this yields a Hilbert space Z = 2(q) with topology equiv-

z(t) = A(q)2(t) + G(t,q)

z(0) = ®(q)

7)

where z = Wsv,)5 ® = (¢,¥), G = (0,g), and the operator A(q) defined
2

on dom(A(q)) = {2 EH? xu" | 2f(0) + kyz,(0) = 0, zy (1) + ky2}(1) = 0}

is given by

A(q) = .

Lage
p ox Fax) p

It can then be shown that under boundedness assumptions on Q, there
exists a constant w independent of q in Q such that A(q) - wl is
dissipative in Z (i.e., <A(q)z,2> < w<z,z>). Furthermore A(q) generates
a strongly continuous semigroup S(t;q), t > 0, that is the family of
solution operators for (7).

This framework provides a convenient setting for discussion of
semidiscrete approximation schemes (and their convergence properties)
for solving the problem of minimizing (5) over Q. In the case under
considerati
```
### Page 8
(no discrete labeled regions — full-page Tesseract OCR: 1962 chars)
```
-4-

Abstractly, one approximates (7)--at least in its state variable--
by choosing a sequence of finite dimensional subspaces 2s, N=1,2,...,

of the state space Z. Letting pN be the projection of Z onto 2 and
a’, 2N > 2N be a family of approximating operators for A, one can

define the sequence of approximating systems in zN by

aN (ey = aN(qy2%cey + PNe(t,a)
(8)

Parc) = pXy

and the corresponding fit-to-data criterion

@)  3%q) = 3 [2h(eg) ay) ~ 94517

The problem of minimizing a over Q is then a finite dimensional state
problem which can in some cases (e.g., when the functional parameters

are assumed in parameteric form) be readily solved for approximate
parameters x, N=1,2,... . In this situation one then desires to

argue that the sequence ta} (or some subsequence) converges to a
parameter q* in Q that provides a minimum for (5). However, in other
cases where the parameter functions (such as p and E in (1)) are not
assumed to possess a priori finite dimensional Parameterizations, the
problems involving (8), (9) still entail optimizations over an infinite
dimensional set and thus a parameter approximation scheme must further
be introduced before the approximating problems are
```
