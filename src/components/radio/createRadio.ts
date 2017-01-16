import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory, TypedTargetEvent } from './../../interfaces';
import createFormLabelMixin, { FormLabelMixin, FormLabelMixinProperties } from '../../mixins/createFormLabelMixin';

export type RadioProperties = WidgetProperties & FormLabelMixinProperties;

export type Radio = Widget<RadioProperties> & FormLabelMixin & {
	onChange(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface RadioFactory extends WidgetFactory<Radio, RadioProperties> { }

const createRadio: RadioFactory = createWidgetBase
	.mixin(createFormLabelMixin)
	.mixin({
		mixin: {
			tagName: 'input',
			type: 'radio',
			onChange(this: Radio, event: TypedTargetEvent<HTMLInputElement>) {
				this.properties.value = event.target.value;
			},
			nodeAttributes: [
				function(this: Radio): VNodeProperties {
					return { onchange: this.onChange };
				}
			]
		}
	});

export default createRadio;
