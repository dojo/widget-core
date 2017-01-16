import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
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
	getFormFieldNodeAttributes() {
		const formfield = formLabelWidget({
			type: 'foo',
			tagName: 'input',
			randomProp: 'qux'
		});

		formfield.setState(<any> { value: 'bar', name: 'baz' });

		let vnode = <VNode> formfield.__render__();
		let inputfield = vnode.children![0];

		assert.strictEqual(inputfield.properties!['type'], 'foo');
		assert.strictEqual(inputfield.properties!['value'], 'bar');
		assert.strictEqual(inputfield.properties!['name'], 'baz');
		assert.isUndefined(inputfield.properties!['randomProp']);

		formfield.setState(<any> { disabled: true });
		vnode = <VNode> formfield.__render__();
		inputfield = vnode.children![0];

		assert.strictEqual(inputfield.properties!['type'], 'foo');
		assert.strictEqual(inputfield.properties!['value'], 'bar');
		assert.strictEqual(inputfield.properties!['name'], 'baz');
		assert.isTrue(inputfield.properties!['disabled']);

		formfield.setState(<any> {
			readonly: true,
			invalid: false,
			descriptionID: 'qux'
		});
		vnode = <VNode> formfield.__render__();
		inputfield = vnode.children![0];

		assert.isTrue(inputfield.properties!['aria-readonly']);
		assert.strictEqual(inputfield.properties!['readonly'], 'readonly');
		assert.isFalse(inputfield.properties!['aria-invalid']);
		assert.strictEqual(inputfield.properties!['aria-describedby'], 'qux');
	},
	'label': {
		'string label'() {
			const formfield = formLabelWidget({
					label: 'bar'
			});
			const vnode = <VNode> formfield.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![1].properties!.innerHTML, 'bar');
		},
		'label options'() {
			const formfield = formLabelWidget({
				label: {
					content: 'bar',
					position: 'above',
					hidden: true
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
