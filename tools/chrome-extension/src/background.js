/**
 * restore option when page is loaded or refreshed.
 */
function setOption(tabId) {
    chrome.storage.local.get({
        keyMode: 'ARROW',
        isOn: true
    }, (items) => {
        items.keyMode = items.isOn ? items.keyMode : 'NONE';
        console.log(items.keyMode);
        const codeString = `window.__spatialNavigation__.keyMode = '${items.keyMode}'`;
        chrome.tabs.executeScript(tabId, {
            code: codeString
        }, (err) => {
            const e = chrome.runtime.lastError;
            if (e !== undefined) {
                console.log(tabId, err, e);
            }
        });

    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    console.log(changeInfo);
   /// alert(changeInfo);
    if (changeInfo.status == 'complete') {
        setOption(tabId);
    }
});
