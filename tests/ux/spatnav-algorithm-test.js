/* Spatial Navigation Polyfill v1.0
* : distance function experiment for Spatial Navigation
*
* Copyright (c) 2018 LG Electronics Inc. All rights reserved.
* Release Version 1.0
*
*/
let mapOfBoundRect = null;
const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};

class SpatialNavigationTest {
  constructor (container, targetId, dir, expectedId, options) {
    this.container = container;
    this.targetId = targetId;
    this.expectedId = expectedId;
    this.options = options;
    this.actualId = null;
    this.test_dir = dir;
    this.test_result = null;
  }

  runTest() {
    document.getElementById(this.targetId).focus();   
    
    // window.navigate(this.test_dir) : original polyfill
    // container, element, dir, options
    navigateByOption(this.container, document.getElementById(this.targetId), this.test_dir, this.options);
    
    this.actualId = document.activeElement.id;
    this.test_result = (this.actualId === this.expectedId) ? true : false;
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
      return `Expected '${this.expectedId}', but got '${this.actualId}'
              when moving focus ${this.test_dir} from '${this.targetId}'`;
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

function writeTestSummary(element, Array) {
  let successCnt = 0;

  writeResult(element, "===== Test Result =====");
  for (let i = 0; i < Array.length; i++) {
    Array[i].runTest();
    if (Array[i].getTestResult() === true)
      successCnt++;

    writeResult(element, 
      `Result: ${Array[i].getTestResult()}   ,   Detail: ${Array[i].getTestMsg()}`);
  }

  writeResult(element, 
    `Total: ${Array.length}   ,   Success: ${successCnt},   Fail: ${Array.length - successCnt}`);
}

function navigateByOption(container, element, dir, options) {
  mapOfBoundRect = new Map();

  const focusableAreas = container.focusableAreas({'mode': 'visible'});
  const candidates = spatNavCandidates(element, dir, focusableAreas, container);
  console.log(candidates);

  if (candidates && candidates.length > 0) {
    const bestCandidate = selectBestCandidateByOptions(element, candidates, dir, options);
    bestCandidate.focus();
  }
}

function spatNavCandidates (element, dir, candidates) {
  let targetElement = element;

  let eventTargetRect = getBoundingClientRect(targetElement);
  return candidates.filter(candidate =>
    isOutside(getBoundingClientRect(candidate), eventTargetRect, dir));
}

function selectBestCandidateByOptions(currentElm, candidates, dir, options) {
  return selectBestCandidate(currentElm, candidates, dir, getDistance, options);
}

function selectBestCandidate(currentElm, candidates, dir, distanceFunction, options) {
  const eventTargetRect = getBoundingClientRect(currentElm);
  let minDistance = Number.POSITIVE_INFINITY;
  let minDistanceElement = undefined;

  console.log(`candidates: '${candidates}'`);

  if (candidates) {
    for (let i = 0; i < candidates.length; i++) {
      const distance = distanceFunction(eventTargetRect, getBoundingClientRect(candidates[i]), dir, options);

      // If the same distance, the candidate will be selected in the DOM order
      if (distance < minDistance) {
        minDistance = distance;
        minDistanceElement = candidates[i];
      }
    }
  }

  return minDistanceElement;
}

function getDistance(rect1, rect2, dir, options) {

  let kOrthogonalWeightForLeftRight = 30;
  let kOrthogonalWeightForUpDown = 2;

  let orthogonalBias = 0;
  let points = getPointsFromClosestPointsOnEdges(dir, rect1, rect2);

  let alignBias = 0;
  let alignWeight = 5.0;
  let gap = 0;

  // get the orthogonal weight 
  if (options.orth_weight_x)
    kOrthogonalWeightForLeftRight = options.orth_weight_x;
  if (options.orth_weight_y)
    kOrthogonalWeightForUpDown = options.orth_weight_y;

  console.log(`orthogonal weight : 'X-axis: ${kOrthogonalWeightForLeftRight}, Y-axis: ${kOrthogonalWeightForUpDown}'`);
  
  // get the align weight 
  if (options.align_weight)
    alignWeight = options.align_weight;

  if (options.point) {
    if (options.point === 'closest_point')
      points = getPointsFromClosestPointsOnEdges(dir, rect1, rect2);
    else if (options.point === 'closest_vertex')
      points = getPointsFromVertices(dir, rect1, rect2);
    else if (options.point === 'center_point')
      points = getPointsFromCenterPoints(dir, rect1, rect2);
    else if (options.point === 'center_edge')
      points = getPointsFromCenterPointsOnEdges(dir, rect1, rect2);
  }

  console.log(`Point selection : ${options.point}`);

  // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
  // that minimize the distance between these two points
  const P1 = Math.abs(points.entryPoint[0] - points.exitPoint[0]);
  const P2 = Math.abs(points.entryPoint[1] - points.exitPoint[1]);

  // A: The euclidian distance between P1 and P2.
  // B: The absolute distance in the dir direction between P1 and P2, or 0 if dir is null.
  // C: The absolute distance in the direction which is orthogonal to dir between P1 and P2, or 0 if dir is null.
  // D: The square root of the area of intersection between the border boxes of candidate and starting point
  // E: The intersection edges between a candidate and the starting point

  const A = Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
  let B, C, E;
    
  const intersectionRect = getIntersectionRect(rect1, rect2);
  const D = intersectionRect.area;

  
  switch (dir) {
  case 'left':
    /* falls through */
  case 'right' :
    gap = intersectionRect.width;
    B = P1;
    
    // If two elements are aligned, add align bias
    if (isAligned(rect1, rect2, dir)) {
      alignBias = intersectionRect.height / rect1.height;
      if (alignBias > 1) align_bias = 1;
    } 
    else  // else, add orthogonal bias
      orthogonalBias = (rect1.height / 2);

    C = (P2 + orthogonalBias) * kOrthogonalWeightForLeftRight;

    E = alignWeight * alignBias;
    
    console.log(`orthogonal weight: ${kOrthogonalWeightForLeftRight}, orthogonal bias: ${orthogonalBias}`);
    console.log(`align weight : ${alignWeight}, align bias: ${alignBias}`);

    break;

  case 'up' :
    /* falls through */
  case 'down' :
    B = P2;
    gap = intersectionRect.height;

    // If two elements are aligned, add align bias
    if (isAligned(rect1, rect2, dir)) {
      alignBias = intersectionRect.width / rect1.width;  
      if (alignBias > 1) alignBias = 1;
    }
    else  // else, add orthogonal bias
      orthogonalBias = (rect1.width / 2);
      
    C = (P1 + orthogonalBias) * kOrthogonalWeightForUpDown;

    E = alignWeight * alignBias;
    
    console.log(`orthogonal weight: ${kOrthogonalWeightForUpDown}, orthogonal bias: ${orthogonalBias}`);
    console.log(`align weight : ${alignWeight}, align bias: ${alignBias}`);

    break;

  default:
    B = 0;
    C = 0;
    E = 0;
    break;
  }

  if (options.function === 'original') {
    console.log(`distance function : A + B + C - D ='${(A + B + C - D)}'`);
    console.log(`=> A : '${A}'`);
    console.log(`=> B : '${B}'`);
    console.log(`=> C : '${C}'`);
    console.log(`=> D : '${D}'`);
    return (A + B + C - D);
  } else if (options.function === 'sameDirOriented') {
    console.log(`distance function : A + C - D ='${(A + C - D)}'`);
    console.log(`=> A : '${A}'`);
    console.log(`=> C : '${C}'`);
    console.log(`=> D : '${D}'`);
    return (A + C - D);
  } else if (options.function === 'additionalAlignFactor') {
    console.log(`distance function : A + C - D - E ='${(A + C - D - E)}'`);
    console.log(`=> A : '${A}'`);
    console.log(`=> C : '${C}'`);
    console.log(`=> D : '${D}'`);
    console.log(`=> E : '${E}'`);
    console.log(`gap: '${gap}'`);
    return (A + C - D - E);
  }  
}

function getPointsFromClosestPointsOnEdges(dir = 'down', rect1, rect2) {
  const points = {entryPoint:[0,0], exitPoint:[0,0]};

  // Set direction
  switch (dir) {
  case 'left':
    points.exitPoint[0] = rect1.left;
    if (rect2.right < rect1.left)
      points.entryPoint[0] = rect2.right;
    else 
      points.entryPoint[0] = rect1.left;
    break;
  case 'up':
    points.exitPoint[1] = rect1.top;
    if (rect2.bottom < rect1.top)
      points.entryPoint[1] = rect2.bottom;
    else
      points.entryPoint[1] = rect1.top;
    break;
  case 'right':
    points.exitPoint[0] = rect1.right;
    if (rect2.left > rect1.right)
      points.entryPoint[0] = rect2.left;
    else 
      points.entryPoint[0] = rect1.right;
    break;
  case 'down':
    points.exitPoint[1] = rect1.bottom;
    if (rect2.top > rect1.bottom)
      points.entryPoint[1] = rect2.top;
    else
      points.entryPoint[1] = rect1.bottom;
    break;
  }

  // Set orthogonal direction
  switch (dir) {
  case 'left':
  case 'right':
    if (isBelow(rect1, rect2)) {
      points.exitPoint[1] = rect1.top;
      if (rect2.bottom < rect1.top)
        points.entryPoint[1] = rect2.bottom;
      else
        points.entryPoint[1] = rect1.top;
    }
    else if (isBelow(rect2, rect1)) {
      points.exitPoint[1] = rect1.bottom;
      if (rect2.top > rect1.bottom)
        points.entryPoint[1] = rect2.top;
      else
        points.entryPoint[1] = rect1.bottom;
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
      if (rect2.right < rect1.left)
        points.entryPoint[0] = rect2.right;
      else
        points.entryPoint[0] = rect1.left;
    }
    else if (isRightSide(rect2, rect1)) {
      points.exitPoint[0] = rect1.right;
      if (rect2.left > rect1.right)
        points.entryPoint[0] = rect2.left;
      else
        points.entryPoint[0] = rect1.right;
    }
    else {
      points.exitPoint[0] = Math.max(rect1.left, rect2.left);
      points.entryPoint[0] = points.exitPoint[0];
    }
    break;
  }
  
  return points;
}

function getPointsFromVertices(dir = 'down', rect1, rect2) {
  const points = {entryPoint:[0,0], exitPoint:[0,0]};

  let centerPoint_rect1 = {x:(rect1.left + rect1.right) / 2, y:(rect1.top + rect1.bottom) / 2};
  let centerPoint_rect2 = {x:(rect2.left + rect2.right) / 2, y:(rect2.top + rect2.bottom) / 2};

  // Set direction
  switch (dir) {
    case 'left':
      points.exitPoint[0] = rect1.left;
      if (centerPoint_rect2.x < rect1.left)
        points.entryPoint[0] = rect2.left;
      else
        points.entryPoint[0] = rect2.right; 
      break;
    case 'up':
      points.exitPoint[1] = rect1.top;
      if (centerPoint_rect2.y < rect1.top)
        points.entryPoint[1] = rect2.top;
      else
        points.entryPoint[1] = rect2.bottom;
      break;
    case 'right':
      points.exitPoint[0] = rect1.right;
      if (centerPoint_rect2.x > rect1.right)
        points.entryPoint[0] = rect2.right;
      else
        points.entryPoint[0] = rect2.left;
      break;
    case 'down':
      points.exitPoint[1] = rect1.bottom;
      if (centerPoint_rect2.y > rect1.bottom)
        points.entryPoint[1] = rect2.bottom;
      else
        points.entryPoint[1] = rect2.top;
      break;
    }
  
  // Set orthogonal direction
  switch (dir) {
    case 'left':
    case 'right':
      if (centerPoint_rect2.y < rect1.top) {
        points.exitPoint[1] = rect1.top;
        points.entryPoint[1] = rect2.bottom;
      }
      else if ((rect1.top <= centerPoint_rect2.y) && (centerPoint_rect2.y < centerPoint_rect1.y)) {
        points.exitPoint[1] = rect1.top;
        points.entryPoint[1] = rect2.top;
      }
      else if ((centerPoint_rect1.y <= centerPoint_rect2.y) && (centerPoint_rect2.y < rect1.bottom)) {
        points.exitPoint[1] = rect1.bottom;
        points.entryPoint[1] = rect2.bottom;
      }
      else {
        points.exitPoint[1] = rect1.bottom;
        points.entryPoint[1] = rect2.top;
      }
      break;
  
    case 'up':
    case 'down':
      if (centerPoint_rect2.x < rect1.left) {
        points.exitPoint[0] = rect1.left;
        points.entryPoint[0] = rect2.right;
      }
      else if ((rect1.left <= centerPoint_rect2.x) && (centerPoint_rect2.x < centerPoint_rect1.x)) {
        points.exitPoint[0] = rect1.left;
        points.entryPoint[0] = rect2.left;
      }
      else if ((centerPoint_rect1.x <= centerPoint_rect2.x) && (centerPoint_rect2.x < rect1.right)) {
        points.exitPoint[0] = rect1.right;
        points.entryPoint[0] = rect2.right;
      }
      else {
        points.exitPoint[0] = rect1.right;
        points.entryPoint[0] = rect2.left;
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

  // Set direction
  switch (dir) {
  case 'left':
    points.exitPoint[0] = rect1.left;
    points.exitPoint[1] = (rect1.top + rect1.bottom) / 2;

    points.entryPoint[1] = (rect2.top + rect2.bottom) / 2;
    if (rect2.right < rect1.left) points.entryPoint[0] = rect2.right;
    else points.entryPoint[0] = rect1.left;
    break;
  case 'up':
    points.exitPoint[0] = (rect1.left + rect1.right) / 2;
    points.exitPoint[1] = rect1.top;

    points.entryPoint[0] = (rect2.left + rect2.right) / 2;
    if (rect2.bottom < rect1.top) points.entryPoint[1] = rect2.bottom;
    else points.entryPoint[1] = rect1.top;
    break;
  case 'right':
    points.exitPoint[0] = rect1.right;
    points.exitPoint[1] = (rect1.top + rect1.bottom) / 2;

    points.entryPoint[1] = (rect2.top + rect2.bottom) / 2;
    if (rect2.left > rect1.right) points.entryPoint[0] = rect2.left;
    else points.entryPoint[0] = rect1.right;
    break;
  case 'down':
    points.exitPoint[0] = (rect1.left + rect1.right) / 2;
    points.exitPoint[1] = rect1.bottom;

    points.entryPoint[0] = (rect2.left + rect2.right) / 2;
    if (rect2.top > rect1.bottom) points.entryPoint[1] = rect2.top;
    else points.entryPoint[1] = rect1.bottom;
    break;
  }

  return points;
}

function getIntersectionRect(rect1, rect2) {
  let intersection_rect = {width: 0, height: 0, area: 0, wRatio: 0, hRatio:0};
  const new_location = [Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top)];
  const new_max_point = [Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom)];

  console.log(new_location);
  console.log(new_max_point);

  intersection_rect.width = Math.abs(new_location[0] - new_max_point[0]);
  intersection_rect.height = Math.abs(new_location[1] - new_max_point[1]);

  if (!(new_location[0] >= new_max_point[0] || new_location[1] >= new_max_point[1])) {
    // intersecting-cases
    intersection_rect.area = Math.sqrt(intersection_rect.width * intersection_rect.height);
  }

  console.log(`Intersection rect: width=${intersection_rect.width}, height=${intersection_rect.height}, area=${intersection_rect.area}`);
  
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