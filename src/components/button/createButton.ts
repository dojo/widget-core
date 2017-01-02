import { VNodeProperties } from '@dojo/interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';

export interface ButtonProperties extends WidgetProperties {
	content?: string;
	name?: string;
	onClick?(event: MouseEvent): void;
}

export type Button = Widget<ButtonProperties> & {
	onClick(event?: MouseEvent): void;
};

export interface ButtonFactory extends WidgetFactory<Button, ButtonProperties> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin({
		mixin: {
			onClick(this: Button, event: MouseEvent) {
				this.properties.onClick && this.properties.onClick(event);
			},
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					return {
						innerHTML: this.properties['content'],
						type: this.properties['type'],
						onclick: this.onClick
					};
				}
			],
			tagName: 'button'
		}
	});

export default createButton;
