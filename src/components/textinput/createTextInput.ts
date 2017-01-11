import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin } from '../../mixins/createFormFieldMixin';
import { DNode } from '../../interfaces';
import { v } from '../../d';

export interface TextInputProperties extends WidgetProperties {
	type?: string;
	name?: string;
	placeholder?: string
}

export type TextInput = Widget<TextInputProperties> & FormFieldMixin<string, any> & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextInputFactory extends WidgetFactory<TextInput, TextInputProperties> { }

const createTextInput: TextInputFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			onInput(this: TextInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: TextInput): VNodeProperties {
					return { oninput: this.onInput };
				}
			],
			tagName: 'input'
		},
		initialize(instance) {
			if ( !instance.properties.type ) {
				instance.setState({ type: 'text' });
			}
		}
	});

export default createTextInput;
