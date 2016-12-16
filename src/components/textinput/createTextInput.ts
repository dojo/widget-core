import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin } from '../../mixins/createFormFieldMixin';
import { DNode } from '../../interfaces';
import { v } from '../../d';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export interface TextInputProperties extends WidgetProperties {
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
			tagName: 'label',
			onInput(this: TextInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: TextInput): VNodeProperties {
					return { oninput: this.onInput };
				}
			],
			getChildrenNodes: function(this: TextInput): DNode[] {
				const { placeholder } = this.properties;
				const { content, hidden, position } = this.label;

				const children = [
					v('input', {
						type: this.type || 'text',
						placeholder
					}),
					v('span', {
						innerHTML: content,
						classes: { 'visually-hidden': hidden }
					})
				];

				if (position === 'above') {
					children.reverse();
				}

				return children;
			}
		}
	});

export default createTextInput;
