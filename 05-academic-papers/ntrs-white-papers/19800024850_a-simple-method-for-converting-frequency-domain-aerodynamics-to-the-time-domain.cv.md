# CV look-loop reading — A simple method for converting frequency domain aerodynamics to the time domain

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 3137 chars)
```
SUMMARY

A simple, direct procedure is developed for converting frequency-domain
aerodynamics into indicial aerodynamics. The data required for aerodynamic
forces in the frequency domain may be obtained from any available (linear)
theory. The method retains flexibility for the analyst and is based upon the
particular character of the frequency-domain results. An evaluation of the
method is made for incompressible, subsonic, and transonic two-dimensional flows.

INTRODUCTION

For many years, unsteady aerodynamic theories and applications have focused
primarily on the frequency domain since the aerodynamic calculation is simpli-
fied if the motion of an airfoil or lifting surface is restricted to be simple
harmonic (refs. 1 and 2). However, for applications to aeroelastic systems with
feedback control and for aeroelastic systems with structural nonlinearities, it
is of considerable value to represent the aerodynamic forces ir. the time domain.

For an aerodynamic theory which is linear in the motion of the aeroelastic
system, there is a fundamental correspondence between the frequency and time
domains through a Fourier transform pair (refs. 1 to 3). Such a linear theory
may still inc
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 912 chars)
```
finite-difference aerodynamic calculations lead directly to time-domain results

(ref.

Marc H. Williams, of Princeton University, provided the frequency-

domain data used in the compressible-flow examples.

aj

SYMBOLS
coefficients of exponential time representation
airfoil half-chord
exponents of exponential time representation
Theodorsen function
lift coefficient
lift coefficient due to heaving
lift coefficient due to pitching
moment coefficient
moment coefficient due to heavina
moment coefficient due to pitching
denominator in polynomial representation of Theodorsen function
real part of Theodorsen function
imaginary part of Theodorsen function
heaving displacement.
total number of terms in sum
(-1)1/2; also, index for summation
reduced frequency, \b/JU
lift
Mach number
numerator in polynomial representation of Theodorsen function
time
free-stream velocity

angle of attack; also, angle of pitch
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 720 chars)
```
e fluid density

t dimensional time, Ut’b

t wagner function

dor fom transient aerodynamic functions
’ frequency

Superscript:
PT Piston tueory

Suoscripts.

I imaginary part
R real pat
max maximum

A bar over a symbol denotes Fourier transform; a dot over a symbol denotes

derivative with respect to time.

BASIC APPROACH

For definiteness, consider same aerodynamic generalized force,
due to same step change in a motion variable, say h/U. ‘Thus,

hu = a

hur o (t

Assume Cy, may be represented by

I
. b.t

cy = \ ae qa
in

G20 4 (1

say Cyr

> 0) (Ta)
< 0) (1b)
> 0) (2a)
<0) (2b)

where the aj,b; are yet to be determined but it is anticipated that bj < 0.

Taking the Fourier transform of equaticns (1) and (2),
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 1644 chars)
```
GB GS iky
= —_——. Q)
Vo (by + ik:

i=l

where a bar above a quanticy denotes Fourier transform and k is the transform
variable. Taking the real and imaginary parts of equation (3),

a 1

(& R v ayk2

arene 2a «@)
— bj tk
ial

= I

can vaabik as)

#70 in by +k

At this point, there are two important questions:

(1) Is a representation such as equation (3) or equations (4) capable of
matching the known behavior to arbitrary accuracy by increasing the number of
terms retained in the series? This question is answered in the affirmative by
numerical examples and, in the special case of incompressible flow, the ana-
lytical results of Desmarais (ref. 11).

(2) How can aj,b; ve determined conveniently, simply, and unambiguously?
Vepa as suggested a (modified) least-squares procedure for determining ay
and bj; Here a simpler procedure is used. The bd; are determined by the

extreaa of eyi\y: then the aj; are determined by a least-squares fit to the
frequency-domain data for eal, only, subject to the two constraints that
the real part is identically satisfied at k = 0 and =. The resultant

(eval, is then predicted at intermediate k values. Moreover it is assumed

that the bj, which are the 
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 2432 chars)
```
For completeness, Roger's procedure is also briefly described here
(refs. 5 and 6). A maximum value of reduced frequency kya, is selected which
is an upper limit on the frequency range of interest. Wext the bj are chosen
as

i

Di > imax (204% 3.26 1

The aj are then determined by a least-squares procedure using both real and
imaginary parts of the aerodynamic transfer fumctions (matrix elements).
Another characteristic of Roger's procedure, though not absolutely exsential,
is that the procedure is applied to the aerodynaxic influence matrix relating
Pressure to downwash, rather than to the matrix relating generalized forces to
generalized ccordisat<;. This automatically insures all motions and resultant
aerudynamic forces are treated on a common basis. Finally, the limits k + 0
and k*+ @ are not enforced as constraints in Roger's method. Abel (ref. 8)
has modified Rcger's method to enforce the constraints at k = 0.

Fram both a theoretical and practical point of view, it is better to select
only the imaginary part of the aerodynamic transfer function to construct che
representation and to allow the real part to be predicted. Fram a practical
point of view, this approach provides a
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 680 chars)
```
«
Ck) = ik Gocnerter at (6)

Following the basic approach, assume that $ may be represented by

I

oir 2 Vo ayePit? (t>0) (7a)
im
(1) =0 (<0) ()

Using equations (€) and (7), the corresponding representation of Theodorsen's
function is

I

ikay
C(k) = (8)
y (-by + ik)

or, in terms of its real and imaginary components C = F + iG,

I K2

a

r-) = (9a)
— bp +k

isl

S y sit (9)
"fT
in by +k

The frequency-domain resuits for F and G are well know (refs. 1 and 2)
and are shown as dashed lines in figure 1. The question is how to determine a;
and bj. First consider the aj. As k* 0, F*1; and as k*+™ P+1/2,
These limits are well known for any aerodynamic theory, since k+ 0 is the
```
