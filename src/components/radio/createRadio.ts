import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export type RadioState = WidgetState & FormFieldMixinState<string>;

export type RadioOptions = WidgetOptions<RadioState, WidgetProperties> & FormFieldMixinOptions<string, RadioState>;

export type Radio = Widget<RadioState, WidgetProperties> & FormFieldMixin<string, RadioState> & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface RadioFactory extends ComposeFactory<Radio, RadioOptions> { }

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
