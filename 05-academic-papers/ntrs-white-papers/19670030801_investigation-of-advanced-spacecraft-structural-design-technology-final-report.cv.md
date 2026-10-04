# CV look-loop reading — Investigation of advanced spacecraft structural design technology  Final report

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 100
- Region b2 (pixel area [520,549,161,151]): "{>"
- Region b3 (pixel area [282,794,113,68]): "\"
### Page 101
(no discrete labeled regions — full-page Tesseract OCR: 1073 chars)
```
These expressions for the general toroidal configuration readily degenerate to

conical and cylindrical ring cases, i.e.

A. Concial Ring

Az=l B= € cosa | (79)

R =0 Rp, _ — 1 (80)

2 24 12
< < - =
ose £ [ (y- 4) + (,- 2) ] (81)
B. Cylindrical Ring
A=l B= € cos @ 7 (82)

Peoo B= > (83)
- 1) (84)

This multiplicity of parameter sets increases formulative effort since in-
tegrations must reflect the alternatives; however, an automated selection feature
eliminates any impact of this multiplicity in utilization of the operational capa-
bility.

The foregoing sets of parameters, taken collectively, enable exact ideali-
zation of cylindrical, conical, and piecewise circular shells of revolution. More
general shell profiles can be realistically approximated by combination of these
elements. .

2. POTENTIAL ENERGY FUNCTIONAL

Linear elastic material behavior is assumed. In accordance with this as-
sumption, a generalized Hooke's law is employed, i.e.

a i} Lel{, i} (85)

° j" lee 26 | (86)

Le] - (pm "egEB Eg
fe} -L%.<e | (88)

Report No. 2356-950001

il

(87)

93
```
### Page 102
(no discrete labeled regions — full-page Tesseract OCR: 912 chars)
```
Note that consideration of material orthotropy is included. This is responsive
to the trend toward high performance composite materials.

In virtue of the assumption of linear material behavior the strain energy density
can be written as

ae “31 | [=] {« , (89)

The next step in proceeding toward the potential energy functional is to express
the strains in terms of displacements. The equations, recorded from Reference 39,

are written (90)
fecha fan} s {409}
ou 2
where | =+AyW = _dow
{4,}-)ag**2 {4 a2 (91)
ASU the W -

The quantities ) j are defined as

1 OB.-
i i er re A3=Pe (92)

These are given explicit definition by the element configuration through Equations
(77), (79), or (82).

Based on these strain displacement relations, the total potential energy functional
is given by

® (ow (d= J (FS, OP Pe] £4,060} ea
BLO, CL] (4, Of
-29p ( )w ( y) Bag

where

[i= 27t Ce] (94)

Report No. 2356-950001 94
```
### Page 103
(no discrete labeled regions — full-page Tesseract OCR: 3133 chars)
```
3. DISPLACEMENT FUNCTIONS

As previously stated, discretization into a finite number of displacement degrees
of freedom is effected in accordance with the Rayleigh-Ritz techniques by the assumption
of admissible displacement modes. The selection of suitable assumed displacement
modes is of paramount importance since these modes are intrinsic to all element matrices
and thereby indirectly determine the response characteristics of structural assemblages.
Indeed, it is primarily the assumed displacement functions which distinguish the subject
element representation from those of Reference 8 and 9.

Admissibility of assumed displacement functions requires that they be complete
embody all rigid body modes, and provide for interelement continuity. In the absence
of idealization error, satisfaction of assumed displacement function admissibility con-
ditions with reference to the total structure guarantees that the predicted potential en-
ergy will be an algebraic upper bound on the potential energy of the exact solution.
Furthermore, the predicted potential energy will monotonically approach the exact value
with grid refinement; theoretically converging to the exact value in the limit. Gr
```
### Page 104
(no discrete labeled regions — full-page Tesseract OCR: 830 chars)
```
u (€) | geo7 "18 “(E)/|¢_, ou,

(98)
Xe(E)| ¢ =o "e % (E)| =s “ee
wl | eos Oe
w (€)] @ 5 =F Me (Ede us, (99)

w (Ee 25 =e Mee (OL ge Me,

These conditions lead to the transformation required to achieve reference to
physical displacement degrees of freedom

{8}~ ['Ba] {2} on)
where
T
{e}'- [ a+ 83+ 89: a3, Bo» By» ba» bys bs | (103)
_ 5
1, 0, 0, 0
0, 1, 0, 0
-3, 2 3 1
s2’ s’ s? 8
2.4, 2. 1
s8? g2? 58? 52
1, 0, 0, 0, 0, 0
Ie, = 2% 1, 0% oO 9 0 (102)
a 1
0, 0, so 0, > 0
20 6 3 4 40° 1
so’ ~s2’ 95’ 58’ 2°25
js 8 3 5b 7 al
si’? g5? a52 * gh? 93? 52
8 A, 4, 6 3 a
so? s2? 283? 59? 547 253

L
{ahh =| Mer Mo MEM Mer Meer Mo MED ELD | ~ (208)

The reader may recognize the membrane displacement function as a well known
Lagrange osculatory interpolation formula and the transverse displacement function as

Report No. 2356-950001 96
```
### Page 105
(no discrete labeled regions — full-page Tesseract OCR: 1765 chars)
```
a hyperosculatory interpolation function. The final form of the displacement forms
might well have been written immediately without development. The approach taken
here was adopted for two reasons. Firstly, it is applicable without conceptual extension
to complex elements where standard interpolation formulae are not applicable. Secondly,
the field coordinates afford considerable algebraic simplification in deriving element
representations.

4. ELEMENT MATRICES

Substitution of the assumed displacement functions of Equations (96) and (97)
into the strain displacement relations of Equations (91) accomplishes the discretization
of the element model. The result may be written symbolically,

for} [o, «>| {8 } (104)
peers fo] Ca] 0

Introducing these discretized strain displacement relations into the potential en-
ergy functional ,Equation (93) ,and intergrating obtain,

® -7(8 | [e]{e }-Le Jt, § (208)

Matrices [ Kk] and { Fp } are given explicit definition in Reference 43 respectively.
The matrix L K] is the element stiffness referenced to field coordinate displacement
degrees of freedom {B }; the matrix {F } is the corresponding pressure load repre-
sentation. As a final step the tra
```
