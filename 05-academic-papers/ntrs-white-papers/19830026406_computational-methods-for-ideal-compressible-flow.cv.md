# CV look-loop reading — Computational methods for ideal compressible flow

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 419 chars)
```
MASA CK (12, (80

NASA Contractor Report 172180
NASA-CR-172180

COMPUTATIONAL METHODS FOR IDEAL COMPRESSIBLE FLOW

Bram van Leer

Contract No. NAS1-15810
July 1983

INSTITUTE FOR COMPUTER APPLICATIONS IN SCIENCE AND ENGINEERING
NASA Langley Research Center, Hampton, Virginia 23665

nu
NASA LIBRARY G3°Y

National Aeronautics and : aed rn
Space Administration DEP 44 083

Langley Research Center
Hampton, Virginia 23665
```
### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 861 chars)
```
ay

COMPUTATIONAL METHODS FOR IDEAL COMPRESSIBLE FLOW

*
Bram van Leer

Leiden Observatory, P.0. Box 9513, 2300 RA Leiden, The Netherlands

Lectures presented at the Von Karmén Institute for Fluid Dynamics, Rhode-St-

Genése, Belgium, in Lecture Series 1983-04 on Computational Fluid Dynamics.

l. Conservative dissipative difference schemes p. i
2. The recognition and representation of discontinuities p. 13

3. Multi-dimensional methods p. 18

The research reported here was partially supported under NASA Contract No.
NASI~-15810 while the author was in residence at ICASE, NASA Langley Research
Center, Hampton, VA 23665, and partially by Leiden Observatory of the

University of Leiden, The Netherlands.

*present ly at Delft University of Technology, Department of Mathematics and

Computer Science, P.0. Box 356, 2600 AJ Delft, The Netherlands

N3~3 E77
```
### Page 3
(no discrete labeled regions — full-page Tesseract OCR: 1799 chars)
```
1. CONSERVATIVE DISSIPATIVE DIFFERENCE SCHEMES

1.1. Introduction: Why Conservative Dissipative Difference Schemes?

In solving problems of gas dynamics it is often permitted to ignore the
dissipative processes in the gas, that is, viscous friction and heat
conduction. This simplification of the physical picture boils down, mathe-
matically, to a degeneration of the partial differential equations from
second-order conservation laws, the Navier-Stokes equations, to first-order
conservation laws, the equations of ideal compressible flow (ICF). Even in
this approximation there remains a bewildering variety of complicated flow
problems.

Particularly notorious are the problems involving such a_ strong
compression of the gas that, in spite of the a priori assumption, dissipation
sooner or later dominates the flow, at last in certain regions known as
shocks. In a shock the flow quantities undergo a significant change over a
distance typical of the dissipative interaction, i.e. the molecular mean free
path.

It is, of course, impossible to infer the structure of a shock from the
equations of ICF. The concept of ICF traditionally is saved and extended by
representing a shock as a flow disc
```
### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 1892 chars)
```
to higher temperatures, are as eligible as their physically realizable
counterparts. Clearly a selection criterion must be invoked. We shall accept a
weak solution of the first-order conservation equations only if it is the
limit solution, for vanishingly small dissipation, of the second-order
conservation equations. For gasdynamics this is equivalent to the following
requirement: the entropy of the gas, measure of the accumulated effect of
dissipation, must not decrease in a shock. This is called the entropy
inequality.

Thus, the advantage of lowering the order of the flow equations is partly
offset by the need to introduce extra equations and an extra inequality. In
consequence, analytic treatment of ICF problems is impossible in all but a few
cases. The numerical treatment, however, can be entirely successful. The key
to success is the combination of conservation and artificial dissipation.

The idea behind artificial dissipation is that, since in ICF the effect
of dissipation is ignored, it may as well be exaggerated. By providing a
difference scheme for ICF with sufficiently large dissipative terms it is
possible to achieve that shocks, whenever these appear, posses a structu
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 1823 chars)
```
1.2. History

The first example of a conservative dissipative difference scheme was the
first~order-accurate Lax~Friedrichs (LF) scheme, presented and analyzed by Lax
(1954). It is the least accurate of its kind and has no practical value today.
More influential was its second-order-accurate successor, the Lax~Wendroff
(LW) scheme (1960) which still is widely used by aerodynamicists in the two-
step form derived by MacCormack (1969).

The survivor among first-order schemes is Godunov's (1959) method based
on upwind differencing. The decision which direction is upwind is made on the
basis of the speeds of the finite-amplitude waves by which discrete fluid
volumes interact. With this strategy, the solution of Riemann's initial-value
problem - the shock-tube or diaphragm problem — becomes a building block of
the difference scheme. At present we see a rapid expansion of the literature
on “approximate Riemann solvers": Roe (1980), Osher (1980), darten and Lax
(1981), Van Leer (1982), Colella (1982); these find their way in first-order
as well as higher-order upwind schemes, A review of this subject was given by
Harten, Lax and Van Leer (1983); I shall return to it later in the present
l
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 1372 chars)
```
During the seventies the design problems of the sixties were gradually
solved. For instance, the prevention of numerical oscillations is now well
understood. As this knowledge has not been fully absorbed by the ICF
community, I have made it the subject of the second lecture.

The eighties have started with an increased interest in explicitly using
the physics embedded in the ICF equations for improving the numerical methods.
In particular, there is a strong emphasis on upwind differencing. Some modern
ideas on how to compute one-dimensional flow are covered by the present
lecture; how well these ideas carry over to multi-dimensional flow is

investigated in the third lecture.

1.3. A family of second-order finite-volume schemes

I shall illustrate the recent developments in computing one-dimensional
ICF on the basis of a family of second-order-accurate difference schemes. The
initial-value representation and algorithm structure are the same as in ‘Van
Leer (1980); the notation is also the same, except for the present use of a

superscript to indicate the time level.

We start with schemes for the scalar linear convection equation

Gp + a dy = Oy a = constant, (1)

assuming a piecew
```
