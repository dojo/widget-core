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
		const formfield = formLabelWidget.override({
			classes: ['foo', 'bar']
		})();
		formfield.setProperties({
			label: 'baz'
		});
		const vnode = <VNode> formfield.__render__();

		assert.strictEqual(vnode.vnodeSelector, 'label.foo.bar');
	},
	getFormFieldNodeAttributes() {
		const formfield = formLabelWidget({
			tagName: 'input',
			properties: {
				value: 'foo',
				randomProp: 'qux'
			}
		});

		let vnode = <VNode> formfield.__render__();
		let inputfield = vnode.children![0];

		assert.strictEqual(inputfield.vnodeSelector, 'input');
		assert.strictEqual(inputfield.properties!['value'], 'foo');
		assert.isUndefined(inputfield.properties!['randomProp']);

		formfield.setProperties({
			value: 'bar',
			name: 'baz'
		});
		vnode = <VNode> formfield.__render__();
		inputfield = vnode.children![0];

		assert.strictEqual(inputfield.properties!['value'], 'bar');
		assert.strictEqual(inputfield.properties!['name'], 'baz');

		formfield.setProperties({
			readonly: true,
			invalid: false,
			disabled: true,
			descriptionID: 'qux'
		});
		vnode = <VNode> formfield.__render__();
		inputfield = vnode.children![0];

		assert.isTrue(inputfield.properties!['aria-readonly']);
		assert.strictEqual(inputfield.properties!['readonly'], 'readonly');
		assert.isFalse(inputfield.properties!['aria-invalid']);
		assert.isTrue(inputfield.properties!['disabled']);
		assert.strictEqual(inputfield.properties!['aria-describedby'], 'qux');
	},
	'label': {
		'string label'() {
			const formfield = formLabelWidget({
				properties: {
					label: 'bar'
				}
			});
			const vnode = <VNode> formfield.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![1].properties!.innerHTML, 'bar');
		},
		'label options'() {
			const formfield = formLabelWidget({
				properties: {
					label: {
						content: 'bar',
						position: 'above',
						hidden: true
					}
				}
			});
			const vnode = <VNode> formfield.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![0].properties!.innerHTML, 'bar');
			assert.isTrue(vnode.children![0].properties!.classes!['visually-hidden']);
		},
		'no label'() {
			const formfield = formLabelWidget();
			const vnode = <VNode> formfield.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 1);
		}
	}
});
