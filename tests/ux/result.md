# Test for various selecting the best candidate methods
## Distance function in the Spec
  <p>For each candidate in candidates, find the points P1 inside the boundary box of starting point and P2<br>
    inside the boundary box of candidate that minimizes the distance between these two points, <br>
    when the distance is defined as follows:</p>
  <p><strong>distance:
      A + B + C - D</strong></p>
  <ul>
    <li>A:
        The euclidian distance between P1 and P2</li>
    <li>B:
        The absolute distance in the dir direction between P1 and P2</li>
    <li>C:
        The absolute distance in the direction which is orthogonal to dir between P1 and P2</li>
    <li>D:
        The square root of the area of intersection between the boundary boxes of candidate and starting point</li>
  </ul>

## Test Result
<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center" rowspan="2">Method</td>
    <td align="center" rowspan="2">Expected</td>
    <td align="center" rowspan="2">Blink</td>
    <td align="center" rowspan="2">Spec</td>
    <td align="center" colspan="2">Closest Points</td>
    <td align="center" colspan="2">Closest Vertices</td>
    <td align="center" colspan="2">Center Points</td>
    <td align="center" colspan="2">Center Points on Edges</td>
  </tr>
  <tr style="background-color: plum;">
    <td align="center">A + B + C - D</td>
    <td align="center">A + C - D</td>
    <td align="center">A + B + C - D</td>
    <td align="center">A + C - D</td>
    <td align="center">A + B + C - D</td>
    <td align="center">A + C - D</td>
    <td align="center">A + B + C - D</td>
    <td align="center">A + C - D</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-001.html" target="blank">Grid Layout 1</a>
      </td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
      <td align="center">3/3</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-002.html" target="blank">Grid Layout 2</a>
      </td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-003.html" target="blank">Grid Layout 3</a>
      </td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-004.html" target="blank">Grid Layout 4</a>
      </td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-005.html" target="blank">Grid Layout 5</a>
      </td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-006.html" target="blank">Grid Layout 6</a>
      </td>
      <td align="center">2/2</td>
      <td align="center">0/2</td>
      <td align="center">0/2</td>
      <td align="center">0/2</td>
      <td align="center">0/2</td>
      <td align="center">0/2</td>
      <td align="center">0/2</td>
      <td align="center">2/2</td>
      <td align="center">2/2</td>
      <td align="center">2/2</td>
      <td align="center">2/2</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-007.html" target="blank">Grid Layout 7</a>
      </td>
      <td align="center">5/5</td>
      <td align="center">5/5</td>
      <td align="center">5/5</td>
      <td align="center">5/5</td>
      <td align="center">5/5</td>
      <td align="center">4/5</td>
      <td align="center">4/5</td>
      <td align="center">3/5</td>
      <td align="center">3/5</td>
      <td align="center">3/5</td>
      <td align="center">3/5</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-transformed-001.html" target="blank">Transformed elements</a>
      </td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">0/1</td>
      <td align="center">0/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
      <td align="center">1/1</td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-fragments-001.html" target="blank">Fragmented elements</a>
      </td>
      <td align="center">3/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
      <td align="center">0/3</td>
      <td align="center">0/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
      <td align="center">1/3</td>
    </tr>
    <tr style="background-color: thistle ">
      <td align="center">Total</td>
      <td align="center">18/18</td>
      <td align="center">11/18</td>
      <td align="center">11/18</td>
      <td align="center">11/18</td>
      <td align="center">12/18</td>
      <td align="center">8/18</td>
      <td align="center">9/18</td>
      <td align="center">12/18</td>
      <td align="center">12/18</td>
      <td align="center">12/18</td>
      <td align="center">12/18</td>
    </tr>

  </tbody>
</table>

For investigating the proper result about selecting the best candidate, the distance function is tweaked as below:
<ul>
  <li>Point Selection</li>
  <ul>
    <li>Select P1 and P2 as the closest point along the boundary box of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the closest vertex of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the center point of the starting point and a candidate element</li>
    <li>Select P1 and P2 as the center point on the closest edge of starting point and a candidate element</li>
  </ul>
  <li>Distance function</li>
  <ul>
    <li>Define the distance function as `(A + B + C - D)`</li>
    <li>Define the distance function as `(A + C - D)`</li>
  </ul>
</ul>
