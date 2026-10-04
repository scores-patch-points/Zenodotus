# CV look-loop reading — Advanced adaptive computational methods for Navier-Stokes simulations in rotorcraft aerodynamics

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 538 chars)
```
=—_— ©.
=

r
a NASA-CR-192282

SY4A9IYO
P.37

Final Report

on |

ADVANCED _ADAPTIVE COMPUTATIONAL

——_-- METHODS FOR NAVIER- STOKES

Wl ELLIE

SIMULATIONS IN ROTORCRAET |

oO
ow
_ N
3 a $
N 7 od
1 - on
es ¢ 4&4
— Zz co) co}
N
o
— ~~
oS Dual
oO
Ww a
>
a 2 6
a r ou
Nationa ‘eronautics and dministration <
- - <
a
a
— s
_ t
>
a
=<

|
AC ail

NAVIER-STOKES SIMULATIONS IN

ROTORCRAFT AERODYNAMICS
(Computational Mechanics Co.)

COMPUTATIONAL METHODS FOR

CNASA-CR-192282)

Mechanics Company, Inc.

1 North Lamar, Suite 200
. i i ‘exas 78752
```
### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 323 chars)
```
Final Report

on

ADVANCED ADAPTIVE COMPUTATIONAL
METHODS FOR NAVIER-STOKES
SIMULATIONS IN ROTORCRAFT

AERODYNAMICS

Contract #NAS2-13285

National Aeronautics and Space Administration
Ames Research Center

TR-93-02
March 1993

—~ Computational Mechanics Company, Inc.

7701 North Lamar, Suite 200
COMCO Austin, Texas 78752
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 1435 chars)
```
- Prologue

This document is the final report on the SBIR Phase IT project conducted by the Computa-
tional Mechanics Company. Inc. under Contract A88-41 with NASA Ames. The objective
of this Phase II effort was to develop a three-dimensional adaptive computer code for the
numerical simulation of transonic flow around multi-bladed helicopter rotors in hover or
forward flight. The major issues of concern included:

- @ Mathematical formulation of finite element based Euler equation in an arbitrary
Lagrangian-Eulerian reference frame.
¢ development of an h-adaptive package along with error estimation capabilities to sys-
tematically reduce the error in the solution and captured fine scale flow features with
~ a minimum number of added degrees of freedom.

¢ development of a grid generation code capable of modeling a variety of blade geometries

and fuselage configurations.

e asliding interface algorithm for modeling the Rotor-Fuselage interaction problem

~
@ development. of Explicit /Implicit solution algorithms.

~ Significant achievement has Leen made in each of the above areas. Documentation of ve-

sults, theory and programmers notes are given in their respective manuals. A bri
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 354 chars)
```
Contents

1 Introduction

2 Summary of the Phase II Effort

3 Performance Issues

4 Sample Results
dl NACA 0012 Airfoil 2.2... ee
4.2 NiBump- 10% are oe
43 Fixed 3D Wing... 22...
44 Rotor Hover Simulation: Caradonna, Laub, and Tung Experiment
[2]

45 Rotor-Fuselage Simulation: Smith and Betzina Experiment [3] . . .

4.6 References... 2.0

5 Future Work
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 2840 chars)
```
~ 1 Introduction

‘ The unsteady flow ficld surrounding a rotorcraft vehicle in hovering and forward flight en-
compasses a wide range of complex flow phenomena which includes blace-vortex interaction,
spiral vortex sheets. tip vortices, and unsteady effects, to name a few. Accurate modeling
at of these flow phenomenon is essential for efficient, high performance rotorcraft designs. In

particular, a detailed analysis of the wake structure is needed to accurately predict acoustic

and vibrational characteristics. as well as the airloads. One standard solution practice is to
7 incorporate models for the tip vortex structure rather than capturing the structure numeri-

cally. These methods. however, tend only to be as good as the assumptions employed in the
Ls models.

More recent efforts for simulating rotorcraft aerodynamics include finite-difference and
ra finite-volume methods with structured computational grids encompassing the entire rotor
blade. However, due to difficulties in capturing the tip vortex structure (insufficient grid

resolution) and numerical dissipation. alternative unstructured methods are being pursued.

One of the challenges in modeling fluid dynamics problem
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 1615 chars)
```
7 : { 4 ROTATING OUTER Ga10
~ < ROTATING INNER Gata AOTATING BLADE

: : ROTATING INNER GAID

‘

. c =

- FIXED GaiD
Figure L: Schematic illustrating the idea of a sliding interface for Rotor-Fuselage Problem.

= Presented in the following sections is a summary of the Phase I] effort, a discussion of
Performance Issues [ollowed by a collection of results and finally an outline of Future Work.

.

: 2 Summary of the Phase II Effort

i As outlined in the previous section, the Phase: [effort has focused on the research and

development of a number of ideas and methodologies which may be loosely grouped to
include: 1) Adaptive Methods. 2) grid generation and data structure issues, 3) Flow solvers,
and 4) the assimilation of parts 1-3 into a working code along with validation. Some general

~ comments with regard to each of these areas follows.

The final code incorporates some features that are common to other software packages
under development at COMCO. These include the data structure, the h-adaptive module,

the graphics and postprocessing capabilities. and the GUT developed concurrently for our

phase IT operator splitting research project. Initial support for a phase III effort to
```
