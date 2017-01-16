import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, DNode, TypedTargetEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';
import { v } from '../../d';

export interface SelectInputProperties extends WidgetProperties, FormLabelMixinProperties {
	options?: {
		[key: string]: string
	};
}

export type SelectInput = Widget<SelectInputProperties> & FormLabelMixin & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface SelectInputFactory extends WidgetFactory<SelectInput, SelectInputProperties> { }

const createSelectInput: SelectInputFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			tagName: 'select',
			onChange(this: SelectInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
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
		aspectAdvice: {
			before: {
				onPropertiesChanged(this: SelectInput, properties: SelectInputProperties, changedPropertyKeys: string[]) {
					const { options = {} } = properties;

					if ( !properties.value && Object.keys(options).length > 0 ) {
						properties.value = Object.keys(options)[0];
					}

					return [properties, changedPropertyKeys];
				}
			}
		}
	});

export default createSelectInput;
