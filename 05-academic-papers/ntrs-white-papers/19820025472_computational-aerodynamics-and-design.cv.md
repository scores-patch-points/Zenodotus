# CV look-loop reading — Computational aerodynamics and design

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 204 chars)
```
MASEL TIM ~ BNYQS 7
NASA Technical Memorandum 84257

NASA-TM-84257 19820025472

Computational Aerodynamics and
Design

W. F. Ballhaus, Jr.

August 1982

NASA

Nationa! Aeronautics and
Space Administration
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 257 chars)
```
NASA Technical Memorandum 84257

Computational Aerodynamics and
Design

W. F. Ballhaus, Jr., Ames Research Center, Moffett Field, California

NASA

National Aeronautics and
Space Administration

Ames Research Center
Moffett Field, California 94035

N39 3339
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 2513 chars)
```
COMPUTATIONAL AERODYNAMICS AND DESIGN

W. F. Ballhaus, Jr.
Ames Research Center, NASA
Moffett Field, California

INTRODUCTION

In the last decade, advances in computer technology and data communications
began to drastically change the way we live and the way we work. We bank, shop, make
airline reservations, and pay our bills by using computers. Now, a new generation of
children is growing up with computers in their homes and in their classrooms. This
computer revolution has also had a major effect on the production of new aircraft.
With the major investment of the aircraft industry in computer-aided design and
computer-aided manufacturing (CAD/CAM), much of the development process from design
through manufacturing is computer controlled. Furthermore, great progress is being
made in computerizing the aeronautical disciplines that are the elements of design,
such as aerodynamics, structures, guidance and control, and propulsion.

Nowhere has this progress been more exciting than in aerodynamics. The avail-
ability of modern supercomputers and the ingenuity of computational aerodynamics
researchers have resulted in new methods for solving historically intractable non-
linear flow-fie
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 2807 chars)
```
EXPERIMENT the simplified form of the partial differ-
ential equations governing fluid flows in
THEORY
P=kVv2

certain flight regimes, such as the tran-
sonic Mach number range. In the late 1960s,

computers sufficiently large to permit solu-

tion of these equations by finite-difference
techniques became available. Computational
FLIGHT aerodynamics has since advanced at a revolu-
tionary rate.

i mi NAY In spite of the rapid advancement of
computational methods, it is not expected

f that computational simulations will com-

pletely replace wind-tunnel testing in the

foreseeable future. Their roles instead
WRIGHT FLYER are complementary. Computations can provide

Fig. 1. In the beginning there was a some of the less intricate flow simulations
blend of theory and experiment in aero-

dynamic design required in design more quickly and at less

cost than wind tunnels. They can also be

used to make more effective use of wind tunnels by providing the means to (1) evaluate
and improve new design concepts, such as swept forward wings or jet flaps for lift
augmentation, before testing; (2) carefully discriminate among candidate configura-
tions, eliminating all but the most promising be
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 2840 chars)
```
formulations that are approximations to the Navier-Stokes equations. These approxi-
mations introduce phenomenological errors, with the consequence that certain aspects
of the flow-field physics are not properly represented. For any given mathematical
formulation, the approximating procedures used to solve the governing equations and
boundary conditions introduce numerical errors. Specifically, these errors are due
to such factors as inadequate grid refinement or incomplete treatment of complex
aerodynamic configurations. The consequences are again that physical phenomena are
not properly represented. Both phenomenological errors and numerical errors can be
reduced by increased computer power.

Because of the inherent differences in the nature of the two types of simulations,
wind tunnels and computers are complementary: they have different inherent errors in
simulating free-flight conditions. The principal point to be emphasized is that com-
putational and wind-tunnel simulations are merely tools of the designer. Success in
design depends very strongly on the judgment and expertise of the designer, his knowl-
edge of aerodynamics, and his ability to use these design tools effectiv
```
### Page 8
(no discrete labeled regions — full-page Tesseract OCR: 2447 chars)
```
Customer

'
Requirements Advanced Design H Project Design
1
[Mission Analyses H
1
1
System Conceptual \\ ; Allocated Production
Requirements Baseline i Baseline Baseline
F___,
Conceptual Preliminary |/) Detailed Manufacture
Design Design { Design & Support
* Optimization « Optimization 1 © Sub-Optimization
+ Parametrics * Multi-Discipline ! ¢ Muiti-Discipline
*Simple Analyses * Sophisticated —_-!_ » Sophisticated
* Exploratory Tests! © Part Designs
* Verification Tests
Time Minutes Hours 1 Days

Seal
eae L__ computational Methods —____|

Fig. 2. The aircraft design process.

Levels of Use of Computational Aerodynamics in Design

Pierre Perrier (Dassault, private communication, Feb. 1982) defines four distinct
levels at which computational aerodynamics is used in the design process. Level 0
involves no use whatsoever, with the designer relying on analysis, empiricisms, and
successive wind-tunnel testing to refine the design. Level 1 involves extensive com-
putation in the preliminary design (PD) phase followed by configuration refinement
via wind-tunnel testing in the detailed design (DD) phase. Level 2 involves exten-
sive reliance on computations in PD with a synergistic mixture o
```
