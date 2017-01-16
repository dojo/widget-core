import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
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
			type: 'checkbox',
			onChange(this: Checkbox, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Checkbox): VNodeProperties {
					return { onchange: this.onChange };
				}
			]
		}
	});

export default createCheckbox;
