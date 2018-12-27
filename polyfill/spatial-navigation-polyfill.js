/* Spatial Navigation Polyfill v1.0
* : common function for Spatial Navigation
*
* Copyright (c) 2018 LG Electronics Inc. All rights reserved.
* Release Version 1.0
*
* https://github.com/WICG/spatial-navigation
* https://wicg.github.io/spatial-navigation
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

  function initiateSpatialNavigation() {
    /**
    * Bind the standards APIs to be exposed to the window object for authors
    **/
    window.navigate = navigate;
    window.Element.prototype.spatialNavigationSearch = spatialNavigationSearch;
    window.Element.prototype.focusableAreas = focusableAreas;
    window.Element.prototype.getSpatialNavigationContainer = getSpatialNavigationContainer;

    /**
    * CSS.registerProperty() from the Properties and Values API
    * Reference: https://drafts.css-houdini.org/css-properties-values-api/#the-registerproperty-function
    **/
    if (window.CSS && CSS.registerProperty) {
      CSS.registerProperty({
        name: '--spatial-navigation-contain',
        syntax: 'auto | contain',
        inherits: false,
        initialValue: 'auto'
      });
    }

    /**
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

    /**
    * mouseup EventListener :
    * If the mouse click a point in the page, the point will be the starting point.
    * *NOTE: Let UA set the spatial navigation starting point based on click
    */
    document.addEventListener('mouseup', function(e) {
      startingPosition = {xPosition: e.clientX, yPosition: e.clientY};
    });
  }

  /**
  * Navigate API :
  * reference: https://wicg.github.io/spatial-navigation/#dom-window-navigate
  * @function for Window
  * @param {SpatialNavigationDirection} direction
  * @returns NaN
  **/
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

      // 5-2
      if (focusingController(eventTarget.spatialNavigationSearch(dir), dir)) return;
      if (scrollingController(eventTarget, dir)) return;
    }

    // 6
    // Let container be the nearest ancestor of eventTarget
    let container = eventTarget.getSpatialNavigationContainer();
    let parentContainer = container.getSpatialNavigationContainer();

    // When the container is the viewport of a browsing context
    if (!parentContainer) {
      parentContainer = window.document.documentElement;
      // The container is IFRAME, so parentContainer will be retargeted to the document of the parent window
      if ( window.location !== window.parent.location ) {
        parentContainer = window.parent.document.documentElement;
      }
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

          createSpatNavEvents('notarget', container, dir);

          if (container === document || container === document.documentElement) {
            container = window.document.documentElement;

            // The page is in an iframe
            if ( window.location !== window.parent.location ) {

              // eventTarget needs to be reset because the position of the element in the IFRAME
              // is unuseful when the focus moves out of the iframe
              eventTarget = window.frameElement;
              container = window.parent.document.documentElement;
            }
            else {
              return;
            }

            parentContainer = container.getSpatialNavigationContainer();
          }
          else {
            // avoiding when spatnav container with tabindex=-1
            if (isFocusable(container)) {
              eventTarget = container;
            }

            container = parentContainer;
            parentContainer = container.getSpatialNavigationContainer();
          }
        }
      }
    }

    if (!parentContainer && container) {
      // Getting out from the current spatnav container
      if (focusingController(eventTarget.spatialNavigationSearch(dir, container.focusableAreas(), container), dir))
        return;
    }

    if (scrollingController(container, dir)) return;
  }

  /**
  * focusing controller :
  * Move focus or do nothing.
  * @function
  * @param {<Node>} the best candidate
  * @param {SpatialNavigationDirection} direction
  * @returns NaN
  **/
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
      createSpatNavEvents('beforefocus', bestCandidate, dir);
      bestCandidate.focus();
      return true;
    }

    // When bestCandidate is not found within the scrollport of a container: Nothing
    else {
      return false;
    }
  }

  /**
  * scrolling controller :
  * Directionally scroll the element if it can be manually scrolled more.
  * @function
  * @param {<Node>} scrollContainer
  * @param {SpatialNavigationDirection} direction
  * @returns NaN
  **/
  function scrollingController(container, dir) {
    /*
      * [event] navbeforescroll : Fired before spatial navigation triggers scrolling.
      */
    // If there is any scrollable area among parent elements and it can be manually scrolled, scroll the document
    if (isScrollable(container, dir) && !isScrollBoundary(container, dir)) {
      createSpatNavEvents('beforescroll', container, dir);
      moveScroll(container, dir);
      return true;
    }

    // If the spatnav container is document and it can be scrolled, scroll the document
    if (!container.parentElement && !isHTMLScrollBoundary(container, dir)) {
      createSpatNavEvents('beforescroll', container, dir);
      moveScroll(document.documentElement, dir);
      return true;
    }
    return false;
  }

  /**
  * Find the candidates among focusable candidates within the container from the element
  * @function for Element
  * @param {SpatialNavigationDirection} direction
  * @param {sequence<Node>} candidates
  * @param {<Node>} container
  * @returns {<Node>} the best candidate
  **/
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
  * Find the best candidate among focusable candidates within the container from the element
  * reference: https://wicg.github.io/spatial-navigation/#js-api
  * @function for Element
  * @param {SpatialNavigationDirection} direction
  * @param {sequence<Node>} candidates
  * @param {<Node>} container
  * @returns {<Node>} the best candidate
  **/
  function spatialNavigationSearch (dir, candidates, container) {
    // Let container be the nearest ancestor of eventTarget that is a spatnav container.
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
  * Get the filtered candidate among candidates
  * - Get rid of the starting point from the focusables
  * - Get rid of the elements which aren't in the direction from the focusables
  * reference: https://wicg.github.io/spatial-navigation/#select-the-best-candidate
  * @function
  * @param {<Node>} starting point
  * @param {sequence<Node>} candidates - focusables
  * @param {SpatialNavigationDirection} direction
  * @param {<Node>} container
  * @returns {sequence<Node>} filtered candidates
  **/
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
      container.contains(candidate.getSpatialNavigationContainer()) &&
      isOutside(getBoundingClientRect(candidate), eventTargetRect, dir)
    );
  }

  /**
  * Select the best candidate among candidates
  * - Find the closet candidate from the starting point
  * - If there are element having same distance, then select the one depend on DOM tree order.
  * reference: https://wicg.github.io/spatial-navigation/#select-the-best-candidate
  * @function
  * @param {<Node>} starting point
  * @param {sequence<Node>} candidates
  * @param {SpatialNavigationDirection} direction
  * @returns {<Node>} the best candidate
  **/
  function selectBestCandidate(currentElm, candidates, dir) {
    return getNearestElement(currentElm, candidates, dir, getDistance);
  }

  /**
  * Select the best candidate among candidates
  * - Find the closet candidate from the edge of the starting point
  * reference: https://wicg.github.io/spatial-navigation/#select-the-best-candidate (Step 5)
  * @function
  * @param {<Node>} startingPoint
  * @param {sequence<Node>} candidates
  * @param {SpatialNavigationDirection} direction
  * @returns {<Node>} the best candidate
  **/
  function selectBestCandidateFromEdge(currentElm, candidates, dir) {
    return getNearestElement(currentElm, candidates, dir, getInnerDistance);
  }


  /**
  * Select the nearest element from distance function
  * @function
  * @param {<Node>} startingPoint
  * @param {sequence<Node>} candidates
  * @param {SpatialNavigationDirection} direction
  * @param {function} distanceFunction
  * @returns {<Node>} the nearest element
  **/
  function getNearestElement(currentElm, candidates, dir, distanceFunction) {
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
  * Get container of this element.
  * - NOTE: Container could be different by the arrow direction, even if it's the same element
  * reference: https://wicg.github.io/spatial-navigation/#dom-element-getspatialnavigationcontainer
  * @function for Element
  * @returns {<Node>} container
  **/
  function getSpatialNavigationContainer() {
    let container = this.parentElement;

    if (!container) return null; // if element==HTML
    while(!isContainer(container)) {
      container = container.parentElement;
      if (!container) return null; // if element==HTML
    }

    return container;
  }

  /**
  * Find focusable elements within the container
  * reference: https://wicg.github.io/spatial-navigation/#dom-element-focusableareas
  * @function
  * @param {FocusableAreasOptions} option
  *         dictionary FocusableAreasOptions {FocusableAreaSearchMode mode;};
  *         enum FocusableAreaSearchMode {'visible', 'all'};
  * @returns {sequence<Node>} focusable areas
  **/
  function focusableAreas(option = {'mode': 'visible'}) {
    const container = this.parentElement ? this : document.body;
    const focusables = Array.prototype.filter.call(container.getElementsByTagName('*'), isFocusable);
    return (option.mode === 'all') ? focusables : focusables.filter(isVisible);
  }

  /**
  * Support the NavigatoinEvent: navbeforefocus, navbeforescroll, navnotarget
  * reference: https://wicg.github.io/spatial-navigation/#events-navigationevent
  * @function
  * @param {option, element, direction}
  * @returns NaN
  **/
  function createSpatNavEvents(option, element, direction) {
    const data = {
      relatedTarget: element,
      dir: direction
    };

    const triggeredEvent = document.createEvent('CustomEvent');

    switch (option) {
    case 'beforefocus':
      triggeredEvent.initCustomEvent('navbeforefocus', true, true, data);
      break;

    case 'beforescroll':
      triggeredEvent.initCustomEvent('navbeforescroll', true, true, data);
      break;

    case 'notarget':
      triggeredEvent.initCustomEvent('navnotarget', true, true, data);
      break;
    }
    element.dispatchEvent(triggeredEvent);
  }

  /**
  * Gives a CSS custom property value applied at the element
  * @function
  * @param
  * element {Element}
  * varName {String} without '--'
  */
  function readCssVar(element, varName) {
    return element.style.getPropertyValue(`--${varName}`).trim();
  }

  function isCSSSpatNavContain(el) {
    return readCssVar(el, 'spatial-navigation-contain') === 'contain';
  }

  /**
  * Find starting point :
  * reference: https://wicg.github.io/spatial-navigation/#spatial-navigation-steps
  * @function
  * @returns {<Node>} Starting point
  **/
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
  * Move Element Scroll :
  * Move the scroll of this element for the arrow directrion
  * (Assume that User Agent defined distance is '40px')
  * Reference: https://wicg.github.io/spatial-navigation/#directionally-scroll-an-element
  * @function
  * @param {<Node>} element
  * @param {SpatialNavigationDirection} dir
  * @param {Number} offset
  * @returns NaN
  **/
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
  * Whether this element is container or not
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  */
  function isContainer(element) {
    return (!element.parentElement) ||
            (element.nodeName === 'IFRAME') ||
            (isScrollContainer(element)) ||
            (isCSSSpatNavContain(element));
  }

  /** Whether this element is a scrollable container or not
  * reference: https://drafts.csswg.org/css-overflow-3/#scroll-container
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isScrollContainer(element) {
    const elementStyle = window.getComputedStyle(element, null);
    const overflowX = elementStyle.getPropertyValue('overflow-x');
    const overflowY = elementStyle.getPropertyValue('overflow-y');
    return (overflowX !== 'visible' && overflowX !== 'clip') && (overflowY !== 'visible' && overflowY !== 'clip');
  }

  /** Whether this element is scrollable or not
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
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
  * isOverflow
  * Whether this element is overflow or not
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
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
  *  isHTMLScrollBoundary
  * Check whether the scrollbar of window reaches to the end or not
  * @function
  * @param {<Node>} element
  * @param {SpatialNavigationDirection} direction
  * @returns {Boolean}
  **/
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

  /** Whether the scrollbar of an element reaches to the end or not
  * @function
  * @param {<Node>} element
  * @param {String} direction
  * @returns {Boolean}
  **/
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
  * isFocusable :
  * Whether this element is focusable with spatnav.
  * check1. Whether the element is the browsing context (document, iframe)
  * check2. Whether the element is scrollable container or not. (regardless of scrollable axis)
  * check3. The value of tabIndex >= 0
  *         There are several elements which the tabindex focus flag be set:
  *         (https://html.spec.whatwg.org/multipage/interaction.html#specially-focusable)
  *         The element with tabindex=-1 is omitted from the spatial navigation order,
  *         but, if there is a focusable child element, it will be included in the spatial navigation order.
  * check4. Whether the element is disabled or not.
  * check5. Whether the element is expressly inert or not.
  * check6. Whether the element is being rendered or not.
  *
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isFocusable(element) {
    return ((!element.parentElement) || (isScrollable(element) && isOverflow(element)) || (element.tabIndex >= 0) || 
            (!isActuallyDisabled(element)) || (!isExpresslyInert(element)) || (isBeingRendered(element)));
  }

  /**
  * isActuallyDisabled :
  * Whether this element is actually disabled or not
  * * reference: https://html.spec.whatwg.org/multipage/semantics-other.html#concept-element-disabled
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isActuallyDisabled(element) {
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTGROUP', 'OPTION', 'FIELDSET'].includes(element.tagName))
      return (element.disabled);
  }

  /**
  * isExpresslyInert :
  * Whether the element is expressly inert or not.
  * * reference: https://html.spec.whatwg.org/multipage/interaction.html#expressly-inert
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isExpresslyInert(element) {
    return ((element.inert) && (!element.ownerDocument.documentElement.inert));
  }

  /**
  * isBeingRendered :
  * Whether the element is being rendered or not. 
  * * reference: https://html.spec.whatwg.org/multipage/rendering.html#being-rendered
  *    "presence of the hidden attribute normally means the element is not being rendered"
  * * reference: https://api.jquery.com/hidden-selector/
  * check1. If an element has the style as "visibility: hidden | collapse" or "display: none", it is not being rendered.
  * check2. If an element has the style as "opacity: 0", it is not being rendered.(that is, invisible).
  * check3. If width and height of an element are explicitly set to 0, it is not being rendered.
  * check4. If a parent element is hidden, an element itself is not being rendered.
  *         (CSS visibility property and display property are inherited.)
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isBeingRendered(element) {
    if (!isVisibleStyleProperty(element.parentElement))
      return false;
    return (isVisibleStyleProperty(element) || (element.style.opacity !== 0) || 
            !((element.style.width === '0px' || element.style.width === 0) && (element.style.height === '0px' || element.style.height === 0)));
  }

  /**
  * isVisible :
  * Whether this element is partially or completely visible to user agent.
  * check1. style property
  * check2. hit test
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
  function isVisible(element) {
    const elementStyle = window.getComputedStyle(element, null);
    return (!element.parentElement) || (isVisibleStyleProperty(elementStyle) && hitTest(element, elementStyle));
  }

  /**
  * isEntirelyVisible :
  * Check whether this element is completely visible in this viewport for the arrow direction.
  * @function
  * @param {<Node>} element
  * @returns {Boolean}
  **/
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

  /** Check the style property of this element whether it's visible or not
  * @function
  * @param {CSSStyleDeclaration} elementStyle
  * @returns {Boolean}
  **/
  function isVisibleStyleProperty(elementStyle) {
    const thisVisibility = elementStyle.getPropertyValue('visibility');
    const thisDisplay = elementStyle.getPropertyValue('display');
    const invisibleStyle = ['hidden', 'collapse'];

    return (thisDisplay !== 'none' && !invisibleStyle.includes(thisVisibility));
  }

  /**
  * hitTest :
  * Check whether this element is entirely or partially visible within the viewport.
  * @function
  * @param {<Node>} element
  * @param {CSSStyleDeclaration} elementStyle
  * @returns {Boolean}
  **/
  function hitTest(element, elementStyle) {
    let offsetX = parseInt(elementStyle.getPropertyValue('width')) / 10;
    let offsetY = parseInt(elementStyle.getPropertyValue('height')) / 10;

    offsetX = isNaN(offsetX) ? 0 : offsetX;
    offsetY = isNaN(offsetY) ? 0 : offsetY;

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
  * isOutside
  * Check whether this element is entirely or partially visible within the viewport.
  * Note: rect1 is outside of rect2 for the dir
  * @function
  * @param {DOMRect} rect1
  * @param {DOMRect} rect2
  * @param {SpatialNavigationDirection} dir
  * @returns {Boolean}
  **/
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
  * Get distance between rect1 and rect2 for the direction when rect2 is inside rect1
  * reference: https://wicg.github.io/spatial-navigation/#select-the-best-candidate
  * @function
  * @param {DOMRect} rect1
  * @param {DOMRect} rect2
  * @param {SpatialNavigationDirection} dir
  * @returns {SpatialNavigationDirection} distance
  **/
  function getInnerDistance(rect1, rect2, dir) {
    const baseEdgeForEachDirection = {left: 'right', right: 'left', up: 'bottom', down: 'top'};
    const baseEdge = baseEdgeForEachDirection[dir];
    return Math.abs(rect1[baseEdge] - rect2[baseEdge]);
  }

  /**
  * Get the distance between two elements considering the direction
  * reference: https://wicg.github.io/spatial-navigation/#select-the-best-candidate
  * @function
  * @param {DOMRect} rect1 (starting point)
  * @param {DOMRect} rect2 (one of candidates)
  * @param {SpatialNavigationDirection} dir
  * @returns {Number} euclidian distance between two elements
  **/
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
  * Get entry point and exit point of two elements considering the direction
  * Note: The default value for dir is 'down'
  * @function
  * @param {SpatialNavigationDirection} dir
  * @param {DOMRect} rect1 (starting point which contains entry point)
  * @param {DOMRect} rect2 (one of candidates which contains exit point)
  * @returns {Number} euclidian distance between two elements
  **/
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
      points.entryPoint[1] = (rect2.bottom < rect1.top) ? rect2.bottom :  rect1.top;
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
  * reference: https://wicg.github.io/spatial-navigation/#dom-element-focusableareas
  * @function
  * @param {DOMRect} rect1
  * @param {DOMRect} rect2
  * @returns {Object} The intersection area between two elements (width , height)
  **/
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
  * Handle the input elements
  * reference- input element types:
  * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
  * @function
  * @param {Event} e
  * @returns {Boolean}
  **/
  function handlingEditableElement(e) {
    const SPINNABLE_INPUT_TYPES = ['email', 'date', 'month', 'number', 'time', 'week'],
      TEXT_INPUT_TYPES = ['password', 'text', 'search', 'tel', 'url'];
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
    else if (TEXT_INPUT_TYPES.includes(eventTarget.getAttribute('type'))) {
      if (startPosition === 0) {
        focusNavigableArrowKey.left = true;
        focusNavigableArrowKey.up = true;
      }
      if (endPosition === eventTarget.value.length) {
        focusNavigableArrowKey.right = true;
        focusNavigableArrowKey.down = true;
      }
    }
    else {
      focusNavigableArrowKey[dir] = true;
    }

    return focusNavigableArrowKey;
  }

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
      let parentContainer = container.getSpatialNavigationContainer();

      // When the container is the viewport of a browsing context
      if (!parentContainer) {
        parentContainer = window.document.documentElement;
        // The container is IFRAME, so parentContainer will be retargeted to the document of the parent window
        if ( window.location !== window.parent.location ) {
          parentContainer = window.parent.document.documentElement;
        }
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
          }
          return findCandidate ? [] : null;
        }
        else {
          // avoiding when spatnav container with tabindex=-1
          if (isFocusable(container)) {
            eventTarget = container;
          }

          container = parentContainer;
          parentContainer = container.getSpatialNavigationContainer();
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
      isContainer: isContainer,
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

  function enableExperimentalAPIs (option) {
    const currentKeyMode = window.__spatialNavigation__ && window.__spatialNavigation__.keyMode;
    window.__spatialNavigation__ = (option === false) ? getInitialAPIs() : Object.assign(getInitialAPIs(), getExperimentalAPI());
    window.__spatialNavigation__.keyMode = currentKeyMode;
    Object.seal(window.__spatialNavigation__);
  }

  function getInitialAPIs() {
    return {
      enableExperimentalAPIs,
      get keyMode() {return this._keymode ? this._keymode : 'ARROW';},
      set keyMode(mode) {this._keymode  = (['SHIFTARROW', 'ARROW', 'NONE'].includes(mode)) ? mode : 'ARROW';},
    };
  }

  window.addEventListener('load', function() {
    initiateSpatialNavigation();
    enableExperimentalAPIs(false);
  });
})();
