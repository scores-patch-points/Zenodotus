# CV look-loop reading — A Computer-Based Orbital Debris Environment Model for Spacecraft Design and Observation in Low Earth Orbit

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 4
(no discrete labeled regions — full-page Tesseract OCR: 1178 chars)
```
Contents

Section Page
ADSUACt  oeeesescssessesstsseessecssessecnscsssscssscsasscssseccucconecsssscsnecsscssessssccuequesuecnacssecsecssessseceaeeeneess v
I. Introduction... 1
TL. New Model Approach  ......sssssssssssssessssssssssnsenesassseceasecsessasecsnsssesesseseesnessesseesscossessseesese 1
Basic Concept ....ssesssessssssssseessessssecsssssssecssessessseseessessnecssessaeesscssessnseaecssesaesnvessnseesvessess 1

3

5

6

6

8

Ill. Program ORDEM 96 9
Running the Program 10
Input Parameters .......scsecssssssssssessssessessnessssneesnseseenecansnessnssnssasssaesassnesueseensseseneeneeseensese 10
QULPUE oe eeccscesssseesessesessesssssesssssesssessessncsesssenenesnesueanecsecsncanssesnesscsbeseeseeseeuseeseesseeseees 12
References ....essssecssessssscsesssssssanecsesnessesssneessanesenscsncssnecsssnesssnecssnseanacssanesanecssessanesssseessasesss 18
Appendix A: Functional Forms Describing the Particle Number...........sscssssseseeseneee A-l
Appendix B: Collision Probability Equations .......c.csssscssecsseesssscssessssesssesnesesatessseesaesees B-1
Appendix C: Modifying Source Code sssssssssssesessssssesssusssseetsuenenseseseeessnenssceseeunanteee C-1

iii
```
### Page 5
(no discrete labeled regions — full-page Tesseract OCR: 2458 chars)
```
Figures

Figure Page
1. The source components in circular orbits in the 98°

Inclination band. ......ceccsecescsessessessssseesssesseeseesseesessecssssseensestensesseessessecsssessueseessesenees 19
2. Altitude distribution of aluminum oxide particles and paint flakes... esses 20
3. | Modeled number density of particles in circular orbits and

elliptical orbits as a function of altitude. .........:cccsesssessesessesseesesseetesessnesessessteseeneseese 21
4. Comparison of the model with U.S. Space Command catalogue

as of early 1995 for the altitudes of 300 km, 500 km, and 800 KM......c:sssusssssesseense 22
5. Comparison of the model with U.S. Space Command catalogue

as of early 1995 for the altitudes of 1000 km and 1500 KM.........csessessesssessessseeseaee 23
6. Comparison of the model with Haystack radar measurements

OVET SIZC.....ssessssssesseesseesesesseseeneneeeees Seatenesscaeneneeesenesscssassncnenesacsecneaesesseseeseaessesassceeneees 24
7. Comparison of the model with Haystack radar measurements

OVEr AltitUde........esceessessecsesesssessesssessseesseessesssessessesssssesssesseessessseesscsecsssesseessusssaness 25

8. Comparison of the model with Haystack data collected 
```
### Page 6
(no discrete labeled regions — full-page Tesseract OCR: 346 chars)
```
Table
1
2.
3.

Tables

The Six Inclination Bands...

The Six Source Components 3
Default Values of the solar Activity (Fio7 in 10* Jy) and the

Production Rate of New Debris to the Historical Rate (N) as a

Function of the Mission Time 11
Output of ORDEM96 If Considering a Spacecraft 14
Output of ORDEM96 If Considering a Point Over the Eartl 17
```
### Page 19
(no discrete labeled regions — full-page Tesseract OCR: 1768 chars)
```
Running the Program

The software is a DOS application. Copy the file ORDEM96.EXE onto your PC, go to the
directory where the program is located, type ORDEM96 and press ENTER. A menu system will
appear on the screen. To select an item to change its value, press ENTER. After the value has
been changed, press ENTER again.

After running the program, the detailed results are retained in the ASCH file ORDEM96.0UT.

Input Parameters

1. fName

The name of the output file which contains detailed results.

2. FixPoint
A decision parameter which determines if the program will calculate the flux onto an orbiting
spacecraft or the flux crossing a fixed point, such as the FOV of a ground-based sensor. Enter
the letter y if you are calculating for a fixed point, and enter the letter n for an orbiting
spacecraft.

3. Time
The time in calendar year. In order to use the default values of the solar activity, the program
only runs for the time from 1971 to 2030.

4. F10.7
The 13-month, smoothed F197 value of the solar activity in the year previous to time, in units
of 10* Jy. If no value is entered, the program will take the default value (table 3).

The program limits Fjo7 to be between 40 and 220
```
### Page 20
(no discrete labeled regions — full-page Tesseract OCR: 1878 chars)
```
Table 3 - Default Values of the Solar Activity (F197 in 10* Jy) and the Production Rate of
New Debris to the Historical Rate (N) as a Function of the Mission Time

Year = F10.7 N_ year F10.7 N year F10.7 N

in year-1 in year-1 in year-1
1971 146 1 1991 195 0.1 2011 163 0.2
1972 118 1 1992 205 0.1 2012 198 0.2
1973 120 1 1993 145 0.1 2013 190 0.2
1974 93 1 1994 109 0.1 2014 180 0.2
1975 87 1 1995 80 0.1 2015 137 0.2
1976 80 1 1996 76 0.2 2016 118 0.2
1977 75 1 1997 74 0.2 2017 80 0.2
1978 78 1 1998 75 0.2 2018 76 0.2
1979 122 1 1999 106 0.2 2019 74 0.2
1980 = 172 1 2000 +163 0.2 2020 75 0.2
1981 201 1 2001-198 0.2 2021 106 0.2
1982 196 1 2002-190 0.2 2022 163 0.2
1983 195 1 2003-180 0.2 2023 198 0.2
1984 149 1 2004 «137 0.2 2024 190 0.2
1985115 1 2005 118 0.2 2035 180 0.2
1986 77 1 2006 80 0.2 2026 137 0.2
1987 74 1 2007 76 0.2 2027 118 0.2
1988 82 1 2008 74 0.2 2028 80 0.2
1989 155 0.6 2009 75 0.2 2029 76 0.2
1990 205 0.6 2010 106 0.2 2030 14 0.2

(NOTE: Forecast of Fio7 to the year 2005 was taken from ref. 9, and the last cycle is repeated for
time after 2005. The 13-month, smoothed Fio7 is used.)

7. DiaMin, DiaMax, nDia
These three parameters give the limiting particle diameters
```
### Page 23
(no discrete labeled regions — full-page Tesseract OCR: 2957 chars)
```
Table 4 - Output of ORDEM96 If Considering a Spacecraft

Considering a spacecraft.
Incl= 51.6, Altitude= 400, Time= 1995, F10(yr-1)= 80, N= .10
nd = 6, np = 18, dv = 1.00
a) Circular orbits:
d[cm]= 1.00E-03 1.00£-02 1.00E-01 1.00E+00 1.00E+01 1.00E+02
Ave. vel. [km/s 11.35 11.39 11.52 9.66 9.53 9.75
Flux[#/m2/yr]= 4.69E+02 4.32E+00 7.05E-04 2.53E-06 4.04E-07 2.19E-07
V{km/s] Az[deg] flux per km/s velocity, normalized with above flux
-50 88.0 - 00000 - 00000 -00002 -00234 -01068 -01537

14,50 18.
15.50 .
16.50 : + 00000 +00000 .00000 -00000 .00000 .00000
17.50 -O0  =.00000 +00000 .00000 -00000 .00000 .00000

b) Elliptical orbits:

d[cm]= 1.00E-03 1.00E-02 1.00E-01 1.00E+00 1.00E+01 1.00E+02
Ave. vel. [km/s]= 8.21 8.21 8.21 8.20 8.09 8.10
Flux[#/m2/yr}]= 1.09E+02 1.28E+00 3.82E-03 4.22E-06 2.49E-08 8.91E-09
V[km/s] Az[deg] flux per km/s velocity, normalized with above flux
+50 :

00000 .00000 -00000 + 00000 -00000 - 00000

1.50 83.1 +00445 00423 -00361 -00740 - 00911 -00919
2.50 80.6 + 01330 01264 -01080 +02109 +02250 -02069
3.50 76.8 +00447 ~00425 +00559 +05349 - 04530 - 03367
4.50 73.5 +02715 02562 -01661 -04806 -05778 05814
5.50 69.2 -01847 -01746 -01272 04402 -04943 04743
6.50 65
```
