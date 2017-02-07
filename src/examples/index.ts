import { WidgetBase } from './../WidgetBase';
import { ProjectorMixin } from './../mixins/ProjectorMixin';
import { Themeable, ThemeableProperties } from './../mixins/ThemeableMixin';
import { I18nMixin, I18nProperties } from './../mixins/I18nMixin';
import { Stateful } from './../mixins/StatefulMixin';
import { v } from './../d';
import * as css from './styles/button.css';

interface ButtonProperties extends ThemeableProperties, I18nProperties {
	myProperty: string;
}

export class Button extends Stateful(I18nMixin(Themeable(WidgetBase))) {

	properties: ButtonProperties;

	constructor(options: any) {
		options.baseClasses = css;
		super(options);
	}

	onClick() {
		let { state: { counter } = { counter: 0 } }  = this;
		counter++;
		this.setState({ counter });
	}

	render() {
		const { state: { counter } = { counter: 0 } }  = this;
		const messages = this.localizeBundle({
			bundlePath: '',
			messages: {
				click: 'Click Me'
			}
		});

		return v('div', [
			v('button', { type: 'button', innerHTML: messages.click, classes: this.classes(css.myClass).get() }),
			v('span', { innerHTML: counter, classes: this.classes(css.myClass).get() })
		]);
	}
}

const projector = new (ProjectorMixin(Button))({});

projector.append();
