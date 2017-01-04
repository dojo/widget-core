import { VNodeProperties } from '@dojo/interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';

export interface ButtonProperties extends WidgetProperties {
	content?: string;
	name?: string;
	onClick?(event: MouseEvent): void;
	type?: string;

	/**
	 * Accessibility attributes
	 */
	descriptionID?: string;
	disabled?: boolean;
	role?: string;
	pressed?: boolean;
	hasPopup?: boolean;
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
						onclick: this.onClick,
						name: this.properties['name'],
						role: this.properties['role'],
						disabled: this.properties.disabled,
						'aria-pressed': this.properties.pressed,
						'aria-describedby': this.properties['descriptionID'],
						'aria-haspopup': this.properties['hasPopup']
					};
				}
			],
			tagName: 'button'
		}
	});

export default createButton;
