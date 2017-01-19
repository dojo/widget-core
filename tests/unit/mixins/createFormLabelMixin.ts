import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
import createWidgetBase from '../../../src/createWidgetBase';
import createFormLabelMixin from '../../../src/mixins/createFormLabelMixin';

const formLabelWidget = createWidgetBase
	.mixin(createFormLabelMixin);

registerSuite({
	name: 'mixins/createFormLabelMixin',
	construction() {
		const formLabelMixin = createFormLabelMixin();

		assert.isDefined(formLabelMixin);
	},
	getNode() {
		const formField = formLabelWidget.override({
			classes: ['foo', 'bar']
		})();
		formField.setProperties({
			label: 'baz'
		});
		const vnode = <VNode> formField.__render__();

		assert.strictEqual(vnode.vnodeSelector, 'label.foo.bar');
	},
	getFormFieldNodeAttributes() {
		const formField = formLabelWidget({
			tagName: 'input',
			properties: {
				value: 'foo',
				maxLength: 100,
				randomProp: 'qux'
			}
		});

		let vnode = <VNode> formField.__render__();
		let inputField = vnode.children![0];

		assert.strictEqual(inputField.vnodeSelector, 'input');
		assert.strictEqual(inputField.properties!['value'], 'foo');
		assert.strictEqual(inputField.properties!['maxlength'], '100');
		assert.isUndefined(inputField.properties!['randomProp']);

		formField.setProperties({
			value: 'bar',
			name: 'baz'
		});
		vnode = <VNode> formField.__render__();
		inputField = vnode.children![0];

		assert.strictEqual(inputField.properties!['value'], 'bar');
		assert.strictEqual(inputField.properties!['name'], 'baz');

		formField.setProperties({
			readOnly: true,
			invalid: false,
			disabled: true,
			describedBy: 'qux'
		});
		vnode = <VNode> formField.__render__();
		inputField = vnode.children![0];

		assert.isTrue(inputField.properties!['aria-readonly']);
		assert.strictEqual(inputField.properties!['readonly'], 'readonly');
		assert.isFalse(inputField.properties!['aria-invalid']);
		assert.isTrue(inputField.properties!['disabled']);
		assert.strictEqual(inputField.properties!['aria-describedby'], 'qux');
	},
	'label': {
		'string label'() {
			const formField = formLabelWidget({
				properties: {
					label: 'bar'
				}
			});
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![1].properties!.innerHTML, 'bar');
		},
		'label options'() {
			const formField = formLabelWidget({
				properties: {
					label: {
						content: 'bar',
						position: 'before',
						hidden: true
					}
				}
			});
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![0].properties!.innerHTML, 'bar');
			assert.isTrue(vnode.children![0].properties!.classes!['visually-hidden']);
		},
		'no label'() {
			const formField = formLabelWidget();
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 1);
		}
	}
});
