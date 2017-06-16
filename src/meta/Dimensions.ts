import { Base } from './Base';

export interface DimensionResults {
	bottom: number;
	height: number;
	left: number;
	offsetHeight: number;
	offsetLeft: number;
	offsetTop: number;
	offsetWidth: number;
	right: number ;
	scrollHeight: number;
	scrollLeft: number;
	scrollTop: number;
	scrollWidth: number;
	top: number;
	width: number;
}

export class Dimensions extends Base {
	get(key: string): Readonly<DimensionResults> {
		this.requireNode(key);

		const node = this.nodes.get(key);
		const {
			bottom = 0,
			height = 0,
			left = 0,
			right = 0,
			top = 0,
			width = 0
		} = (node ? node.getBoundingClientRect() : {});
		const {
			scrollLeft = 0,
			scrollTop = 0,
			scrollHeight = 0,
			scrollWidth = 0,
			offsetLeft = 0,
			offsetTop = 0,
			offsetWidth = 0,
			offsetHeight = 0
		} = (node || {});

		return {
			bottom,
			height,
			left,
			right,
			top,
			width,
			scrollLeft,
			scrollTop,
			scrollHeight,
			scrollWidth,
			offsetLeft,
			offsetTop,
			offsetWidth,
			offsetHeight
		};
	}
}

export default Dimensions;
