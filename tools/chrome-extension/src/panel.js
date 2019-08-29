const HOVER_ELEMENT_HIGHLIGHT = 'hover-element-highlight';
const FOCUSABLE_ELEMENT_HIGHLIGHT = 'focusable-element-highlight';
const DIRECTIONS = ['up', 'down', 'left', 'right'];
let checkedCnt;

const backgroundPageConnection = chrome.runtime.connect({
    name: 'panel'
});

backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});


function getCodeStringForFocusableElements(functionStr, addClass) {
    // TODO : keep previous outline style.
    return `(function() {
        var candidates = ${functionStr};
        if (candidates) {
            for (element of candidates) {
                ${addClass} ? element.classList.add('${FOCUSABLE_ELEMENT_HIGHLIGHT}') : element.classList.remove('${FOCUSABLE_ELEMENT_HIGHLIGHT}');
            }
        }
    })();`;
}

// Show the result of 'findCandidates()'.
function getCodeStringForGetCandidates(dir) {
    return `(function() {
        const disCandidate = [];
        const candidates = __spatialNavigation__.findCandidates(document.activeElement, '${dir}');
        if(candidates) {
            for(let i = 0; i < candidates.length; i++) {
                disCandidate[i] = [candidates[i].outerHTML, __spatialNavigation__.getDistanceFromTarget(document.activeElement, candidates[i], '${dir}')];
            }
        }
        return disCandidate;
    })();`;
}

// Get containerList
function getCodeStringForContainerList() {
    return `(function () {
        let currentContainer = document.activeElement.getSpatialNavigationContainer();
        const list = [];
        while(currentContainer) {
            list.push(currentContainer.outerHTML);
            currentContainer = (currentContainer.parentElement) ? currentContainer.parentElement.getSpatialNavigationContainer() : null;
        }
        return list;
    })();`;
}


function getCodeStringForMouseOverCandidates(dir, childIndex, addClass) {
    // TODO : keep previous outline style.
    return  `(function() {
        let elements = __spatialNavigation__.findCandidates(document.activeElement, '${dir}');
        if (elements && elements[${childIndex}]) {
            ${addClass} ? elements[${childIndex}].classList.add('${HOVER_ELEMENT_HIGHLIGHT}') : elements[${childIndex}].classList.remove('${HOVER_ELEMENT_HIGHLIGHT}');
        }
    })();`;
}


function getCodeStringForMouseOverContainer(childIndex, addClass) {
    return `(function() {
        let element = document.activeElement.getSpatialNavigationContainer();
        for (let i = 0; i < ${childIndex}; i++) {
            element = (element.parentElement) ? element.parentElement.getSpatialNavigationContainer() : null;
        }
        ${addClass} ? element.classList.add('${HOVER_ELEMENT_HIGHLIGHT}') : element.classList.remove('${HOVER_ELEMENT_HIGHLIGHT}');
    })();`;
}

function getCodeStringForMouseOver(functionStr, addClass) {
    return `(function() {
        let element = ${functionStr};
        if (element) {
            if(${addClass}) {
                element.classList.add('${HOVER_ELEMENT_HIGHLIGHT}');
                element.scrollIntoViewIfNeeded();
            } else {
                element.classList.remove('${HOVER_ELEMENT_HIGHLIGHT}');
            }
        }
    })();`;
}

/**
 * Make outline on candidates of specific direction
 * @param {string} dir colored dir
 */
function coloring(dir) {
    checkedCnt++;
    chrome.tabs.executeScript({
        code: getCodeStringForFocusableElements(`window.__spatialNavigation__.findCandidates(document.activeElement, '${dir}')`, true)
    });
    if (checkedCnt == 4) document.getElementById('button-all').checked = true;
}

/**
 * Remove outline on candidates of specific direction
 * @param {string} dir decolored dir
 */
function decoloring(dir) {
    checkedCnt--;
    chrome.tabs.executeScript({
        code: getCodeStringForFocusableElements(`window.__spatialNavigation__.findCandidates(document.activeElement, '${dir}')`, false)
    });
    if (checkedCnt < 4) document.getElementById('button-all').checked = false;
}

