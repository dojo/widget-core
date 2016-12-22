import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState, WidgetProperties } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

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
			instance.own(instance.on('input', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	});

export default createRadio;
