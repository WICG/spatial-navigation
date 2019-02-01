# Improve the distance function for [selecting the best candidate](https://drafts.csswg.org/css-nav-1/#select-the-best-candidate)
## Background
### Selecting the best candidate step in the spec
To select the element which will gain the focus from the search origin, the distance value is calculated for each candidate with following steps:

(1) Find the point P1 within the edges of the boundary box of the search origin and the point P2 within that of a candidate which will make the smallest Euclidean distance between P1 and P2.

(2) With P1 and P2, the distance value is measured by the function as follows:

    distance: A + B + C - D

  <ul>
    <li>A:
        The Euclidean distance between P1 and P2</li>
    <li>B:
        The absolute distance in the navigation direction between P1 and P2</li>
    <li>C:
        The absolute distance in the direction which is orthogonal to the navigation direction between P1 and P2</li>
    <li>D:
        The square root of the area of intersection between the boundary box of a candidate and the search origin</li>
  </ul>

(3) Among the candidates, the one which has the smallest distance value is selected as the best candidate.

> NOTE:
  * Search origin: In general, the currently focused element and the origin for searching the element which will gain the focus.
  * Candidate: The element which is positioned in the navigation direction from the currently focused element.
  * Best candidate: The element which will gain the focus from the currently focused element.

## Problem

When the spatial navigation is used for the real pages, there are unexpected behavior in UX point of view because of the distance function above.

#### Case 1: The focus moves to the unexpected element with the smallest Euclidean distance but not aligned with the search origin in the navigation direction.

