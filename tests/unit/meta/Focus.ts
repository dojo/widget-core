const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '@dojo/shim/global';
import * as sinon from 'sinon';
import Focus from '../../../src/meta/Focus';
import NodeHandler from '../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

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

registerSuite('meta - Focus', {

	beforeEach() {
		// const { browserName } = this.remote.session.capabilities;
		// if (browserName === 'safari') {
		// 	this.skip('SafariDriver does not allow stubbing of global.document.activeElement');
		// }

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
	},

	afterEach() {
		focus.destroy();
		nodeHandler.destroy();
		activeElement.restore();
	},

	tests: {
		'Will return default dimensions if node not loaded'() {
			assert.deepEqual(focus.get('foo'), defaultFocus);
		},
		'Will accept a number key'() {
			assert.deepEqual(focus.get(1234), defaultFocus);
		},

		'get element with focus'() {
			nodeHandler.add(element, 'root');

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, true);
			assert.equal(focusResults.containsFocus, true);
		},

		'get element containing focus'() {
			const containingEl = document.createElement('div');
			containingEl.appendChild(element);
			nodeHandler.add(containingEl, 'root');

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, true);
		},

		'get element without focus'() {
			const rootEl = document.createElement('div');
			nodeHandler.add(rootEl, 'root');

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, false);
		},

		'document.activeElement only called once'() {
			nodeHandler.add(element, 'root');

			let focusResults = focus.get('root');
			assert.isTrue(activeGetter.calledOnce, 'activeElement called on first .get()');
			assert.equal(focusResults.active, true);
			assert.equal(focusResults.containsFocus, true);

			focusResults = focus.get('root');
			assert.isTrue(activeGetter.calledOnce, 'cached value used on second .get()');
			assert.equal(focusResults.active, true);
			assert.equal(focusResults.containsFocus, true);
		},

		'invalidate called on focus event'() {
			const focusEvent = global.document.createEvent('Event');
			focusEvent.initEvent('focusin', true, true);
			nodeHandler.add(element, 'root');

			focus.get('root');
			global.document.dispatchEvent(focusEvent);
			assert.isTrue(invalidateStub.calledOnce);
		},

		'focus event updates saved activeElement value'() {
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

			activeGetter.reset();
			focusResults = focus.get('root');
			assert.isFalse(activeGetter.called, 'activeElement not called on second .get()');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, true);
		},

		'focus listener removed when meta is destroyed'() {
			const focusEvent = global.document.createEvent('Event');
			focusEvent.initEvent('focusin', true, true);
			nodeHandler.add(element, 'root');

			focus.get('root');
			global.document.dispatchEvent(focusEvent);
			assert.isTrue(activeGetter.called, 'focus handler calls activeElement');

			focus.destroy();
			activeGetter.reset();
			global.document.dispatchEvent(focusEvent);
			assert.isFalse(activeGetter.called, 'focus handler is removed');
		},

		'set focus on element'() {
			const setFocus = sinon.stub();
			sinon.stub(element, 'focus').callsFake(setFocus);
			nodeHandler.add(element, 'root');

			focus.set('root');
			assert.isTrue(setFocus.calledOnce);
		}
	}
});
