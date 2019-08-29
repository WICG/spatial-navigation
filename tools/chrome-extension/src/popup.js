/**
 * set keyMode
 * @param {string} mode keyMode string
 */
function setKeyOption(mode) {
    chrome.tabs.query({}, (tabs) => {
        const setCode = `window.__spatialNavigation__.keyMode = '${mode}'`;
        for (let i = 0; i < tabs.length; i++) {
            chrome.tabs.executeScript(tabs[i].id, {
                code: setCode
            }, (err) => {
                const e = chrome.runtime.lastError;
                if (e !== undefined) {
                    console.log(tabs[i].id, err, e);
                }
            });
        }
    });
}

/**
 * save keyMode options.
 */
function onChangeOptions() {
    const isOn = document.getElementById('switch').checked;
    const mode = document.getElementById('keyMode').value;
    const isVisible = document.getElementById('visNextTarget').checked;
    const CurrentOn = document.getElementById('visActive').checked;
    const VisNone = document.getElementById('visNone').checked;
    const optionAreaDiv = document.getElementById('optionArea');
    chrome.storage.local.set({
        keyMode: mode,
        isOn,
        isVisible,
        CurrentOn,
        VisNone
    }, () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        if (isOn) {
            setKeyOption(keyMode.value);
            optionAreaDiv.style.display = 'block';
        } else {
            setKeyOption('NONE');
            optionAreaDiv.style.display = 'NONE';
        }

        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 750);
    });
}

/**
 * restore keyMode options.
 */
function restoreOptions() {
    // Use default value color = 'ARROW' and isOn = true.
    chrome.storage.local.get({
        keyMode: 'ARROW',
        isOn: true,
        isVisible: false,
        CurrentOn: true,
        VisNone : false
    }, (items) => {
        document.getElementById('keyMode').value = items.keyMode;
        document.getElementById('switch').checked = items.isOn;
        document.getElementById('visNextTarget').checked = items.isVisible;
        document.getElementById('visActive').checked = items.CurrentOn;
        document.getElementById('visNone').checked = items.VisNone;

        const optionAreaDiv = document.getElementById('optionArea');
        if (items.isOn) {
            setKeyOption(items.keyMode.value);
            optionAreaDiv.style.display = 'block';
        } else {
            setKeyOption('NONE');
            optionAreaDiv.style.display = 'NONE';
        }
    });
}

window.onload = restoreOptions;
document.getElementById('switch').addEventListener('change', onChangeOptions);
document.getElementById('keyMode').addEventListener('change', onChangeOptions);
document.getElementById('visNextTarget').addEventListener('change', onChangeOptions);
document.getElementById('visActive').addEventListener('change', onChangeOptions);
document.getElementById('visNone').addEventListener('change', onChangeOptions);
