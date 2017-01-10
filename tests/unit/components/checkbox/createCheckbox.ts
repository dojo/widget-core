import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createCheckbox from '../../../../src/components/checkbox/createCheckbox';

registerSuite({
	name: 'createCheckbox',
		construction() {
		const checkbox = createCheckbox({
			properties: {
				id: 'foo',
				name: 'bar',
				value: 'baz'
			}
		});

		assert.strictEqual(checkbox.state.id, 'foo');
		assert.strictEqual(checkbox.state.name, 'bar');
		assert.strictEqual(checkbox.value, 'baz');
	},
	render() {
		const checkbox = createCheckbox({
			properties: {
				id: 'foo',
				name: 'bar',
				value: 'baz'
			}
		});
		let vnode = <VNode> checkbox.__render__();
		let inputEl = vnode.children![0];

		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(inputEl.vnodeSelector, 'input');
		assert.strictEqual(inputEl.properties!.type, 'checkbox');
		assert.strictEqual(inputEl.properties!.name, 'bar');
		assert.strictEqual(inputEl.properties!.value, 'baz');

		checkbox.setState({ checked: true });
		vnode = <VNode> checkbox.__render__();
		inputEl = vnode.children![0];

		assert.strictEqual(inputEl.properties!.checked, 'true');
	}
});
