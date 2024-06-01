import { RuleMap } from './rules.js';

const contentScriptId = 'rules_content_script';
let rules = new RuleMap();

chrome.storage.sync.get(['rulesJson'], items => {
    if (items.rulesJson == null) {
        return;
    }

    setRules(items.rulesJson);
});

chrome.storage.onChanged.addListener((items, _namespace) => {
    if (items.rulesJson == null) {
        return;
    }

    setRules(items.rulesJson.newValue);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
        return;
    }

    let rule = rules.getByUrl(tab.url);
    if (rule) {
        chrome.tabs.sendMessage(tabId, {
            type: rule.renameDefinition.type,
            value: rule.renameDefinition.value
        });
    }
});

function setRules(rulesJson) {
    rules = RuleMap.fromJson(rulesJson);
    if (rules.patternMatches.length == 0) {
        return;
    }

    registerContentScripts(rules.patternMatches);
}

function registerContentScripts(patternMatches) {
    let expectedId = { ids: [contentScriptId] };
    chrome.scripting.getRegisteredContentScripts(expectedId, (scripts) => {
        if (scripts.length == 0) {
            initializeContentScripts(patternMatches);
            return;
        }

        updateContentScripts(patternMatches);
    });
}

function initializeContentScripts(patternMatches) {
    chrome.scripting.registerContentScripts([{
        id: contentScriptId,
        matches: patternMatches,
        runAt: "document_idle",
        js: [ "content.js" ],
    }]);
}

function updateContentScripts(patternMatches) {
    chrome.scripting.updateContentScripts([{
        id: contentScriptId,
        matches: patternMatches,
    }]);
}
