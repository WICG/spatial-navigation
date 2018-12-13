/* Spatial Navigation Polyfill v1.0
* : distance function experiment for Spatial Navigation
*
* Copyright (c) 2018 LG Electronics Inc. All rights reserved.
* Release Version 1.0
*
*/
class SpatialNavigationTest {
  constructor (targetId, dir, expectedId) {
    this.targetId = targetId;
    this.expectedId = expectedId;
    this.actualId = null;
    this.test_dir = dir;
    this.test_result = null;
  }

  runTest() {
    document.getElementById(this.targetId).focus();   
    window.navigate(this.test_dir);    
    this.actualId = document.activeElement.id;
    this.test_result = (this.actualId === this.expectedId) ? true : false;

    console.log(this.test_result);
  }

  getTestResult() {
    return this.test_result;
  }

  getTestMsg() {
    if (this.test_result === true)
      return `Move focus ${this.test_dir} 
                from ${this.targetId} 
                to ${this.actualId} `;
    else if (this.test_result === false)
      return `Expected ${this.expectedId}, but got ${this.actualId}
              when moving focus ${this.test_dir} from ${this.targetId}`;
  }
}

function writeResult(element, text) {
  let x = document.createElement('P');
  x.appendChild(document.createTextNode(text));
  element.appendChild(x);
}

