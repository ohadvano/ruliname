import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { RuleType } from '../src/consts.js';
import { describe, before, beforeEach, it } from 'mocha';

describe('Test title rename content script', () => {
    let window;
    let document;
    let MutationObserver;
    let contentModule;
    let getElement;
    let evaluateRenameRequest;
    let maybeObserveTitle;

    before(() => {
        globalThis.chrome = {
            runtime: {
                sendMessage: sinon.spy(),
                onMessage: {
                    addListener: sinon.spy()
                }
            }
        };
    });

    beforeEach(async () => {
        const dom = new JSDOM(
            '<!DOCTYPE html><html><head><title>Old Title</title></head><body></body></html>');

        window = dom.window;
        document = dom.window.document;
        MutationObserver = dom.window.MutationObserver;

        globalThis.window = window;
        globalThis.document = document;
        globalThis.HTMLElement = dom.window.HTMLElement;
        globalThis.MutationObserver = MutationObserver;

        contentModule = await import('../src/content.js');
        getElement = contentModule.getElement;
        evaluateRenameRequest = contentModule.evaluateRenameRequest;
        maybeObserveTitle = contentModule.maybeObserveTitle;

        expect(chrome.runtime.sendMessage.calledOnceWithExactly({
            type: 'ready_to_receive_rename_request',
        })).to.be.true;
    });

    describe('getElement tests', () => {
        it('should create a new <section> element for RuleType.Fixed', () => {
            const renameRequest = { type: RuleType.Fixed, value: 'Fixed Value' };
            const element = getElement(renameRequest);
            expect(element).to.be.instanceOf(HTMLElement);
            expect(element.tagName).to.equal('SECTION');
            expect(element.textContent).to.equal('Fixed Value');
        });

        it('should return an element by id for RuleType.ElementId', () => {
            const div = document.createElement('div');
            div.id = 'testId';
            document.body.appendChild(div);

            const renameRequest = { type: RuleType.ElementId, value: 'testId' };
            const element = getElement(renameRequest);
            expect(element).to.equal(div);
        });

        it('should return an element by class for RuleType.ClassId', () => {
            const div = document.createElement('div');
            div.className = 'testClass';
            document.body.appendChild(div);

            const renameRequest = { type: RuleType.ClassId, value: 'testClass' };
            const element = getElement(renameRequest);
            expect(element).to.equal(div);
        });

        it('should use a custom query for RuleType.CustomQuery', () => {
            const div = document.createElement('div');
            div.id = 'custom';
            document.body.appendChild(div);

            const renameRequest = { type: RuleType.CustomQuery, value: '#custom' };
            const element = getElement(renameRequest);
            expect(element).to.equal(div);
        });

        it('should return null and log error for an unsupported type', () => {
            const consoleErrorStub = sinon.stub(console, 'error');
            const renameRequest = { type: 'unsupported', value: 'anything' };
            const element = getElement(renameRequest);
            expect(element).to.be.null;
            expect(consoleErrorStub.calledOnce).to.be.true;
            consoleErrorStub.restore();
        });
    });

    describe('evaluateRenameRequest tests', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            document.body.innerHTML = '';
        });

        afterEach(() => {
            clock.restore();
        });

        it('should resolve immediately if the element is found', () => {
            const div = document.createElement('div');
            div.id = 'found';
            document.body.appendChild(div);

            const renameRequest = {
                type: RuleType.ElementId,
                value: 'found',
                attempts: 3,
                interval: 50
            };

            return evaluateRenameRequest(renameRequest).then((element) => {
                expect(element).to.equal(div);
            });
        });

        it('should poll until the element is found', () => {
            const renameRequest = {
                type: RuleType.ElementId,
                value: 'later',
                attempts: 3,
                interval: 50
            };

            const promise = evaluateRenameRequest(renameRequest);
            // At first polling, the element is not there
            clock.tick(50);

            // Adding the element so it should be found in second poll
            const div = document.createElement('div');
            div.id = 'later';
            document.body.appendChild(div);

            clock.tick(50);

            return promise.then((element) => {
                expect(element).to.equal(div);
            });
        });

        it('should reject if the element is not found within the allotted attempts', () => {
            const renameRequest = {
                type: RuleType.ElementId,
                value: 'nonexistent',
                attempts: 2,
                interval: 50
            };

            const promise = evaluateRenameRequest(renameRequest);

            clock.tick(100);

            return promise.catch((error) => {
                expect(error).to.be.an('error');
                expect(error.message).to.equal('Element not found within timeout period');
            });
        });
    });

    describe('maybeObserveTitle tests', () => {
        let observerCallback;
        let mockObserverInstance;

        beforeEach(() => {
            mockObserverInstance = {
                observe: sinon.spy(),
                disconnect: sinon.spy()
            };

            global.MutationObserver = function(callback) {
                observerCallback = callback;
                return mockObserverInstance;
            };

            sinon.stub(document, 'querySelector').returns({
                textContent: 'original'
            });
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should not observe title changes if observeTitleChanges is false', () => {
            let renameRequest = {
                observeTitleChanges: false,
                maxTitleRenaming: 3
            };

            maybeObserveTitle(renameRequest, 'xyz');

            expect(document.querySelector.notCalled).to.be.true;
            expect(mockObserverInstance.observe.notCalled).to.be.true;
        });

        it('should start observing title changes if observeTitleChanges is true', () => {
            let renameRequest = {
                observeTitleChanges: true,
                maxTitleRenaming: 3
            };

            maybeObserveTitle(renameRequest, 'xyz');

            expect(document.querySelector.calledOnceWith('title')).to.be.true;
            expect(mockObserverInstance.observe.calledOnceWith(
                document.querySelector('title'),
                { childList: true, characterData: true, subtree: true },
            )).to.be.true;
        });

        it('should not update document title if it matches newTitle', () => {
            let renameRequest = {
                observeTitleChanges: true,
                maxTitleRenaming: 2
            };

            document.title = 'xyz';
            maybeObserveTitle(renameRequest, 'xyz');

            expect(document.querySelector.calledOnceWith('title')).to.be.true;
            expect(mockObserverInstance.observe.calledOnceWith(
                document.querySelector('title'),
                { childList: true, characterData: true, subtree: true },
            )).to.be.true;

            observerCallback([]);
            expect(document.title).to.equal('xyz');
            expect(renameRequest.maxTitleRenaming).to.equal(2);
            expect(mockObserverInstance.disconnect.notCalled).to.be.true;
        });

        it('should update document title and disconnect observer when maxTitleRenaming reaches 0', () => {
            let renameRequest = {
                observeTitleChanges: true,
                maxTitleRenaming: 3
            };

            maybeObserveTitle(renameRequest, 'xyz');

            document.title = 'title1';
            observerCallback([]);
            expect(document.title).to.equal('xyz');
            expect(renameRequest.maxTitleRenaming).to.equal(2);

            document.title = 'title2';
            observerCallback([]);
            expect(document.title).to.equal('xyz');
            expect(renameRequest.maxTitleRenaming).to.equal(1);

            document.title = 'title3';
            observerCallback([]);
            expect(document.title).to.equal('title3');
            expect(renameRequest.maxTitleRenaming).to.equal(0);
            expect(mockObserverInstance.disconnect.calledOnce).to.be.true;
        });
    });

    describe('chrome.runtime.onMessage listener tests', function() {
        let onMessageListener;
        let sendResponse;

        beforeEach(function () {
            expect(chrome.runtime.onMessage.addListener.calledOnce).to.be.true;
            onMessageListener = chrome.runtime.onMessage.addListener.firstCall.args[0];
            sendResponse = sinon.spy();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should handle failure scenario when element not found', (done) => {
            const consoleWarnStub = sinon.stub(console, 'warn');

            const renameRequest = {
                type: RuleType.ElementId,
                value: 'nonexistent',
                attempts: 1,
            };

            onMessageListener(renameRequest, null, sendResponse);

            setTimeout(() => {
                expect(consoleWarnStub.calledOnce).to.be.true;
                expect(sendResponse.calledOnceWith({ result: 'failure' })).to.be.true;
                consoleWarnStub.restore();
                done();
            }, 50);
        });

        it('should handle success scenario and update document title', (done) => {
            const mockElement = document.createElement('div');
            mockElement.id = 'test-element';
            mockElement.innerHTML = 'Mock Title';
            document.body.appendChild(mockElement);

            const renameRequest = {
                type: RuleType.ElementId,
                value: 'test-element',
                attempts: 1,
            };

            onMessageListener(renameRequest, null, sendResponse);

            setTimeout(() => {
                expect(document.title).to.equal('Mock Title');
                expect(sendResponse.calledOnceWith({ result: 'success' })).to.be.true;
                done();
            }, 50);
        });
    });
});
