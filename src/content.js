import { RuleType } from './consts.js';

chrome.runtime.onMessage.addListener((renameDefinition, _sender, sendResponse) => {
    var newTitle = null;
    switch (renameDefinition.type) {
        case RuleType.Fixed:
            newTitle = renameDefinition.value;
            break;
        case RuleType.ElementId:
            try {
                newTitle = document.getElementById(renameDefinition.value).innerHTML;
            } catch(_) {
                console.log(`Failed retreiving element '${renameDefinition.value}' value`);
            }

            break;
        case RuleType.ClassId:
            try {
                newTitle = document.querySelector(`.${renameDefinition.value}`).innerHTML;
            } catch(_) {
                console.log(`Failed retreiving class '${renameDefinition.value}' value`);
            }

            break;
        default:
            console.log(`Internal error: unsupported renameDefinition `
                         + `'type': ${renameDefinition.type}`);
    }

    if (newTitle === null) {
        sendResponse({ result: "fail" });
        return;
    }

    document.title = newTitle;
    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type != 'childList') {
                return;
            }

            if (document.title !== newTitle) {
                document.title = newTitle;
            }
        });
    });

    observer.observe(document.querySelector('title'), { childList: true });
    sendResponse({ result: "ok" });
});
