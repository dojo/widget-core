import { WidgetBase } from './../WidgetBase';
import { ProjectorMixin } from './../mixins/ProjectorMixin';
import { Themeable, ThemeableProperties } from './../mixins/ThemeableMixin';
import { StatefulMixin } from './../mixins/StatefulMixin';
import { v } from './../d';
import * as css from './styles/button.css';

interface ButtonProperties extends ThemeableProperties {
	myProperty: string;
}

export class Button extends StatefulMixin(Themeable(WidgetBase)) {

	properties: ButtonProperties;

	constructor(options: any) {
		options.baseClasses = css;
		super(options);
	}

	onClick() {
		let { state: { counter = 0 } }  = this;
		counter++;
		this.setState({ counter });
	}

	render() {
		const { state: { counter = 0 } }  = this;

		return v('div', [
			v('button', { type: 'button', onclick: this.onClick, innerHTML: 'Click Me', classes: this.classes(css.myClass).get() }),
			v('span', { classes: this.classes(css.myClass).get() }, [ String(counter) ])
		]);
	}
}

const projector = new (ProjectorMixin(Button))({});

projector.append();
