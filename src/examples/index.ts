import { WidgetBase } from './../WidgetBase';
import { ProjectorMixin } from './../mixins/ProjectorMixin';
import { Themeable, ThemeableProperties } from './../mixins/ThemeableMixin';
import { Stateful } from './../mixins/StatefulMixin';
import { v } from './../d';
import * as css from './styles/button.css';

interface ButtonProperties extends ThemeableProperties {
	myProperty: string;
}

class Button extends Stateful(Themeable(WidgetBase)) {

	properties: ButtonProperties;

	constructor(options: any) {
		options.baseClasses = css;
		super(options);
	}

	render() {
		return v('button', { type: 'button', classes: this.classes(css.myClass).get() });
	}
}

const projector = new (ProjectorMixin(Button))({});

projector.append();
