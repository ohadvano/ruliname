import { RuleMap } from './rules.js';

const contentScriptId = 'rules_content_script';
let rules = new RuleMap();

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
            console.debug(`Initialized ${contentScriptId} content scripts`);
            return;
        }

        console.debug(`Updated ${contentScriptId} content scripts`);
        updateContentScripts(patternMatches);
    });
}

function initializeContentScripts(patternMatches) {
    chrome.scripting.registerContentScripts([{
        id: contentScriptId,
        matches: patternMatches,
        runAt: "document_start",
        js: [ "content.js" ],
    }]);
}

function updateContentScripts(patternMatches) {
    chrome.scripting.updateContentScripts([{
        id: contentScriptId,
        matches: patternMatches,
    }]);
}

chrome.storage.local.get(['rulesJson'], items => {
    if (items.rulesJson == null) {
        return;
    }

    setRules(items.rulesJson);
    console.debug('Initialized extension rules');
});

chrome.storage.onChanged.addListener((items, _namespace) => {
    if (items.rulesJson == null) {
        return;
    }

    setRules(items.rulesJson.newValue);
    console.debug('Updated extension rules');
});

chrome.runtime.onMessage.addListener((msg, sender) => {
    console.debug(`Got message from ${sender.tab.url}`);
    if (msg.type !== 'ready_to_receive_rename_request') {
        console.debug('Unknown message type');
        return;
    }

    let rule = rules.getByUrl(sender.tab.url);
    if (rule) {
        console.debug(`Rule found for tab with URL: ${sender.tab.url}`)
        chrome.tabs.sendMessage(sender.tab.id, {
            type: rule.renameDefinition.type,
            value: rule.renameDefinition.value,
            attempts: 10,
            interval: 1000,
            observeTitleChanges: true,
            maxTitleRenaming: 5,
        });

        console.debug(`Rule sent to tab with URL: ${sender.tab.url}`)
    } else {
        console.error(
            `Internal error. Rule not found for tab with URL: ${sender.tab.url}`);
    }
});
