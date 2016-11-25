import 'dojo/has!host-node?../support/loadJsdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createProjector from '../../src/createProjector';
import d from '../../src/util/d';
import global from 'dojo-core/global';
import { spy } from 'sinon';

registerSuite({
	name: 'projector',
	basic(this: any) {
		const childNodeLength = document.body.childNodes.length;
		const nodeText = 'foo';
		const projector = createProjector({
			getChildrenNodes: function() {
				return [ d('h2', [ 'foo' ] ) ];
			}
		});

		return projector.attach().then((attachHandle) => {
			assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
			assert.strictEqual((<HTMLElement> document.body.lastChild).innerHTML, nodeText);
			assert.strictEqual((<HTMLElement> document.body.lastChild).tagName.toLowerCase(), 'h2');
		});
	},
	'construct projector with css transitions'() {
		global.cssTransitions = {};
		try {
			createProjector({ cssTransitions: true });
		}
		catch (err) {
			assert.fail(null, null, 'Projector should be created without throwing an error');
		}

	},
	'construting projector configured for css transitions throws when css-transitions script is not loaded.'() {
		global.cssTransitions = undefined;
		try {
			createProjector({ cssTransitions: true });
		}
		catch (err) {
			assert.isTrue(err instanceof Error);
			assert.equal(err.message, 'Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
		}
	},
	'attach event'() {
		const root = document.createElement('div');
		document.body.appendChild(root);
		const projector = createProjector({
			getChildrenNodes: function() {
				return [ d('h2', [ 'foo' ] ) ];
			},
			root
		});
		assert.strictEqual(root.childNodes.length, 0, 'there should be no children');
		let eventFired = false;
		projector.on('attach', () => {
			eventFired = true;
			assert.strictEqual(root.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> root.firstChild).tagName.toLowerCase(), 'h2');
			assert.strictEqual((<HTMLElement> root.firstChild).innerHTML, 'foo');
		});
		return projector.attach().then(() => {
			assert.isTrue(eventFired);
		});
	},
	'get root'() {
		const projector = createProjector();
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'destroy'() {
		const projector = createProjector();
		const maquetteProjectorStopSpy = spy(projector.projector, 'stop');
		const maquetteProjectorDetachSpy = spy(projector.projector, 'detach');

		return projector.attach().then(() => {
			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);

			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);
		});

	},
	'invalidate before attached'() {
		const projector = createProjector();
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('schedulerender', () => {
			called = true;
		});

		projector.invalidate();

		assert.isFalse(maquetteProjectorSpy.called);
		assert.isFalse(called);
	},
	'invalidate after attached'() {
		const projector = createProjector();
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('schedulerender', () => {
			called = true;
		});

		return projector.attach().then(() => {
			projector.invalidate();
			assert.isTrue(maquetteProjectorSpy.called);
			assert.isTrue(called);
		});
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = createProjector({ root });
		const promise = projector.attach();
		assert.strictEqual(promise, projector.attach(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = createProjector();
		const div = document.createElement('div');
		projector.root = div;
		return projector.attach().then((handle) => {
			assert.throws(() => {
				projector.root = document.body;
			}, Error, 'already attached');
		});
	}
});
