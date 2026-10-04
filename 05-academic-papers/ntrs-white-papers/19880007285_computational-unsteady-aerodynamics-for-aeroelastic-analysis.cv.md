# CV look-loop reading — Computational unsteady aerodynamics for aeroelastic analysis

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 372 chars)
```
NASA Technical Memorandum 100523

COMPUTATIONAL UNSTEADY AERODYNAMICS FOR
AEROELASTIC ANALYSIS

WOODROW WHITLOW, JR.

(WASA-TH-100523) CCAPUTATICNAL UNSTEADY N88- 16668
AERODYNAMICS FOR AEROELASTIC ANALYSIS
(KASA) 29 p CSCL O1A

Unclas

63/02 0123307

DECEMBER 1987

NASA

National Aeronautics and
Space Administration

Langley Research Center
Hampton, Virginia 23665-5225
```
### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 1758 chars)
```
COMPUTATIONAL UNSTEADY AERODYNAMICS FOR AEROELASTIC ANALYSIS
Woodrow Whitlow, Jr.

NASA Langley Research Center
Hampton, Virginia 23665-5225

Summary

This report summarizes the status of computational unsteady aerodynamics methods for
aeroelastic analysis and makes recommendations for future research activities. The flight
conditions for which various types of flows exist are described and the aeroelastic phenomena
that can occur in those flight regimes are discussed. Some important aeroelastic problems of
current interest are described, and the aerodynamic methods needed to analyze them are
presented. The capabilities and limitations of existing unsteady aerodynamics methods are
discussed. Computer resources required to perform aeroelastic analysis of various flight
vehicle configurations are presented. Recommendations for future research are made, and

schedules for completion of proposed research tasks are presented.

Introduction

Computational aerodynamics is rapidly becoming an important tool in the design of flight
vehicles. It allows computer simulation of flows past configurations that previously would have
required large budget and personnel resources to determine the fl
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 1920 chars)
```
realistic, flexible structures, the aeroelastic response of the structure interacts with the
airflow to induce much more complicated situations. Structural vibrations can cause the flow to
alternately separate and reattach at flow conditions where a rigid structure would support
attached flow. The associated highly unsteady aerodynamic loading can interact with the
structural dynamic response to cause unusual aeroelastic phenomena which may restrict the
vehicle flight envelope.

With further speed and/or angle of attack increases which are encountered under
maneuvering conditions, stable separated flow conditions emerge (region Ill of fig. 1). Leading-
edge vortex flows and shock-induced separated flows are of this nature. At still higher angles of
attack, vortex bursting is encountered. Within such regions, the flow is highly unsteady,
requiring careful attention to turbulence modeling.

While predictive methods for attached flows are reasonably well developed, the picket fence
in fig. 1 emphasizes the difficulty in predicting aeroelastic phenomena in the mixed and
separated flow regions. It also symbolizes novel features that are being encountered in
transonic flutter testing. Mo
```
### Page 8
(no discrete labeled regions — full-page Tesseract OCR: 2038 chars)
```
Potential Flow Methods

These methods provide a realistic opportunity to develop design and analysis capabilities for
complete aircraft. They are applicable only to aircraft operating in attached flow (region 1).
Current potential flow capability includes the XTRANSS (ref. 1) and CAP-TSD (Computational
Aeroelasticity Program-Lransonic Small Disturbance) (ref. 2) codes. The XTRAN3S code
solves the transonic small disturbance (TSD) potential equation and was developed for analysis
of isolated wing configurations. Extensive modifications to the code have enabled the analysis of
either wing/fuselage or wing/canard (tail) configurations. The CAP-TSD code was developed by
the Unsteady Aerodynamics Branch (UAB) at Langley and can be used for aeroelastic analysis of
complete aircraft. As an example, ref. 2 gives the details of modeling an F-16 aircraft,
including the wing, strake, tail, fuselage, tip launcher, and tip missile.

Methods based on TSD theory are vatid for thin bodies at small angles of incidence undergoing
small amplitude unsteady motions. In addition, the flow equations are derived assuming that the
free stream Mach number is near unity. Thus, full potential (FP) methods are
```
### Page 10
(no discrete labeled regions — full-page Tesseract OCR: 1715 chars)
```
wings have been obtained (ref. 12). These unsteady codes are available to be used in aeroelastic

analysis.

Inter: Vi An

Since inviscid flow methods--potential and Euler--are limited to the attached flow regime,
it is necessary to interact the solutions with viscous boundary layer methods to allow analysis
of mildly separated flows. Coupling viscous boundary layer methods with inviscid flow codes
results in a capability for more accurately resolving some aeroelastic phenomena. In
particular, accurate definition of the transonic “flutter dip" and calculation of the nonclassical
aeroelastic response observed for the DAST ARW-2 are among the problems that may be treated
with this capability. Available boundary layer methods include one with which mildly separated
flows can be modeled (ref. 13). This method has been tested, in a quasi-steady manner, in the
2-D unsteady TSD code XTRAN2L (ref. 14). Implementation in CAP-TSD, in a quasi-steady,
2-D strip fashion, is underway. These methods also can be coupled with full potential and Euler
methods. Coupling Euler and viscous methods provides a means for calculating separated flows,
for some cases, as well as attached and mildly separated
```
### Page 13
(no discrete labeled regions — full-page Tesseract OCR: 2110 chars)
```
calculations. Also, it is assumed that the TSD calculations require 200 operations per grid
point per time step, the full potential calculations require 300 operations per grid point per
time step, the Euler calculations require 600 operations per grid point per time step, and the
Navier-Stokes calculations require 1000 operations per grid point per time step. The times
shown for the TSD and full potential calculations are 180 percent of the inviscid flow times.
The 80 percent increase in run time (compared to inviscid calculations) has been observed for
potential flow coupled with boundary layer methods (ref. 13). Coupling a boundary layer
method with an Euler solution increases the required CPU time by approximately 30 percent.
Thus the times shown in Table III for the Euler solutions are 1.3 times the inviscid Euler
requirements. Because of the differences in the multiplicative factors--1.8 versus 1.3--the
ratio of required times for Euler and TSD solutions decreases. The TSD method with boundary
layer can be used for problems in region | and for some problems in region Il. Using this flow
model, 30 hours and 12 hours on the VPS-32 and NAS, respectively, are required to define a
```
