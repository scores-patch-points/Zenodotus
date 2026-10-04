# CV look-loop reading — Flight Mechanics Symposium 1997

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 100
(no discrete labeled regions — full-page Tesseract OCR: 2992 chars)
```
A Statistical Technique for Studying how a Space Vehicle’s Residual
Dipole Moment Degrades the Magnetic Torquer Residual Momentum
Desaturation Capability”

Timothy M. Linn!, Harold F. Zimbelman”
Abstract

‘This paper describes the effects that a space vehicle’s residual dipole moment can have on residual
momentum desaturation capability. Ultimately, the residual dipole moment creates undesirable disturbance
torques that degrade the performance of the magnetic torquers (MT) residual momentum desaturation
capability. That is, the MT are control system actuators that create torques to help desaturate any undesired
system residual momentum. The MT generate a commandable magnetic dipole moment that interacts with
the Earth’s magnetic field to create this torque. The residual dipole moment of the space vehicle, however,
also interacts with the Earth’s magnetic field and creates possible undesired torques. It’s these undesired
torques that were studied to find a limit on the maximum allowable residual dipole moment, given certain
mission constraints and magnetic torque capability. Moreover, given the time varying nature of the
magnetic field during a space vehicle’s orbit around the Earth
```
### Page 102
(no discrete labeled regions — full-page Tesseract OCR: 2407 chars)
```
produced by the MT onto each vector that makes up this sphere. This torque sphere then
represents the global torque capability of the MT for one instant in time, since the torque
produced by the MT is a function of the time varying earth’s magnetic field. Over the
entire surface of the earth, then, there will be many of these torque spheres for the varying
magnetic field. Before going into the statistical technique presented in this paper, a
description of the geomagnetic field model and the MT control law and actuator
dynamics will be described.

The geomagnetic field used for this analysis was modeled as an eighth order
spherical harmonic model. The Earth’s geomagnetic field, for inclined orbits, has a half-
orbit period variation and for near-equatorial orbits, is essentially constant. For a given
orbital radius R, and an inclination angle i , the geomagnetic model [ref.2] was sampled
24 times, or every 15 degrees in true anomaly around each orbit with each orbit being
precessed from 0 to 360 degrees in 15 degree increments of longitude of the ascending
node. This procedure produces a set of geomagnetic field data with an index of 576
points, which covers the entire Earth. The g
```
### Page 103
(no discrete labeled regions — full-page Tesseract OCR: 1705 chars)
```
Shown in Figure 1 are the magnetic and inertial reference coordinate systems, and in
Figure 2, the orbital and inertial coordinate systems. The transformation matrices, used to
define the geomagnetic field vector components in the different coordinate systems, are
defined by equations 5 thru 9. The geomagnetic field vector in the space vehicle
coordinate system was solved using the following orbital conditions:

B,=0, o, =n*15, B,=0, @,=n*15, a=n*15, i=constant

where n = 0,1,2,...,24.

Next, a description of the MT control law and actuator dynamics will be
presented. The magnetic torquers are control system actuators that create torques by
generating commandable magnetic dipole moment that interacts with the earth’s magnetic
field. Again, these magnetic produced torques need to be in the opposite direction of the
residual momentum to desaturate the undesired momentum. Figure 3 is the block
diagram that represents the general magnetic torquer control law. For this study, there
were three magnetic torquers of equal capability, one placed along each axis of the space
vehicle.

Gain
X xr (i)
> BSO |
Be. Cross-Product |} t=] fod
a | a Bien XB = ue
H..,, resy ve Limiter
Figure 3 - Magne
```
### Page 104
(no discrete labeled regions — full-page Tesseract OCR: 423 chars)
```
North Pole

Ym Yi a
North Magnetic Pole Bm xm
We

17 deg

/. Geomagnetic Plane

s

es

f \ o/s
Uys Equatorial Plane
= :
Xi
Zi - Zm
Vernal Equinox Bm+We *t

X, Xn

Y, |=7T(B, +z *t)*T(7°)} Y, 6)
Zz, Zn

X,] [eos(B,, +O, *t) O —sin(B,,+@, *t)] cos(17’) sin(17°) O] X,,

Y, |= 0 1 0 -sin(17°) cos(17’) O} ¥, | (©)

Z, sin(B,, +O *t) 0 cos(B,,+@, *t) 0 0 11 Z,,
Figure 1 - Magnetic and Inertial Reference Coordinate Systems

95
```
### Page 105
(no discrete labeled regions — full-page Tesseract OCR: 366 chars)
```
Yi

Orbital Plane

Zi Ascending
Vernal Equinox Be+W_lam *t Node
L, x,
L, |=T(@)*TH)*7(8, +0, *1)*} Y, )
Ly z,

1] [oove) 0 -sin(ay)T costn) sinfr) OeasiB, +a, *) O -sin(B, +o, *)] X,
Lil= 0 1 QO |-sn() cosy) 0 0 1 0 ¥) @)
1, |sne) 0 cos} 0 0 IfsinB,+0,*2) 0 cw(B, +0, *) |Z

RX) [h
R,|=TAL, ()
RB) \L

Figure 2 - Orbital and Inertial Reference Coordinate Systems

96
```
### Page 106
(no discrete labeled regions — full-page Tesseract OCR: 1911 chars)
```
The block diagram shown in Figure 4 represents the magnetic torquer actuator model.

B, i Pimux Cross-Product =
: id Cursor * Bye PPL Tar
é = ‘Permeability
C MT _tot [Conversion]
Cur z
_ Sum
Curr residual
Residual Dipole Moment
Figure 4 - Magnetic Torquer Actuator Model
Where
B,, Earth’s Geomagnetic Field Flux Density (wb/m“2).
c ‘Mr Commanded Dipole Moment (wb-m; pole-cm converted to wb-m).
c ‘MT _residual Residual Dipole Moment (wb-m; pole-cm converted to wb-m).
K Permeability Constant.
The following equations describe the magnetic torquer model:
107
K=07375621*20 4)
4n
Va = Curt X By, (15)
Tog =K*V, (16)

It should be noted, that the magnetic torquers are the only means in desaturating
undesired Z-axis vehicle residual momentum, and this Magnetic Torquer Momentum
Control (MTMC) law does not always produce the best possible Z-axis vehicle torques.
Therefore, in addition to this basic control law, the residual momentum command can be
varied to assure that “good” magnetic torques (i.e. large magnitude in the correct
direction) will be applied along the Z-axis when necessary. To assure good torques are
applied along the Z-axis, the X and Y-axis residual momentums signals are set to 
```