e.g.) [Related test case](https://jihyerish.github.io/spatial-navigation/tests/ux/spatnav-distance-function-grid-001.html)

#### Case 2: The focus moves to the unexpected candidate when there are multiple candidates which have the same Euclidean distance.

e.g.) [Related test case](https://jihyerish.github.io/spatial-navigation/tests/ux/spatnav-distance-function-grid-003.html)

#### Case 3: The focus moves to the unexpected candidate when he Euclidean distances of candidates are slightly different (about 1px), but the degrees of alignment with the search origin are significantly different.

e.g.) [Related test case](https://jihyerish.github.io/spatial-navigation/tests/ux/spatnav-distance-function-grid-align-002.html)

## Approach

The distance formula needs to change as below:

#### 1. Remove the factor about calculating the absolute distance in the navigation direction between the search origin and a candidate

In Case 1, the aligned elements are more desirable element to gain the focus. But calculating the absolute distance in the navigation direction (B Factor of the distance formula in the spec) penalizes elements which are aligned, so it's the reason for the unexpected behavior.

[See the test result](#)

#### 2. Add the factor about calculating the degree of alignment between the search origin and a candidate

As in Case 2, when there are multiple candidates which have the same Euclidean distance from the search origin, it's ambiguous to decide where the focus will move to.
To solve the ambiguousity, the Factor for calculating degree of alignment in the navigation direction between a candidate and the search origin is suggested.
It is calculated as

> **Factor** = **degree of alignment** * **alignWeight**
>
> **degree of alignment** = (length of the edge of the area of intersection between a candidate and the search origin / length of the edge of the search origin)

Also, considering Case 3, **alignWeight** is decided as 5.

[See the test result](#)

## Summary of the proposal

<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center"></td>
    <td align="center">As-Is</td>
    <td align="center">To-Be</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">Point Selection</td>
      <td>Closest point from another element on the each element's edge</td>
      <td>Closest point from another element on the each element's edge</td>
    </tr>

    <tr>
      <td align="center">Distance formula</td>
      <td>
        <strong>Distance formula = A + B + C - D</strong>
        <ul>
          <li>A: The Euclidean distance between points</li>
          <li>B: The absolute distance in the navigation direction between points</li>
          <li>C: The absolute distance in the direction which is orthogonal to the navigation direction between points</li>
            <ul>
              <li>Orthogonal weight for LEFT and RIGHT direction: 30</li>
              <li>Orthogonal weight for UP and DOWN direction: 2</li>
            </ul>
          <li>D: The square root of the area of intersection between the boundary box of a candidate and the search origin</li>
        </ul>
      </td>
      <td>
        <strong>Distance formula = A + B - C - D</strong>
        <ul>
          <li>A: The Euclidean distance between points</li>
          <li>B: The absolute distance in the direction which is orthogonal to the navigation direction between points</li>
            <ul>
              <li>Orthogonal weight for LEFT and RIGHT direction: 30</li>
              <li>Orthogonal weight for UP and DOWN direction: 2</li>
            </ul>
          <li>C: The degree of alignment in the navigation direction between a candidate and the search origin</li>
            <ul>
              <li>Align weight: 5</li>
            </ul>
          <li>D: The square root of the area of intersection between the boundary box of a candidate and the search origin</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

#### General Rules (of To-Be)

- A Factor has a decisive effect on the final value of the distance formula.
  e.g.) [Related test case](http://10.177.242.47/jihye/spatial-navigation/tests/ux/spatnav-distance-function-grid-align-004.html)

- If the values of D factor is 0, and the values of A Factor are the same, select the candidate which has the largest value of C Factor.

  e.g.) [Related test case](http://10.177.242.47/jihye/spatial-navigation/tests/ux/spatnav-distance-function-grid-001.html)

- If the values of B factor is 0, and the values of A Factor are slightly different (1px), select the candidate which has the largest value of C Factor.

  e.g.) [Related test case](http://10.177.242.47/jihye/spatial-navigation/tests/ux/spatnav-distance-function-grid-align-002.html)

- If the value of D Factor is more than 0, then the value of A Factor is always 0 and select the candidate which has the largest value of D Factor.

  e.g.) [Related test case](http://10.177.242.47/jihye/spatial-navigation/tests/ux/spatnav-distance-function-intersected-002.html)

- If there are multiple candidates which have the final value of the distance formula, select the first element in the DOM order.

  e.g.) [Related test case](http://10.177.242.47/jihye/spatial-navigation/tests/ux/spatnav-distance-function-grid-002.html)

## Additional Experiment

Also the most appropriate way to select the point from each element for measuring distance is considered.<br>
The conclusion is keeping the method in the spec, which is **choosing the point from each element's edges which is the closest point from another element.**

[See the test result](#)

## Test

We've collected the test cases which show the expected result of the spatial navigation behavior.<br>
See the list of ux test cases [here](list.html).

#### 1. Selection of points

For investigating the proper result about selecting the best candidate, the distance formula is tweaked as below:

  <li>Point Selection</li>
  <ul>
    <li>Select P1 and P2 as the closest point along the boundary box of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the closest vertex of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the center point of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the center point on the closest edge of starting point and a candidate element</li>
  </ul>
  NOTE: The distance formula is (A + B + C - D ) as in the spec.

<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center" rowspan="2">Method</td>
    <td align="center" rowspan="2">Expected</td>
    <td align="center" colspan="4">Spec</td>
  </tr>
  <tr style="background-color: plum;">
    <td align="center">Closest Points</td>
    <td align="center">Closest Vertices</td>
    <td align="center">Center Points</td>
    <td align="center">Center Points on Edges</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-002.html" target="blank">Grid Layout 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-003.html" target="blank">Grid Layout 3</a>
      </td>
      <td align="center">2 / 2</td>
      <td align="center">0 / 2</td>
      <td align="center">0 / 2</td>
      <td align="center">2 / 2</td>
      <td align="center">2 / 2</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-004.html" target="blank">Grid Layout 4</a>
      </td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-001.html" target="blank">Grid Align 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-002.html" target="blank">Grid Align 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-003.html" target="blank">Grid Align 3</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-004.html" target="blank">Grid Align 4</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-001.html" target="blank">Element Intersect 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-002.html" target="blank">Element Intersect 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-transformed-001.html" target="blank">Transformed elements</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-fragments-001.html" target="blank">Fragmented elements</a>
      </td>
      <td align="center">3 / 3</td>
      <td align="center">1 / 3</td>
      <td align="center">0 / 3</td>
      <td align="center">1 / 3</td>
      <td align="center">1 / 3</td>
    </tr>

    <tr style="background-color: thistle ">
      <td align="center">Total</td>
      <td align="center">17 / 17</td>
      <td align="center">11 / 17</td>
      <td align="center">8 / 17</td>
      <td align="center">12 / 17</td>
      <td align="center">12 / 17</td>
    </tr>
  </tbody>
</table>

#### 2. Remove redundant distance value

<li>Distance function</li>
<ul>
  <li>As-is: Define the distance function as `(A + B + C - D)`</li>
  <li>To-be: Define the distance function as `(A + C - D)`</li>
</ul>

<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center" rowspan="2">Method</td>
    <td align="center" rowspan="2">Expected</td>
    <td align="center" colspan="2">Spec</td>
  </tr>
  <tr style="background-color: plum;">
    <td align="center">A + B + C - D</td>
    <td align="center">A + C - D</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-001.html" target="blank">Grid Layout 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-002.html" target="blank">Grid Layout 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-003.html" target="blank">Grid Layout 3</a>
      </td>
      <td align="center">2 / 2</td>
      <td align="center">0 / 2</td>
      <td align="center">0 / 2</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-004.html" target="blank">Grid Layout 4</a>
      </td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-001.html" target="blank">Grid Align 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-002.html" target="blank">Grid Align 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-003.html" target="blank">Grid Align 3</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-004.html" target="blank">Grid Align 4</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-001.html" target="blank">Element Intersect 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-002.html" target="blank">Element Intersect 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>

    <tr style="background-color: thistle ">
      <td align="center">Total</td>
      <td align="center">16 / 16</td>
      <td align="center">12 / 16</td>
      <td align="center">12 / 16</td>
    </tr>
  </tbody>
</table>

#### 3. Considering the degree of alignment

<li>Distance function</li>
<ul>
  <li>As-is: Define the distance function as `(A + C - D)`</li>
  <li>To-be: Define the distance function as `(A + B - C - D)`</li>
</ul>

<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center" rowspan="2">Method</td>
    <td align="center" rowspan="2">Expected</td>
    <td align="center" colspan="2">Spec</td>
  </tr>
  <tr style="background-color: plum;">
    <td align="center">A + C - D</td>
    <td align="center">A + B - C - D</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-001.html" target="blank">Grid Layout 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-002.html" target="blank">Grid Layout 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-003.html" target="blank">Grid Layout 3</a>
      </td>
      <td align="center">2 / 2</td>
      <td align="center">0 / 2</td>
      <td align="center">2 / 2</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-004.html" target="blank">Grid Layout 4</a>
      </td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
      <td align="center">4 / 4</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-001.html" target="blank">Grid Align 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-002.html" target="blank">Grid Align 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">0 / 1</td>
      <td align="center">0 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-003.html" target="blank">Grid Align 3</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-004.html" target="blank">Grid Align 4</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-001.html" target="blank">Element Intersect 1</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-002.html" target="blank">Element Intersect 2</a>
      </td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
      <td align="center">1 / 1</td>
    </tr>

    <tr style="background-color: thistle ">
      <td align="center">Total</td>
      <td align="center">16 / 16</td>
      <td align="center">12 / 16</td>
      <td align="center">16 / 16</td>
    </tr>
  </tbody>
</table>
