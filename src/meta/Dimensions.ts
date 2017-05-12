import { WidgetMeta, WidgetMetaProperties } from '../WidgetBase';
import Map from '@dojo/shim/Map';

export interface DimensionResults {
	bottom: number;
	height: number;
	left: number;
	right: number ;
	scrollHeight: number;
	scrollLeft: number;
	scrollTop: number;
	scrollWidth: number;
	top: number;
	width: number;
}

export default class Dimensions implements WidgetMeta {
	private _nodes: Map<string, any>;

	readonly requiresRender = true;

	constructor(properties: WidgetMetaProperties) {
		this._nodes = properties.nodes;
	}

	has(key: string): boolean {
		return !!this._nodes.get(key);
	}

	get(key: string): DimensionResults {
		const node = this._nodes.get(key);

		if (node) {
			const clientRect = node.getBoundingClientRect();

			return {
				scrollLeft: node.scrollLeft,
				scrollTop: node.scrollTop,
				scrollHeight: node.scrollHeight,
				scrollWidth: node.scrollWidth,
				bottom: clientRect.bottom,
				height: clientRect.height,
				left: clientRect.left,
				right: clientRect.right,
				top: clientRect.top,
				width: clientRect.width
			};
		}
		else {
			return {
				scrollLeft: 0,
				scrollTop: 0,
				scrollHeight: 0,
				scrollWidth: 0,
				bottom: 0,
				height: 0,
				left: 0,
				right: 0,
				top: 0,
				width: 0
			};
		}
	}
}
