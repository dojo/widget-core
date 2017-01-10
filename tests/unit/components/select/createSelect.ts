import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createSelect from '../../../../src/components/select/createSelect';

registerSuite({
	name: 'createSelect',
		construction() {
		const select = createSelect({
			properties: {
				id: 'foo',
				name: 'bar'
			},
			options: {
				'option1': 'First',
				'option2': 'Second'
			}
		});

		assert.strictEqual(select.state.id, 'foo');
		assert.strictEqual(select.state.name, 'bar');
		assert.lengthOf(Object.keys(select.options), 2);
		assert.strictEqual(select.value, 'option1');
	},
	render() {
		const select = createSelect({
			options: {
				'option1': 'First',
				'option2': 'Second'
			}
		});
		const vnode = <VNode> select.__render__();
		const selectEl = vnode.children![0];

		assert.strictEqual(selectEl.vnodeSelector, 'select');
		assert.lengthOf(selectEl.children, 2);
		assert.strictEqual(selectEl.children![0].properties!.innerHTML, 'First');
		assert.strictEqual(selectEl.children![0].properties!.value, 'option1');
		assert.strictEqual(selectEl.children![1].properties!.innerHTML, 'Second');
		assert.strictEqual(selectEl.children![1].properties!.value, 'option2');
	}
});
