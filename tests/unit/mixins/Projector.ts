import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';
import { ProjectorMixin, ProjectorState, ProjectorProperties } from '../../../src/mixins/Projector';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';

class TestWidget extends ProjectorMixin(WidgetBase)<ProjectorProperties> {}

registerSuite({
	name: 'mixins/projectorMixin',

	'render throws an error for null result'() {
		const projector = new class extends TestWidget {
			render() {
				return null;
			}
		}({});

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render throws an error for string result'() {
		const projector = new class extends TestWidget {
			render() {
				return '';
			}
		}({});

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render does not attach after create when there are no properties'() {
		const projector = new class extends TestWidget {
			render() {
				return v('div', <any> null);
			}

			__render__() {
				const results: any = super.__render__();
				results.properties = undefined;
				return results;
			}
		}({});

		const vnode  = <any> projector.__render__();
		assert.isUndefined(vnode.properties);
	},
	'attach to projector': {
		'append'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = new TestWidget({});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.append().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
				assert.strictEqual(child.tagName.toLowerCase(), 'div');
				assert.strictEqual(( <HTMLElement> child.firstChild).tagName.toLowerCase(), 'h2');
			});
		},
		'replace'() {
			const projector = new class extends TestWidget {
				render() {
					return v('body', this.children);
				}
			}({});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.replace().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			});
		},
		'merge'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = new TestWidget({});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.merge().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			});
		}
	},
	'attach event'() {
		const root = document.createElement('div');
		document.body.appendChild(root);
		const projector = new TestWidget({ root });

		projector.setChildren([ v('h2', [ 'foo' ] ) ]);

		assert.strictEqual(root.childNodes.length, 0, 'there should be no children');
		let eventFired = false;
		projector.on('projector:attached', () => {
			eventFired = true;
			assert.strictEqual(root.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> root.firstChild).tagName.toLowerCase(), 'div');
			assert.strictEqual((<HTMLElement> root.firstChild).innerHTML, '<h2>foo</h2>');
		});
		return projector.append().then(() => {
			assert.isTrue(eventFired);
		});
	},
	'get root'() {
		const projector = new TestWidget({});
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'get projector state'() {
		const projector = new TestWidget({});

		assert.equal(projector.projectorState, ProjectorState.Detached);
		return projector.append().then(() => {
			assert.equal(projector.projectorState, ProjectorState.Attached);
			projector.destroy();
			assert.equal(projector.projectorState, ProjectorState.Detached);
		});

	},
	'destroy'() {
		const projector: any = new TestWidget({});
		const maquetteProjectorStopSpy = spy(projector.projector, 'stop');
		const maquetteProjectorDetachSpy = spy(projector.projector, 'detach');

		return projector.append().then(() => {
			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);

			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);
		});

	},
	'invalidate on setting children'() {
		const projector = new TestWidget({});
		let called = false;

		projector.on('invalidated', () => {
			called = true;
		});

		projector.setChildren([ v('div') ]);

		assert.isTrue(called);
	},
	'invalidate before attached'() {
		const projector: any = new TestWidget({});
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		projector.invalidate();

		assert.isFalse(maquetteProjectorSpy.called);
		assert.isFalse(called);
	},
	'invalidate after attached'() {
		const projector: any = new TestWidget({});
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		return projector.append().then(() => {
			projector.invalidate();
			assert.isTrue(maquetteProjectorSpy.called);
			assert.isTrue(called);
		});
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = new TestWidget({ root });
		const promise = projector.append();
		assert.strictEqual(promise, projector.append(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = new TestWidget({});
		const div = document.createElement('div');
		projector.root = div;
		return projector.append().then((handle) => {
			assert.throws(() => {
				projector.root = document.body;
			}, Error, 'already attached');
		});
	}
});
