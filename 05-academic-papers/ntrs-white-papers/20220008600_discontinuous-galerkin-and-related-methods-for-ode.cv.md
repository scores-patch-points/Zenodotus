# CV look-loop reading — Discontinuous Galerkin and Related Methods for ODE

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 3448 chars)
```
Eleventh International Conference on ICCFD11-xxxx
Computational Fluid Dynamics (ICCFD11),
Maui, Hawaii, USA, July 11-15, 2022

Discontinuous Galerkin and Related Methods for ODE

H. T. Huynh
huynh@grc.nasa.gov

NASA Glenn Research Center, MS 5-11,
Cleveland, OH 44135, USA.

Abstract: A defining feature of the discontinuous Galerkin (DG) method for ODE is
that the piecewise polynomial solution can have a jump discontinuity at the beginning
of each step. Starting from the standard integral formulation, the DG method is derived
here in differential form. The key ingredient is a polynomial called the correction
function, which helps ‘correct’ the discontinuous solution by approximating the jump
and yields a continuous one. Under the right Radau quadrature, this continuous solution
is identical to the solutions by the right Radau collocation and the continuous Galerkin
(CG) methods. Next, the correction function facilitates the construction of the
associated implicit Runge-Kutta schemes (IRK-DG). Different quadratures for DG
result in different IRK-DG methods: left Radau quadrature in Radau IA, right Radau
quadrature in Radau IIA or right Radau collocation, and Gauss quadrature in a met
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 2749 chars)
```
In the rest of this paper, we employ the notation

,_du
w= ae"
Thus, using the local coordinate € with the assumption h = 1, the ODE takes the form: on [0, 1],
w') = f(E,us)), uO) = th. (2.1)

Denote by P, the space of polynomials of degree k or less, by P;, the projection onto P, and, for any
two functions v and w on [0, 1] (usually polynomials here),

1
vw) = [ v@w@as.
0

To solve u'(&) = f (€, u(€)), the DG method seeks a polynomial u;, of degree k on (0, 1], such that
for any v in P;., (Up, Vv) nearly equals (fv); the precise criteria is given by (2.3) below. To involve un,
by integration by parts,

(uh, v) = Up (1) v(1) — up (0*)v(0) — (up, v').
At = 0, the data u, is more critical and is employed instead of up,(0*) above.
The DG method seeks u;, of degree k on (0,1] such that for any v in P,, (called a test function),

up(Dv(1) — un v0) — un, v') = (Ff, »). (2.2)
The above is often called the weak form. Integrate (u;,,v’) by parts, we obtain the strong form
[un (0*) — un]v@) + (uh,v) = Cf). (2.3)
At Xp41, the solution u,4, is, in the local coordinate,
Unga = Un(1) = Up(17). (24)

Strictly speaking, uj, is defined on (0,1]. To simplify the notation, its domain is extended to [
```
### Page 4
- Region b1 (pixel area [172,642,387,228]): "Left Radau points"
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 2030 chars)
```
y =(k+1)7l,3. (2.11)
To show the above, let the corresponding left Radau quadrature weights be by 1, ..., byx41 where
_ 1
~(k+1)?
(The standard weight of 2/(k + 1)? is due to the domain being [—1, 1]; see, e.g., Hildebrand 1974). Recall
that the Radau quadrature with k + 1 evaluation points has a degree of precision 2k, i.c., it is exact for any
polynomial of degree 2k or less. As a consequence, for any v in Px, since l, ,v is of degree 2k or less, by
applying the left Radau quadrature, and since 1, , vanishes at all Left Radau points except at ¢,,, = 0,

bia (2.12)

1 1
(vv) =| 1,18) v()dg = b,1V(0) = wee’:

That is,
(k + 17, 4,0) = v(0).
The above and (2.10) completes the proof of (2.11).

Fig. 2.2a shows the 3 left Radau points (blue square dots on the €-axis) and the corresponding Lagrange
polynomials for k = 2, and Fig. 2.2b shows the approximate Dirac delta function y for k = 8 (thin blue
curve) and k = 9 (red thick curve).

100
80
60
40

20

Left Radau points ¢;,;

(a) (b)
Fig. 2.2 (a) The left Radau points ¢,, ; (blue square dots) and the corresponding Lagrange polynomials l,, ;,
j =1,2,3 for k = 2. (b) The approximate Dirac delta function y = (k + 1)7l,,1 for k = 8 (blue t
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 2311 chars)
```
uh (E14) = fa (Es) (2.16)

and for j = 1, ie., at € = 1 = 0, by (2.15),
up (0) — (k + 1)? [un — Un (0)] = fr (0). (2.17)
Loosely put, the jump in function values at € = 0 from u,, to u;,(0) does not alter the derivative at the
nonzero left Radau points by (2.16); however, at € = 0, by the above, the derivative uj, (0) is ‘corrected’
by an amount of —(k + 1)?[un — up(0)] to account for the jump (see also Fig. 2.1). In other words, by
employing the k + 1 left Radau points to evaluate the derivative of up, all the corrections caused by the
jump [u, — u;,(0)] in function values at the left boundary is lumped to the left boundary itself and the

amount of correction for the derivative evaluation at the left boundary is —(k + 1)?[un — up, (0)]. This
discussion will be clarified further by the correction function of the next subsection.

As a consequence of (2.16) and (2.17), the solution u;, can be constructed from the values of f), at the

left Radau points as follows. Consider k of the k + 1 left Radau points away from the left boundary,

namely, ¢);,2 <j <k +1. Let ie, wes ep be the corresponding Lagrange (basis) polynomials,

which are of degree k — 1. Then, by (2.16) and, since up i
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 3151 chars)
```
1
[ G+ 0%.@ag = 1
0

The above (which is also a property of the Dirac delta function) and (2.23) imply (2.24).

As a consequence of g(0) = 1 and g’ =~—y, similar to (2.17), loosely put, when calculating the
derivative of a jump at € = 0, a jump of size 1 in function values (i.e., g(0) = 1) leads to a jump of size
—(k + 1)? in derivative values (ie., g’(0) = —(k + 1)).

The following assertion holds: the polynomial g defined by (2.23) of degree k + 1 is orthogonal to all
polynomials of degree k — 1 or less:

gt Pra. (2.25)
For the proof, let v be in P;,, then v’ is in P,_ and, as v spans P;,, v' spans P,_. Next, recall that
g(0) = 1 and g(1) = 0; thus
(g.v') = g(1)v@) — g(0)v(0) - (g',v) = —v(0) - (g',v).
By (2.21), g’ = —y. Therefore,
(g',v) = (-y,v) = —v(0),
where the last equality above follows from (2.10). As a result of the above two equations, for all v in Px,
(g,v') = 0.
As v spans P;,,v’ spans P,_1, and assertion (2.25) follows.

We can now show that g defined by (2.23) is identical to the right Radau polynomial of degree k + 1
defined by the k + 2 conditions that it vanishes at the k + 1 right Radau points and g(0) = 1.

Indeed, condition g(0) = 1 is satisfied by requiremen
```
