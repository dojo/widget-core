import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties, WidgetFactory, TypedTargetEvent, PropertiesChangeEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';

export type TextInputProperties = WidgetProperties & FormLabelMixinProperties;

export type TextInput = Widget<TextInputProperties> & FormLabelMixin & {
	type: string;

	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextInputFactory extends WidgetFactory<TextInput, TextInputProperties> { }

const createTextInput: TextInputFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'text',
			onInput(this: TextInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: TextInput): VNodeProperties {
					return { oninput: this.onInput };
				}
			]
		},
		initialize(instance, options: WidgetOptions<WidgetState, TextInputProperties>) {
			instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<TextInput, TextInputProperties>) => {
				const { type } = evt.properties;
				if (type) {
					instance.type = type;
				}
			}));

			const { properties = {} } = options;
			instance.type = properties.type || 'text';
		}
	});

export default createTextInput;
