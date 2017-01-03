import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetProperties, WidgetState } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export interface ButtonState extends WidgetState, FormFieldMixinState<string> {
	label?: string;
}

export interface ButtonProperties extends WidgetProperties {
	label?: string;
	onclick?(event: MouseEvent): void;
}

export interface ButtonOptions extends WidgetOptions<ButtonState, ButtonProperties>, FormFieldMixinOptions<any, ButtonState> { }

export type Button = Widget<ButtonState, ButtonProperties> & FormFieldMixin<string, ButtonState> & {
	onclick(event: MouseEvent): void;
};

export interface ButtonFactory extends ComposeFactory<Button, ButtonOptions> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			onclick(this: Button, event: MouseEvent) {
				if (this.properties.onclick) {
					this.properties.onclick.call(this, event);
				}
			},
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					return { innerHTML: this.state.label, onclick: this.onclick };
				}
			],
			tagName: 'button',
			type: 'button'
		}
	});

export default createButton;
