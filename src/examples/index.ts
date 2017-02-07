import { WidgetBase } from './../WidgetBase';
import { ProjectorMixin } from './../mixins/ProjectorMixin';
import { Themeable } from './../mixins/ThemeableMixin';
import { v } from './../d';
import * as css from './styles/button.css';

class Button extends Themeable(WidgetBase) {

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
