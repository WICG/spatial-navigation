/* Spatial Navigation Polyfill v1.1.0
 * : common function for Spatial Navigation
 *
 * Copyright (c) 2018-2019 LG Electronics Inc.
 * https://github.com/WICG/spatial-navigation
 *
 * Licensed under the MIT license (MIT)
 */

 /**
 * User type definition for Point
 * @typeof {Object} Points
 * @property {Array<x,y>} Points.entryPoint
 * @property {Array<x,y>} Points.exitPoint
 */

(function () {

  // If spatial navigation is already enabled via browser engine or browser extensions, all the following code isn't executed.
  if (window.navigate !== undefined) {
    return;
  }

  const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
  const TAB_KEY_CODE = 9;
  let mapOfBoundRect = null;
  let startingPosition = null; // Indicates global variables for spatnav (starting position)

  /**
   * Initiate the spatial navigation features of the polyfill.
   * This function defines which input methods trigger the spatial navigation behavior.
   * @function initiateSpatialNavigation
   */
  function initiateSpatialNavigation() {
    /*
     * Bind the standards APIs to be exposed to the window object for authors
     */
    window.navigate = navigate;
    window.Element.prototype.spatialNavigationSearch = spatialNavigationSearch;
    window.Element.prototype.focusableAreas = focusableAreas;
    window.Element.prototype.getSpatialNavigationContainer = getSpatialNavigationContainer;

    /*
     * CSS.registerProperty() from the Properties and Values API
     * Reference: https://drafts.css-houdini.org/css-properties-values-api/#the-registerproperty-function
     */
    if (window.CSS && CSS.registerProperty &&
      window.getComputedStyle(document.documentElement).getPropertyValue('--spatial-navigation-contain') === '') {
      CSS.registerProperty({
        name: '--spatial-navigation-contain',
        syntax: 'auto | contain | delegable',
        inherits: false,
        initialValue: 'auto'
      });
    }

    /*
     * CSS.registerProperty() from the Properties and Values API
     * Reference: https://drafts.css-houdini.org/css-properties-values-api/#the-registerproperty-function
     */
    if (window.CSS && CSS.registerProperty &&
      window.getComputedStyle(document.documentElement).getPropertyValue('--spatial-navigation-behavior') === '') {
      CSS.registerProperty({
        name: '--spatial-navigation-behavior',
        syntax: 'auto | focus | scroll',
        inherits: true,
        initialValue: 'auto'
      });
    }

    /*
     * keydown EventListener :
     * If arrow key pressed, get the next focusing element and send it to focusing controller
     */
    window.addEventListener('keydown', function(e) {
      const currentKeyMode = (parent && parent.__spatialNavigation__.keyMode) || window.__spatialNavigation__.keyMode;
      const eventTarget = document.activeElement;
      const dir = ARROW_KEY_CODE[e.keyCode];

      if (e.keyCode === TAB_KEY_CODE)
        startingPosition = null;

      if (!currentKeyMode ||
          (currentKeyMode === 'NONE') ||
          ((currentKeyMode === 'SHIFTARROW') && !e.shiftKey) ||
          ((currentKeyMode === 'ARROW') && e.shiftKey))
        return;

      if (!e.defaultPrevented) {
        let focusNavigableArrowKey = {'left': true, 'up': true, 'right': true, 'down': true};

        // Edge case (text input, area) : Don't move focus, just navigate cursor in text area
        if ((eventTarget.nodeName === 'INPUT') || eventTarget.nodeName === 'TEXTAREA')
          focusNavigableArrowKey = handlingEditableElement(e);

        if (focusNavigableArrowKey[dir]) {
          e.preventDefault();
          mapOfBoundRect = new Map();

          navigate(dir);

          mapOfBoundRect = null;
          startingPosition = null;
        }
      }
    });

    /*
     * mouseup EventListener :
     * If the mouse click a point in the page, the point will be the starting point.
     * NOTE: Let UA set the spatial navigation starting point based on click
     */
    document.addEventListener('mouseup', function(e) {
      startingPosition = {xPosition: e.clientX, yPosition: e.clientY};
    });
  }

  /**
   * Enable the author to trigger spatial navigation programatically, as if the user had done so manually.
   * @see {@link https://wicg.github.io/spatial-navigation/#dom-window-navigate}
   * @function navigate
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   */
  function navigate(dir) {
    // spatial navigation steps

    // 1
    let startingPoint = findStartingPoint();
    let eventTarget = null;
    let elementFromPosition = null;

    // 2 Optional step, UA defined starting point
    if (startingPosition) {
      elementFromPosition = document.elementFromPoint(startingPosition.xPosition, startingPosition.yPosition);
    }

    if (elementFromPosition && startingPoint.contains(elementFromPosition)) {
      startingPoint = startingPosition;
      startingPosition = null;

      // 3
      eventTarget = elementFromPosition;
    } else {
      // 3
      eventTarget = startingPoint;
    }

    // 4
    if (eventTarget === document || eventTarget === document.documentElement) {
      eventTarget = document.body || document.documentElement;
    }

    // 5
    // At this point, spatialNavigationSearch can be applied.
    // If startingPoint is either a scroll container or the document,
    // find the best candidate within startingPoint
    if ((isContainer(eventTarget) || eventTarget.nodeName === 'BODY') && !(eventTarget.nodeName === 'INPUT')) {
      if (eventTarget.nodeName === 'IFRAME')
        eventTarget = eventTarget.contentDocument.body;

      // spatnav-behavior = scroll
      if (getCSSSpatNavAction(eventTarget) === 'scroll') {
        console.log(`Behavior on the spatnav container: ${getCSSSpatNavAction(eventTarget)}`);
        if (scrollingController(eventTarget, dir)) return;
      }

      else {
        // 5-2
        if (focusingController(eventTarget.spatialNavigationSearch(dir), dir)) return;
        if (scrollingController(eventTarget, dir)) return;
      }
    }

    // 6
    // Let container be the nearest ancestor of eventTarget
    let container = eventTarget.getSpatialNavigationContainer();
    let parentContainer = (container.parentElement) ? container.parentElement.getSpatialNavigationContainer() : null;

    // When the container is the viewport of a browsing context
    if (!parentContainer && ( window.location !== window.parent.location)) {
      parentContainer = window.parent.document.documentElement;
    }

    if (getCSSSpatNavAction(container) === 'focus') {
      console.log(`Behavior on the spatnav container: ${getCSSSpatNavAction(container)}`);
      focusOnly(eventTarget, container, dir);
    }
    else if (getCSSSpatNavAction(container) === ('auto')) {
      // 7
      while (parentContainer) {
        if (focusingController(eventTarget.spatialNavigationSearch(dir, {container, outsideOnly: true}), dir)) {
          return;
        } else {
          // If there isn't any candidate and the best candidate among candidate:
          // 1) Scroll or 2) Find candidates of the ancestor container
          // 8 - if
          if (scrollingController(container, dir)) return;
          else {
            // 8 - else
            // [event] navnotarget : Fired when spatial navigation has failed to find any acceptable candidate to move the focus
            // to in the current spatnav container and when that same spatnav container cannot be scrolled either,
            // before going up the tree to search in the nearest ancestor spatnav container.

            if (!createSpatNavEvents('notarget', container, eventTarget, dir)) return;

            // find the container
            if (container === document || container === document.documentElement) {

              if ( window.location !== window.parent.location ) {
                // The page is in an iframe
                // eventTarget needs to be reset because the position of the element in the IFRAME
                // is unuseful when the focus moves out of the iframe
                eventTarget = window.frameElement;
                container = window.parent.document.documentElement;

                if (container.parentElement)
                  parentContainer = container.parentElement.getSpatialNavigationContainer();
                else {
                  parentContainer = null;
                  break;
                }
              }
            }
            else {
              // avoiding when spatnav container with tabindex=-1
              if (isFocusable(container)) {
                eventTarget = container;
              }

              container = parentContainer;

              if (container.parentElement)
                parentContainer = container.parentElement.getSpatialNavigationContainer();
              else {
                parentContainer = null;
                break;
              }
            }
          }
        }
      }
    }

    // Behavior after 'navnotarget' - Getting out from the current spatnav container
    if (!parentContainer && container) {
      if (focusingController(eventTarget.spatialNavigationSearch(dir, {candidates: getSpatialNavigationCandidates(container), container, outsideOnly: true}), dir))
        return;
    }

    if (getCSSSpatNavAction(container) === ('auto'))
      if (scrollingController(container, dir)) return;
  }

  /**
   * Move the focus to the best candidate or do nothing.
   * @function focusingController
   * @param bestCandidate {Node} - The best candidate of the spatial navigation
   * @param dir {SpatialNavigationDirection}- The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function focusingController(bestCandidate, dir) {
    // 10 & 11
    // When bestCandidate is found
    if (bestCandidate) {
      const container = bestCandidate.getSpatialNavigationContainer();

      // Scrolling container or document when the next focusing element isn't entirely visible
      if (isScrollContainer(container) && !isEntirelyVisible(bestCandidate))
        bestCandidate.scrollIntoView();

      // When bestCandidate is a focusable element and not a container : move focus
      /*
       * [event] navbeforefocus : Fired before spatial or sequential navigation changes the focus.
       */
      if (!createSpatNavEvents('beforefocus', bestCandidate, null, dir))
        return true;

      bestCandidate.focus();
      return true;
    }

    // When bestCandidate is not found within the scrollport of a container: Nothing
    return false;
  }

  /**
   * Directionally scroll the scrollable spatial navigation container if it can be manually scrolled more.
   * @function scrollingController
   * @param container {Node} - The spatial navigation container which can scroll
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function scrollingController(container, dir) {
    /*
     * [event] navbeforescroll : Fired before spatial navigation triggers scrolling.
     */
    // If there is any scrollable area among parent elements and it can be manually scrolled, scroll the document
    if (isScrollable(container, dir) && !isScrollBoundary(container, dir)) {
      createSpatNavEvents('beforescroll', container, null, dir);
      moveScroll(container, dir);
      return true;
    }

    // If the spatnav container is document and it can be scrolled, scroll the document
    if (!container.parentElement && !isHTMLScrollBoundary(container, dir)) {
      createSpatNavEvents('beforescroll', container, null, dir);
      moveScroll(document.documentElement, dir);
      return true;
    }
    return false;
  }

  /**
   * Find the candidates within a spatial navigation container include delegable container.
   * This function does not search inside delegable container or focusable container.
   * In other words, this return candidates set is not included focusable elements inside delegable container or focusable container.
   *
   * @function getSpatialNavigationCandidates
   * @param container {Node} - The spatial navigation container
   * @param option {FocusableAreasOptions} - 'mode' attribute takes visible' or 'all' for searching the boundary of focusable elements.
   *                                          Default value is 'visible'.
   * @returns {sequence<Node>} candidate elements within the container
   */
  function getSpatialNavigationCandidates(container, option = {'mode': 'visible'}) {
    let candidates = [];

    if (container.childElementCount > 0) {
      if (!container.parentElement) {
        container = document.body;
      }
      const children = container.children;
      for (const elem of children) {
        if (isDelegableContainer(elem)) {
          candidates.push(elem);
        } else if(isFocusable(elem)) {
          candidates.push(elem);

          if(!isContainer(elem) && elem.childElementCount) {
            candidates = candidates.concat(getSpatialNavigationCandidates(elem));
          }
        } else if (elem.childElementCount) {
          candidates = candidates.concat(getSpatialNavigationCandidates(elem));
        }
      }
    }
    return (option.mode === 'all') ? candidates : candidates.filter(isVisible);
  }

  /**
   * Find the candidates among focusable elements within a spatial navigation container from the search origin (currently focused element)
   * depending on the directional information.
   * @function getFilteredSpatialNavigationCandidates
   * @param element {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param candidates {sequence<Node>} - The candidates for spatial navigation without the directional information
   * @param container {Node} - The spatial navigation container
   * @param outsideOnly {boolean} - Whether candidates should be elements outside of the target element or not.
   * @returns {Node} The candidates for spatial navigation considering the directional information
   */
  function getFilteredSpatialNavigationCandidates (element, dir, candidates, container, outsideOnly) {
    const targetElement = (element.nodeName === 'IFRAME') ? element.contentDocument.body : element;
    // If the container is unknown, get the closest container from the element
    container = container || targetElement.getSpatialNavigationContainer();

    // If the candidates is unknown, find candidates
    // 5-1
    candidates = (!candidates || candidates.length <= 0) ? getSpatialNavigationCandidates(container) : candidates;
    return filteredCandidates(targetElement, candidates, dir, container, outsideOnly);
  }

  /**
   * Find the best candidate among the candidates within the container from the search origin (currently focused element)
   * @see {@link https://wicg.github.io/spatial-navigation/#js-api}
   * @function spatialNavigationSearch
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param container {Node} - The spatial navigation container
   * @param outsideOnly {boolean} - Whether candidates should be elements outside of the target element or not.
   * @returns {Node} The best candidate which will gain the focus
   */
  function spatialNavigationSearch (dir, args) {
    let {candidates, container, outsideOnly} = args || {};
    const targetElement = this;
    let bestTarget;
    candidates = getFilteredSpatialNavigationCandidates(targetElement, dir, candidates, container, outsideOnly);

    // Find the best candidate
    // 5
    // If startingPoint is either a scroll container or the document,
    // find the best candidate within startingPoint
    if (candidates && candidates.length > 0) {
      if ((isContainer(targetElement) || targetElement.nodeName === 'BODY') && !(targetElement.nodeName === 'INPUT')) {
        const insideCandidates = [];
        const outsideCandidates = [];

        // if candidates are contained in the targetElement, then the focus moves inside the targetElement
        candidates.forEach(candidate => {
          (targetElement.contains(candidate) ? insideCandidates : outsideCandidates).push(candidate);
        });
        bestTarget = selectBestCandidateFromEdge(targetElement, insideCandidates, dir) || selectBestCandidate(targetElement, outsideCandidates, dir);
      } else {
        bestTarget = selectBestCandidate(targetElement, candidates, dir);
      }
      if (isDelegableContainer(bestTarget)) {

        // if best target is delegable container, then find descendants candidate inside delegable container.
        const innerTarget = getSpatialNavigationCandidates(bestTarget);
        const descendantsBest = innerTarget.length > 0 ? targetElement.spatialNavigationSearch(dir, {candidates: innerTarget, container: bestTarget}) : null;
        if (descendantsBest) {
          bestTarget = descendantsBest;
        } else if (!isFocusable(bestTarget)) {
          // if there is no target inside bestTarget and delegable container is not focusable,
          // then try to find another best target without curren best target.
          candidates.splice(candidates.indexOf(bestTarget), 1);
          bestTarget = candidates.length ? targetElement.spatialNavigationSearch(dir, {candidates: candidates, container: container}) : null;
        }
      }
      return bestTarget;
    }

    return null;
  }

  /**
   * Get the filtered candidate among candidates.
   * @see {@link https://wicg.github.io/spatial-navigation/#select-the-best-candidate}
   * @function filteredCandidates
   * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param container {Node} - The spatial navigation container
   * @param outsideOnly {boolean} - Whether candidates should be elements outside of the target element or not.
   * @returns {sequence<Node>} The filtered candidates which are not the search origin and not in the given spatial navigation direction from the search origin
   */
  function filteredCandidates(currentElm, candidates, dir, container, outsideOnly) {
    const originalContainer = currentElm.getSpatialNavigationContainer();
    let eventTargetRect;

    // If D(dir) is null, let candidates be the same as visibles
    if (dir === undefined)
      return candidates;

    // to do
    // Offscreen handling when originalContainer is not <HTML>
    if (originalContainer.parentElement && container !== originalContainer && !isVisible(currentElm))
      eventTargetRect = getBoundingClientRect(originalContainer);
    else eventTargetRect = getBoundingClientRect(currentElm);

    /*
     * Else, let candidates be the subset of the elements in visibles
     * whose principal box’s geometric center is within the closed half plane
     * whose boundary goes through the geometric center of starting point and is perpendicular to D.
     */
    if (!outsideOnly && (isContainer(currentElm) || currentElm.nodeName === 'BODY') && !(currentElm.nodeName === 'INPUT')) {
      return candidates.filter(candidate => {
        const candidateRect = getBoundingClientRect(candidate);
        return container.contains(candidate) &&
          ((currentElm.contains(candidate) && isInside(eventTargetRect, candidateRect) && candidate !== currentElm) ||
          isOutside(candidateRect, eventTargetRect, dir));
        });
    } else {
      return candidates.filter(candidate =>
        container.contains(candidate) &&
        isOutside(getBoundingClientRect(candidate), eventTargetRect, dir)
      );
    }
  }

  /**
   * Select the best candidate among given candidates.
   * @see {@link https://wicg.github.io/spatial-navigation/#select-the-best-candidate}
   * @function selectBestCandidate
   * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Node} The best candidate which will gain the focus
   */
  function selectBestCandidate(currentElm, candidates, dir) {
    return getClosestElement(currentElm, candidates, dir, getDistance);
  }

  /**
   * Select the best candidate among candidates by finding the closet candidate from the edge of the currently focused element (search origin).
   * @see {@link https://wicg.github.io/spatial-navigation/#select-the-best-candidate (Step 5)}
   * @function selectBestCandidateFromEdge
   * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Node} The best candidate which will gain the focus
   */
  function selectBestCandidateFromEdge(currentElm, candidates, dir) {
    return getClosestElement(currentElm, candidates, dir, getInnerDistance);
  }


  /**
   * Select the closest candidate from the currently focused element (search origin) among candidates by using the distance function.
   * @function getClosestElement
   * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param distanceFunction {function} - The distance function which measures the distance from the search origin to each candidate
   * @returns {Node} The candidate which is the closest one from the search origin
   */
  function getClosestElement(currentElm, candidates, dir, distanceFunction) {
    const eventTargetRect = getBoundingClientRect(currentElm);
    let minDistance = Number.POSITIVE_INFINITY;
    let minDistanceElement = undefined;

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

  /**
   * Get container of an element.
   * @see {@link https://wicg.github.io/spatial-navigation/#dom-element-getspatialnavigationcontainer}
   * @module Element
   * @function getSpatialNavigationContainer
   * @returns {Node} The spatial navigation container
   */
  function getSpatialNavigationContainer() {
    let container = this;

    while(!isContainer(container)) {
      if (!container.parentElement) {
        container = window.document.documentElement;
        break;
      }
      else {
        container = container.parentElement;
      }
    }
    return container;
  }

  /**
   * Find focusable elements within the spatial navigation container.
   * @see {@link https://wicg.github.io/spatial-navigation/#dom-element-focusableareas}
   * @function focusableAreas
   * @param option {FocusableAreasOptions} - 'mode' attribute takes visible' or 'all' for searching the boundary of focusable elements.
   *                                          Default value is 'visible'.
   * @returns {sequence<Node>} All focusable elements or only visible focusable elements within the container
   */
  function focusableAreas(option = {'mode': 'visible'}) {
    const container = this.parentElement ? this : document.body;
    const focusables = Array.prototype.filter.call(container.getElementsByTagName('*'), isFocusable);
    return (option.mode === 'all') ? focusables : focusables.filter(isVisible);
  }

  /**
   * Create the NavigatoinEvent: navbeforefocus, navbeforescroll, navnotarget
   * @see {@link https://wicg.github.io/spatial-navigation/#events-navigationevent}
   * @function createSpatNavEvents
   * @param option {string} - Type of the navigation event (beforefocus, beforescroll, notarget)
   * @param element {Node} - The target element of the event
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   */
  function createSpatNavEvents(option, element, elm, direction) {
    const data = {
      causedTarget: elm,
      dir: direction
    };

    let triggeredEvent = null;

    switch (option) {
    case 'beforefocus':
      triggeredEvent = new CustomEvent('navbeforefocus', {'bubbles': true, 'cancelable': true, detail: data});
      break;

    case 'beforescroll':
      triggeredEvent = new CustomEvent('navbeforescroll', {'bubbles': true, 'cancelable': true, detail: data});
      break;

    case 'notarget':
      triggeredEvent = new CustomEvent('navnotarget', {'bubbles': true, 'cancelable': true, detail: data});
      break;
    }

    return element.dispatchEvent(triggeredEvent);
  }

  /**
   * Get the value of the CSS custom property of the element
   * @function readCssVar
   * @param element {Node}
   * @param varName {string} - The name of the css custom property without '--'
   * @returns {string} The value of the css custom property
   */
  function readCssVar(element, varName) {
    return element.style.getPropertyValue(`--${varName}`).trim();
  }

  /**
   * Decide whether or not the 'contain' value is given to 'spatial-navigation-contain' css property of an element
   * @function isCSSSpatNavContain
   * @param element {Node}
   * @returns {boolean}
   */
  function isCSSSpatNavContain(element) {
    const spatialNavigationCSS =  readCssVar(element, 'spatial-navigation-contain');
    return spatialNavigationCSS === 'contain' || spatialNavigationCSS === 'delegable';
  }

  /**
   * Return the value of 'spatial-navigation-behavior' css property of an element
   * @function getCSSSpatNavAction
   * @param element {Node} - would be the spatial navigation container
   * @returns {string} : auto | focus | scroll
   */
  function getCSSSpatNavAction(element) {
    if (readCssVar(element, 'spatial-navigation-action') === '')
      return 'auto';
    return readCssVar(element, 'spatial-navigation-action');
  }

  /**
   * Only move the focus with spatial navigation. Manually scrolling isn't available.
   * @function focusOnly
   * @param element {SpatialNavigationContainer} - container
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   */
  function focusOnly(element, container, dir) {
    // spatial navigation steps

    let eventTarget = element;
    let parentContainer = (container.parentElement) ? container.parentElement.getSpatialNavigationContainer() : null;

    // 7
    while (parentContainer) {
      if (focusingController(eventTarget.spatialNavigationSearch(dir, {candidates: getSpatialNavigationCandidates(container, {'mode': 'all'}), container}), dir)) {
        return;
      }
      else {
        // If there isn't any candidate and the best candidate among candidate: Find candidates of the ancestor container

        // [event] navnotarget : Fired when spatial navigation has failed to find any acceptable candidate to move the focus
        // to in the current spatnav container and when that same spatnav container cannot be scrolled either,
        // before going up the tree to search in the nearest ancestor spatnav container.
        if (!createSpatNavEvents('notarget', container, element, dir)) return;

        // find the container

        if (container === document || container === document.documentElement) {

          if ( window.location !== window.parent.location ) {
            // The page is in an iframe
            // eventTarget needs to be reset because the position of the element in the IFRAME
            // is unuseful when the focus moves out of the iframe
            eventTarget = window.frameElement;
            container = window.parent.document.documentElement;

            if (container.parentElement)
              parentContainer = container.parentElement.getSpatialNavigationContainer();
            else {
              parentContainer = null;
              break;
            }
          }
        }
        else {
          // avoiding when spatnav container with tabindex=-1
          if (isFocusable(container)) {
            eventTarget = container;
          }

          container = parentContainer;

          if (container.parentElement)
            parentContainer = container.parentElement.getSpatialNavigationContainer();
          else {
            parentContainer = null;
            break;
          }
        }
      }
    }
    // Behavior after 'navnotarget' - Getting out from the current spatnav container
    if (!parentContainer && container) {
      if (focusingController(eventTarget.spatialNavigationSearch(dir, {candidates: getSpatialNavigationCandidates(container), container}), dir))
        return;
    }
  }

  /**
   * Find starting point.
   * @todo Use terminology - 'search origin'
   * @see {@link https://wicg.github.io/spatial-navigation/#spatial-navigation-steps}
   * @function findStartingPoint
   * @returns {Node} The starting point for the spatial navigation
   */
  function findStartingPoint() {
    let startingPoint = document.activeElement;
    if (!startingPoint ||
      (startingPoint === document.body && !document.querySelector(':focus')) /* body isn't actually focused*/
    ) {
      startingPoint = document;
    }
    return startingPoint;
  }

  /**
   * Move the scroll of an element depending on the given spatial navigation directrion
   * (Assume that User Agent defined distance is '40px')
   * @see {@link https://wicg.github.io/spatial-navigation/#directionally-scroll-an-element}
   * @function moveScroll
   * @param element {Node} - The scrollable element
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param offset {Number} - The explicit amount of offset for scrolling. Default value is 0.
   */
  function moveScroll(element, dir, offset = 0) {
    if (element) {
      switch (dir) {
      case 'left': element.scrollLeft -= (40 + offset); break;
      case 'right': element.scrollLeft += (40 + offset); break;
      case 'up': element.scrollTop -= (40 + offset); break;
      case 'down': element.scrollTop += (40 + offset); break;
      }
    }
  }

  /**
   * Decide whether an element is container or not.
   * @function isContainer
   * @param element {Node} element
   * @returns {boolean}
   */
  function isContainer(element) {
    return (!element.parentElement) ||
            (element.nodeName === 'IFRAME') ||
            (isScrollContainer(element)) ||
            (isCSSSpatNavContain(element));
  }

  /**
   * Decide whether an element is delegable container or not.
   * @function isDelegableContainer
   * @param element {Node} element
   * @returns {boolean}
   */
  function isDelegableContainer(element) {
    return readCssVar(element, 'spatial-navigation-contain') === 'delegable';
  }

  /**
   * Decide whether an element is a scrollable container or not.
   * @see {@link https://drafts.csswg.org/css-overflow-3/#scroll-container}
   * @function isScrollContainer
   * @param element {Node}
   * @returns {boolean}
   */
  function isScrollContainer(element) {
    const elementStyle = window.getComputedStyle(element, null);
    const overflowX = elementStyle.getPropertyValue('overflow-x');
    const overflowY = elementStyle.getPropertyValue('overflow-y');
    return (overflowX !== 'visible' && overflowX !== 'clip') && (overflowY !== 'visible' && overflowY !== 'clip');
  }

  /**
   * Decide whether this element is scrollable or not.
   * @function isScrollable
   * @param element {Node}
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function isScrollable(element, dir) { // element, dir
    if (element && typeof element === 'object') {
      if (dir && typeof dir === 'string') { // parameter: dir, element
        if (isOverflow(element, dir)) {
          // style property
          const elementStyle = window.getComputedStyle(element, null);
          const overflowX = elementStyle.getPropertyValue('overflow-x');
          const overflowY = elementStyle.getPropertyValue('overflow-y');

          switch (dir) {
          case 'left':
            /* falls through */
          case 'right':
            return (overflowX !== 'visible' && overflowX !== 'clip');
          case 'up':
            /* falls through */
          case 'down':
            return (overflowY !== 'visible' && overflowY !== 'clip');
          }
        }
        return false;
      } else { // parameter: element
        return (element.nodeName === 'HTML' || element.nodeName === 'BODY') ||
                (isScrollContainer(element) && isOverflow(element));
      }
    }
  }

  /**
   * Decide whether an element is overflow or not.
   * @function isOverflow
   * @param element {Node}
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function isOverflow(element, dir) {
    if (element && typeof element === 'object') {
      if (dir && typeof dir === 'string') { // parameter: element, dir
        switch (dir) {
        case 'left':
          /* falls through */
        case 'right':
          return (element.scrollWidth > element.clientWidth);
        case 'up':
          /* falls through */
        case 'down':
          return (element.scrollHeight > element.clientHeight);
        }
      } else { // parameter: element
        return (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
      }
      return false;
    }
  }

  /**
   * Decide whether the scrollbar of the browsing context reaches to the end or not.
   * @function isHTMLScrollBoundary
   * @param element {Node} - The top browsing context
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function isHTMLScrollBoundary(element, dir) {
    let result = false;
    switch (dir) {
    case 'left':
      result = window.scrollX === 0;
      break;
    case 'right':
      result = (element.scrollWidth - element.scrollLeft - element.clientWidth) === 0;
      break;
    case 'up':
      result = window.scrollY === 0;
      break;
    case 'down':
      result = (element.scrollHeight - element.scrollTop - element.clientHeight) === 0;
      break;
    }
    return result;
  }

  /**
   * Decide whether the scrollbar of an element reaches to the end or not.
   * @function isScrollBoundary
   * @param element {Node}
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
  function isScrollBoundary(element, dir) {
    if (isScrollable(element, dir)) {
      const winScrollY = element.scrollTop;
      const winScrollX = element.scrollLeft;

      const height = element.scrollHeight - element.clientHeight;
      const width = element.scrollWidth - element.clientWidth;

      switch (dir) {
      case 'left': return (winScrollX === 0);
      case 'right': return (Math.abs(winScrollX - width) <= 1);
      case 'up': return (winScrollY === 0);
      case 'down': return (Math.abs(winScrollY - height) <= 1);
      }
    }
    return false;
  }

  /**
   * Decide whether an element is focusable for spatial navigation.
   * 1. If element is the browsing context (document, iframe), then it's focusable,
   * 2. If the element is scrollable container (regardless of scrollable axis), then it's focusable,
   * 3. The value of tabIndex >= 0, then it's focusable,
   * 4. If the element is disabled, it isn't focusable,
   * 5. If the element is expressly inert, it isn't focusable,
   * 6. Whether the element is being rendered or not.
   *
   * @function isFocusable
   * @param element {Node}
   * @returns {boolean}
   *
   * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#focusable-area}
   */
  function isFocusable(element) {
    if (element.tabIndex < 0 || isAtagWithoutHref(element) || isActuallyDisabled(element) || isExpresslyInert(element) || !isBeingRendered(element))
      return false;
    else if ((!element.parentElement) || (isScrollable(element) && isOverflow(element)) || (element.tabIndex >= 0))
      return true;
  }

  /**
   * Decide whether an element is a tag without href attribute or not.
   *
   * @function isAtagWithoutHref
   * @param element {Node}
   * @returns {boolean}
   */
  function isAtagWithoutHref(element) {
    return (element.tagName === 'A' && element.getAttribute('href') === null && element.getAttribute('tabIndex') === null);
  }

  /**
   * Decide whether an element is actually disabled or not.
   *
   * @function isActuallyDisabled
   * @param element {Node}
   * @returns {boolean}
   *
   * @see {@link https://html.spec.whatwg.org/multipage/semantics-other.html#concept-element-disabled}
   */
  function isActuallyDisabled(element) {
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTGROUP', 'OPTION', 'FIELDSET'].includes(element.tagName))
      return (element.disabled);
    else
      return false;
  }

  /**
   * Decide whether the element is expressly inert or not.
   * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#expressly-inert}
   * @function isExpresslyInert
   * @param element {Node}
   * @returns {boolean}
   */
  function isExpresslyInert(element) {
    return ((element.inert) && (!element.ownerDocument.documentElement.inert));
  }

  /**
   * Decide whether the element is being rendered or not.
   * 1. If an element has the style as "visibility: hidden | collapse" or "display: none", it is not being rendered.
   * 2. If an element has the style as "opacity: 0", it is not being rendered.(that is, invisible).
   * 3. If width and height of an element are explicitly set to 0, it is not being rendered.
   * 4. If a parent element is hidden, an element itself is not being rendered.
   * (CSS visibility property and display property are inherited.)
   * @see {@link https://html.spec.whatwg.org/multipage/rendering.html#being-rendered}
   * @function isBeingRendered
   * @param element {Node}
   * @returns {boolean}
   */
  function isBeingRendered(element) {
    if (!isVisibleStyleProperty(element.parentElement))
      return false;
    return (isVisibleStyleProperty(element) || (element.style.opacity !== 0) ||
            !((element.style.width === '0px' || element.style.width === 0) && (element.style.height === '0px' || element.style.height === 0)));
  }

  /**
   * Decide whether this element is partially or completely visible to user agent.
   * @function isVisible
   * @param element {Node}
   * @returns {boolean}
   */
  function isVisible(element) {
    return (!element.parentElement) || (isVisibleStyleProperty(element) && hitTest(element));
  }

  /**
   * Decide whether this element is completely visible in this viewport for the arrow direction.
   * @function isEntirelyVisible
   * @param element {Node}
   * @returns {boolean}
   */
  function isEntirelyVisible(element) {
    const rect = getBoundingClientRect(element);
    const containerRect = getBoundingClientRect(element.getSpatialNavigationContainer());

    // FIXME: when element is bigger than container?
    const entirelyVisible = !((rect.left < containerRect.left) ||
      (rect.right > containerRect.right) ||
      (rect.top < containerRect.top) ||
      (rect.bottom > containerRect.bottom));

    return entirelyVisible;
  }

  /**
   * Decide the style property of this element is specified whether it's visible or not.
   * @function isVisibleStyleProperty
   * @param {<Node>} element
   * @returns {boolean}
   */
  function isVisibleStyleProperty(element) {
    const elementStyle = window.getComputedStyle(element, null);
    const thisVisibility = elementStyle.getPropertyValue('visibility');
    const thisDisplay = elementStyle.getPropertyValue('display');
    const invisibleStyle = ['hidden', 'collapse'];

    return (thisDisplay !== 'none' && !invisibleStyle.includes(thisVisibility));
  }

  /**
   * Decide whether this element is entirely or partially visible within the viewport.
   * @function hitTest
   * @param element {Node}
   * @returns {boolean}
   */
  function hitTest(element) {
    let offsetX = parseInt(element.offsetWidth) / 10;
    let offsetY = parseInt(element.offsetHeight) / 10;

    offsetX = isNaN(offsetX) ? 1 : offsetX;
    offsetY = isNaN(offsetY) ? 1 : offsetY;

    const elementRect = getBoundingClientRect(element);

    const middleElem = document.elementFromPoint((elementRect.left + elementRect.right) / 2, (elementRect.top + elementRect.bottom) / 2);
    if (element === middleElem || element.contains(middleElem)) {
      return true;
    }

    const leftTopElem = document.elementFromPoint(elementRect.left + offsetX, elementRect.top + offsetY);
    if (element === leftTopElem || element.contains(leftTopElem)) {
      return true;
    }

    const leftBottomElem = document.elementFromPoint(elementRect.left + offsetX, elementRect.bottom - offsetY);
    if (element === leftBottomElem || element.contains(leftBottomElem)) {
      return true;
    }

    const rightTopElem = document.elementFromPoint(elementRect.right - offsetX, elementRect.top + offsetY);
    if (element === rightTopElem || element.contains(rightTopElem)) {
      return true;
    }

    const rightBottomElem = document.elementFromPoint(elementRect.right - offsetX, elementRect.bottom - offsetY);
    if (element === rightBottomElem || element.contains(rightBottomElem)) {
      return true;
    }

    return false;
  }

  /**
   * Decide whether a child element is entirely or partially Included within container visually.
   * @function isInside
   * @param containerRect {DOMRect}
   * @param childRect {DOMRect}
   * @returns {boolean}
   */
  function isInside(containerRect, childRect) {
    const rightEdgeCheck = (containerRect.left <= childRect.right && containerRect.right >= childRect.right);
    const leftEdgeCheck = (containerRect.left <= childRect.left && containerRect.right >= childRect.left);
    const topEdgeCheck = (containerRect.top <= childRect.top && containerRect.bottom >= childRect.top);
    const bottomEdgeCheck = (containerRect.top <= childRect.bottom && containerRect.bottom >= childRect.bottom);
    return (rightEdgeCheck || leftEdgeCheck) && (topEdgeCheck || bottomEdgeCheck);
  }

  /**
   * Decide whether this element is entirely or partially visible within the viewport.
   * Note: rect1 is outside of rect2 for the dir
   * @function isOutside
   * @param rect1 {DOMRect}
   * @param rect2 {DOMRect}
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {boolean}
   */
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

  /**
   * Get distance between the search origin and a candidate element along the direction when candidate element is inside the search origin.
   * @see {@link https://wicg.github.io/spatial-navigation/#select-the-best-candidate}
   * @function getInnerDistance
   * @param rect1 {DOMRect} - The search origin
   * @param rect2 {DOMRect} - A candidate element
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Number} The euclidian distance between the spatial navigation container and an element inside it
   */
  function getInnerDistance(rect1, rect2, dir) {
    const baseEdgeForEachDirection = {left: 'right', right: 'left', up: 'bottom', down: 'top'};
    const baseEdge = baseEdgeForEachDirection[dir];
    return Math.abs(rect1[baseEdge] - rect2[baseEdge]);
  }

  /**
   * Get the distance between the search origin and a candidate element considering the direction.
   * @see {@link https://wicg.github.io/spatial-navigation/#select-the-best-candidate}
   * @function getDistance
   * @param rect1 {DOMRect} - The search origin
   * @param rect2 {DOMRect} - A candidate element
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Number} The euclidian distance between two elements
   */
  function getDistance(rect1, rect2, dir) {
    const kOrthogonalWeightForLeftRight = 30;
    const kOrthogonalWeightForUpDown = 2;

    let orthogonalBias = 0;

    // Get exit point, entry point
    const points = getEntryAndExitPoints(dir, rect1, rect2);

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
        orthogonalBias = (rect1.height / 2);
      C = (P2 + orthogonalBias) * kOrthogonalWeightForLeftRight;
      break;

    case 'up' :
      /* falls through */
    case 'down' :
      B = P2;
      // If not aligned => add bias
      if (!isAligned(rect1, rect2, dir))
        orthogonalBias = (rect1.width / 2);
      C = (P1 + orthogonalBias) * kOrthogonalWeightForUpDown;
      break;

    default:
      B = 0;
      C = 0;
      break;
    }

    // D: The square root of the area of intersection between the border boxes of candidate and starting point
    const intersectionRect = getIntersectionRect(rect1, rect2);
    const D = (intersectionRect) ? Math.sqrt(intersectionRect.width * intersectionRect.height) : 0;

    return (A + B + C - D);
  }

  /**
   * Get entry point and exit point of two elements considering the direction.
   * @function getEntryAndExitPoints
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD). Default value for dir is 'down'.
   * @param rect1 {DOMRect} - The search origin which contains the exit point
   * @param rect2 {DOMRect} - One of candidates which contains the entry point
   * @returns {Points} The exit point from the search origin and the entry point from a candidate
   */
  function getEntryAndExitPoints(dir = 'down', rect1, rect2) {
    const points = {entryPoint:[0,0], exitPoint:[0,0]};

    // Set direction
    switch (dir) {
    case 'left':
      points.exitPoint[0] = rect1.left;
      points.entryPoint[0] = (rect2.right < rect1.left) ? rect2.right : rect1.left;
      break;
    case 'up':
      points.exitPoint[1] = rect1.top;
      points.entryPoint[1] = (rect2.bottom < rect1.top) ? rect2.bottom : rect1.top;
      break;
    case 'right':
      points.exitPoint[0] = rect1.right;
      points.entryPoint[0] = (rect2.left > rect1.right) ? rect2.left : rect1.right;
      break;
    case 'down':
      points.exitPoint[1] = rect1.bottom;
      points.entryPoint[1] = (rect2.top > rect1.bottom) ? rect2.top : rect1.bottom;
      break;
    }

    // Set orthogonal direction
    switch (dir) {
    case 'left':
    case 'right':
      if (isBelow(rect1, rect2)) {
        points.exitPoint[1] = rect1.top;
        points.entryPoint[1] = (rect2.bottom < rect1.top) ? rect2.bottom : rect1.top;
      }
      else if (isBelow(rect2, rect1)) {
        points.exitPoint[1] = rect1.bottom;
        points.entryPoint[1] = (rect2.top > rect1.bottom) ? rect2.top : rect1.bottom;
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
        points.entryPoint[0] = (rect2.right < rect1.left) ? rect2.right : rect1.left;
      }
      else if (isRightSide(rect2, rect1)) {
        points.exitPoint[0] = rect1.right;
        points.entryPoint[0] = (rect2.left > rect1.right) ? rect2.left : rect1.right;
      }
      else {
        points.exitPoint[0] = Math.max(rect1.left, rect2.left);
        points.entryPoint[0] = points.exitPoint[0];
      }
      break;
    }

    return points;
  }

  /**
   * Find focusable elements within the container
   * @see {@link https://wicg.github.io/spatial-navigation/#dom-element-focusableareas}
   * @function getIntersectionRect
   * @param rect1 {DOMRect} - The search origin which contains the exit point
   * @param rect2 {DOMRect} - One of candidates which contains the entry point
   * @returns {IntersectionArea} The intersection area between two elements.
   *
   * @typeof {Object} IntersectionArea
   * @property {Number} IntersectionArea.width
   * @property {Number} IntersectionArea.height
   */
  function getIntersectionRect(rect1, rect2) {
    const newLocation = [Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top)];
    const newMaxPoint = [Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom)];

    if (!(newLocation[0] >= newMaxPoint[0] || newLocation[1] >= newMaxPoint[1])) {
      // intersecting-cases
      return {
        width: Math.abs(newLocation[0] - newMaxPoint[0]),
        height: Math.abs(newLocation[1] - newMaxPoint[1])
      };
    }
  }

  /**
   * Handle the spatial navigation behavior for HTMLInputElement, HTMLTextAreaElement
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input|HTMLInputElement (MDN)}
   * @function handlingEditableElement
   * @param e {Event} - keydownEvent
   * @returns {boolean}
   */
  function handlingEditableElement(e) {
    const SPINNABLE_INPUT_TYPES = ['email', 'date', 'month', 'number', 'time', 'week'],
      TEXT_INPUT_TYPES = ['password', 'text', 'search', 'tel', 'url', null];
    const eventTarget = document.activeElement;
    const startPosition = eventTarget.selectionStart;
    const endPosition = eventTarget.selectionEnd;
    const focusNavigableArrowKey = {'left': false, 'up': false, 'right': false, 'down': false};

    const dir = ARROW_KEY_CODE[e.keyCode];
    if (dir === undefined) {
      return focusNavigableArrowKey;
    }

    if (SPINNABLE_INPUT_TYPES.includes(eventTarget.getAttribute('type')) &&
      (dir === 'up' || dir === 'down')) {
      focusNavigableArrowKey[dir] = true;
    }
    else if (TEXT_INPUT_TYPES.includes(eventTarget.getAttribute('type')) || eventTarget.nodeName === 'TEXTAREA') {
      if (startPosition == endPosition) { // if there isn't any selected text
        if (startPosition === 0) {
          focusNavigableArrowKey.left = true;
          focusNavigableArrowKey.up = true;
        }
        if (endPosition === eventTarget.value.length) {
          focusNavigableArrowKey.right = true;
          focusNavigableArrowKey.down = true;
        }
      }
    }
    else { // HTMLDataListElement, HTMLSelectElement, HTMLOptGroup
      focusNavigableArrowKey[dir] = true;
    }

    return focusNavigableArrowKey;
  }

  /**
   * Get the DOMRect of an element
   * @function getBoundingClientRect
   * @param element {Node}
   * @returns {DOMRect}
   */
  function getBoundingClientRect(element) {
    // memoization
    let rect = mapOfBoundRect && mapOfBoundRect.get(element);
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

  /**
   * Get the list of the experimental APIs
   * @function getExperimentalAPI
   */
  function getExperimentalAPI() {
    function canScroll(container, dir) {
      return (isScrollable(container, dir) && !isScrollBoundary(container, dir)) ||
             (!container.parentElement && !isHTMLScrollBoundary(container, dir));
    }


    function findTarget(findCandidate, element, dir, option) {
      let eventTarget = element;
      let bestNextTarget = null;

      // 4
      if (eventTarget === document || eventTarget === document.documentElement) {
        eventTarget = document.body || document.documentElement;
      }

      // 5
      // At this point, spatialNavigationSearch can be applied.
      // If startingPoint is either a scroll container or the document,
      // find the best candidate within startingPoint
      if ((isContainer(eventTarget) || eventTarget.nodeName === 'BODY') && !(eventTarget.nodeName === 'INPUT')) {
        if (eventTarget.nodeName === 'IFRAME')
          eventTarget = eventTarget.contentDocument.body;

        const candidates = getSpatialNavigationCandidates(eventTarget, option);

        // 5-2
        if (Array.isArray(candidates) && candidates.length > 0) {
          return findCandidate ? getFilteredSpatialNavigationCandidates(eventTarget, dir, candidates) : eventTarget.spatialNavigationSearch(dir, {candidates});
        }
        if (canScroll(eventTarget, dir)) {
          return findCandidate ? [] : eventTarget;
        }
      }

      // 6
      // Let container be the nearest ancestor of eventTarget
      let container = eventTarget.getSpatialNavigationContainer();
      let parentContainer = (container.parentElement) ? container.parentElement.getSpatialNavigationContainer() : null;

      // When the container is the viewport of a browsing context
      if (!parentContainer && ( window.location !== window.parent.location)) {
        parentContainer = window.parent.document.documentElement;
      }

      // 7
      while (parentContainer) {
        const candidates = filteredCandidates(eventTarget, getSpatialNavigationCandidates(container, option), dir, container);

        if (Array.isArray(candidates) && candidates.length > 0) {
          bestNextTarget = eventTarget.spatialNavigationSearch(dir, {candidates, container});
          if (bestNextTarget) {
            return findCandidate ? candidates : bestNextTarget;
          }
        }

        // If there isn't any candidate and the best candidate among candidate:
        // 1) Scroll or 2) Find candidates of the ancestor container
        // 8 - if
        else if (canScroll(container, dir)) {
          return findCandidate ? [] : eventTarget;
        } else if (container === document || container === document.documentElement) {
          container = window.document.documentElement;

          // The page is in an iframe
          if ( window.location !== window.parent.location ) {

            // eventTarget needs to be reset because the position of the element in the IFRAME
            // is unuseful when the focus moves out of the iframe
            eventTarget = window.frameElement;
            container = window.parent.document.documentElement;
            if (container.parentElement)
              parentContainer = container.parentElement.getSpatialNavigationContainer();
            else {
              parentContainer = null;
              break;
            }
          }
        } else {
          // avoiding when spatnav container with tabindex=-1
          if (isFocusable(container)) {
            eventTarget = container;
          }

          container = parentContainer;
          if (container.parentElement)
            parentContainer = container.parentElement.getSpatialNavigationContainer();
          else {
            parentContainer = null;
            break;
          }
        }
      }

      if (!parentContainer && container) {
        // Getting out from the current spatnav container
        const candidates = filteredCandidates(eventTarget, getSpatialNavigationCandidates(container, option), dir, container);

        // 9
        if (Array.isArray(candidates) && candidates.length > 0) {
          bestNextTarget = eventTarget.spatialNavigationSearch(dir, {candidates, container});
          if (bestNextTarget) {
            return findCandidate ? candidates : bestNextTarget;
          }
        }
      }

      if (canScroll(container, dir)) {
        bestNextTarget = eventTarget;
        return bestNextTarget;
      }
    }

    return {
      isContainer,
      findCandidates: findTarget.bind(null, true),
      findNextTarget: findTarget.bind(null, false),
      getDistanceFromTarget: (element, candidateElement, dir) => {
        if ((isContainer(element) || element.nodeName === 'BODY') && !(element.nodeName === 'INPUT')) {
          if (getSpatialNavigationCandidates(element).includes(candidateElement)) {
            return getInnerDistance(getBoundingClientRect(element), getBoundingClientRect(candidateElement), dir);
          }
        }
        return getDistance(getBoundingClientRect(element), getBoundingClientRect(candidateElement), dir);
      }
    };
  }

  /**
   * Makes to use the experimental APIs.
   * @function enableExperimentalAPIs
   * @param option {boolean} - If it is true, the experimental APIs can be used or it cannot.
   */
  function enableExperimentalAPIs (option) {
    const currentKeyMode = window.__spatialNavigation__ && window.__spatialNavigation__.keyMode;
    window.__spatialNavigation__ = (option === false) ? getInitialAPIs() : Object.assign(getInitialAPIs(), getExperimentalAPI());
    window.__spatialNavigation__.keyMode = currentKeyMode;
    Object.seal(window.__spatialNavigation__);
  }

  /**
   * Set the environment for using the spatial navigation polyfill.
   * @function getInitialAPIs
   */
  function getInitialAPIs() {
    return {
      enableExperimentalAPIs,
      get keyMode() { return this._keymode ? this._keymode : 'ARROW'; },
      set keyMode(mode) { this._keymode = (['SHIFTARROW', 'ARROW', 'NONE'].includes(mode)) ? mode : 'ARROW'; },
    };
  }

  window.addEventListener('load', function() {
    initiateSpatialNavigation();
    enableExperimentalAPIs(false);
  });
})();
