import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, DNode, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinProperties } from '../../mixins/createFormFieldMixin';
import { v } from '../../d';

export interface SelectInputProperties extends WidgetProperties, FormFieldMixinProperties {
	options?: {
		[key: string]: string
	};
}

export type SelectInput = Widget<SelectInputProperties> & FormFieldMixin<string, any> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface SelectInputFactory extends WidgetFactory<SelectInput, SelectInputProperties> { }

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
				const { options = {} } = this.properties;
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
		initialize(instance) {
			let { options = {} } = instance.properties;

			// select first option by default
			if (Object.keys(options).length > 0) {
				instance.value = instance.value || Object.keys(options)[0];
			}
		}
	});

export default createSelectInput;
