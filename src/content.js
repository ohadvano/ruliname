import { RuleType } from './consts.js';

chrome.runtime.onMessage.addListener((renameRequest, _sender, sendResponse) => {
    getRequestedElement(renameRequest)
        .then((element) => {
            console.log('Found requested element');
            const newTitle = element.innerHTML;
            document.title = newTitle;

            let titleObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type != 'childList') {
                        return;
                    }

                    if (document.title !== newTitle) {
                        document.title = newTitle;
                    }
                });
            });

            titleObserver.observe(document.querySelector('title'), {
                childList: true
            });

            sendResponse({ result: "ok" });
        })
        .catch((error) => {
            console.warn(error);
            sendResponse({ result: "fail" });
        });
});

function getRequestedElement(renameRequest) {
    return new Promise((resolve, reject) => {
        function getElement(renameRequest) {
            switch (renameRequest.type) {
                case RuleType.Fixed:
                    const newElement = document.createElement('section');
                    newElement.textContent = renameRequest.value;
                    return newElement;
                case RuleType.ElementId:
                    return document.getElementById(renameRequest.value);
                case RuleType.ClassId:
                    return document.querySelector(`[class="${renameRequest.value}"]`);
                default:
                    console.log(`Internal error: unsupported renameDefinition `
                                + `'type': ${renameRequest.type}`);
                    return null;
            }
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type != 'childList' && mutation.type === 'subtree') {
                    return;
                }

                const element = getElement(renameRequest);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
        });

        const initialElement = getElement(renameRequest);
        if (initialElement) {
            resolve(initialElement);
            return;
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error('Element not found within timeout period'));
        }, renameRequest.timeout);
    });
}
