import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';

export type TextareaProperties = WidgetProperties & FormLabelMixinProperties;

export type Textarea = Widget<TextareaProperties> & FormLabelMixin & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextareaFactory extends WidgetFactory<Textarea, TextareaProperties> { }

const createTextarea: TextareaFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			tagName: 'textarea',
			onInput(this: Textarea, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Textarea): VNodeProperties {
					return { oninput: this.onInput };
				}
			]
		}
	});

export default createTextarea;
