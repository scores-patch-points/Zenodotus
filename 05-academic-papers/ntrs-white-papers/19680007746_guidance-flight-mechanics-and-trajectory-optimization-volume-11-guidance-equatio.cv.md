# CV look-loop reading — Guidance, flight mechanics and trajectory optimization.  Volume 11 - Guidance equations for orbital operations

Rendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR, a vision model read when one answered, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.

### Page 100
(no discrete labeled regions — full-page Tesseract OCR: 1486 chars)
```
by minimizing the Bayes function, or a' posteriori risk, as defined in
Section 2.3.5.2.1 of Reference 2.23. A Bayes strategy was derived for the
optimum estimation problem in Reference 2.23. A Bayes strategy for the
optimum control problem is discussed in the following section of this mono-

graph.

It should be noted that the problem which has been defined includes
the sequential problem or time sequence problem which is most common in
space flight technology. This aspect of the problem does not present a
major difficulty in determining minimum risk strategies. The essential
difference with respect to the other problems being considered lies in the
definition of the parameter (9), the action (U) and the sample (¥) sets;
iee., these sets can be defined as ordered sets of vectors (or subsets)
which correspond to the state, control and observation vectors at
particular times. The optimum strategy is, thus, the ordered set U of
action subsets or vectors. Of course, the loss function 4 (U, @) is
defined over the sets V and 9. For instance, the "quadratic" loss
function (see Section 2.2.2) can be written as

L(U, 0) = 8 QO+U"7rU

where @ and 6 are vectors with subvectors which denote th
```
### Page 101
(no discrete labeled regions — full-page Tesseract OCR: 2497 chars)
```
Thus, it is seen that the problem being formulated is not restricted to
a "terminal" action.

An important goal in the establishment of minimum risk strategies is
the determination of a set which contains all necessary information to
define the optimum strategy. This set, termed a "sufficient statistic",
was defined in a previous monograph (see Section 2.3 of Reference 2.23) for
the estimation problem. The use of sufficient statistics in optimum control
is discussed in Reference 2.17. The general result, as presented, is that
minimum risk strategies are exclusive functions of sufficient statistics;
therefore, only sufficient statistics need be considered in determining
minimum risk strategies. This proof is a significant part of the sequential
problem in which it is generally desired to express the "local" action in
terms of the most "compact" set of information. In general, the sufficient
statistic for a particular problem will depend upon the nature of the
dynamics, the statistical distributions and the loss function involved in
the problem, In all cases, however, the sufficient statistic determines
a basic requirement of the optimum strategy for minimum risk which, in
turn, dete
```
### Page 102
(no discrete labeled regions — full-page Tesseract OCR: 1757 chars)
```
where f( ) denotes the probability density function of its argument and
£(/) denotes the conditional probability density function of its arguments.
Now, since all of the functions used in the definition of R[U,] are
positive, the optimum strategy (the Bayes strategy) minimizes the inner
integral for all Y. However, the inner integral can be reduced further

by use of the identity f(y /6)2(9) = £(0/Y)f(Y). i.e.,

av,2) =f Lf ciu, 8) Fle/y)ae JFiay
ya

-[8 Lum tn ay

where B[UCY)] is definedYas the Bayes function. (This function is
recognized as being the conditional expected loss, given a particular set

of observations Y).
atuivd=fz(u,9) Fle/v)ae
2

Again, the optimal (Bayes) strategy minimizes the Bayes function B[U(Y)] .

In the more general form of the optimum control problem, the loss is
a function of sequential state and control vectors. However, this depen-
dence can be included in the parameter and action sets 9 and u by defining
these sets as vectors which contain the state vectors and control vectors
as subvectors, i.e.,

where 6, and uy, are state and control vectors, respectively, defined as

6,= 8(4,) and. = “Ct, )
and where N is the total number of control points. Note
```
### Page 103
(no discrete labeled regions — full-page Tesseract OCR: 983 chars)
```
as (see Section 2.2.2) N
r Tr
Ty 7s (87Q, & eg, Ba]
el
The loss Jy is a special case of 24 (u , 9) where Q and @ are partitioned
diagonal matrices containing the matrices Q q and

ne

Now, the parameter set 9 is a function of the action set U . In
particular, the state vector n is a function of the previous state 6-1
and the control u, - For a linear system, the relationship of & , and uy
is usually expressed as

old, ) = Font 5(4, het) thy nat & (é,.)

However, the system can also be described by the following equivalent
relationships.
6, * a 4

wv

8, = yy 67a I %

et

6, = 4
=¢, ,

Note that the system state S is expressed in terms of the initial state 6,

and the contribution of all ‘previous control vectors “, for i=1, 2,.--, ne
This system of equations can now be written in terms of the sets § and @ as
6=95+7U

where 4, is the initial state vector, 9 and U are the parameter and action
sets, respectively, and Q and [ are matrices defined as follows

tend eaten

96
```
### Page 104
(no discrete labeled regions — full-page Tesseract OCR: 955 chars)
```
The matrices $ and [ are thus partitioned matrices which contain the sub-
matrices fio and —- igs respectively. It is important to note that Proiisa
lower triangular matrix.

The loss function (for the present purposes,loss is quadratic) can now

be expressed in terms of the action set U and the initial state vector 6,
i.e., since the parameter set © is a function of U and 69 it follows that

Llu 5 (6,U)) = L*lU™, §]

where
“lum, 8] = (88+ 70)"Q(64 +7UpU" TU
= 658096 +2UT QbGtUT QrUruUTtU
2* [ur] = 87905 +2U7' 996 tu (r'@rrt)u

L*(U, 6) =L*TU), 8)

Substituting L*(U, 69) = L* [U(x), So] into the Bayes function
and taking the first partial derivative with respect to the action set, it
is found that

a
7 BLU pele, 6)/¥)
EGF (U6 0/7}

2E{L 984 + (arr z)uy/y

w

a
30 Blu]

Thus, setting the first partial ote[u(yy equal to zero determines the
Bayes strategy Ug , i-e-,

('Ertry, =-ELPQ9X YN = - P'Q@GElS/¥)

(7Or+ 1, = -r'QGE

where

& = £(6/Y)

97
```
### Page 105
(no discrete labeled regions — full-page Tesseract OCR: 1953 chars)
```
Thus, the Bayes strategy becomes

yu, =-(Parrny regs = KG

and the corresponding loss is

L(UW) 4:9(6,0)] = 610 8 -2KQ8 HK (POLK

The "optimum" schedule for these corrections can now be determined by
minimizing the maximum eigenvalue of the matrix A. This process has its
origin in the fact that

4[46] | VAS 24

4 7 ‘max
ad 54% 44

where the > are the eigenvalues of A. Note that Dynamic Programming has
not been employed at any point.

Several comments are in order concerning the Bayes strategy for the
optimum control (quadratic loss). First, note that the form of Ug is
the same as the form for the optimum estimate in the linear case and
Gaussian distributions (see Sections 2.3.6.3 of Reference 2.23). Second,
the optimum control is a linear function of the conditional expectation of
Oo, given the observations, which is a Bayes strategy for the optimum
estimate of So under rather general conditions (see Section 2.3.5.2 of
Reference 2.23). Third, the Bayes strategy (4) is the "total" optimum
control since it contains as subvectors, the "local" optimum control vectors
( Un*)3 ieee, Uz is a single expression for the set of optimum control
vectors ( Un*) for n= 1,2,..., NM. Fourth, the Ba
```
