import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
import createButton from '../../../../src/components/button/createButton';

registerSuite({
	name: 'createButton',
	construction() {
		const button = createButton({
			properties: {
				id: 'foo',
				content: 'bar',
				name: 'baz'
			}
		});
		assert.strictEqual(button.properties.id, 'foo');
		assert.strictEqual(button.properties.content, 'bar');
		assert.strictEqual(button.properties.name, 'baz');
	},
	render() {
		const button = createButton({
			properties: {
				id: 'foo',
				content: 'bar',
				name: 'baz'
			}
		});
		const vnode = <VNode> button.__render__();
		assert.strictEqual(vnode.vnodeSelector, 'button');
		assert.strictEqual(vnode.properties!.innerHTML, 'bar');
		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(vnode.properties!['name'], 'baz');
		assert.lengthOf(vnode.children, 0);
	},
	'button without text'() {
		const button = createButton({
			properties: {
				id: 'foo',
				name: 'baz'
			}
		});
		const vnode = <VNode> button.__render__();
		assert.isUndefined(vnode.properties!.innerHTML);
	},
	disable() {
		const button = createButton({
			properties: {
				id: 'foo',
				content: 'bar',
				name: 'baz'
			}
		});
		let vnode = <VNode> button.__render__();
		button.setState({
			disabled: true
		});
		vnode = <VNode> button.__render__();
		assert.isTrue(vnode.properties!['disabled']);
	},
	onClick() {
		let onClickCount = 0;
		const onClick = function() {
			onClickCount++;
		};
		const button = createButton({ properties: { onClick }});
		button.onClick();
		assert.equal(onClickCount, 1);
		button.setProperties({});
		button.onClick();
		assert.equal(onClickCount, 1);
	}
});
