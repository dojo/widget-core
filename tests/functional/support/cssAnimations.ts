import { ProjectorMixin } from '../../../src/mixins/Projector';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';

interface AppProperties {
	enter?: string;
	exit?: string;
}

export function setup(properties: AppProperties = {}) {
	const { enter: enterAnimationActive, exit: exitAnimationActive } = properties;

	let children: any[] = [];

	class TestProjector extends ProjectorMixin(WidgetBase)<{}> {
		root = document.getElementById('projector')!;

		render() {
			return v('div', {}, children);
		}
	}

	const projector = new TestProjector({});

	setTimeout(function () {
		children.push(v('div', {
			classes: {
				blue: true
			},
			enterAnimation: 'fade-in',
			enterAnimationActive: enterAnimationActive,
			exitAnimation: 'fade-out',
			exitAnimationActive: exitAnimationActive
		}));

		projector.invalidate();

		setTimeout(function () {
			// element should be fairly transparent
			(<any> window).startOpacity = getComputedStyle(document.querySelector('.blue')!).opacity;
		}, 100);

		setTimeout(function () {
			// element should be faded in.
			(<any> window).endOpacity = getComputedStyle(document.querySelector('.blue')!).opacity;

			children = [];
			projector.invalidate();

			setTimeout(function () {
				// element should be fading out
				(<any> window).fadeOutOpacity = getComputedStyle(document.querySelector('.blue')!).opacity;

				setTimeout(function () {
					// element should be gone
					(<any> window).elementGone = document.querySelector('.blue') === null;
					(<any> window).finished = true;
				}, 1250);
			}, 250);
		}, 1500);
	}, 0);

	projector.append();
}
