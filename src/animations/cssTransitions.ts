import has, { add as hasAdd } from '@dojo/has/has';

const TRANSISTION_END_EVENT_NAME = 'transitionend';
const ANIMATION_END_EVENT_NAME = 'animationend';

export interface VNodeProperties {
	enterAnimationActive?: string;
	exitAnimationActive?: string;
}

hasAdd('css-transitions', has('host-node') || 'transition' in document.createElement('div').style);

function runAndCleanUp(element: HTMLElement, startAnimation: () => void, finishAnimation: () => void) {
	/* istanbul ignore if */
	if (!has('css-transitions')) {
		throw new Error('Environment does not support CSS transistions');
	}

	let finished = false;

	let transitionEnd = function () {
		if (!finished) {
			finished = true;
			element.removeEventListener(TRANSISTION_END_EVENT_NAME, transitionEnd);
			element.removeEventListener(ANIMATION_END_EVENT_NAME, transitionEnd);

			finishAnimation();
		}
	};

	startAnimation();

	element.addEventListener(ANIMATION_END_EVENT_NAME, transitionEnd);
	element.addEventListener(TRANSISTION_END_EVENT_NAME, transitionEnd);
}

function exit(node: HTMLElement, properties: VNodeProperties, exitAnimation: string, removeNode: () => void) {
	const activeClass = properties.exitAnimationActive || `${exitAnimation}-active`;

	runAndCleanUp(node, () => {
		node.classList.add(exitAnimation);

		requestAnimationFrame(function () {
			node.classList.add(activeClass);
		});
	}, () => {
		removeNode();
	});
}

function enter(node: HTMLElement, properties: VNodeProperties, enterAnimation: string) {
	const activeClass = properties.enterAnimationActive || `${enterAnimation}-active`;

	runAndCleanUp(node, () => {
		node.classList.add(enterAnimation);

		requestAnimationFrame(function () {
			node.classList.add(activeClass);
		});
	}, () => {
		node.classList.remove(enterAnimation);
		node.classList.remove(activeClass);
	});
}

export default {
	enter,
	exit
};
