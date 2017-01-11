import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export type TextareaState = WidgetState & FormFieldMixinState<string>;

export type TextareaOptions = WidgetOptions<TextareaState, WidgetProperties> & FormFieldMixinOptions<string, TextareaState>;

export type Textarea = Widget<TextareaState, WidgetProperties> & FormFieldMixin<string, TextareaState> & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextareaFactory extends ComposeFactory<Textarea, TextareaOptions> { }

const createTextarea: TextareaFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'textarea',
			onInput(this: Textarea, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Textarea): VNodeProperties {
					return { oninput: this.onInput };
				}
			]
		}
	});

export default createTextarea;
