import { RuleType } from './consts.js';

export function getElement(renameRequest) {
    switch (renameRequest.type) {
        case RuleType.Fixed: {
            const newElement = document.createElement('section');
            newElement.textContent = renameRequest.value;
            return newElement;
        }
        case RuleType.ElementId:
            return document.getElementById(renameRequest.value);
        case RuleType.ClassId:
            return document.querySelector(`[class="${renameRequest.value}"]`);
        case RuleType.CustomQuery:
                return document.querySelector(renameRequest.value);
        default:
            console.error(`Internal error: unsupported renameDefinition `
                        + ` type: ${renameRequest.type}`);
            return null;
    }
}

export function evaluateRenameRequest(renameRequest) {
    return new Promise((resolve, reject) => {
        function pollRequestedElement() {
            const element = getElement(renameRequest);
            if (element) {
                resolve(element);
            } else if (--renameRequest.attempts === 0) {
                reject(new Error('Element not found within timeout period'));
            } else {
                console.debug(
                    'Requested element was not found. Scheduling next polling iteration');
                setTimeout(pollRequestedElement, renameRequest.interval);
            }
        }

        pollRequestedElement();
    });
}

export function maybeObserveTitle(renameRequest, newTitle) {
    if (renameRequest.observeTitleChanges !== true) {
        return;
    }

    let titleObserver = new MutationObserver((_mutations) => {
        if (document.title === newTitle) {
            return;
        }

        if (--renameRequest.maxTitleRenaming == 0) {
            console.warn('Maximum title renaming reached');
            titleObserver.disconnect();
            return;
        }

        document.title = newTitle;
    });

    titleObserver.observe(
        document.querySelector('title'),
        { childList: true, characterData: true, subtree: true },
    );

    console.debug("Started observing title changes");
}

chrome.runtime.onMessage.addListener((renameRequest, _sender, sendResponse) => {
    console.debug(`Received rename request, evaluation start`);

    evaluateRenameRequest(renameRequest).then((element) => {
        console.debug('Found requested element, renaming title');
        document.title = element.innerHTML;
        maybeObserveTitle(renameRequest, element.innerHTML);

        sendResponse({ result: "success" });
    }).catch((error) => {
        console.warn(error);
        sendResponse({ result: "failure" });
    });
});

console.debug('Content script loaded');

chrome.runtime.sendMessage({ type: 'ready_to_receive_rename_request' });
console.debug(`Sent 'ready_to_receive_rename_request' message`);