function clearResult(element) {
  // If the console element has any child nodes, remove its child nodes
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

(function () {

  let mapOfBoundRect = null;
  const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
  
  document.addEventListener('load', function() {

    // init distance function setting
    init();
  });

  function init() {
    console.log('========Init=======');
    const container = document.getElementById('container');

    container.addEventListener('keydown', function(e) {
      e.preventDefault();
      const dir = ARROW_KEY_CODE[e.keyCode];
      const target = e.target;

      console.log(`dir: '${dir}'`);
      console.log(`target: '${target}'`);
      
      mapOfBoundRect = new Map();

      const focusableAreas = container.focusableAreas({'mode': 'visible'});
      const candidates = spatNavCandidates(target, dir, focusableAreas, container);
      console.log(candidates);

      if (candidates && candidates.length > 0) {
        const bestCandidate = selectBestCandidateByOptions(target, candidates, dir);
        bestCandidate.focus();
      }
      
    });
  }
    
  function spatNavCandidates (element, dir, candidates) {
    let targetElement = element;
  
    let eventTargetRect = getBoundingClientRect(targetElement);
    return candidates.filter(candidate =>
      isOutside(getBoundingClientRect(candidate), eventTargetRect, dir));
  }
  
  function selectBestCandidateByOptions(currentElm, candidates, dir) {
    return selectBestCandidate(currentElm, candidates, dir, getDistance);
  }
  
  function selectBestCandidate(currentElm, candidates, dir, distanceFunction) {
    const eventTargetRect = getBoundingClientRect(currentElm);
    let minDistance = Number.POSITIVE_INFINITY;
    let minDistanceElement = undefined;
  
    console.log(`candidates: '${candidates}'`);
  
    if (candidates) {
      for (let i = 0; i < candidates.length; i++) {
        const distance = distanceFunction(eventTargetRect, getBoundingClientRect(candidates[i]), dir);
  
        // If the same distance, the candidate will be selected in the DOM order
        if (distance < minDistance) {
          minDistance = distance;
          minDistanceElement = candidates[i];
        }
      }
    }
  
    return minDistanceElement;
  }
  
  function getDistance(rect1, rect2, dir) {
  
    const kOrthogonalWeightForLeftRight = 30;
    const kOrthogonalWeightForUpDown = 2;
  
    let orthogonal_bias = 0;
    let points = null;
  
    let pointOption = document.getElementById('point_option').value;
    let functionOption = document.getElementById('function_option').value;
  
    console.log('========Apply Options=======');
  
    if (pointOption === 'closest_vertex') {
      // calculate the distance function with closest vertex
      points = getPointsFromVertices(dir, rect1, rect2);
      console.log(`point option : closest vertices ='${points}'`);
    } else if (pointOption === 'center_point') {
      // calculate the distance function with center points
      points = getPointsFromCenterPoints(dir, rect1, rect2);
      console.log(`point option : center point ='${points}'`);
    } else if (pointOption === 'center_edge') {
    // calculate the distance function with center points on the edges
      points = getPointsFromCenterPointsOnEdges(dir, rect1, rect2);
      console.log(`point option : center point of the edges ='${points}'`);
    }
  
    // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
    // that minimize the distance between these two points
    const P1 = Math.abs(points.entryPoint[0] - points.exitPoint[0]);
    const P2 = Math.abs(points.entryPoint[1] - points.exitPoint[1]);
  
    // A = The euclidian distance between P1 and P2.
    const A = Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
    let B, C;
  
    // B: The absolute distance in the dir direction between P1 and P2, or 0 if dir is null.
    // C: The absolute distance in the direction which is orthogonal to dir between P1 and P2, or 0 if dir is null.
    switch (dir) {
    case 'left':
      /* falls through */
    case 'right' :
      B = P1;
      // If not aligned => add bias
      if (!isAligned(rect1, rect2, dir))
        orthogonal_bias = (rect1.height / 2);
      C = (P2 + orthogonal_bias) * kOrthogonalWeightForLeftRight;
      break;
  
    case 'up' :
      /* falls through */
    case 'down' :
      B = P2;
      // If not aligned => add bias
      if (!isAligned(rect1, rect2, dir))
        orthogonal_bias = (rect1.width / 2);
      C = (P1 + orthogonal_bias) * kOrthogonalWeightForUpDown;
      break;
  
    default:
      B = 0;
      C = 0;
      break;
    }
  
    // D: The square root of the area of intersection between the border boxes of candidate and starting point
    const intersection_rect = getIntersectionRect(rect1, rect2);
    const D = (intersection_rect) ? intersection_rect.width * intersection_rect.height : 0;
  
    if (functionOption === 'original') {
      console.log(`distance function : A + B + C - D ='${(A + B + C - D)}'`);
      return (A + B + C - D);
    } else if (functionOption === 'sameDirOriented') {
      console.log(`distance function : A + C - D ='${(A + C - D)}'`);
      return (A + C - D);
    }  
  }
  
  function getPointsFromClosestPointsOnEdges(dir = 'down', rect1, rect2) {
  
  }
  
  function getPointsFromVertices(dir = 'down', rect1, rect2) {
    const points = {entryPoint:[0,0], exitPoint:[0,0]};
  
    // Set direction
    switch (dir) {
    case 'left':
      points.exitPoint[0] = rect1.left;
      if (rect2.right < rect1.left) points.entryPoint[0] = rect2.right;
      else points.entryPoint[0] = rect1.left;
      break;
    case 'up':
      points.exitPoint[1] = rect1.top;
      if (rect2.bottom < rect1.top) points.entryPoint[1] = rect2.bottom;
      else points.entryPoint[1] = rect1.top;
      break;
    case 'right':
      points.exitPoint[0] = rect1.right;
      if (rect2.left > rect1.right) points.entryPoint[0] = rect2.left;
      else points.entryPoint[0] = rect1.right;
      break;
    case 'down':
      points.exitPoint[1] = rect1.bottom;
      if (rect2.top > rect1.bottom) points.entryPoint[1] = rect2.top;
      else points.entryPoint[1] = rect1.bottom;
      break;
    }
  
    // Set orthogonal direction
    switch (dir) {
    case 'left':
    case 'right':
      if (isBelow(rect1, rect2)) {
        points.exitPoint[1] = rect1.top;
        if (rect2.bottom < rect1.top) points.entryPoint[1] = rect2.bottom;
        else points.entryPoint[1] = rect1.top;
      }
      else if (isBelow(rect2, rect1)) {
        points.exitPoint[1] = rect1.bottom;
        if (rect2.top > rect1.bottom) points.entryPoint[1] = rect2.top;
        else points.entryPoint[1] = rect1.bottom;
      }
      else {
        points.exitPoint[1] = Math.max(rect1.top, rect2.top);
        points.entryPoint[1] = points.exitPoint[1];
      }
      break;
  
    case 'up':
    case 'down':
      if (isRightSide(rect1, rect2)) {
        points.exitPoint[0] = rect1.left;
        if (rect2.right < rect1.left) points.entryPoint[0] = rect2.right;
        else points.entryPoint[0] = rect1.left;
      }
      else if (isRightSide(rect2, rect1)) {
        points.exitPoint[0] = rect1.right;
        if (rect2.left > rect1.right) points.entryPoint[0] = rect2.left;
        else points.entryPoint[0] = rect1.right;
      }
      else {
        points.exitPoint[0] = Math.max(rect1.left, rect2.left);
        points.entryPoint[0] = points.exitPoint[0];
      }
      break;
    }
    
    return points;
  }
  
  function getPointsFromCenterPoints(dir = 'down', rect1, rect2) {
    const points = {entryPoint:[0,0], exitPoint:[0,0]};
  
    // exit point comes from the rect 1
    points.exitPoint[0] = (rect1.left + rect1.right) / 2;
    points.exitPoint[1] = (rect1.top + rect1.bottom) / 2;
  
    // entry point comes from the rect 2
    points.entryPoint[0] = (rect2.left + rect2.right) / 2;
    points.entryPoint[1] = (rect2.top + rect2.bottom) / 2;
    
    return points;
  }
  
  function getPointsFromCenterPointsOnEdges(dir = 'down', rect1, rect2) {
    const points = {entryPoint:[0,0], exitPoint:[0,0]};
  
    // exit point comes from the rect 1
    points.exitPoint[0] = (rect1.left + rect1.right) / 2;
    points.exitPoint[1] = (rect1.top + rect1.bottom) / 2;
  
    // entry point comes from the rect 2
    points.entryPoint[0] = (rect2.left + rect2.right) / 2;
    points.entryPoint[1] = (rect2.top + rect2.bottom) / 2;
    
    return points;
  }
  
  function getIntersectionRect(rect1, rect2) {
    let intersection_rect;
    const new_location = [Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top)];
    const new_max_point = [Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom)];
  
    if (!(new_location[0] >= new_max_point[0] || new_location[1] >= new_max_point[1])) {
      // intersecting-cases
      intersection_rect = {width: 0, height: 0};
      intersection_rect.width = Math.abs(new_location[0] - new_max_point[0]);
      intersection_rect.height = Math.abs(new_location[1] - new_max_point[1]);
    }
    return intersection_rect;
  }
  
  
  function getBoundingClientRect(element) {
    let rect = mapOfBoundRect && mapOfBoundRect.get(element);   // memoization
    if (!rect) {
      const boundingClientRect = element.getBoundingClientRect();
      rect = {
        top: Number(boundingClientRect.top.toFixed(2)),
        right: Number(boundingClientRect.right.toFixed(2)),
        bottom: Number(boundingClientRect.bottom.toFixed(2)),
        left: Number(boundingClientRect.left.toFixed(2)),
        width: Number(boundingClientRect.width.toFixed(2)),
        height: Number(boundingClientRect.height.toFixed(2))
      };
      mapOfBoundRect && mapOfBoundRect.set(element, rect);
    }
    return rect;
  }
  
  function isOutside(rect1, rect2, dir) {
    switch (dir) {
    case 'left':
      return isRightSide(rect2, rect1);
    case 'right':
      return isRightSide(rect1, rect2);
    case 'up':
      return isBelow(rect2, rect1);
    case 'down':
      return isBelow(rect1, rect2);
    default:
      return false;
    }
  }
  
  /* rect1 is right of rect2 */
  function isRightSide(rect1, rect2) {
    return rect1.left >= rect2.right || (rect1.left >= rect2.left && rect1.right > rect2.right && rect1.bottom > rect2.top && rect1.top < rect2.bottom);
  }
  
  /* rect1 is below of rect2 */
  function isBelow(rect1, rect2) {
    return rect1.top >= rect2.bottom || (rect1.top >= rect2.top && rect1.bottom > rect2.bottom && rect1.left < rect2.right && rect1.right > rect2.left);
  }
  
  /* rect1 is completely aligned or partially aligned for the direction */
  function isAligned(rect1, rect2, dir) {
    switch (dir) {
    case 'left' :
      /* falls through */
    case 'right' :
      return rect1.bottom > rect2.top && rect1.top < rect2.bottom;
    case 'up' :
      /* falls through */
    case 'down' :
      return rect1.right > rect2.left && rect1.left < rect2.right;
    default:
      return false;
    }
  }

})(document);