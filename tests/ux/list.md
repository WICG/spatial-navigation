# List of UX Test Cases

We've collected the test cases for investigating proper spatial navigation behavior.
The results of test cases are "desirable" behavior, so it may not seem to be correct for some users.

NOTE:
- Search origin: In general, the currently focused element and the origin for searching the element which will gain the focus.
- Candidate: The element which is positioned in the navigation direction from the currently focused element.
- Best candidate: The element which will gain the focus from the currently focused element.

<table style="font-family: 'Roboto';">
  <thead>
  <tr style="background-color:purple; font-weight: bold; color: white;">
    <td align="center">Test Name</td>
    <td align="center">Test Summary</td>
    <td align="center">Note</td>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-001.html" target="blank">Grid Layout 1</a>
      </td>
      <td align="center">Focus will move from the search origin to the best candidate, and the elements are positioned in the grid-like layout.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-002.html" target="blank">Grid Layout 2</a>
      </td>
      <td align="center">Focus will move from the search origin to the best candidate when the elements are positioned in the masonry layout.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-003.html" target="blank">Grid Layout 3</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates when there are multiple candidates which have the same Euclidean distance from the search origin.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-004.html" target="blank">Grid Layout 4</a>
      </td>
      <td align="center">Focus will move from the search origin to the best candidate, and the elements are positioned in the grid-like layout.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-001.html" target="blank">Grid Align 1</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates when there are multiple candidates which have the same Euclidean distance from the search origin.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-002.html" target="blank">Grid Align 2</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates. The Euclidean distances from the search origin of each element are slightly different (1px). But the amount of alignment between the search origin are significantly different.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-003.html" target="blank">Grid Align 3</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates. This test aims to make sure that the Euclidean distance affects more than the amount of alignment to the final value of the distance function.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-grid-align-004.html" target="blank">Grid Align 4</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates. This test aims to make sure that the Euclidean distance has a decisive effect on the final value of the distance function more than the amount of alignment.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-001.html" target="blank">Element Intersect 1</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates. This test aims to make sure that the amount of intersected area affects more than the Euclidean distance to the final value of the distance function.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-intersected-002.html" target="blank">Element Intersect 2</a>
      </td>
      <td align="center">Focus will move from the search origin to one of the candidates. This test aims to make sure that the amount of intersected area affects more than the amount of alignment to the final value of the distance function.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-transformed-001.html" target="blank">Transformed elements</a>
      </td>
      <td align="center">Focus will move from the search origin to transformed elements. This test aims to find out the amount of transformation of an element will affect the result of distance function or not.</td>
      <td align="center"></td>
    </tr>
    <tr>
      <td align="center">
        <a href="spatnav-distance-function-fragments-001.html" target="blank">Fragmented elements</a>
      </td>
      <td align="center">Focus will move from the search origin to the fragmented text element.</td>
      <td align="center"></td>
    </tr>
  </tbody>
</table>
