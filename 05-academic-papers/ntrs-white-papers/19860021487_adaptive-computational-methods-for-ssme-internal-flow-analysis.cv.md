# CV look-loop reading — Adaptive computational methods for SSME internal flow analysis

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
- Region b0 (pixel area [78,1479,1061,147]): "(NASA-CR-178864) . ADAPTIVE COMPUTATIONAL 2 N86-30959  METHODS. FOR SSME INTERNAL. FLO® ANALYSIS Hk :  Final Report: (Computational.Nechanics . .  Consultants) 56 FF .. . CSCL.20D .- Unclas . . . . , 43374"
### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 854 chars)
```
TABLE OF CONTENTS

Bof0) 0250): 3 bn 1
INTRODUCTION 2.0... eee e cee ce cece reece eee nee eee ee nies 2
SPACE-TIME VARIATIONAL FORMULATION OF

COMPLEX FLOW PROBLEMS ........ 00 cee ee cece cece eect eeene 5
2.1. A Space-Time Navier-Stokes Formulation ........... 5

2.2. A Space-Time Variational Formulation of the

Euler Equations .......... ee cece eee e eee eee e eens 6
ADAPTIVE SCHEMES ....... eee cece eee e eee e een ete eeeees 10
3.1. Finite Element Approximations ..............0eeeee 10
3.2. A Node Redistribution Method .......-.....+.eeeeee 14
3.3. Numerical Experiments - An r-Method .. 20
3.4. A poMethod 2.0... cece cece eee ence e eee ee eeeeee 32
LOL) N63 21S) 0) \ ts 39
REFERENCES 2... ec cece cesses cece cece erect reece eneeeeenne 40
APPENDIX oo. eee eee eet e cee ce ee tere eee e eee ne tnee 41
REFERENCES FOR THIS APPENDIX .. 56
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 726 chars)
```
2. SPACE-TIME VARIATIONAL FORMULATIONS

OF COMPLEX FLOW PROBLEMS

2.1. A Space-Time Navier-Stokes Formulation. A general space-time

variational principle for incompressible viscous flow is characterized as
follows (see [ 1, 2, 3]).

Find a velocity field u in a class of functions V such that over a
time interval [ 0, T],

T

[ce bv whet mcs vt pb(u,u,v)
O

+e) (divu’, divv), } at

T
-{ C£,v), dt +o (u, wg - e Wy Wy
ie)

Vvev (2.1)
where v is an arbitrary test function, p the mass density, u the
viscosity, f the body force, and

ov
[vy ul, = il ue u dx at time t

Q

t
(Cu, v)), = [os Vvdx at time t

ard
Cu, WL F u-vdx at time t

Q

b (a, u,v) = 5B (u, u, v) +b (u, p, v) +b (YU, v)

Bow sf lev) ve we bata ew) | oe
Q
t
```
### Page 8
(no discrete labeled regions — full-page Tesseract OCR: 1081 chars)
```
with a the spatial time domain at time t. Here we use a penalty method

(artificial compressibility) to approximate the hydrostatic pressure

p, by
Por et div u,

with « a small positive parameter. The functional b (*,*,+*) represents
the convective term in the Navier-Stokes equations and yw is a particular
function designed to simplify the enforcement of no-flow boundary con-
ditions.

A finite element approximation (2.1) is obtained by replacing
u’and v with appropriate discrete approximations defined over a space-

time element K; e.g.

€ € N
w= uf Gx, t) =) ud Ce) iy GO
N
Once a finite element solution is obtained on a fixed mesh, we use

it to compute a local error indicator $, which bounds the local et =u -

wu in an appropriate norm:
h s
lle I s Il dyll for element K

We shall discuss means for obtaining by later.

2.2 A Space-Time Variational Formulation of the Euler Equations.

By following a plan similar to that used in the formulation of the
weak-space-time problem (2.1), a space-time formulation of the Euler

equations in two dimensions can be obtained.
```
### Page 9
(no discrete labeled regions — full-page Tesseract OCR: 894 chars)
```
If U(x,t), (x,t) C D, is the 4-vector of conservation variables,
U = {p, om, E}', with p the mass density, m the linear momentum, and
E the total energy, and if dQ and dS denote Lebesque measures of area
(volume) and length (area) of 2 and 32 respectively, then we demand

that U satisfy the following system of conservation laws:

$[va--| ganas
at 3.1
Q an Gv

Here, Qu) is the flux and n is the unit outward normal to 32. If

my > ny denote Cartesian components of m, then

T
U={p , m4. m) » E}

a | m

4
on mt + p(U) | oma,
Qu) = -1 P12
e mm, | pm, + p(U)

om (E + p(v)) | om, (E + p(u))

pein)" 5 pW) = (y- (E- 9) ae 2/2)

In these equations, p is the thermodynamic pressure and y is the ratio
of specific heats, assumed here to be constant. In addition to (3.1),

U must satisfy an entropy production inequality as well as an initial

condition,

UG.0) = Une) + Eee

where JU, is given.

0
```
### Page 10
(no discrete labeled regions — full-page Tesseract OCR: 933 chars)
```
It is of fundamental importance to note the smoothness requirements on
U in order that (3.1) make sense mathematically. Conservation laws (3:1)
hold when the components of U are bounded measurable (with respect to
Lebesque measure in x ) functions on D. Thus, we may seek solutions in
the function space

= T =
ve {v= {V,, Vy. V3» Vy} | Y= V, (x,t)

61(0.7 3 h(a) s t= 1, 2, 3, 4}

In particular, (3.1) is not equivalent to the classical Euler equations,
u + div Q(U) = 0 (with u. = 9U/at and div Q = 5 3Q, 4 /2*) since
solutions may not possess derivatives across surfaces in D . However,

the conservation laws and initial conditions are fully equivalent to

the following weak boundary-initial value problem:

Find U6 V_ such that

[ (u" g, + QC) + ye)anae

T
+| ac-.oaa = | $ F’ 4 ds dt
a olan
for all g6W

where F is the actual prescribed flux through 382 and W is a suitable

space of test functions.

Here, we use the notation
```
