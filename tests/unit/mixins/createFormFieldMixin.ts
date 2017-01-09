import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createWidgetBase from '../../../src/createWidgetBase';
import createFormFieldMixin, { ValueChangeEvent } from '../../../src/mixins/createFormFieldMixin';

const formFieldWidget = createWidgetBase
	.mixin(createFormFieldMixin);

registerSuite({
	name: 'mixins/createFormFieldMixin',
	construction() {
		const formfield = createFormFieldMixin({
			type: 'foo'
		});

		formfield.setState({
			name: 'foo',
			value: 2,
			disabled: false
		});
		assert.strictEqual(formfield.value, '2');
		assert.strictEqual(formfield.state.value, 2);
		assert.strictEqual(formfield.type, 'foo');
		assert.strictEqual(formfield.state.name, 'foo');
		assert.isFalse(formfield.state.disabled);
	},
	'.value'() {
		const value = { foo: 'foo' };
		const formfield = createFormFieldMixin({});

		formfield.setState({ value });

		assert.strictEqual(formfield.value, '{"foo":"foo"}');
		formfield.setState({ value: { foo: 'bar' } });
		assert.deepEqual(formfield.value, '{"foo":"bar"}');
	},
	'valuechange event': {
		'emitted'() {
			let count = 0;
			const formfield = createFormFieldMixin<string>();
			const handle = formfield.on('valuechange', (event) => {
				count++;
				assert.strictEqual(event.type, 'valuechange');
				assert.strictEqual(event.target, formfield);
				assert.strictEqual(event.oldValue, '');
				assert.strictEqual(event.value, 'bar');
				assert.isFalse(event.defaultPrevented);
				assert.isFunction(event.preventDefault);
			});
			formfield.value = 'bar';
			assert.strictEqual(count, 1);
			formfield.value = 'bar';
			assert.strictEqual(count, 1);
			handle.destroy();
			formfield.value = 'qat';
			assert.strictEqual(count, 1);
		},
		'cancelable'() {
			let count = 0;
			const formfield = createFormFieldMixin({
				value: 1,
				listeners: {
					valuechange(event: ValueChangeEvent<number>) {
						if (isNaN(Number(event.value))) {
							count++;
							event.preventDefault();
						}
					}
				}
			});

			assert.strictEqual(formfield.value, '1');
			assert.strictEqual(formfield.state.value, 1);
			formfield.value = '2';
			assert.strictEqual(formfield.value, '2');
			assert.strictEqual(formfield.state.value, 2);
			assert.strictEqual(count, 0);
			formfield.value = 'foo';
			assert.strictEqual(count, 1);
			assert.strictEqual(formfield.value, '2');
			assert.strictEqual(formfield.state.value, 2);
			formfield.value = '3.141592';
			assert.strictEqual(formfield.value, '3.141592');
			assert.strictEqual(formfield.state.value, 3.141592);
			assert.strictEqual(count, 1);
		}
	},
	'label': {
		'string label'() {
			const formfield = formFieldWidget({
				type: 'foo',
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
			const formfield = formFieldWidget({
				type: 'foo',
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
			const formfield = formFieldWidget({
				type: 'foo'
			});
			const vnode = <VNode> formfield.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 1);
		}
	},
	'getNodeAttributes()': {
		'truthy value'() {
			const formfield = formFieldWidget({
				type: 'foo',
				tagName: 'input'
			});

			formfield.setState({ value: 'bar', name: 'baz' });

			let vnode = <VNode> formfield.__render__();
			let inputfield = vnode.children![0];

			assert.strictEqual(inputfield.properties!['type'], 'foo');
			assert.strictEqual(inputfield.properties!['value'], 'bar');
			assert.strictEqual(inputfield.properties!['name'], 'baz');

			formfield.setState({ disabled: true });
			vnode = <VNode> formfield.__render__();
			inputfield = vnode.children![0];

			assert.strictEqual(inputfield.properties!['type'], 'foo');
			assert.strictEqual(inputfield.properties!['value'], 'bar');
			assert.strictEqual(inputfield.properties!['name'], 'baz');
			assert.isTrue(inputfield.properties!['disabled']);

			formfield.setState({
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
		'falsey value'() {
			const formfield = formFieldWidget({
				type: 'foo'
			});

			formfield.setState({
				value: ''
			});
			let vnode = <VNode> formfield.__render__();
			let inputfield = vnode.children![0];

			assert.strictEqual(inputfield.properties!['value'], '');

			formfield.setState({
				value: undefined
			});
			vnode = <VNode> formfield.__render__();
			inputfield = vnode.children![0];

			assert.isUndefined(formfield.state.value);
			assert.strictEqual(inputfield.properties!['value'], '');
		}
	}
});
