import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMapMixin from 'src/mixins/createParentMapMixin';
import createRenderable, { Renderable } from 'src/mixins/createRenderable';
import { Child } from 'src/mixins/interfaces';
import { Map } from 'immutable/immutable';
import { from as arrayFrom } from 'dojo-core/array';

type RenderableWithID = Renderable & { id?: string; };

registerSuite({
	name: 'mixins/createParentMapMixin',
	creation() {
		const parent = createParentMapMixin();
		assert.instanceOf(parent.children, Map);
		assert.isFunction(parent.append);
		assert.isFunction(parent.merge);
		assert.isFunction(parent.clear);
	},
	'children at creation'() {
		const widget1 = createRenderable();
		const widget2 = createRenderable();
		const parent = createParentMapMixin({
			children: {
				widget1,
				widget2
			}
		});
		assert.strictEqual(parent.children.get('widget1'), widget1);
		assert.strictEqual(parent.children.get('widget2'), widget2);
	},
	'append()': {
		'child without ID'() {
			const parent = createParentMapMixin();
			parent.append(createRenderable({ tagName: 'foo' }));
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'child0' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo' ]);
		},
		'array without IDs'() {
			const parent = createParentMapMixin();
			parent.append([
				createRenderable({ tagName: 'foo' }),
				createRenderable({ tagName: 'bar' }),
				createRenderable({ tagName: 'baz' })
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'child0', 'child1', 'child2' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo', 'bar', 'baz' ]);
		},
		'child with ID'() {
			const parent = createParentMapMixin();
			const widget1: RenderableWithID = createRenderable();
			widget1.id = 'widget1';
			parent.append(widget1);
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1' ]);
		},
		'array with IDs'() {
			const parent = createParentMapMixin();
			const widget1: RenderableWithID = createRenderable();
			widget1.id = 'widget1';
			const widget2: RenderableWithID = createRenderable();
			widget2.id = 'widget2';
			const widget3: RenderableWithID = createRenderable();
			widget3.id = 'widget3';
			parent.append([
				widget1,
				widget2,
				widget3
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1', 'widget2', 'widget3' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1', 'widget2', 'widget3' ]);
		}
	}
});
