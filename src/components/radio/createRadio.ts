import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinProperties } from '../../mixins/createFormFieldMixin';

export type RadioProperties = WidgetProperties & FormFieldMixinProperties;

export type Radio = Widget<RadioProperties> & FormFieldMixin<string, any> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface RadioFactory extends WidgetFactory<Radio, RadioProperties> { }

const createRadio: RadioFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'radio',
			onChange(this: Radio, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Radio): VNodeProperties {
					return { onchange: this.onChange };
				}
			]
		}
	});

export default createRadio;
