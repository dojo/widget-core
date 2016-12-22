import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState, WidgetProperties } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export type TextareaState = WidgetState & FormFieldMixinState<string>;

export type TextareaOptions = WidgetOptions<TextareaState, WidgetProperties> & FormFieldMixinOptions<string, TextareaState>;

export type Textarea = Widget<TextareaState, WidgetProperties> & FormFieldMixin<string, TextareaState>;

export interface TextareaFactory extends ComposeFactory<Textarea, TextareaOptions> { }

const createTextarea: TextareaFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			tagName: 'textarea'
		},
		initialize(instance) {
			instance.own(instance.on('input', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	});

export default createTextarea;
