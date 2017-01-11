import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export type CheckboxState = WidgetState & FormFieldMixinState<string>;

export type CheckboxOptions = WidgetOptions<CheckboxState, WidgetProperties> & FormFieldMixinOptions<string, CheckboxState>;

export type Checkbox = Widget<CheckboxState, WidgetProperties> & FormFieldMixin<string, CheckboxState>;

export interface CheckboxFactory extends ComposeFactory<Checkbox, CheckboxOptions> { }

const createCheckbox: CheckboxFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'checkbox'
		},
		initialize(instance, options: CheckboxOptions) {
			instance.own(instance.on('change', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	});

export default createCheckbox;
