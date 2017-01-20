import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
import createTextarea from '../../../../src/components/textarea/createTextarea';

registerSuite({
	name: 'createTextarea',
		construction() {
		const textarea = createTextarea({
			properties: {
				id: 'foo',
				name: 'bar',
				placeholder: 'baz'
			}
		});

		assert.strictEqual(textarea.properties.id, 'foo');
		assert.strictEqual(textarea.properties.name, 'bar');
		assert.strictEqual(textarea.properties.placeholder, 'baz');
	},
	render() {
		const textarea = createTextarea({
			properties: {
				id: 'foo',
				name: 'bar',
				maxlength: 200
			}
		});
		const vnode = <VNode> textarea.__render__();
		const inputEl = vnode.children![0];

		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(inputEl.vnodeSelector, 'textarea');
		assert.strictEqual(inputEl.properties!.name, 'bar');
		assert.strictEqual(inputEl.properties!['maxlength'], '200');
	},
	nodeAttributes() {
		const textarea = createTextarea();
		const nodeAttributes = textarea.getNodeAttributes();
		assert.equal(nodeAttributes.oninput, textarea.onInput);
	},
	onInput() {
		const textarea = createTextarea();
		textarea.onInput(<any> { target: { value: 'hello world' } });
		assert.equal(textarea.properties.value, 'hello world');
	}
});
