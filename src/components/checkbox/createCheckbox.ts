import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export type CheckboxState = WidgetState & FormFieldMixinState<string>;

export type CheckboxOptions = WidgetOptions<CheckboxState, WidgetProperties> & FormFieldMixinOptions<string, CheckboxState>;

export type Checkbox = Widget<CheckboxState, WidgetProperties> & FormFieldMixin<string, CheckboxState> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface CheckboxFactory extends ComposeFactory<Checkbox, CheckboxOptions> { }

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
