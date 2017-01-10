import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createRadio from '../../../../src/components/radio/createRadio';

registerSuite({
	name: 'createRadio',
		construction() {
		const radio = createRadio({
			properties: {
				id: 'foo',
				name: 'bar',
				value: 'baz'
			}
		});

		assert.strictEqual(radio.state.id, 'foo');
		assert.strictEqual(radio.state.name, 'bar');
		assert.strictEqual(radio.value, 'baz');
	},
	render() {
		const radio = createRadio({
			properties: {
				id: 'foo',
				name: 'bar',
				value: 'baz'
			}
		});
		let vnode = <VNode> radio.__render__();
		let inputEl = vnode.children![0];

		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(inputEl.vnodeSelector, 'input');
		assert.strictEqual(inputEl.properties!.type, 'radio');
		assert.strictEqual(inputEl.properties!.name, 'bar');
		assert.strictEqual(inputEl.properties!.value, 'baz');

		radio.setState({ checked: true });
		vnode = <VNode> radio.__render__();
		inputEl = vnode.children![0];

		assert.strictEqual(inputEl.properties!.checked, 'true');
	}
});
