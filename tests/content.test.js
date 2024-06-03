import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { RuleType } from '../src/consts.js';
import { describe, before, beforeEach, it } from 'mocha';

describe('Test title rename content script', () => {
    let window;
    let document;
    let MutationObserver;
    let addListenerCallback;

    before(() => {
        globalThis.chrome = {
            runtime: {
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
        globalThis.MutationObserver = MutationObserver;

        await import('../src/content.js');
        addListenerCallback = chrome.runtime.onMessage.addListener.getCall(0).args[0];
    });

    it('should respond with fail on unsupported type', (done) => {
        const renameRequest = {
            type: 'UnsupportedType',
            value: 'Unsupported Value',
            timeout: 10
        };

        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
            done();
        }, 20);
    });

    it('should set document.title to a fixed value', (done) => {
        const renameRequest = { type: RuleType.Fixed, value: 'FixedTitle', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(document.title).to.equal('FixedTitle');
            expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
            done();
        }, 20);
    });

    it('should set document.title to element ID content', (done) => {
        const element = document.createElement('div');
        element.id = 'elementId';
        element.innerHTML = 'ElementIDTitle';
        document.body.appendChild(element);

        const renameRequest = { type: RuleType.ElementId, value: 'elementId', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(document.title).to.equal('ElementIDTitle');
            expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
            done();
        }, 20);
    });

    it('should fail when element ID does not exist', (done) => {
        const element = document.createElement('div');
        element.id = 'elementId';
        element.innerHTML = 'ElementIDTitle';
        document.body.appendChild(element);

        const renameRequest = { type: RuleType.ElementId, value: 'invalidId', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
            done();
        }, 20);
    });

    it('should set document.title to class content', (done) => {
        const element = document.createElement('div');
        element.className = 'classId';
        element.innerHTML = 'Class ID Title';
        document.body.appendChild(element);

        const renameRequest = { type: RuleType.ClassId, value: 'classId', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(document.title).to.equal('Class ID Title');
            expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
            done();
        }, 20);
    });

    it('should fail when class ID is invalid', (done) => {
        const element = document.createElement('div');
        element.className = 'classId';
        element.innerHTML = 'Class ID Title';
        document.body.appendChild(element);

        const renameRequest = { type: RuleType.ClassId, value: 'invalidClass', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);
        setTimeout(() => {
            expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
            done();
        }, 20);
    });

    it('should update document.title when the title element is mutated', (done) => {
        const renameRequest = { type: RuleType.Fixed, value: 'Observed Title', timeout: 10 };
        const sendResponse = sinon.spy();

        addListenerCallback(renameRequest, null, sendResponse);

        setTimeout(() => {
            expect(document.title).to.equal('Observed Title');
            expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
        }, 100);

        const titleElement = document.querySelector('title');
        titleElement.textContent = 'New Mutated Title';

        setTimeout(() => {
            expect(document.title).to.equal('Observed Title');
            done();
        }, 100);
    });
});
