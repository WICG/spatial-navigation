# Spatial Navigation

**Written**: 2017-10-17, **Updated**: 2018-12-12

**Spatial Navigation** provides a processing model and standards APIs for directional(top/left/bottom/right) focus navigation using arrow keys, jog shuttle, and gesture on several devices. (e.g. TV, feature phone, game console, IVI system)

This repository is for supportive tools such as polyfill, demo, and relevant documents. The spatial navigation [spec](https://drafts.csswg.org/css-nav-1/) has been migrated from WICG to CSS WG as an official draft according to the [decision](https://www.w3.org/2018/10/23-css-minutes.html#item01) at the CSS WG meeting in TPAC 2018.

You can raise a spec issue in [CSS WG](https://github.com/w3c/csswg-drafts/labels/css-nav-1), but also raise others(polyfill, demo, ideas) in [WICG](https://github.com/WICG/spatial-navigation/issues) here.

## Details
* Read the [Spec](https://drafts.csswg.org/css-nav-1/)
* Read the [Explainer](https://drafts.csswg.org/css-nav-1/explainer)
* Play with the [Polyfill](polyfill/README.md)
* Try the [Demo](https://wicg.github.io/spatial-navigation/demo/) and [Extension tool](https://github.com/WICG/spatial-navigation/tree/master/tools/chrome-extension)
* See the [Implementation status](implStatus.md)
* Give feedback on [issues for spec](https://github.com/w3c/csswg-drafts/labels/css-nav-1) in CSS WG or [issues for others](https://github.com/WICG/spatial-navigation/issues) in WICG

## Overview
**Spatial navigation** is the ability to navigate between focusable elements based on their position within a structured document. Spatial navigation is often called 'directional navigation' which enables four(top/left/bottom/right) directional navigation. Users are usually familiar with the 2-way navigation using both 'tab key' for the forward direction and 'shift+tab key' for the backward direction, but not familiar with the 4-way navigation using arrow keys.

Regarding TV remote control, game console pad, IVI jog dial with 4-way keys, and Web accessibility, the spatial navigation has been a rising important input mechanism in several industries. If the web can embrace the spatial navigation and efficiently support the functionalities in web engines and W3C standard APIs, it will be more promising technology for existing products as mentioned above and various upcoming smart devices.

## Requirement
Prior to the requirement explanation, we need to first understand how the arrow keys currently work on the web. If you're watching this page in a normal HD monitor and desktop, not mobile, please push a down-arrow key on your keyboard. What happens? Basically, scrolling downward would be triggered. That's the default behavior of arrow keys in the web, only when the page is scrollable in the direction.

In spatial navigation mode, the default behavior of arrow keys is changed from scrolling behavior to focus moving so that users can use the arrow keys to navigate between focusable elements based on their position. To support the functionalities of the spatial navigation, we should consider the following three steps:
1. A heuristic algorithm to be supported in web engines by default (e.g. how to judge a next best focusable element)
2. Overriding methods on top of the heuristic algorithm (DOM method/attribute/event as standard APIs)
3. Some relevant APIs for efficiently supporting the spatial navigation (e.g. setting an element as a container)

See the [explainer](https://drafts.csswg.org/css-nav-1/explainer) for the details of W3C standardization for #1, #2 and #3 above.

See the [implStatus](implStatus.md) for the details of the implementation in web engines for #1 above.

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
