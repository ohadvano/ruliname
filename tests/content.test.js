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

    it('should respond with fail on unsupported type', () => {
        const renameDefinition = { type: 'UnsupportedType', value: 'Unsupported Value' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);
        expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
    });

    it('should set document.title to a fixed value', () => {
        const renameDefinition = { type: RuleType.Fixed, value: 'FixedTitle' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);

        expect(document.title).to.equal('FixedTitle');
        expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
    });

    it('should set document.title to element ID content', () => {
        const element = document.createElement('div');
        element.id = 'elementId';
        element.innerHTML = 'ElementIDTitle';
        document.body.appendChild(element);

        const renameDefinition = { type: RuleType.ElementId, value: 'elementId' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);

        expect(document.title).to.equal('ElementIDTitle');
        expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
    });

    it('should fail when element ID does not exist', () => {
        const element = document.createElement('div');
        element.id = 'elementId';
        element.innerHTML = 'ElementIDTitle';
        document.body.appendChild(element);

        const renameDefinition = { type: RuleType.ElementId, value: 'invalidId' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);
        expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
    });

    it('should set document.title to class content', () => {
        const element = document.createElement('div');
        element.className = 'classId';
        element.innerHTML = 'Class ID Title';
        document.body.appendChild(element);

        const renameDefinition = { type: RuleType.ClassId, value: 'classId' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);

        expect(document.title).to.equal('Class ID Title');
        expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;
    });

    it('should fail when class ID is invalid', () => {
        const element = document.createElement('div');
        element.className = 'classId';
        element.innerHTML = 'Class ID Title';
        document.body.appendChild(element);

        const renameDefinition = { type: RuleType.ClassId, value: 'invalidClass' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);
        expect(sendResponse.calledWith({ result: 'fail' })).to.be.true;
    });

    it('should update document.title when the title element is mutated', (done) => {
        const renameDefinition = { type: RuleType.Fixed, value: 'Observed Title' };
        const sendResponse = sinon.spy();

        addListenerCallback(renameDefinition, null, sendResponse);

        expect(document.title).to.equal('Observed Title');
        expect(sendResponse.calledWith({ result: 'ok' })).to.be.true;

        // Simulate a mutation in the title element
        const titleElement = document.querySelector('title');
        titleElement.textContent = 'New Mutated Title';

        // Use a small timeout to allow the MutationObserver to react
        setTimeout(() => {
            expect(document.title).to.equal('Observed Title');
            done();
        }, 100);
    });
});
