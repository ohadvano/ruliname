import { expect } from 'chai';
import sinon from 'sinon';
import { describe, beforeEach, afterEach, it } from 'mocha';

describe('Test extension background service', () => {
    beforeEach(async () => {
        globalThis.chrome = {
            storage: {
                local: {
                    get: sinon.stub(),
                },
                onChanged: {
                    addListener: sinon.stub(),
                },
            },
            runtime: {
                onMessage: {
                    addListener: sinon.stub(),
                },
            },
            tabs: {
                sendMessage: sinon.stub(),
            },
            scripting: {
                getRegisteredContentScripts: sinon.stub(),
                registerContentScripts: sinon.stub(),
                updateContentScripts: sinon.stub(),
            },
        };
    });

    afterEach(() => {
        sinon.restore();
        delete globalThis.chrome;
    });

    async function importBackgroundScript() {
        return import(`../src/background.js?update=${Date.now()}`);
    }

    it('should not register when rules are null', async () => {
        chrome.storage.local.get.yields({ rulesJson: null });
        await importBackgroundScript();
        expect(chrome.scripting.getRegisteredContentScripts.notCalled).to.be.true;
    });

    it('should not register when rules are empty', async () => {
        chrome.storage.local.get.yields({ rulesJson: '{}' });
        await importBackgroundScript();
        expect(chrome.scripting.getRegisteredContentScripts.notCalled).to.be.true;
    });

    it('should register content scripts for single rule', async () => {
        const rulesJson = JSON.stringify({
            test: {
                match: "https://test.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
        });

        chrome.storage.local.get.yields({ rulesJson });
        chrome.scripting.getRegisteredContentScripts.yields([]);
        await importBackgroundScript();

        expect(chrome.scripting.getRegisteredContentScripts.calledOnce).to.be.true;
        expect(chrome.scripting.registerContentScripts.calledOnceWithExactly([{
            id: 'rules_content_script',
            matches: ["https://test.com/"],
            runAt: "document_start",
            js: ["content.js"],
        }])).to.be.true;
    });

    it('should register content scripts for two rules', async () => {
        const rulesJson = JSON.stringify({
            test: {
                match: "https://test.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
            test2: {
                match: "https://test2.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
        });

        chrome.storage.local.get.yields({ rulesJson });
        chrome.scripting.getRegisteredContentScripts.yields([]);
        await importBackgroundScript();

        expect(chrome.scripting.getRegisteredContentScripts.calledOnce).to.be.true;
        expect(chrome.scripting.registerContentScripts.calledOnceWithExactly([{
            id: 'rules_content_script',
            matches: ["https://test.com/", "https://test2.com/"],
            runAt: "document_start",
            js: ["content.js"],
        }])).to.be.true;
    });

    it('should update content scripts if already registered', async () => {
        const rulesJson = JSON.stringify({
            test: {
                match: "https://test.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
        });

        chrome.storage.local.get.yields({ rulesJson });
        chrome.scripting.getRegisteredContentScripts.yields(['rules_content_script']);
        await importBackgroundScript();

        expect(chrome.scripting.getRegisteredContentScripts.calledOnce).to.be.true;
        expect(chrome.scripting.updateContentScripts.calledOnceWithExactly([{
            id: 'rules_content_script',
            matches: ["https://test.com/"],
        }])).to.be.true;
    });

    it('should call setRules with the new value when rulesJson changes', async () => {
        const listenerStub = chrome.storage.onChanged.addListener;
        const newValue = JSON.stringify({
            test: {
                match: "https://test.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
        });

        chrome.scripting.getRegisteredContentScripts.yields(['rules_content_script']);
        await importBackgroundScript();
        expect(listenerStub.calledOnce).to.be.true;
        const callback = listenerStub.getCall(0).args[0];
        callback({ rulesJson: { newValue } }, 'sync');

        expect(chrome.scripting.getRegisteredContentScripts.calledOnce).to.be.true;
        expect(chrome.scripting.updateContentScripts.calledOnceWithExactly([{
            id: 'rules_content_script',
            matches: ["https://test.com/"],
        }])).to.be.true;
    });

    it('should message to tab that was registered', async () => {
        const rulesJson = JSON.stringify({
            test: {
                match: "https://test.com/",
                rename: {
                    type: "fixed",
                    value: "val"
                },
            },
        });

        const listenerStub = chrome.runtime.onMessage.addListener;
        chrome.storage.local.get.yields({ rulesJson });
        chrome.scripting.getRegisteredContentScripts.yields([]);
        await importBackgroundScript();

        expect(chrome.scripting.getRegisteredContentScripts.calledOnce).to.be.true;
        expect(chrome.scripting.registerContentScripts.calledOnceWithExactly([{
            id: 'rules_content_script',
            matches: ["https://test.com/"],
            runAt: "document_start",
            js: ["content.js"],
        }])).to.be.true;

        expect(listenerStub.calledOnce).to.be.true;

        const callback = listenerStub.getCall(0).args[0];

        callback(
            { type: 'unknown_type' },
            { tab: { id: "tabId", url: "https://test.com/"}}
        );
        callback(
            { type: 'ready_to_receive_rename_request' },
            { tab: { id: "tabId", url: "https://notregistered.com/"}}
        );
        callback(
            { type: 'ready_to_receive_rename_request' },
            { tab: { id: "tabId", url: "https://test.com/"}}
        );

        expect(chrome.tabs.sendMessage.calledOnceWithExactly("tabId", {
            type: "fixed",
            value: "val",
            attempts: 10,
            interval: 1000,
            observeTitleChanges: true,
            maxTitleRenaming: 5,
        })).to.be.true;
    });
});
