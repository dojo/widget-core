import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createButton from '../../../../src/components/button/createButton';

registerSuite({
	name: 'createButton',
	construction() {
		const button = createButton({
			props: {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		assert.strictEqual(button.state.id, 'foo');
		assert.strictEqual(button.state.label, 'bar');
		assert.strictEqual(button.state.name, 'baz');
	},
	render() {
		const button = createButton({
			props: {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		const vnode = <VNode> button.__render__();
		assert.strictEqual(vnode.vnodeSelector, 'button');
		assert.strictEqual(vnode.properties!.innerHTML, 'bar');
		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(vnode.properties!.name, 'baz');
		assert.strictEqual(vnode.properties!['type'], 'button');
		assert.lengthOf(vnode.children, 0);
	},
	disable() {
		const button = createButton({
			props: {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		let vnode = <VNode> button.__render__();
		assert.isFalse(vnode.properties!['disabled']);
		button.state = {
			disabled: true
		};
		vnode = <VNode> button.__render__();
		assert.isTrue(vnode.properties!['disabled']);
	}
});
