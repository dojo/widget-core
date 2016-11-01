import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { before } from 'dojo-core/aspect';
import { createProjector } from '../../../src/projector';

registerSuite({
	name: 'bases/createWidgetBase',
	api() {
		const widgetBase = createWidgetBase();
		assert(widgetBase);
		assert.isFunction(widgetBase.getNodeAttributes);
		assert.isFunction(widgetBase.getChildrenNodes);
		assert.isFunction(widgetBase.invalidate);
	},
	tagName: {
		'Applies default tagName'() {
			const widget = createWidgetBase();
			assert.deepEqual(widget.tagName, 'div');
		},
		'Applies overridden tagName'() {
			const widget = createWidgetBase.extend({ tagName: 'header' })();
			assert.deepEqual(widget.tagName, 'header');
		}
	},
	'getNodeAttributes()'() {
		const widgetBase = createWidgetBase({
			state: { id: 'foo', classes: [ 'bar' ] }
		});

		let nodeAttributes = widgetBase.getNodeAttributes();
		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 4);

		widgetBase.setState({ 'id': 'foo', classes: ['foo'] });

		nodeAttributes = widgetBase.getNodeAttributes();

		assert.deepEqual(nodeAttributes.classes, { foo: true, bar: false });
	},
	'getChildrenNodes()'() {
		const widgetBase = createWidgetBase();
		assert.deepEqual(widgetBase.getChildrenNodes(), []);
	},
	'render()/invalidate()'() {
		const widgetBase = createWidgetBase({
			state: { id: 'foo', label: 'foo' }
		});
		const result1 = widgetBase.render();
		const result2 = widgetBase.render();
		widgetBase.invalidate();
		widgetBase.invalidate();
		widgetBase.setState({});
		const result3 = widgetBase.render();
		const result4 = widgetBase.render();
		assert.strictEqual(result1, result2);
		assert.strictEqual(result3, result4);
		assert.notStrictEqual(result1, result3);
		assert.notStrictEqual(result2, result4);
		assert.deepEqual(result1, result3);
		assert.deepEqual(result2, result4);
		assert.strictEqual(result1.vnodeSelector, 'div');
		assert.strictEqual(result1.properties!['data-widget-id'], 'foo');
	},
	'id': {
		'in options'() {
			const widgetBase = createWidgetBase({
				id: 'foo'
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'in state'() {
			const widgetBase = createWidgetBase({
				state: {
					id: 'foo'
				}
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'in options and state'() {
			const widgetBase = createWidgetBase({
				id: 'foo',
				state: {
					id: 'bar'
				}
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'not in options or state'() {
			const widgetBase = createWidgetBase();

			assert.strictEqual(widgetBase.id, '');
		},
		'is read only'() {
			const widgetBase = createWidgetBase();
			assert.throws(() => {
				(<any> widgetBase).id = 'foo'; /* .id is readonly, so TypeScript will prevent mutation */
			});
		}
	},
	'invalidate invalidates parent projector'() {
		let count = 0;
		const projector = createProjector({});
		before(projector, 'invalidate', () => {
			count++;
		});
		projector.attach();
		const widgetBase = createWidgetBase();
		(<any> widgetBase).parent = projector;
		widgetBase.invalidate();
		assert.strictEqual(count, 0);
		widgetBase.render();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	},
	'invalidate invalidates parent widget'() {
		let count = 0;
		const createParent = createWidgetBase.before('invalidate', () => {
			count++;
		});
		const parent = createParent();
		const widgetBase = createWidgetBase();
		(<any> widgetBase).parent = <any> parent; /* trick typescript, becuase this isn't a real parent */
		widgetBase.invalidate();
		assert.strictEqual(count, 0);
		widgetBase.render();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	}
});
