import { VNodeProperties } from '@dojo/interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin } from '../../mixins/createFormFieldMixin';
import themeable, { Themeable } from '../../mixins/themeable';

export interface ButtonProperties extends WidgetProperties {
	label?: string;
	name?: string;
	onClick?(event: MouseEvent): void;
}

const css = {
	hello: 'world'
};

export type Button = Widget<ButtonProperties> & FormFieldMixin<string, any> & Themeable<typeof css> & {
	onClick(event?: MouseEvent): void;
};

export interface ButtonFactory extends WidgetFactory<Button, ButtonProperties> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin(themeable)
	.mixin({
		mixin: {
			onClick(this: Button, event: MouseEvent) {
				this.properties.onClick && this.properties.onClick(event);
			},
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					const themeClasses = this.getTheme();
					// themeClasses. should autocomplete to `hello`.
					return { innerHTML: this.properties.label, onclick: this.onClick };
				}
			],
			tagName: 'button',
			type: 'button',
			baseTheme: css
		}
	});

export default createButton;
