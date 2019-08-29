

function blurHappened() {
    chrome.runtime.sendMessage({
        request: 'reload'
    });
}

const NEXT_TARGET_HIGHLIGHT = 'next-target-highlight';
const ACTIVE_ELEMENT_HIGHLIGHT = 'active-element-highlight';

let actElement;
let highlightedElement = {
    left: null,
    right: null,
    up: null,
    down: null
};
/**
 * Event handler for initializing.
 */
window.addEventListener('load', function () {
    window.__spatialNavigation__ && window.__spatialNavigation__.enableExperimentalAPIs();
});

/**
 * Event handler for highlight and tooltip.
 */

window.addEventListener('blur', () => {
    // Current frame lost focus
    if (actElement != null) {
        actElement.classList.remove(ACTIVE_ELEMENT_HIGHLIGHT);
        actElement = null;
    }
    for (label in highlightedElement) {
        if (highlightedElement[label]) {
            highlightedElement[label].classList.remove(NEXT_TARGET_HIGHLIGHT);

            if (highlightedElement[label].getAttribute('spatNavTooltip')) {
                highlightedElement[label].removeAttribute('spatNavTooltip');
            }
            highlightedElement[label] = null;
        }
    }
});

document.addEventListener('keyup', (e) => {
    const keyCode = e.which || e.keyCode;

    // get keyMode settings.
    if (chrome.storage.local) {
        chrome.storage.local.get({
            keyMode: 'ARROW',
            isOn: true,
            isVisible: false,
            CurrentOn: true
        }, (items) => {
            if (document.activeElement != undefined) {
                // enable spatial navigation experimental APIs.
                if(!window.__spatialNavigation__.findNextTarget) {
                    window.__spatialNavigation__ && window.__spatialNavigation__.enableExperimentalAPIs();
                }

                // Check whether pressed key is arrow key or tab key.
                if ([9, 37, 38, 39, 40].includes(keyCode)) {
                    blurHappened();

                    // remove highlight and tooltip.
                    if (actElement != null) {
                        actElement.classList.remove(ACTIVE_ELEMENT_HIGHLIGHT);
                        actElement = null;
                    }
                    for (label in highlightedElement) {
                        if (highlightedElement[label]) {
                            highlightedElement[label].classList.remove(NEXT_TARGET_HIGHLIGHT);

                            if (highlightedElement[label].getAttribute('spatNavTooltip')) {
                                highlightedElement[label].removeAttribute('spatNavTooltip');
                            }
                            highlightedElement[label] = null;
                        }
                    }

                    // Add only spatNav and visible option are turned on.
                    if (items.isOn && items.isVisible) {
                        actElement = document.activeElement;
                        actElement.classList.add(ACTIVE_ELEMENT_HIGHLIGHT);

                        // Add highlight and tooltip.
                        for (label in highlightedElement) {
                            highlightedElement[label] = window.__spatialNavigation__.findNextTarget(actElement, label);

                            if (highlightedElement[label]) {
                                highlightedElement[label].classList.add(NEXT_TARGET_HIGHLIGHT);
                                highlightedElement[label].setAttribute('spatNavTooltip', label);
                            }
                        }
                    } else if (items.isOn && items.CurrentOn) {
                        actElement = document.activeElement;
                        actElement.classList.add(ACTIVE_ELEMENT_HIGHLIGHT);
                    }
                }
            }
        });
    }
}, false);
