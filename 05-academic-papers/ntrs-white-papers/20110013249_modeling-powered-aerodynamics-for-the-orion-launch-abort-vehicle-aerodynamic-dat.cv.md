# CV look-loop reading — Modeling Powered Aerodynamics for the Orion Launch Abort Vehicle Aerodynamic Database

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 1
(no discrete labeled regions — full-page Tesseract OCR: 2730 chars)
```
Modeling Powered Aerodynamics for the Orion Launch
Abort Vehicle Aerodynamic Database (Invited)

David T. Chan* and Eric L. Walker!
YASA Langley Research Center, Hampton, VA, 23681

Philip E. Robinson? and Thomas M. Wilson’
Houston, TX, 77058

NASA Johnson Space Cente

Modeling the aerodynamics of the Orion Launch Abort Vehicle (LAV) has presented
many technical challenges to the developers of the Orion aerodynamic database. During
a launch abort event, the aerodynamic environment around the LAV is very complex as
multiple solid rocket plumes interact with each other and the vehicle. It is further compli-
cated by vehicle separation events such as between the LAV and the launch vehicle stack or
between the launch abort tower and the crew module. The aerodynamic database for the
LAV was developed mainly from wind tunnel tests involving powered jet simulations of the
rocket exhaust plumes, supported by computational fluid dynamic simulations. However,
limitations in both methods have made it difficult to properly capture the aerodynamics of
the LAV in experimental and numerical simulations. These limitations have also influenced
decisions regarding the modeling and structure of the a
```
### Page 2
(no discrete labeled regions — full-page Tesseract OCR: 2970 chars)
```
Sref Vehicle reference area, ft? boost Boost (AM+ACM) effect

SS Sum of squares sep, separation Separation effect
Tat Thrust balance total Total effect
U Total uncertainty unpowered Unpowered effect
u Uncertainty component ae
a Angle of attack, deg Units
B Angle of sideslip, deg i. deg degrees ,
A denotes increment or difference F degrees Fahrenheit
AX Axial separation distance atm atmospheres
measured in CM heat shield ft square feet
diameters in-lbf inch-pound force
AY Lateral separation distance Ibt pounds force
measured in CM heat shield psf pounds per square foot
diameters psi pounds per square inch
AZ Normal separation distance psia pounds per square inch absolute
measured in CM heat shield sec seconds
diameters ‘Acronyms
Aa Relative angle of attack difference . ,
between separating ve ACM Attitude Control Motor
AB Relative angle of sides AM Abort Motor
. “ > ange oF § . API Application Programming
difference between separating Intertaee
drawn from a uniform distribution ©, 7 pi .
. Ratio of epecitie heats for a tet CFD Computational Fluid Dynamics
Viet ine. Specie heats tor a Je CLV Crew Launch Vehicle
p Correlation parameter cM Crew Module
o Standard deviation wee Costes of
```
### Page 7
(no discrete labeled regions — full-page Tesseract OCR: 3688 chars)
```
not updated in this database due to a lack of data. Test 26-AA only acquired a small set of vehicle separation
data, therefore the separation effects from the previous database were still used.

In the development of the new Cr,,,.. term, CFD data were used to provide a WT-to-flight correction to
the wind tunnel data. This correction was found to be significant at some conditions and underscores the
non-linear nature of the AM plume aerodynamic interaction. The process can be summarized as follows

Corea = (Wa + (ACFDam)wr-to-pignt) + AWTacu (5)
AWTacu = WTam+acu ~ WTau (6)
(ACFDam)wer-to—stignt = (CF DAM) prignt ~ (CF Dam wr (7)

where the CFD-derived WT-to-flight correction is applied to the powered AM-only wind tunnel data and
then the effect of the powered ACM is added. The effect of the powered ACM is obtained by differencing
the powered AM-only data from the powered AM+ACM data (Fig. 9).

Also, the CFD-derived WT-to-flight correction is computed by differencing CFD at WT
CFD at flight conditions. The correction not only incorporates scaling to flight Reynolds number, but
includes scaling to flight jet plumes (hot gas i s in geometry between
WT models and the flight vehicle. A
```
### Page 8
- Region b0 (pixel area [550,1019,242,38]): "2 [or +02 + (2p) 02, 02."
### Page 10
(no discrete labeled regions — full-page Tesseract OCR: 4071 chars)
```
III. Complexities of Multi-Dimensional Data

Modeling the acrodynamics of the LAV requires a large multi-dimensional data space, which introduces
a set of potential problems. The correct independent parameters must be determined to accurate
the model, however, the data space quickly grows with each added dimension. It is nearly impossible to fill
in all areas of the data space, especially with the time and resource constraints attached to any experimental
or numerical simulation. This section describes the problems encountered by the CAP team in working with
multi-dimensional data and includes examples of solutions adopted by the database developers.

Ill.A. Parameterization

Since the data space can grow rapidly, it is important to determine the best parameters to describe the
model and avoid adding extraneous parameters. The chosen parameters must be unique, well-defined, and
casily measurable. Sometimes, when there are many candidate parameters to describe a model, it is possible
to combine them, resulting in fewer parameters to describe the model.

An example of this is with the attitude control motor. Recall that the ACM is a solid rocket motor fired
through eight variable-thr
```
### Page 13
(no discrete labeled regions — full-page Tesseract OCR: 5767 chars)
```
Acknowledgments

The authors would like to acknowledge the hard work and dedi
ment of the LAV acrodynamic database. The wind tunnel and CFD groups took major steps in improving
the state of the art for powered aerodynamic simulations for vehicles such as the LAV and their efforts
produced quality data for use in the database. The database and uncertainty groups also worked to improve
modeling and uncertainty quantification methods to ensure the highest quality database and ease of use for
end-users.

tion of the Orion CAP team in develop-

References

INASA, “http://www.nasa.gov/mission_pages/constellation/orion,”

?Robinson, P. E. and Wilson, T. M., “Orion Aerodynamic Databook, Ver 0.61,” NASA CXP-72167, Mar. 2011.

3A.Thompson, J., “CEV Aerodynamic Database Application Programming Interface User’s Guide,” CEV Aerosciences
Project, Rept. EG-CAP-09-138, NASA Johnson Space Center, Houston, TX, March 2011.

4Rogers, S. B. and Pulliam, T. H., “Computational Challenges in Simulating Powered Flight of the Orion Launch Abort
Vehicle,” 29th AIAA Applied Aerodynamics Conference, Honolulu, Hi, 27-30 June 2011 (submitted for publication), American
Institute of Aeronautics and Astronautics, R
```