/**
 * Focusable element button onclick event listener
 */
document.body.addEventListener('click', (event) => {
    const id = event.srcElement.id;
    if (id == 'whole-page') {
        const isChecked = document.getElementById(id).checked;
        ChangeCheckAll(isChecked);
        document.getElementById('button-all').checked = isChecked;
        chrome.tabs.executeScript({
            code: getCodeStringForFocusableElements('document.body.focusableAreas({mode: "all"})', isChecked)
        });
    } else if (id == 'button-all') {
        if (document.getElementById(id).checked) ChangeCheckAll(true);
        else ChangeCheckAll(false);
    } else {
        const way = id.substr(7);
        if (DIRECTIONS.includes(way)) {
            if (document.getElementById(id).checked) coloring(way);
            else decoloring(way);
        }
    }
});

/**
 * Check / UnCheck focusable element button (4way)
 * @param {boolean} checked true = checked, false = unchecked
 */
function ChangeCheckAll(checked) {
    for (const dir of DIRECTIONS) {
        document.getElementById(`button-${dir}`).checked = checked;
        if (checked) {
            coloring(dir);
            checkedCnt = 4;
        } else {
            decoloring(dir);
            checkedCnt = 0;
        }
    }
}

/**
 *
 * Send Message on every focus changing event
 */
chrome.runtime.onMessage.addListener(() => {
    chrome.tabs.executeScript({
        code: 'window.__spatialNavigation__.useMemoizationForIsVisible(true);'
    });
    let t1 = performance.now();
    // remove all outline
    if (checkedCnt != 0) {
        ChangeCheckAll(false);
        document.getElementById('whole-page').checked = false;
        document.getElementById('button-all').checked = false;
        chrome.tabs.executeScript({
            code: getCodeStringForFocusableElements('document.body.focusableAreas({mode: "all"})', false)
        });
    }
    let t2 = performance.now();
    chrome.tabs.executeScript({
        code: `console.log(${t2-t1});`
    });

    // show information of Spatnav on devtool
    chrome.tabs.executeScript({
        code: 'document.body.focusableAreas({mode: "all"}).length;'
    }, (result)=> {
        document.getElementById('focus-cnt').innerText = result;
    });

    chrome.tabs.executeScript({
        code: '__spatialNavigation__.isContainer(document.activeElement);'
    }, (result)=> {
        document.getElementById('container').innerText = result;
        if (result === 'true') {
            document.getElementById('container').style.color = '#0057e7';
        } else {
            document.getElementById('container').style.color = '#d62d20';
        }
    });

    let t3 = performance.now();
    chrome.tabs.executeScript({
        code: `console.log(${t3-t2});`
    });
    // Show the result of 'findNextTarget()' and 'spatialNavigationSearch()'.
    for (const dir of DIRECTIONS) {
        chrome.tabs.executeScript({
            code: `var temp = __spatialNavigation__.findNextTarget(document.activeElement, '${dir}'); temp ? temp.outerHTML : 'null';`
        }, (result)=> {
            if (result === undefined) document.getElementById(dir).innerText = 'undefined';
            else document.getElementById(dir).innerText = result.toString().replace(/(\r\n\t|\n|\r\t)/gm, '');
            document.getElementById(dir).setAttribute('cmd', 'next');
        });

        chrome.tabs.executeScript({
            code: `var temp = document.activeElement.spatialNavigationSearch('${dir}'); temp ? temp.outerHTML : 'null';`
        }, (result)=> {
            const searchElement = document.getElementById(`search-${dir}`);
            searchElement.setAttribute('cmd', 'spatnav-search');
            if (result === undefined) { searchElement.innerText = 'undefined'; }
            else { searchElement.innerText = result.toString().replace(/(\r\n\t|\n|\r\t)/gm, ''); }
        });
    }
    let t4 = performance.now();
    chrome.tabs.executeScript({
        code: `console.log(${t4-t3});`
    });

    // Make list of 4 way candidate
    for (const dir of DIRECTIONS) {
        chrome.devtools.inspectedWindow.eval(getCodeStringForGetCandidates(dir), { useContentScriptContext: true }, (result) => {
            const parentDiv = document.getElementById('candidates-area-' + dir);
            while (parentDiv.firstChild) {
                parentDiv.removeChild(parentDiv.firstChild);
            }
            if (result.length === 0) {
                parentDiv.appendChild(document.createTextNode('None'));
            } else {
                const currentDiv = document.getElementById('candidates-' + dir);
                for (let i = 0; i < result.length; i++) {
                    const newDiv = document.createElement('div');
                    newDiv.setAttribute('id', `candidates-${dir}-${i}`);
                    newDiv.className = 'item';
                    const newContent = document.createTextNode(`[${i}] distance : ${parseInt(result[i][1])}, ${result[i][0].replace(/(\r\n\t|\n|\r\t)/gm, '')}`);
                    newDiv.appendChild(newContent);
                    parentDiv.insertBefore(newDiv, currentDiv);
                }
            }
        });
    }

    let t5 = performance.now();
    chrome.tabs.executeScript({
        code: `console.log(${t5-t4});`
    });
    // Make list of container
    chrome.devtools.inspectedWindow.eval(getCodeStringForContainerList(), { useContentScriptContext: true }, (result) => {
        const parentDiv = document.getElementById('container-list');
        while (parentDiv.firstChild) {
            parentDiv.removeChild(parentDiv.firstChild);
        }

        if (!result.length) {
            document.getElementById('container-list').innerText = 'None';
        } else {
            for (let i = 0; i < result.length; i++) {
                const newDiv = document.createElement('div');
                newDiv.className = 'item';
                newDiv.setAttribute('id', `container-list-${i}`);
                newDiv.innerText = `[${i}] ${result[i].replace(/(\r\n\t|\n|\r\t)/gm, '')}`;
                parentDiv.appendChild(newDiv, parentDiv);
            }
        }
    });

    let t6 = performance.now();
    chrome.tabs.executeScript({
        code: `console.log(${t6-t5}); window.__spatialNavigation__.useMemoizationForIsVisible(false);`
    });

});

