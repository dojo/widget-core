import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
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

		assert.strictEqual(checkbox.properties!.id, 'foo');
		assert.strictEqual(checkbox.properties!.name, 'bar');
		assert.strictEqual(checkbox.properties!.value, 'baz');
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

		checkbox.setProperties({ checked: true });
		vnode = <VNode> checkbox.__render__();
		inputEl = vnode.children![0];

		assert.strictEqual(inputEl.properties!.checked, 'true');
	},
	nodeAttributes() {
		const checkbox = createCheckbox();
		const nodeAttributes = checkbox.getNodeAttributes();
		assert.equal(nodeAttributes.onchange, checkbox.onChange);
	},
	onInput() {
		const checkbox = createCheckbox();
		checkbox.onChange(<any> { target: { value: 'hello world' } });
		assert.equal(checkbox.properties!.value, 'hello world');
	}
});
