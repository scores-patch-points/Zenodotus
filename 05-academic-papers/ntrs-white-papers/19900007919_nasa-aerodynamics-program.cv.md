# CV look-loop reading — NASA aerodynamics program

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 100
(no discrete labeled regions — full-page Tesseract OCR: 316 chars)
```
M..G. Macaraeg
Computational Methods Branch
Langley Research Center

(804)864-2295

Amplitude U,,,, RMS %

12

(2-D TS Wave With 0.25% Initial Amplitude)

MARCH: AR=10 , Amplitude of U,,, RMS %

(b)

15 tineor

R= 400
F = 86
w= 38

Aasa= 0.62%

Figure 3.8. Spatial Marching Method for Boundary Layer Transition

3-18
```
### Page 101
(no discrete labeled regions — full-page Tesseract OCR: 1908 chars)
```
3.10 | DEVELOPMENT AND IMPLEMENTATION OF THE PARABOLIC
STABILITY EQUATION

3.10.1 Objective

To study linear and nonlinear stages of transition using the Parabolic Stability
Equation (PSE).

3.10.2 Approach

The equation is based on the split of a disturbance's stream function into the
product of a profile function and a wavelike function. Under proper adjustment of the
wave function, one may apply the boundary layer approximation to the shape profiles and
obtain a parabolic governing equation.

3.10.3. Accomplishments

A family of codes based on the PSE for the analysis of two dimensional waves in
a Blasius boundary layer was developed and fully tested. The marching code was run with
up to eight harmonics of the TS wave, at amplitudes of up to eight percent (Umaxtms)
(See Figure 3.8). A complete analysis of the linear growth of the TS wave in a nonparallel
boundary layer was completed. The results of previous investigators were accurately
duplicated and some issues were clarified. The nonlinear calculations are in agreement with
the full Navier- Stokes simulations of Spalart, at Ames.

3.10.4 Significance

The PSE is an alternative tool for the accurate analysis of transition in t
```
### Page 102
- Region b0 (pixel area [609,469,508,243]): "Interaction between a stationary CF mode f kHz Az AY 0 0.003 and two TS modes  Ao 20 0.012 A320 0.0024"
### Page 103
(no discrete labeled regions — full-page Tesseract OCR: 2402 chars)
```
3.11 | NONLINEAR WAVE INTERACTIONS IN THREE DIMENSIONAL
BOUNDARY LAYERS

3.11.1 Objective

Three dimensional (3-D) boundary layers are usually rich in different instability
modes, i.e., Stationary Crossflow (CF), Traveling CF, Vertical Vorticity (VV) and
Tollmien-Schlichting (TS) modes. One expects the possible evolution of many resonant
triads whose components can take part in several resonant interactions. The mechanism of
resonance of three waves plays an important role in determining the nonlinear
characteristics of the development of disturbances leading to transition. To study the spatial
evolution of these triads to promote the understanding of the transition process in 3-D
flows.

3.11.2 Approach

A nonlinear nonparallel stability analysis code was developed to examine the
modulation of the amplitudes and phases of three instability modes satisfying triad resonant
conditions in time and space in 3-D flows. The meanflow was the boundary layer on a 23
degree swept infinite span wing with M..=.82 and Rc=20x106. Different examples of
interaction were found. A triad interaction of three traveling CF modes exhibited strong
resonance and resulted in the amplification of a superhar
```
### Page 104
- Region b0 (pixel area [292,662,295,272]): "20 partece"
### Page 105
(no discrete labeled regions — full-page Tesseract OCR: 2476 chars)
```
3.12 EVOLUTION OF A 2-D SECOND MODE WAVE IN A MACH 4.5
BOUNDARY LAYER

3.12.1 Objective

To demonstrate the existence of a saturated state of the two-dimensional second
mode. This saturated state will then become the primary flow for a secondary instability
analysis. To this end, the time-dependent Navier-Stokes equations are solved using a fully
spectral algorithm (for reasons of accuracy).

3.12.2 Approach

An existing three-dimensional spectral compressible code that solves the Navier-
Stokes equations applied to a flat plate geometry was used to track a 2-D second mode over
multiple wave periods. Flow conditions are M..=4.5,Re and the streamwise wave length
alpha=2.25. The simulation was conducted on a grid of 16x64x4 and the wave length was
tracked for 20 time periods. As a point of reference, the linear wave amplification is
approximately seven percent per period.

3.12.3, Accomplishments

Results after 20 periods indicate that non-linearities are developing in the critical
layer/generalized inflection point region. These nonlinearities were proven to be the result
of the cubic interactions in the momentum equations, which is not surprising in light of the
large density fluct
```
