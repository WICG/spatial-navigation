# Spatial Navigation
[![npm stat](https://img.shields.io/npm/dm/spatial-navigation-polyfill.svg?style=flat-square)](https://npm-stat.com/charts.html?package=spatial-navigation-polyfill)
[![npm version](https://img.shields.io/npm/v/spatial-navigation-polyfill.svg?style=flat-square)](https://www.npmjs.com/package/spatial-navigation-polyfill)

**Written**: 2017-10-17, **Updated**: 2019-11-27

This repository is for supportive tools of **Spatial Navigation** such as polyfill, demo, and relevant documents. The spatial navigation [spec](https://drafts.csswg.org/css-nav-1/) has been migrated from WICG to CSS WG as an official draft according to the [decision](https://www.w3.org/2018/10/23-css-minutes.html#item01) at the CSS WG meeting in TPAC 2018.

You can raise a spec issue in [CSS WG](https://github.com/w3c/csswg-drafts/labels/css-nav-1), but also raise others(polyfill, demo, ideas) in [WICG](https://github.com/WICG/spatial-navigation/issues) here.

## Overview
**Spatial navigation** is the ability to navigate between focusable elements based on their position within a structured document. Spatial navigation is often called 'directional navigation' which enables four(top/left/bottom/right) directional navigation. Users are usually familiar with the 2-way navigation using both 'tab key' for the forward direction and 'shift+tab key' for the backward direction, but not familiar with the 4-way navigation using arrow keys.

Regarding TV remote control, game console pad, IVI jog dial with 4-way keys, and Web accessibility, the spatial navigation has been a rising important input mechanism in several industries.

## Details
* Read the [Spec](https://drafts.csswg.org/css-nav-1/)
* Read the [Explainer](https://drafts.csswg.org/css-nav-1/explainer)
* Play with the [Polyfill](polyfill/README.md)
* Try the [Demo](https://wicg.github.io/spatial-navigation/demo/) and [Extension tool](https://github.com/WICG/spatial-navigation/tree/master/tools/chrome-extension)
* See the [Implementation status](implStatus.md)
* Give feedback on [issues for spec](https://github.com/w3c/csswg-drafts/labels/css-nav-1) in CSS WG or [issues for others](https://github.com/WICG/spatial-navigation/issues) in WICG

## Why Use the Polyfill

Eventually, we expect spatial navigation to be natively supported by browsers.
However, this is not yet the case.

Until then, authors who wish to experiment with providing this feature to their users
can include this polyfill in their page.

It can also be used for people interested in reviewing the specification
in order to test the behavior it defines in various situations.

## How to Use

### Installation
```
npm i spatial-navigation-polyfill
```

We recommend only using versions of the polyfill that have been published to npm, rather than cloning the repo and using the source directly. This helps ensure the version you're using is stable and thoroughly tested.
See the [changes](https://wicg.github.io/spatial-navigation/polyfill/changelog.html) in the polyfill so far.

If you do want to build from source, make sure you clone the latest tag!

### Including the Polyfill in a page

Include the following code in your web page,
and the polyfill will be included,
enabling spatial navigation.

```html
...
    <script src="/node_modules/spatial-navigation-polyfill/polyfill/spatial-navigation-polyfill.js"></script>
  </body>
</html>
```

Users can now user the keyboard's arrow keys to navigate the page.

### Handling Browser Events
In the polyfill, <a href="https://www.w3.org/TR/DOM-Level-3-Events/#event-type-keydown"><code>keydown</code> event</a> and <a href="https://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseup"><code>mouseup</code> event</a> are used for the spatial navigation.
The event handlers of those are attached to the window object.

We recommend to use it with the polyfill as below:

* If you want to use those event handlers for other usages besides the spatial navigation,
   * attach the event handler on the children of window object
   or
   * call the event handler during the capturing phase of the event.
* If you don't want those events to work with the spatial navigation, call <code>preventDefault()</code>.

### Using the APIs

The spatial navigation specification defines several JavaScript [events](https://wicg.github.io/spatial-navigation/#events-navigationevent) and [APIs](https://wicg.github.io/spatial-navigation/#js-api).
Using these is not necessary to use the polyfill,
and users can start using the arrow keys as soon as the polyfill is included,
but they can be convenient for authors who wish to override the default behavior in some cases.
See the specification for more details.

#### Standard APIs
| Standard APIs | Feature |
|-|-|
| [navigate()](https://drafts.csswg.org/css-nav-1/#dom-window-navigate) | Enables the author to trigger spatial navigation programmatically |
| [spatialNavigationSearch()](https://drafts.csswg.org/css-nav-1/#dom-element-spatialnavigationsearch) | Finds the element which will gain the focus within the spatial navigation container from the currently focused element |
| [getSpatialNavigationContainer()](https://drafts.csswg.org/css-nav-1/#dom-element-getspatialnavigationcontainer) | Gets the spatial navigation container of an element |
| [focusableAreas()](https://drafts.csswg.org/css-nav-1/#dom-element-focusableareas) | Finds focusable elements within the spatial navigation container |
| [Navigation Events](https://drafts.csswg.org/css-nav-1/#events-navigationevent) | Occurs depending on the specific contextual behavior associated with spatial navigation
| [--spatial-navigation-contain](https://drafts.csswg.org/css-nav-1/#container) | Creates customized spatial navigation containers
| [--spatial-navigation-action](https://drafts.csswg.org/css-nav-1/#css-property-spatialnavigationaction) | Controls the interaction for the scrollable element
| [--spatial-navigation-function](https://drafts.csswg.org/css-nav-1/#css-property-spatialnavigationfunction) | Selects the navigation algorithm

#### Experimental APIs
NOTE: The APIs below are non-standard and experimental features of the spatial navigation.

* <code>isContainer (element)</code> :
  * Determines whether the element is a spatial Navigation container.
  * Returns <code>true</code> if the element is the spatial Navigation container, and <code>false</code> if not.
  * Parameter
    * element : Required. 
      - Any element.
* <code>findCandidates (element, dir, option)</code> :
  * Searchs all valid candidates for a certain direction.
  * Returns a list of elements.
  * Parameter
    * element : Required. 
      - The currently focused element to search for candidates.
    * dir : Required. 
       - The direction to find candidates.
       - It should be one of <code>['up', 'down', 'left', 'right']</code>.
    * option : Optional.
      - Default value is <code>{'mode': 'visible'}</code>.
      - The FocusableAreasOptions to find candidates.
      - It should be <code>{'mode': 'visible'}</code> or <code>{ mode: 'all' }</code>.
* <code>findNextTarget (element, dir, option)</code> :
  * Indicates what is the best element to move the focus for a certain direction.
  * Returns the next target element. 
      - If there is no target for the direction, it returns <code>null</code>. 
      - If scrolling occurs, it returns the element itself.
  * Parameter
    * element : Required. 
      - The currently focused element to search for candidates.
    * dir : Required. 
       - The direction to find candidates.
       - It should be one of <code>['up', 'down', 'left', 'right']</code>.
    * option : Optional.
      - Default value is <code>{'mode': 'visible'}</code>.
      - The FocusableAreasOptions to find candidates.
      - It should be <code>{'mode': 'visible'}</code> or <code>{ mode: 'all' }</code>.
* <code>getDistanceFromTarget (element, candidateElement, dir)</code> :
  * Calculates the distance between the currently focused element and a certain candidate element.
  * Parameter
    * element : Required. 
      - The currently focused element to search for candidates.
    * candidateElement : Required.
      - The candidate element which may gain the focus.
    * dir : Required. 
       - The direction to find candidates.
       - It should be one of <code>['up', 'down', 'left', 'right']</code>.
* <code>keyMode</code> :
  * Variable for getting or setting which key type to use for the spatial navigation.
  * value
      - It should be one of <code>['ARROW', 'SHIFTARROW', 'NONE']</code>.
      - In the case of using <code>'NONE'</code> value, the spatial navigation feature will be turned off.

## Current Status

### Browser Support
The Spatial Navigation has been tested and known to work in the following browsers:

<table>
  <tr>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/39.2.2/src/chrome/chrome_48x48.png" alt="Chrome"><br>
      49+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/39.2.2/src/firefox/firefox_48x48.png" alt="Firefox"><br>
      61+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/39.2.2/src/safari/safari_48x48.png" alt="Safari"><br>
      11.1+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/39.2.2/src/edge/edge_48x48.png" alt="Edge"><br>
      17+
    </td>
    <td align="center">
      <img src="https://raw.github.com/alrra/browser-logos/39.2.2/src/opera/opera_48x48.png" alt="Opera"><br>
      36+
    </td>
  </tr>  
</table>

### Remaining Issues

The polyfill is not yet complete. It roughly matches the specification but does not yet follow it closely, and has several  known issues.

See [the list of open bugs](https://github.com/wicg/spatial-navigation/issues?q=is%3Aissue+is%3Aopen+label%3Atopic%3Apolyfill) in github.

## FAQ
**Q. I’m not sure how the spatial navigation works.**
- You can see the video that shows the spatial navigation operations in the YouTube page ([link](https://www.youtube.com/watch?v=TzDtcX9urUg)).
- You can see the brief description for the spatial navigation in Wikipedia ([link](https://en.wikipedia.org/wiki/Spatial_navigation)).
- In several references below, you can get the help to understand the spatial navigation operation better.

**Q. Isn’t it enough just using the relevant web frameworks?**
- Several web frameworks and extensions for the spatial navigation have been provided so far due to no support from web engines. For examples, [js-spatial-navigation](https://github.com/luke-chang/js-spatial-navigation) made by Mozilla seems one of the frameworks and its quality would be good to support the features of the spatial navigation. [Spotlight library](https://github.com/enyojs/spotlight) implemented by LGE is also an instance of the frameworks for the spatial navigation, even though it was deprecated now. However, the support of spatial navigation from web frameworks has some limits as follows:
  - Difficult to align native scroll behavior when moving the focus to an element out of view
  - Difficult to align native focus method for a11y support
  - Performance degradation due to the expensive cost of DOM Access
  - Inconsistency of user experience (various kinds of frameworks)
  - Impossible to control isolated frames like iframe and shadow DOM

**Q. The spatial navigation seems not the general feature esp. in mobile with no physical key-based interface.**
- Honestly, the mobile(feature phone) has been a first citizen of the spatial navigation about ten years old. Before touch-based interface, the majority of interface for mobile was the key-based interface. Recently(2018-2019), [KaiOS](https://www.kaiostech.com/)-based feature phones have been propagated mainly in several developing countries such as Africa, India, and Southeast Asia. The devices doesn't support a touch interface, so users need to use the arrow keys to select a item on all applications including a browser.

- In the future, the input mechanism for smart devices will change to something like voice command, hand gesture, and gaze direction, but the key-based interface will never disappear, even though it'll be used as a secondary method. The key-based interface used to be evaluated as one of the most intuitive ways with a strong sense feedback of finger after pushing a key, as if it's inconvenient a touch-based keyboard without any physical keys.

**Q. I would like to raise an issue or idea about spatial navigation.**
- Please put any question via the following two links:
- [Issues](https://github.com/w3c/csswg-drafts/labels/css-nav-1) in CSS WG for spec issues
- [Issues](https://github.com/WICG/spatial-navigation/issues) in WICG WG for any other issues
- Everything for the spatial navigation is welcome! :D

## Reference
- WICD Core 1.0 Working Group Note (W3C)
  - https://www.w3.org/TR/WICD/#focus-handling
- A JavaScript library targeting to Firefox OS (Mozilla)
  - https://github.com/luke-chang/js-spatial-navigation
- A JavaScript library targeting to LG webOS platform (LG Electronics)
  - https://github.com/enactjs/enact/tree/master/packages/spotlight
  - https://github.com/enyojs/spotlight (deprecated a few years ago)
- Pass the Remote: User Input on TV Devices (Netflix Tech Blog)
  - https://medium.com/netflix-techblog/pass-the-remote-user-input-on-tv-devices-923f6920c9a8
- Implementing TV remote control navigation (MDN)
  - https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV/TV_remote_control_navigation
- Spatial Navigation in the web (slides presented in BlinkOn 8)
  - https://docs.google.com/presentation/d/1x4RaJIzTYeX0-nySVuq0TThe5shfmOsjbGIMrZJLBTE/edit
- Focus interaction in UIKit (Apple)
  - https://developer.apple.com/documentation/uikit/focus_interactions
- Focus navigation with keyboard, gamepad, and accessibility tools (MS)
  - https://docs.microsoft.com/en-us/windows/uwp/input-and-devices/managing-focus-navigation
- Designing for Xbox and TV (MS)
  - https://docs.microsoft.com/en-us/windows/uwp/input-and-devices/designing-for-tv
