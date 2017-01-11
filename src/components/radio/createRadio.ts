import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export type RadioState = WidgetState & FormFieldMixinState<string>;

export type RadioOptions = WidgetOptions<RadioState, WidgetProperties> & FormFieldMixinOptions<string, RadioState>;

export type Radio = Widget<RadioState, WidgetProperties> & FormFieldMixin<string, RadioState>;

export interface RadioFactory extends ComposeFactory<Radio, RadioOptions> { }

const createRadio: RadioFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'radio'
		},
		initialize(instance, options: RadioOptions) {
			instance.own(instance.on('change', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	});

export default createRadio;
