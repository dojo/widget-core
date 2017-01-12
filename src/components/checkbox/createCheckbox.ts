import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinProperties } from '../../mixins/createFormFieldMixin';

export type CheckboxProperties = WidgetProperties & FormFieldMixinProperties;

export type Checkbox = Widget<CheckboxProperties> & FormFieldMixin<string, any> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface CheckboxFactory extends WidgetFactory<Checkbox, CheckboxProperties> { }

const createCheckbox: CheckboxFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'checkbox',
			onChange(this: Checkbox, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Checkbox): VNodeProperties {
					return { onchange: this.onChange };
				}
			]
		}
	});

export default createCheckbox;