function onMouseOverOut(id, isActive) {
    if (DIRECTIONS.includes(id)) {
        const dir = id;
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigation__.findNextTarget(document.activeElement, '${dir}');`, isActive)
        });
    } else if (id.includes('search-')) {
        const dir = id.substr('search-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`document.activeElement.spatialNavigationSearch('${dir}');`, isActive)
        });
    } else if (id.includes('container-list-')) {
        const childIndex = parseInt(id.substr('container-list-'.length));
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOverContainer(childIndex, isActive)
        });
    } else if (id.includes('error-list-fixed-')) {
        const childIndex = id.substr('error-list-fixed-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.outOfFlow[${childIndex}];`, isActive)
        });

    } else if (id.includes('error-list-focus-ring-')) {
        const childIndex = id.substr('error-list-focus-ring-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.foucusRing[${childIndex}];`, isActive)
        });
    } else if (id.includes('error-list-iframe-')) {
        const childIndex = id.substr('error-list-iframe-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.iframe[${childIndex}];`, isActive)
        });

    } else if (id.includes('error-list-no-tabindex-')) {
        const childIndex = id.substr('error-list-no-tabindex-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.noTabIndex[${childIndex}];`, isActive)
        });
    } else if (id.includes('error-list-unreachable-')) {
        const childIndex = id.substr('error-list-unreachable-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.unreachable[${childIndex}];`, isActive)
        });
    } else if (id.includes('error-list-trapped-')) {
        const childIndex = id.substr('error-list-trapped-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.trapped[${childIndex}];`, isActive)
        });
    } else if (id.includes('error-list-isolation-')) {
        const childIndex = id.substr('error-list-isolation-'.length);
        chrome.tabs.executeScript({
            code: getCodeStringForMouseOver(`window.__spatialNavigationTestResult__.isolation[${childIndex}];`, isActive)
        });
    } else {
        for (const dir of DIRECTIONS) {
            if (id.includes(`candidates-${dir}-`)) {
                const childIndex = parseInt(id.substr(`candidates-${dir}-`.length));
                chrome.tabs.executeScript({
                    code: getCodeStringForMouseOverCandidates(dir, childIndex, isActive)
                });
                return;
            }
        }
    }
}

