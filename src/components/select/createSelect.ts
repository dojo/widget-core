import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, DNode, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';
import { v } from '../../d';

export interface SelectInputState extends WidgetState, FormFieldMixinState<string> {
	options?: {
		[key: string]: string
	};
};

export interface SelectInputProperties extends WidgetProperties {
	options?: {
		[key: string]: string
	};
}

export type SelectInputOptions = WidgetOptions<SelectInputState, SelectInputProperties> & FormFieldMixinOptions<string, SelectInputState>;

export type SelectInput = Widget<SelectInputState, SelectInputProperties> & FormFieldMixin<string, SelectInputState> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface SelectInputFactory extends ComposeFactory<SelectInput, SelectInputOptions> { }

const createSelectInput: SelectInputFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'select',
			onChange(this: SelectInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: SelectInput): VNodeProperties {
					return { onchange: this.onChange };
				}
			],
			getChildrenNodes: function(this: SelectInput): DNode[] {
				const { options = {} } = this.state;
				const optionNodes = [];
				let key;

				for (key in options) {
					optionNodes.push(v('option', {
						value: key,
						innerHTML: options[key]
					}));
				}

				return optionNodes;
			}
		},
		initialize(instance, selectOptions: SelectInputOptions) {
			let { options } = instance.state;

			if (!options) {
				options = {};
				instance.setState({ options });
			}

			// select first option by default
			if (Object.keys(options).length > 0) {
				instance.value = instance.value || Object.keys(options)[0];
			}
		}
	});

export default createSelectInput;
