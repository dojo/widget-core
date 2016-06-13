import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMapMixin from 'src/mixins/createParentMapMixin';
import createRenderable from 'src/mixins/createRenderable';
import { Map } from 'immutable/immutable';

registerSuite({
	name: 'mixins/createParentMapMixin',
	creation() {
		const parent = createParentMapMixin();
		assert.instanceOf(parent.children, Map);
		assert.isFunction(parent.add);
		assert.isFunction(parent.append);
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
	}
});
