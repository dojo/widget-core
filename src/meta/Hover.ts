import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';
import { WidgetMetaProperties } from '../interfaces';

interface HoverInfo {
	hovering: boolean;
}

export default class Hover extends Base {
	private _hoverInfo: WeakMap<HTMLElement, HoverInfo>;

	constructor(properties: WidgetMetaProperties) {
		super(properties);
		this._hoverInfo = new WeakMap();
	}

	/**
	 * Returns `true` if the mouse is hovering over the node, identified by `key`, otherwise returns `false`
	 * @param key The key of the node that the hover information is required for
	 */
	public get(key: string): boolean {
		this.requireNode(key);

		const node = this.nodes.get(key);

		if (!node) {
			return false;
		}

		let hoverInfo = this._hoverInfo.get(node);

		if (!hoverInfo) {
			hoverInfo = { hovering: false };
			this._hoverInfo.set(node, hoverInfo);
			node.addEventListener('mouseenter', () => {
				// Issue with CFA and function scope (see: Microsoft/TypeScript#17449), using non null assertion
				if (!hoverInfo!.hovering) {
					hoverInfo!.hovering = true;
					this.invalidate();
				}
			});
			node.addEventListener('mouseleave', () => {
				// Issue with CFA and function scope (see: Microsoft/TypeScript#17449), using non null assertion
				if (hoverInfo!.hovering) {
					hoverInfo!.hovering = false;
					this.invalidate();
				}
			});
		}

		return hoverInfo.hovering;
	}
}
