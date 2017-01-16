import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';

export type CheckboxProperties = WidgetProperties & FormLabelMixinProperties;

export type Checkbox = Widget<CheckboxProperties> & FormLabelMixin & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface CheckboxFactory extends WidgetFactory<Checkbox, CheckboxProperties> { }

const createCheckbox: CheckboxFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			onChange(this: Checkbox, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Checkbox): VNodeProperties {
					return { onchange: this.onChange };
				}
			]
		},
		aspectAdvice: {
			before: {
				onPropertiesChanged(this: Checkbox, properties: CheckboxProperties, changedPropertyKeys: string[]) {
					properties.type = 'checkbox';
					return [properties, changedPropertyKeys];
				}
			}
		}
	});

export default createCheckbox;
