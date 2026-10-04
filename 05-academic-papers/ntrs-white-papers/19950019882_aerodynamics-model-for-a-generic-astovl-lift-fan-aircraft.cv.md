# CV look-loop reading — Aerodynamics model for a generic ASTOVL lift-fan aircraft

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 2024 chars)
```
Nomenclature

4j
Aj.otal
b

=

Cp
CGFS
CGWL
Cc

Cig

C

Ci,

Chat
CL
Cla

Cle

individual jet exit area, ft?

total jet exit area, ft?

wing span, ft

mean aerodynamic chord, ft

drag coefficient

fuselage station center of gravity, in.
waterline center of gravity, in.
rolling moment (RM) coefficient

rolling moment due to sideslip
derivative, I/rad

rolling moment due to roll rate
derivative, I/rad

rolling moment due to yaw rate
derivative, I/rad

rolling moment due to rudder deflection
derivative, I/rad

lift coefficient

lift coefficient due to pitch rate
derivative, I/rad

lift coefficient due to angle-of-attack
rate derivative, I/rad

pitching moment (PM) coefficient

pitching moment due to pitch rate
derivative, I/rad

pitching moment due to angle-of-attack
rate derivative, I/rad

yawing moment (YM) coefficient

yawing moment due to sideslip
derivative, I/rad

yawing moment due to roll rate
derivative, I/rad

yawing moment due to yaw rate
derivative, I/rad

yawing moment due to rudder
deflection derivative, I/rad

side force (FY) coefficient

side force due to sideslip derivative,
\/rad

Pp

Cy Smut

hide
IGE

MRC

a

XMRC

ZMRC

side force due to roll rate derivative,
\/rad
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 479 chars)
```
bail
Scanard
flap
Srud

oF
Sin

aileron deflection angle, deg
canard deflection angle, deg
flap deflection angle, deg
rudder deflection angle, rad
equivalent jet angle, deg:

3EQ = ALF) + (1- BLN
lift-fan nozzle deflection angle, deg

lift nozzle deflection angle, deg

unpowered in-ground effect drag
increment

unpowered in-ground effect lift
increment

unpowered in-ground effect pitching
moment increment

nondimensionalized jet-induced lift
increment

thrust split: A= TLp/T
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 4336 chars)
```
Aerodynamics Model for a Generic ASTOVL Lift-Fan Aircraft

LOURDES G. BIRCKELBAW, WALTER E. MCNEILL, AND DOUGLAS A. WARDWELL

Ames Research Center

Summary

This report describes the aerodynamics model used in a
simulation model of an advanced short takeoff and
vertical landing lift-fan fighter aircraft. The simulation
model was developed for use in piloted evaluations of
transition and hover flight regimes, so that only low speed
(M ~ 0.2) aerodynamics are included in the mathematical
model. The aerodynamics model includes both the power-
off aerodynamic forces and moments and the propulsion
system induced aerodynamic effects.

Introduction

NASA Ames Research Center is participating in
technology development for advanced short takeoff and
vertical landing (ASTOVL) fighter aircraft as a member
of the Joint Advanced Strike Technology (JAST) and
formerly the Advanced Research Projects Agency
(ARPA) ASTOVL program. Integration of flight and
propulsion controls is one of the critical technologies
being pursued in that program. NASA's role in this
technical area is to participate in developing design
guidelines for integrated flight/propulsion controls,
support technology development f
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 4233 chars)
```
Aerodynamics Model

The aerodynamics model includes both the power-off
aerodynamic forces and moments and the propulsion
system induced aerodynamic effects. The simulation
experiment focused on transition and hover flight
Tegimes, so that only low-speed (M ~ 0.2) aerodynamics
are included in the mathematical model.

The power-off aerodynamics data were generated using
the U.S. Air Force Stability and Control Digital
DATCOM program (ref. 2) and a NASA Ames in-house
graphics program called VOR VIEW (no reference
available) which allows the user to easily analyze
arbitrary conceptual aircraft configurations using the
VORLAX program (which is based on the vortex lattice
method of ref. 3). All the power-off coefficients and
derivatives were calculated in the stability axes. The jet-
induced data were generated using the prediction methods
of references 4-8. For the data shown in this report, the
moment reference for Digital DATCOM was 30.889 ft
aft of the nose, the moment reference for VORVIEW/
VORLAX was 31.204 ft aft of the nose (-10 percent of
the mean aerodynamic chord), and the moment reference
for the jet-induced effects was 31.11 ft aft of the nose. In
the final simulation model,
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 3211 chars)
```
AL AL
>= [ae SLE. Ve, cl.
AL{ h
+(e (Z-tecvean J @)
© LN
#( h
+|—= 2.0: ea)]
| T \de Fount

Figures 8~11 show the jet-induced lift increment due to
the lift fan for nozzle angles of 90, 75, 60, and 45 deg,
respectively. Figures 12-15 show the jet-induced lift
increment due to the lift nozzles for angles of 90, 75, 60,
and 45 deg, respectively. Figures 16-19 show the jet-
induced lift increment due to the fountain for equivalent
(lift fan and lift nozzle, 5EQ) angles of 90, 75, 60, and
45 deg, respectively.

Drag- The drag equation for the lift-fan model is shown
in equation 4. This equation accounts only for the power-
off drag.

= Cpas (4)

The equation for C p is shown in equation 5. Drag curves
for Cp(@, Sflap) and Cp (a, dcanard) are shown in
figures 20 and 21, respectively. The curves shown in
figures 20 and 21 were generated using the vortex-lattice
program. Digital DATCOM was used to predict the drag
coefficient increment due to the influence of the ground
plane, ACDigp(®), shown in figure 22.

Cp = Cp(a.8flap) + ACD gcanard
+KGEACD gg (a)
where

ACDscanard = CD(0,Seanard) (se)
—Cp(a,dcanard = 0°)

Pitching moment- The pitching moment equation for the
lift-fan model is shown
```
### Page 8
(no discrete labeled regions — full-page Tesseract OCR: 3649 chars)
```
Side force— The side force equation is shown in
equation 9, and the expansion of the power-off side force
coefficient is presented in equation 10.

FY =CyqS @)

= pb
Cy= Cyp(OB+ Cy, (oe a0)

+ Cyg.,4 Stud + Cy (a, dail)

Digital DATCOM was used to predict the side force
coefficients for Cyg (a) and Cy, (a); these curves are
shown in figures 39 and 40, respectively. Digital
DATCOM was used to predict the rudder derivative:
Cy sa = 0.2063/rad. The side force coefficient due to
aileron deflection, Cy (a, Sail), is shown in figure 41
and was generated using the vortex-lattice program.

Rolling moment- The rolling moment equation is shown
in equation 11. The first term accounts for the power-off
rolling moment, the second term represents the jet-
induced rolling moment increment, and the third term
accounts for c.g. travel.

RM = C,qSb +48M

Td. + FY Z 11
Td, Vt MRC (11)

The equation for C) is presented in equation 12. Digital
DATCOM was used to predict the rolling moment
coefficients for Cig (C1 (@), Cj, (), and Cheat (a);
these curves are shown in figures 42-45, respectively.
The rolling moment coefficient due to aileron deflection,
Cj (a, dail), is shown in figure 46 and was generat
```
