import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';

export type TextInputProperties = WidgetProperties & FormLabelMixinProperties;

export type TextInput = Widget<TextInputProperties> & FormLabelMixin & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextInputFactory extends WidgetFactory<TextInput, TextInputProperties> { }

const createTextInput: TextInputFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			onInput(this: TextInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: TextInput): VNodeProperties {
					return { oninput: this.onInput };
				}
			],
			tagName: 'input'
		},
		aspectAdvice: {
			before: {
				onPropertiesChanged(this: TextInput, properties: TextInputProperties, changedPropertyKeys: string[]) {
					if ( !properties.type ) {
						properties.type = 'text';
					}

					return [properties, changedPropertyKeys];
				}
			}
		}
	});

export default createTextInput;
