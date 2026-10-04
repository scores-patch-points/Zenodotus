# CV look-loop reading — The orbital mechanics of flight mechanics

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 100
(no discrete labeled regions — full-page Tesseract OCR: 1490 chars)
```
In the special case where the station is in a circular orbit rg and 6=w are con-
stants, and equations (4-3), (4-4), and (4-5) reduce to the form

2 2
ey . . gr. g.r,“R
R- Rv - R@O- w)*cos*y + ( - we, cos ysin 9 + =< =0 (4-6)
aa a
2)
{Rs + 2R(3 - «)] cos y - 2RY{9 - w)sin y+ (4 - ee). cos 9=0 (4-7)
Yr,
v
- ae . 2. 2 Ete" .
Ry + 2Ry + RS - w)“sin ycos yp - |w* - ir, sin YW sind =0 (4-8)
ry? / §
Vv

As before, for the case of a station in a circular orbit, the equations of motion in
terms of the rectangular coordinate system (eqs. (3-13), (3-14), and (3-15)) may be
linearized and, therefore, solved in closed form by approximating the gravity differ-
ence between the two vehicles. Thus

2 2
g.Y, r
Seg afte (ae (4-9)
ry? 73 ts

This approximation represents a rotating parallel gravitational field rather than the
spherical field of equation (3-22). The application of equation (4-9) yields equa-
tions (3-26), (3-27), and (3-28) as was done before in chapter 3:

X - 2wy =0 (3-26)
j + 2wk - 3w2y = 0 (3-27)
“ 2

Z+w0°z=0 (3-28)

These equations have the solutions:

x ¥ x, y,
x= (222 - sy,)sin ot - 2-2 cos ot +(6y, -2 8) 423045 (3-29)

x y, x,
= ‘0 Og; *o
y= (232 oy, eos wt +29 sin ut + 4y, 
```
### Page 101
(no discrete labeled regions — full-page Tesseract OCR: 1548 chars)
```
Vo _ 2x (1 = C08 WTy) + ¥o(4 sin WT, - 3WT, cos WT,)

o Bur, sin wr, - B(1 - cos wry) (3-38)

*e “o : 3-34

oO" tan OT; (3-34)
For simplicity, make the substitution

A= 37, sin wT, - a - cos ory) (4-10)

In terms of the spherical coordinates R, w,and 9, equations (3-32), (3-33), and
(3-34) become, respectively,

R 2 2 2

‘c ;. s.
oR (& + Kg sin’9, - K4 sin 9, cos 9)e0s Wy +K, sin", (4-11)
Ye K, -K, -K. sin?9 + Ky, sin 9, cos 9, ) sin W, cos y, (4-12)
o 1 2 3 ° 4 ° 9, ° °
~ Kg sin 99 COS 99 + Ky sin?9, - Ks (4-13)

where

aw
"
1
3
9
a
€
a
oy

Ky = t sin OT,
Kg = S (sin WT, - WT, cos wry) (4-14)
Ky= (or -2+4+2 cos ory)

K5 = xt - cos ory)

These then are the Clohessy-Wiltshire equations in.spherical-coordinate form. They
are useful where spherical symmetry about the origin is inherent to the nature of the
problem as, for instance, if measurements are to be made by a radar located on the
station. They are not, however, any more accurate than the rectangular version and,
hence, have seldom been used either in computer studies where the rectangular coor-
dinates are just as easy to use, or in actual hardware where coordinate conversion has
been the rule, They do, however, show in an ele
```
### Page 102
(no discrete labeled regions — full-page Tesseract OCR: 1199 chars)
```
aaaamaa
planet to the orbital vehicle upon the plane of the reference vehicle. The symbol z
is normal to this plane passing through the orbital vehicle; y is measured along r
from the reference vehicle altitude to the projection of the maneuvering vehicle with
the positive direction upward; and x is measured in a curved arc backward along the
flight path of the reference vehicle in the plane of the reference vehicle orbit to r,
The coordinate system rotates about the origin with angular velocity 6. It should be
noted that this is a left-handed coordinate system as opposed to all of the previous — —

‘ OG
coordinate systems which were right-handed. = *
‘$ Ejection
angle YoV yy }
Xo poe oH OE
—_——_—_———_
Direction of
orbital motion
Reference vehicle bi: ia ai
X j i
w

Ke”

Orbital vehicle
ror Fy

Figure 4-2.- Coordinates employed in describing the motions of the vehicles.

Two assumptions are made about the physical nature of the problem. They are:
(1) the attracting planetary mass is a gravitational sphere, and (2) the body upon which
the coordinate system is centered is in a circular orbit. Small departures from these
assumptions are not considered serious.

90

et
ral
|
an |

bee
```
### Page 103
(no discrete labeled regions — full-page Tesseract OCR: 937 chars)
```
In a cylindrical coordinate system centered on the planetary body the Lagrangian
is
2
L= : m(¢2 +1262 4 22) - mr2wé + 3 mor? eS (4-15)
rr + 2
Equations (4-1) are converted to shell coordinates by means of the following
substitutions:

ytrg=r
X=Tg0 (4-16)
Z=Z

Hence
jst
x=1,6 (4-17)

27k 2 2BerQ" -
+ (v8) GF -*) ou (4-18)
Ss.

The differential equations of motion which follow from this Lagrangian are

t+ B+ 2b 205-0 (4-19)
r2 2 3)-3/2
Be E é +) + (5) 20 (4-20)
Ts s
-3/2
2
. £7, 2 2
s

These are the exact differential equations of motion as seen from the orbiting vehicle.
It can be seen immediately that equation (4-19) is cyclic in the x-coordinate; thus, a
first integral of the equation of motion in the x-direction is found immediately, The
integral merely expresses the law of conservation of angular momentum.

If use is made of the exact orbital expression,

2
gr

w = a (3-16)
r,
8s

91

Poet

ing

ye

wet

“Mos

¥

a

i

!
```
### Page 104
(no discrete labeled regions — full-page Tesseract OCR: 1144 chars)
```
and equation (4-19) is integrated, the equations of motion become

y- (v + oak - ay - oll +z) + ay =0 (4-23) 7 OF

eg
wed

2 -3/2
he (0 + #4) + (3) =0 (4-24)
's Ts
For convenience, let
yell
Ts (4-25) .
2%
Ze Ts
T= wt
The resulting equations are
x-1-—# (4-26) yao
“Gey
“ : -3/2
¥ can {ce-v? [a ew? +24 Mo (4-27)
“ 2. 23-3/2
z+2{a + Y) +23] =0 (4-28) ror FO}

where the dot over the symbols now refers to the derivative with respect to 7, The
approach taken in obtaining the solutions is the following: Equation (4-27) contains
terms in X but notin X. The term Z? is assumed to be small in relation to
(i+ y)? and can hence be neglected. For instance, typical dimensional values of z
and y are on the order of 100 km or less, making Z or Y on the order of

100 0.107 as compared to 1. Thus, it is possible to cast equation (4-27) as an

1936
equation in Y and ¥ by direct substitution of the right-hand side of equation (4-26).

Equation (4-27) can then be solved approximately for Y as an explicit function of
time. The solution so obtained may then be used in the solution of equations (4-26)
and (4-28).

“1
val
wel
weg

92

a

ae
reser
net

4
```
### Page 105
(no discrete labeled regions — full-page Tesseract OCR: 1102 chars)
```
In order to establish a value for K, assume that at time equals zero
T=0
kek (4-29)
Y=Yo

It follows that K = (Xp - 1)(1+¥)*. Substituting the right-hand side of equa-
tion (4-26) into equation (4-27) and neglecting the out-of-plane term Z results in

- 2
y-—K 1 - (4-30)
a+y)? Gay)?
If the forms of
—_i_
(1+¥)

where n=2or3 are expanded, and the terms of the second order and lower are
retained, equations (4-26), (4-27), and (4-28) become

X + 2KY - (K +1) = 3Ky? (4-381)
¥ + ay - g? = -r¥? (4-32)
Z4+Z=3YZ (4-33)
where
K= (XK - 1)(1 + ¥9)? (4-34)
a = 3K? -2
piaK? 4 (4-35)
A= -6K? +3

First-Order Solutions

The first-order solutions to equations (4-31), (4-32), and (4-33) are obtained by
dropping the second-order terms (setting the terms on the right-hand side of
eqs. (4-31), (4-32), and (4-33) equal to zero). The Y-equation is solved by inspection.
Its solution is

Y =a' cos(at + ¢') + & (4-36)
a
where primes are used to distinguish first-order-equation integration constants a
and € from those of the second-order which will be developed in the next section.
93

aa

PEE Y PERRET

&

road
a
```
