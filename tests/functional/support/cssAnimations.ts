import createProjector from '../../../src/createProjector';
import { v } from '../../../src/d';
import { DNode } from '../../../src/interfaces';

interface AppProperties {
	enter?: string;
	exit?: string;
}

export function setup(properties: AppProperties = {}) {
	const { enter: enterAnimationActive, exit: exitAnimationActive } = properties;

	let children: DNode[] = [];

	let projector = createProjector.mixin({
		mixin: {
			getChildrenNodes(): DNode[] {
				return children;
			}
		}
	})({
		root: document.getElementById('projector')!
	});

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