document.body.addEventListener('mouseover', (event) => {
    const id = event.srcElement.id;
    if(id) {
        onMouseOverOut(id, true);
    }
});

document.body.addEventListener('mouseout', (event) => {
    const id = event.srcElement.id;
    if(id) {
        onMouseOverOut(id, false);
    }
});

function runTestCase(executeScript, id, title, progress) {
    const parentDiv = document.getElementById('error-list');
    const progressbar = document.getElementById('test-progress');

    chrome.devtools.inspectedWindow.eval(executeScript, { useContentScriptContext: true },
        (result) => {
            const errorTypeTitle = document.createElement('h3');
            errorTypeTitle.innerText = title;
            parentDiv.appendChild(errorTypeTitle);

            const errorTypeDiv = document.createElement('div');
            errorTypeDiv.className = 'error-list';
            errorTypeDiv.setAttribute('id', 'error-list-' + id);
            parentDiv.appendChild(errorTypeDiv);

            if (!result || !result.length) {
                errorTypeDiv.appendChild(document.createTextNode('NONE'));
            } else {
                for (let i = 0; i < result.length; i++) {
                    const newItem = document.createElement('abbr');
                    newItem.className = 'item';
                    newItem.setAttribute('id', 'error-list-' + id + `-${i}`);
                    newItem.innerText = result[i];
                    newItem.title = result[i];
                    errorTypeDiv.appendChild(newItem);
                }
            }
            progressbar.value = progress;
            if(progress === 100) {
                progressbar.classList.add('hide');
                document.getElementById('test-start').classList.remove('hide');
                document.getElementById('test-stop').classList.add('hide');
            }
        });
}

/*
 Spatial navigation friendly test.
*/
document.getElementById('test-start').addEventListener('click', () => {
    document.getElementById('test-start').classList.add('hide');
    document.getElementById('test-stop').classList.remove('hide');
    document.getElementById('error-list').classList.remove('hide');

    const progressbar = document.getElementById('test-progress');
    progressbar.classList.remove('hide');
    progressbar.value = 0;

    const parentDiv = document.getElementById('error-list');
    while (parentDiv.firstChild) {
        parentDiv.removeChild(parentDiv.firstChild);
    }

    // Focus-ring error detector
    chrome.tabs.executeScript({
        code: 'alert("Test will take some minute"); focus_error_detector();'
    });
    // unreachable detector
    runTestCase('unreachable_detector();', 'unreachable', 'Unreachable element', 5);

    // // trap detector
    // runTestCase('trap_detector();', 'trapped', 'Trapped element', 10);

    // // isolation detector
    // runTestCase('isolation_detector();', 'isolation', 'Isolated element', 15);

    // no tabIndex detector
    runTestCase('non_focusable_button_detector();', 'no-tabindex', 'No tabIndex', 20);

    // position fixed detector
    runTestCase('fixed_sticky_detector();', 'fixed', 'Fixed element', 40);

    // iframe fixed detector
    runTestCase('iframe_detector();', 'iframe', 'iFrame element', 60);

    setTimeout(() => {
        runTestCase('get_result_of_focus_error();', 'focus-ring', 'Focus Ring Error', 100);
    }, 5000);
});



document.getElementById('test-stop').addEventListener('click', () => {
    document.getElementById('test-start').classList.remove('hide');
    document.getElementById('test-stop').classList.add('hide');
    const progressbar = document.getElementById('test-progress');
    progressbar.classList.add('hide');
    progressbar.value = 0;
});

