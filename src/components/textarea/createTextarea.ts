import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinProperties } from '../../mixins/createFormFieldMixin';

export type TextareaProperties = WidgetProperties & FormFieldMixinProperties;

export type Textarea = Widget<TextareaProperties> & FormFieldMixin<string, any> & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextareaFactory extends WidgetFactory<Textarea, TextareaProperties> { }

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
