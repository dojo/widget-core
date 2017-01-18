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
				type: 'baz'
			}
		});
		assert.strictEqual(button.properties.id, 'foo');
		assert.strictEqual(button.properties.content, 'bar');
		assert.strictEqual(button.type, 'baz');
	},
	render() {
		const button = createButton({
			properties: {
				id: 'foo',
				content: 'bar',
				name: 'baz'
			}
		});
		let vnode = <VNode> button.__render__();
		assert.strictEqual(vnode.vnodeSelector, 'button');
		assert.strictEqual(vnode.properties!.innerHTML, 'bar');
		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(vnode.properties!['name'], 'baz');
		assert.lengthOf(vnode.children, 0);

		button.setProperties({
			type: 'submit'
		});
		vnode = <VNode> button.__render__();
		assert.strictEqual(button.type, 'submit');
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
		const button = createButton({});
		button.setProperties({
			disabled: true
		});
		const vnode = <VNode> button.__render__();

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
