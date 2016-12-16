import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createFormFieldMixin, { ValueChangeEvent } from '../../../src/mixins/createFormFieldMixin';

registerSuite({
	name: 'mixins/createFormFieldMixin',
	construction() {
		const formfield = createFormFieldMixin({
			type: 'foo'
		});

		formfield.state = {
			name: 'foo',
			value: 2,
			disabled: false
		};
		assert.strictEqual(formfield.value, '2');
		assert.strictEqual(formfield.state.value, 2);
		assert.strictEqual(formfield.type, 'foo');
		assert.strictEqual(formfield.state.name, 'foo');
		assert.isFalse(formfield.state.disabled);
	},
	'.value'() {
		const value = { foo: 'foo' };
		const formfield = createFormFieldMixin({});

		formfield.state = { value };

		assert.strictEqual(formfield.value, '{"foo":"foo"}');
		formfield.state = { value: { foo: 'bar' } };
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
	'getNodeAttributes()': {
		'truthy value'() {
			const formfield = createFormFieldMixin({
				type: 'foo'
			});

			formfield.state = { value: 'bar', name: 'baz' };

			let nodeAttributes = formfield.nodeAttributes[0].call(formfield, {});
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.isFalse(nodeAttributes['disabled']);

			formfield.state = { disabled: true };

			nodeAttributes = formfield.nodeAttributes[0].call(formfield, {});
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.isTrue(nodeAttributes['disabled']);

			formfield.state = { disabled: false };

			nodeAttributes = formfield.nodeAttributes[0].call(formfield, {});
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.isFalse(nodeAttributes['disabled']);
		},
		'falsey value'() {
			const formfield = createFormFieldMixin({
				type: 'foo'
			});

			formfield.state = {
				value: ''
			};

			let nodeAttributes = formfield.nodeAttributes[0].call(formfield, {});
			assert.strictEqual(nodeAttributes['value'], '');

			formfield.state = {
				value: undefined
			};

			nodeAttributes = formfield.nodeAttributes[0].call(formfield, {});
			assert.isUndefined(formfield.state.value);
			assert.strictEqual(nodeAttributes['value'], '');
		}
	}
});
