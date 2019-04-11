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
 * @property {Point} Points.entryPoint
 * @property {Point} Points.exitPoint
 */

(function () {

  // If spatial navigation is already enabled via browser engine or browser extensions, all the following code isn't executed.
  if (window.navigate !== undefined) {
    return;
  } 

  const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
  const TAB_KEY_CODE = 9;
  let mapOfBoundRect = null;
  let startingPoint = null; // Indicates global variables for spatnav (starting position)

  let navnotargetPrevented = false; // Indicates the navnotarget event is prevented or not
  let navbeforescrollPrevented = false; // Indicates the navbeforescroll event is prevented or not
  let navbeforefocusPrevented = false; // Indicates the navbeforefocus event is prevented or not

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
        syntax: 'auto | contain',
        inherits: false,
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
        startingPoint = null;

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
          startingPoint = null;
        }
      }
    });

    /*
     * mouseup EventListener :
     * If the mouse click a point in the page, the point will be the starting point.
     * NOTE: Let UA set the spatial navigation starting point based on click
     */
    document.addEventListener('mouseup', function(e) {
      startingPoint = {x: e.clientX, y: e.clientY};
    });

    /*
     * navbeforefocus EventListener :
     * If the navbeforefocus event is triggered, then the navbeforefocusPrevented flag can be set
     * for define the prevented default behavior for the event
     */
    document.body.addEventListener('navbeforefocus', function(e) {
      navbeforefocusPrevented = e.defaultPrevented;
    });

    /*
     * navbeforescroll EventListener :
     * If the navbeforescroll event is triggered, then the navbeforescrollPrevented flag can be set
     * for define the prevented default behavior for the event
     */
    document.body.addEventListener('navbeforescroll', function(e) {
      navbeforescrollPrevented = e.defaultPrevented;
    });

    /*
     * navnotarget EventListener :
     * If the navnotarget event is triggered, then the navnotargetPrevented flag can be set
     * for define the prevented default behavior for the event
     */
    document.body.addEventListener('navnotarget', function(e) {
      navnotargetPrevented = e.defaultPrevented;
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
    let searchOrigin = findSearchOrigin();
    let eventTarget = null;
    let elementFromPosition = null;

    // 2 Optional step, UA defined starting point
    if (startingPoint) {
      elementFromPosition = (document.elementFromPoint(startingPoint.x, startingPoint.y)).getSpatialNavigationContainer();
    }

    if (elementFromPosition && searchOrigin.contains(elementFromPosition)) {
      eventTarget = elementFromPosition;
    } else {
      // 3
      eventTarget = searchOrigin;
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

      // 5-2
      if (focusingController(eventTarget.spatialNavigationSearch(dir), dir)) return;
      if (scrollingController(eventTarget, dir)) return;
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
      if (focusingController(eventTarget.spatialNavigationSearch(dir, container.focusableAreas(), container), dir)) {
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

            createSpatNavEvents('notarget', container, eventTarget, dir);

            if (navnotargetPrevented) break;

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

    // Behavior after 'navnotarget' - Getting out from the current spatnav container
    if (!parentContainer && container) {
      if (focusingController(eventTarget.spatialNavigationSearch(dir, container.focusableAreas(), container), dir))
        return;
    }

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
      createSpatNavEvents('beforefocus', bestCandidate, null, dir);

      if (!navbeforefocusPrevented) {
        bestCandidate.focus();
        return true;
      }
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

      if (!navbeforescrollPrevented) {
        moveScroll(container, dir);
        return true;
      }
    }

    // If the spatnav container is document and it can be scrolled, scroll the document
    if (!container.parentElement && !isHTMLScrollBoundary(container, dir)) {
      createSpatNavEvents('beforescroll', container, null, dir);
      
      if (!navbeforescrollPrevented) {
        moveScroll(container, dir);
        return true;
      }
    }
    return false;
  }

  /**
   * Find the candidates among focusable elements within a spatial navigation container from the search origin (currently focused element)
   * depending on the directional information.
   * @function spatNavCandidates
   * @param element {Node} - The currently focused element which is defined as 'search origin' in the spec
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param candidates {sequence<Node>} - The candidates for spatial navigation without the directional information
   * @param container {Node} - The spatial navigation container
   * @returns {Node} The candidates for spatial navigation considering the directional information
   */
  function spatNavCandidates (element, dir, candidates, container) {
    let targetElement = element;
    // If the container is unknown, get the closest container from the element
    container = container || targetElement.getSpatialNavigationContainer();

    // If the candidates is unknown, find candidates
    // 5-1
    if (!candidates || candidates.length <= 0) {
      if ((isContainer(targetElement) || targetElement.nodeName === 'BODY') && !(targetElement.nodeName === 'INPUT')) {
        if (targetElement.nodeName === 'IFRAME')
          targetElement = targetElement.contentDocument.body;

        candidates = targetElement.focusableAreas();
      }
      else {
        candidates = filteredCandidates(targetElement, container.focusableAreas(), dir, container);
      }
    }
    else {
      candidates = filteredCandidates(targetElement, candidates, dir, container);
    }
    return candidates;
  }

  /**
   * Find the best candidate among the candidates within the container from the search origin (currently focused element)
   * @see {@link https://wicg.github.io/spatial-navigation/#js-api}
   * @function spatialNavigationSearch
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @param candidates {sequence<Node>} - The candidates for spatial navigation
   * @param container {Node} - The spatial navigation container
   * @returns {Node} The best candidate which will gain the focus
   */
  function spatialNavigationSearch (dir, candidates, container) {
    // Let container be the nearest ancestor of eventTarget that is a spatnav container.

    // targetElement === eventTarget
    const targetElement = this;
    candidates = spatNavCandidates(targetElement, dir, candidates, container);

    // Find the best candidate
    // 5
    // If startingPoint is either a scroll container or the document,
    // find the best candidate within startingPoint
    if (candidates && candidates.length > 0) {
      if ((isContainer(targetElement) || targetElement.nodeName === 'BODY') && !(targetElement.nodeName === 'INPUT')) {
        const targetElementInTarget = targetElement.focusableAreas();
        if (candidates.every(x => targetElementInTarget.includes(x))) {
          // if candidates are contained in the targetElement, then the focus moves inside the targetElement
          return selectBestCandidateFromEdge(targetElement, candidates, dir);
        }
      }
      return selectBestCandidate(targetElement, candidates, dir);
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
   * @returns {sequence<Node>} The filtered candidates which are not the search origin and not in the given spatial navigation direction from the search origin
   */
  function filteredCandidates(currentElm, candidates, dir, container) {
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
    return candidates.filter(candidate =>
      container.contains(candidate) &&
      isOutside(getBoundingClientRect(candidate), eventTargetRect, dir)
    );
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
    if (startingPoint)
      return getClosestElement(currentElm, candidates, dir, getDistanceFromPoint);
    else
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
   * @param option {FocusableAreasOptions} - 'mode' attribute takes visible' or 'all' for searching the boundary of focosable elements. 
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
   * @see {@link https://drafts.csswg.org/css-nav-1/#events-navigationevent}
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

    element.dispatchEvent(triggeredEvent);
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
    return readCssVar(element, 'spatial-navigation-contain') === 'contain';
  }

  /**
   * Find search origin
   * @see {@link https://drafts.csswg.org/css-nav-1/#nav}
   * @function findSearchOrigin
   * @returns {Node} The search origin for the spatial navigation
   */
  function findSearchOrigin() {
    let searchOrigin = document.activeElement;
    if (!searchOrigin ||
      (searchOrigin === document.body && !document.querySelector(':focus')) /* body isn't actually focused*/
    ) {
      searchOrigin = document;
    }
    return searchOrigin;
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
    if ((element.tabIndex < 0) || isAtagWithoutHref(element) || (isActuallyDisabled(element) && isExpresslyInert(element) && !isBeingRendered(element)))
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
    const elementStyle = window.getComputedStyle(element, null);
    return (!element.parentElement) || (isVisibleStyleProperty(elementStyle) && hitTest(element));
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
   * @param elementStyle {CSSStyleDeclaration}
   * @returns {boolean}
   */
  function isVisibleStyleProperty(elementStyle) {
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
   * @function getDistanceFromPoint
   * @param point {Point} - The search origin
   * @param element {DOMRect} - A candidate element
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Number} The euclidian distance between the spatial navigation container and an element inside it
   */
  function getDistanceFromPoint(point, element, dir) {
    point = startingPoint;
    // Get exit point, entry point -> {x: '', y: ''};
    const points = getEntryAndExitPoints(dir, point, element);

    // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
    // that minimize the distance between these two points
    const P1 = Math.abs(points.entryPoint.x - points.exitPoint.x);
    const P2 = Math.abs(points.entryPoint.y - points.exitPoint.y);

    // The result is euclidian distance between P1 and P2.
    return Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
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
   * @see {@link https://drafts.csswg.org/css-nav-1/#calculating-the-distance}
   * @function getDistance
   * @param searchOrigin {DOMRect || Point} - The search origin
   * @param element2 {DOMRect} - A candidate element
   * @param candidateRect {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
   * @returns {Number} The distance scoring between two elements
   */
  function getDistance(searchOrigin, candidateRect, dir) {
    const kOrthogonalWeightForLeftRight = 30;
    const kOrthogonalWeightForUpDown = 2;

    let orthogonalBias = 0;
    let alignBias = 0;
    const alignWeight = 5.0;

    // Get exit point, entry point -> {x: '', y: ''};
    const points = getEntryAndExitPoints(dir, searchOrigin, candidateRect);

    // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
    // that minimize the distance between these two points
    const P1 = Math.abs(points.entryPoint.x - points.exitPoint.x);
    const P2 = Math.abs(points.entryPoint.y - points.exitPoint.y);

    // A: The euclidian distance between P1 and P2.
    const A = Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
    let B, C;

    // B: The absolute distance in the direction which is orthogonal to dir between P1 and P2, or 0 if dir is null.
    // C: The intersection edges between a candidate and the starting point.

    // D: The square root of the area of intersection between the border boxes of candidate and starting point
    const intersectionRect = getIntersectionRect(searchOrigin, candidateRect);
    const D = intersectionRect.area;

    switch (dir) {
    case 'left':
      /* falls through */
    case 'right' :
      // If two elements are aligned, add align bias
      // else, add orthogonal bias
      if (isAligned(searchOrigin, candidateRect, dir))
        alignBias = Math.min(intersectionRect.height / searchOrigin.height , 1);
      else
        orthogonalBias = (searchOrigin.height / 2);

      B = (P2 + orthogonalBias) * kOrthogonalWeightForLeftRight;
      C = alignWeight * alignBias;
      break;

    case 'up' :
      /* falls through */
    case 'down' :
      // If two elements are aligned, add align bias
      // else, add orthogonal bias
      if (isAligned(searchOrigin, candidateRect, dir))
        alignBias = Math.min(intersectionRect.width / searchOrigin.width , 1);
      else
        orthogonalBias = (searchOrigin.width / 2);

      B = (P1 + orthogonalBias) * kOrthogonalWeightForUpDown;
      C = alignWeight * alignBias;
      break;

    default:
      B = 0;
      C = 0;
      break;
    }

    return (A + B - C - D);
  }

  /**
   * Get entry point and exit point of two elements considering the direction.
   * @function getEntryAndExitPoints
   * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD). Default value for dir is 'down'.
   * @param searchOrigin {DOMRect | Point} - The search origin which contains the exit point
   * @param candidateRect {DOMRect} - One of candidates which contains the entry point
   * @returns {Points} The exit point from the search origin and the entry point from a candidate
   */
  function getEntryAndExitPoints(dir = 'down', searchOrigin, candidateRect) {
    const points = {entryPoint: {x: 0, y: 0}, exitPoint:{x: 0, y: 0}};

    if (startingPoint) {
      points.exitPoint = searchOrigin;

      switch (dir) {
      case 'left':
        points.entryPoint.x = candidateRect.right;
        break;
      case 'up':
        points.entryPoint.y = candidateRect.bottom;
        break;
      case 'right':
        points.entryPoint.x = candidateRect.left;
        break;
      case 'down':
        points.entryPoint.y = candidateRect.top;
        break;
      }
  
      // Set orthogonal direction
      switch (dir) {
      case 'left':
      case 'right':
        if (startingPoint.y <= candidateRect.top) {
          points.entryPoint.y = candidateRect.top;
        } else if (startingPoint.y < candidateRect.bottom) {
          points.entryPoint.y = startingPoint.y;
        } else {
          points.entryPoint.y = candidateRect.bottom;
        }
        break;
  
      case 'up':
      case 'down':
        if (startingPoint.x <= candidateRect.left) {
          points.entryPoint.x = candidateRect.left;
        } else if (startingPoint.x < candidateRect.right) {
          points.entryPoint.x = startingPoint.x;
        } else {
          points.entryPoint.x = candidateRect.right;
        }
        break;
      }
    }
    else {
      // Set direction
      switch (dir) {
      case 'left':
        points.exitPoint.x = searchOrigin.left;
        points.entryPoint.x = (candidateRect.right < searchOrigin.left) ? candidateRect.right : searchOrigin.left;
        break;
      case 'up':
        points.exitPoint.y = searchOrigin.top;
        points.entryPoint.y = (candidateRect.bottom < searchOrigin.top) ? candidateRect.bottom : searchOrigin.top;
        break;
      case 'right':
        points.exitPoint.x = searchOrigin.right;
        points.entryPoint.x = (candidateRect.left > searchOrigin.right) ? candidateRect.left : searchOrigin.right;
        break;
      case 'down':
        points.exitPoint.y = searchOrigin.bottom;
        points.entryPoint.y = (candidateRect.top > searchOrigin.bottom) ? candidateRect.top : searchOrigin.bottom;
        break;
      }
  
      // Set orthogonal direction
      switch (dir) {
      case 'left':
      case 'right':
        if (isBelow(searchOrigin, candidateRect)) {
          points.exitPoint.y = searchOrigin.top;
          points.entryPoint.y = (candidateRect.bottom < searchOrigin.top) ? candidateRect.bottom : searchOrigin.top;
        } else if (isBelow(candidateRect, searchOrigin)) {
          points.exitPoint.y = searchOrigin.bottom;
          points.entryPoint.y = (candidateRect.top > searchOrigin.bottom) ? candidateRect.top : searchOrigin.bottom;
        } else {
          points.exitPoint.y = Math.max(searchOrigin.top, candidateRect.top);
          points.entryPoint.y = points.exitPoint.y;
        }
        break;
  
      case 'up':
      case 'down':
        if (isRightSide(searchOrigin, candidateRect)) {
          points.exitPoint.x = searchOrigin.left;
          points.entryPoint.x = (candidateRect.right < searchOrigin.left) ? candidateRect.right : searchOrigin.left;
        } else if (isRightSide(candidateRect, searchOrigin)) {
          points.exitPoint.x = searchOrigin.right;
          points.entryPoint.x = (candidateRect.left > searchOrigin.right) ? candidateRect.left : searchOrigin.right;
        } else {
          points.exitPoint.x = Math.max(searchOrigin.left, candidateRect.left);
          points.entryPoint.x = points.exitPoint.x;
        }
        break;
      }
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
    const intersection_rect = {width: 0, height: 0, area: 0};

    const new_location = [Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top)];
    const new_max_point = [Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom)];

    intersection_rect.width = Math.abs(new_location[0] - new_max_point[0]);
    intersection_rect.height = Math.abs(new_location[1] - new_max_point[1]);

    if (!(new_location[0] >= new_max_point[0] || new_location[1] >= new_max_point[1])) {
      // intersecting-cases
      intersection_rect.area = Math.sqrt(intersection_rect.width * intersection_rect.height);
    }
    
    return intersection_rect;
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

        const candidates = eventTarget.focusableAreas(option);

        // 5-2
        if (Array.isArray(candidates) && candidates.length > 0) {
          return findCandidate ? spatNavCandidates(eventTarget, dir, candidates) : eventTarget.spatialNavigationSearch(dir, candidates);
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
        const candidates = filteredCandidates(eventTarget, container.focusableAreas(option), dir, container);

        if (Array.isArray(candidates) && candidates.length > 0) {
          bestNextTarget = eventTarget.spatialNavigationSearch(dir, candidates, container);
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
        const candidates = filteredCandidates(eventTarget, container.focusableAreas(option), dir, container);

        // 9
        if (Array.isArray(candidates) && candidates.length > 0) {
          bestNextTarget = eventTarget.spatialNavigationSearch(dir, candidates, container);
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
          if (element.focusableAreas().includes(candidateElement)) {
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
