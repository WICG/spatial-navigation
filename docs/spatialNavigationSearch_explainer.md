# spatialNavigationSearch API Explained

**Written**: 2019-11-13, **Updated**: 2019-11-13

**spatialNavigationSearch()** is a proposed API to get a next target element to be focused via directional inputs. It returns a focuable element as a best candidate element in a given direction. It's only enabled behind a runtime flag (--enable-spatial-navigation) so that it can be used in specific user agents such as smart TV with remote control and touchless smartphone. There seems no performance and security issue as it's just get method.

In `CSS Spatial Navigation` specification, there are several proposed APIs such as DOM methods, CSS properties and DOM Events. We would like to focus on spatialNavigationSearch API as the most primitive one here.

See also:
* [specification](https://drafts.csswg.org/css-nav-1/#dom-element-spatialnavigationsearch), official working draft published in W3C CSS WG.
* [demo](https://wicg.github.io/spatial-navigation/demo/#spatialNavSearch), working with polyfill located in W3C WICG.

## Background

**Spatial navigation** is the ability to navigate between focusable elements based on their position within a structured document. Spatial navigation is often called 'directional navigation' which enables four(top/left/bottom/right) directional navigation. Users are usually familiar with the 2-way navigation using both 'tab key' for the forward direction and 'shift+tab key' for the backward direction, but not familiar with the 4-way navigation using arrow keys.

In terms of TV remote control, arrow keys on touchless smartphone and Web accessibility, the spatial navigation has been a rising important input mechanism in several industries. If the web could embrace the spatial navigation functionalities in web engines(i.e. Chrmoium) and W3C standard APIs, it will be more promising technology for existing products as mentioned above and various upcoming smart devices.

## spatialNavigationSearch WebIDL

```webidl
enum SpatialNavigationDirection {
    "up",
    "down",
    "left",
    "right",
};
dictionary SpatialNavigationSearchOptions {
    sequence<Node>? candidates;
    Node? container;
};
partial interface Element {
    Node? spatialNavigationSearch(SpatialNavigationDirection dir, optional SpatialNavigationSearchOptions options);
};
```

## Description
...

## Sample code
To simply understand the behavior of spatialNavigationSearch() API, the looping exmaple is shown as follows.
```html
<div id=container>
<div id="elm1" tabindex="0"></div>
<div id="elm2" tabindex="0"></div>
<div id="elm3" tabindex="0"></div>
<div id="elm4" tabindex="0"></div>
<div id="elm5" tabindex="0"></div>
</div>

<script>
const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
document.addEventListener("keydown", (e) => {
  let key = ARROW_KEY_CODE[e.keyCode];
  let next = e.target.spatialNavigationSearch(key);
  if (next === null) {
    if (key === "right") elm1.focus();
    if (key === "left") elm5.focus();
  }
});
</script>
```

The example code works as the followings (gif image).
![spatial navigation on any websites](https://raw.githubusercontent.com/lgewst/images/master/spatialNavigationSearch.gif)

## Use cases
