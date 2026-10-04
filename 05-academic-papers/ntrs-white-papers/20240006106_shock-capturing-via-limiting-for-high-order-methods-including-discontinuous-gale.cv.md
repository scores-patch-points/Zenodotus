# CV look-loop reading — Shock Capturing via Limiting for High-Order Methods including Discontinuous Galerkin

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 1953 chars)
```
2 Preliminaries

For any nonnegative integer m, let Pm be the space of polynomials of degree m or less.

For any two functions v and w on / = [—1,1], denote (v, w) = (v,w); = Ly v(é)w(S) dé.

We need the Legendre polynomials to define the Radau polynomials. Let the Legendre polynomial
L, on I be defined as the unique polynomial of degree k that satisfies L,(1) = 1 and Ly is orthogonal
to Px-1 (or Ly | Px-1), ie., (Le, €") = Ly Ly(@E™ dé = 0, for m = 0,1,...,k — 1. The first few
Legendre polynomials are

3é7-1 5&3 —3€ 35é4 — 3067 +3
Llo=1, Ly=§, Lg = z L3=—y— and Ly = ———35———.
The zeros of Ly are the k Gauss points.

Fig. 2.1(a) shows the graphs of the above Legendre polynomials; the dots, which represent the zeros.
of L4, are the 4 Gauss points.

(2.1)

Lo

eal

N

—

ap Ff

a
—

> - =().5 NN ols

(a) Legendre polynomials (b) Left Radau polynomials

A
[bs

Eo)
Re
‘

LO.

Fig. 2.1: (a) The graphs of the Legendre polynomials L;,,k = 0,..., 4; the dots represent the 4 Gauss.
points. (b) The graphs of the left Radau polynomials R;,,,k = 4; the dots represent the 4 left
Radau points. The left Radau polynomials approximate a unit jump (up) at the right boundary.

The Radau quadrature fo
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 2797 chars)
```
The corresponding Rp, ;, can easily be obtained by Rr x (§) = Ry, e(—€).-
Since both L;, and L,_1 are orthogonal to P,_2, both Radau polynomials also have this property:
Rie L Pez, and Ray Ll Pp_2- (2.5a,b)

Let the step-down function Sp and step-up function Sy on J be defined respectively by

_f{1 for §€=-1 _(0 for-1<é<1
Sv) ={6 for -1<e<1 md Sus) ={ 1 for €=1. (2.6a,b)
On /,Sp represents a unit jump (down) at € = —1, and Sy represents a unit jump (up) at € = 1.

The right Radau polynomial Rp ; can be considered as an approximation to the step-down function
Sp since Re x(-1) = 1, Rax(1) =0, and Rex approximates 0 on (—1,1] in the sense that
Rr 1 Pr_2,i€., (Raw é&™) = 0 form = 0,1,...,k — 2.In other words, except for the two conditions
at the boundaries, namely (2.4a,b), Rp,, utilizes the rest of the conditions (k —1 of them) to
approximate 0 in the sense of orthogonality or projection: Rp x  Px-2-

Similarly, the left Radau polynomial R,, approximates Sy.

The above discussion implies that the left and right Radau polynomials can be employed to
approximate the jumps at the cell interfaces for the DG method as will be discussed below.

The zeros of R,, are the k left Radau points, 
```
### Page 5
- Region b1 (pixel area [255,276,144,87]): "“9.4"
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 3023 chars)
```
Assume that the data uj ,(t") = uj, are known for all cells. We wish to calculate (uj), or
equivalently (up)¢. The initial condition wo (x) can be discretized by using the values at the p + 1
Gauss points in each cell. The resulting nodal data can easily be transformed into modal form (3.4).

As is routine, to involve data interaction among cells, at each interface j + 1/2, we define a value
common for the two adjacent cells j and j + 1 by upwinding: using the reference frame,

win = 4). (3.5)

The DG method can be cast as follows (for the proof, see Appendix C). In each cell j, we reconstruct
the solution by a polynomial of degree p + 1, one degree higher than that of u;, denoted by Uj, and

defined by p + 2 conditions. At the two interfaces, U; takes on the common (upwind) values,
upw

Uj(-1) = wet =uj1(1) and Uj(1) = Ujsij2 = uj (1). (3.6a,b)

For the remaining p conditions, we require that U;(§) approximates u; (¢) as closely as possible through
projection:

(Uj — uj) -L Pp-1- (3.7)
The degree p + 1 for U; serves the purpose that (Uj), which yields (up,)¢, matches the degree of u;.

Focussing on cell j, at the left interface, we have the following jump denoted by J,:

Uj(-) -yu
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 2195 chars)
```
On the other hand, the left Radau points play an important role in the interpolation between (Gj I;) le
and (u),- At the left boundary € = —1,

k +1)?
(W)D= w)d-1.$

However, at the p interior points of the p + 1 left Radau points, by (2.11), (Yj), equals (uj). Thus, at

the left Radau points, the “correction” to (uj) e in the form (U;) f° is lumped to the left boundary. This

fact also relates to the sign changes of the oscillations across the left Radau points in Fig. 4.1(b) later.

u Te3)

02 04 06 08 1.0° 02 04 06 08 10°

(a) Piecewise quadratic data (b) Cubic polynomials Uj and Uj+1

Fig. 3.1: Piecewise quadratic DG method in the FR framework for advection: (a) piecewise
quadratic data; (b) cubic polynomial U; (x), which matches the upwind value at the left interface and

interpolates u; at the 3 right Radau points; (Yj), yields (up), for the DG method.

In passing, if there is also a jump at the right boundary of cell j, (e.g., the speed a changes sign in
the cell, or the centered common value is used instead of the upwind value in (3.5)), then to match the
common values at both boundaries, (3.11) must be modified to Uj = uj + Ji Rr, p41 +JRR1,p41-

With U; by (3.11), the adv
```
### Page 10
(no discrete labeled regions — full-page Tesseract OCR: 2186 chars)
```
10

If g = Rr, p+ in (4.6), the result is the DGp method. The p + 1 zeros of this g are the right Radau
points. To obtain a monotone g, we can push all the zeros to € = 1 by requiring that € = 1 is a zero of
multiplicity p + 1. Equivalently, for 1 < k < p, all derivatives to degree k vanish: g (1) = 0. Thus,

pt.

Consequently,
o'=-s0@4+0(43Y’ 49)

With U; by (4.6) and g by (4.8), the FR solution after a time step corresponding to a is given by

~ A 1-§)?
Gj = uj — 2ou; + oJ, |(p + 1) (=) : (4.10)
Hence, for our example of step-down data,

a= o@+y(*5* =e (4.11)

For p = 0, uj = 0, a constant function. For p = 0, 1, 2,..., at the left boundary, the solution values are
og, 20, 30, ... as opposed to 740,90, ... of the DG methods, i.e., ¢(p + 1) as opposed to a(p + 1)?.
At the right boundary, for all p > 1, (1) = 0 and, forl < k<p—1,a@(1)=0.

Fig. 4.2 shows (a) the graphs of monotone correction functions (4.8) of degree k = p + 1, where

p=0,...,3, and (b) the corresponding FR solutions (4.11) for the step-down data, which are
monotonically decreasing in the cell.

u

1.0
08) 10

0.8 F
o6t 06 Cell j
04 0.4
02 0.2

kad x
oS. gol 02 |o/4 of 0.8 ifo
-1.0 -0.5 0.0 0.5 1.0 .
(a) Monotone co
```
