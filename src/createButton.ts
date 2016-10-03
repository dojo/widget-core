import { ComposeFactory } from 'dojo-compose/compose';
import createRenderMixin, { RenderMixinState, RenderMixinOptions, RenderMixin } from './mixins/createRenderMixin';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';

export interface ButtonState extends RenderMixinState, FormFieldMixinState<string> { }

export interface ButtonOptions extends VNodeEventedOptions, RenderMixinOptions<ButtonState>, FormFieldMixinOptions<any, ButtonState> { }

export type Button = RenderMixin<ButtonState> & FormFieldMixin<string, ButtonState> & VNodeEvented;

export interface ButtonFactory extends ComposeFactory<Button, ButtonOptions> { }

const createButton: ButtonFactory = createRenderMixin
	.mixin(createFormFieldMixin)
	.mixin(createVNodeEvented)
	.extend('Button', {
		tagName: 'button',
		type: 'button'
	});

export default createButton;
