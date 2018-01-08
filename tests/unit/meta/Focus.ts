const { assert } = intern.getPlugin('chai');
const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
import global from '@dojo/shim/global';
import * as sinon from 'sinon';
import Focus from '../../../src/meta/Focus';
import NodeHandler from '../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

function supportsActiveElementStub() {
	try {
		const testStub = sinon.stub();
		const activeStub = sinon.stub(global.document, 'activeElement').get(testStub);
		global.document.activeElement;
		activeStub.restore();
		return testStub.called;
	} catch (e) {
		return false;
	}
}

describe('meta - Focus', () => {
	const bindInstance = new WidgetBase();
	const defaultFocus = {
		active: false,
		containsFocus: false
	};
	let element: HTMLElement;
	let activeElement: any;
	let activeGetter: any;
	let focus: any;
	let nodeHandler: any;
	let invalidateStub: any;

	beforeEach((test) => {
		if (!supportsActiveElementStub()) {
			test.skip('This environment does not allow stubbing of global.document.activeElement');
		} else {
			invalidateStub = sinon.stub();
			nodeHandler = new NodeHandler();
			focus = new Focus({
				invalidate: invalidateStub,
				nodeHandler,
				bind: bindInstance
			});

			element = document.createElement('div');
			activeGetter = sinon.stub().returns(element);
			activeElement = sinon.stub(global.document, 'activeElement').get(activeGetter);
		}
	});

	afterEach(() => {
		if (supportsActiveElementStub()) {
			focus.destroy();
			nodeHandler.destroy();
			activeElement.restore();
		}
	});

	it('will return default dimensions if a node is not loaded', () => {
		assert.deepEqual(focus.get('foo'), defaultFocus);
	});
	it('will accept a number key', () => {
		assert.deepEqual(focus.get(1234), defaultFocus);
	});
	it('will return true/true for an element with focus', (test) => {
		nodeHandler.add(element, 'root');
		if (!element.contains(element)) {
			test.skip('IE11 Webdriver handles .contains() improperly');
		}

		const focusResults = focus.get('root');
		assert.equal(focusResults.active, true);
		assert.equal(focusResults.containsFocus, true);
	});
	it('will return false/true for an element containing focus', () => {
		const containingEl = document.createElement('div');
		containingEl.appendChild(element);
		nodeHandler.add(containingEl, 'root');

		const focusResults = focus.get('root');
		assert.equal(focusResults.active, false);
		assert.equal(focusResults.containsFocus, true);
	});
	it('will return false/false for an element without focus', () => {
		const rootEl = document.createElement('div');
		nodeHandler.add(rootEl, 'root');

		const focusResults = focus.get('root');
		assert.equal(focusResults.active, false);
		assert.equal(focusResults.containsFocus, false);
	});
	it('will only query the dom once for multiple requests', () => {
		nodeHandler.add(element, 'root');

		let focusResults = focus.get('root');
		assert.isTrue(activeGetter.calledOnce, 'activeElement called on first .get()');
		assert.equal(focusResults.active, true);

		focusResults = focus.get('root');
		assert.isTrue(activeGetter.calledOnce, 'cached value used on second .get()');
		assert.equal(focusResults.active, true);
	});
	it('will invalidate on focus events', () => {
		const focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		nodeHandler.add(element, 'root');

		focus.get('root');
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(invalidateStub.calledOnce);
	});
	it('updates the saved activeElement value on focus events', () => {
		const child = document.createElement('span');
		const focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		element.appendChild(child);
		nodeHandler.add(element, 'root');

		let focusResults = focus.get('root');
		assert.isTrue(activeGetter.calledOnce, 'activeElement called on first .get()');
		assert.equal(focusResults.active, true);
		assert.equal(focusResults.containsFocus, true);

		activeGetter = sinon.stub().returns(child);
		activeElement = sinon.stub(global.document, 'activeElement').get(activeGetter);
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(activeGetter.calledOnce, 'activeElement called after focus event');

		activeGetter.resetHistory();
		focusResults = focus.get('root');
		assert.isFalse(activeGetter.called, 'activeElement not called on second .get()');
		assert.equal(focusResults.active, false);
		assert.equal(focusResults.containsFocus, true);
	});
	it('removes the focus listener when the meta is destroyed', () => {
		const focusEvent = global.document.createEvent('Event');
		focusEvent.initEvent('focusin', true, true);
		nodeHandler.add(element, 'root');

		focus.get('root');
		global.document.dispatchEvent(focusEvent);
		assert.isTrue(activeGetter.called, 'focus handler calls activeElement');

		focus.destroy();
		activeGetter.resetHistory();
		global.document.dispatchEvent(focusEvent);
		assert.isFalse(activeGetter.called, 'focus handler is removed');
	});
});
