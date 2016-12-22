import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, DNode } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';
import { v } from '../../d';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export type SelectInputState = WidgetState & FormFieldMixinState<string>;

export type SelectInputOptions = WidgetOptions<SelectInputState, WidgetProperties> & FormFieldMixinOptions<string, SelectInputState> & {
	options: {
		[key: string]: string
	}
};

export type SelectInput = Widget<SelectInputState, WidgetProperties> & FormFieldMixin<string, SelectInputState> & {
	options: {
		[key: string]: string
	}
};

export interface SelectInputFactory extends ComposeFactory<SelectInput, SelectInputOptions> { }

const createSelectInput: SelectInputFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'select',

			getChildrenNodes: function(this: SelectInput): DNode[] {
				const { options } = this;
				const optionNodes = [];
				let key;

				for (key in options) {
					optionNodes.push(v('option', {
						value: key,
						innerHTML: options[key]
					}));
				}

				return optionNodes;
			},

			options: {}
		},
		initialize(instance, { options }: SelectInputOptions) {
			instance.options = options;

			// select first option
			instance.value = Object.keys(options)[0];

			instance.own(instance.on('input', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	});

export default createSelectInput;
