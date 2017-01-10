import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createTextInput from '../../../../src/components/textinput/createTextInput';

registerSuite({
	name: 'createTextInput',
	construction() {
		const textInput = createTextInput({
			properties: {
				id: 'foo',
				name: 'bar',
				placeholder: 'baz'
			}
		});
		assert.strictEqual(textInput.properties.id, 'foo');
		assert.strictEqual(textInput.properties.name, 'bar');
		assert.strictEqual(textInput.properties.placeholder, 'baz');
	},
	render() {
		const textInput = createTextInput({
			properties: {
				id: 'foo',
				name: 'bar',
				placeholder: 'baz'
			}
		});
		const vnode = <VNode> textInput.__render__();
		const inputEl = vnode.children![0];

		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(inputEl.vnodeSelector, 'input');
		assert.strictEqual(inputEl.properties!.type, 'text');
		assert.strictEqual(inputEl.properties!.name, 'bar');
		assert.strictEqual(inputEl.properties!.placeholder, 'baz');
	},
	nodeAttributes() {
		const textInput = createTextInput();
		const nodeAttributes = textInput.getNodeAttributes();
		assert.equal(nodeAttributes.oninput, textInput.onInput);
	},
	onInput() {
		const textInput = createTextInput();
		textInput.onInput(<any> { target: { value: 'hello world' } });
		assert.equal(textInput.value, 'hello world');
	},
	'input types'() {
		const emailInput = createTextInput({
			properties: {
				type: 'email'
			}
		});
		const vnode = <VNode> emailInput.__render__();
		const inputEl = vnode.children![0];

		assert.strictEqual(inputEl.vnodeSelector, 'input');
		assert.strictEqual(inputEl.properties!.type, 'email');
	}
});
