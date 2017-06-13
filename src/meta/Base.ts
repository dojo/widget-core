import global from '@dojo/core/global';
import Map from '@dojo/shim/Map';
import Set from '@dojo/shim/Set';
import { WidgetMetaProperties } from '../interfaces';

export class Base {
	private _invalidate: () => void;
	private _requiredNodes: Set<string>;
	private _invalidating: number;

	protected nodes: Map<string, HTMLElement>;

	constructor(properties: WidgetMetaProperties) {
		this._invalidate = properties.invalidate;
		this._requiredNodes = properties.requiredNodes;
		this.nodes = properties.nodes;
	}

	has(key: string): boolean {
		this.requireNode(key);
		return this.nodes.has(key);
	}

	invalidate(): void {
		global.cancelAnimationFrame(this._invalidating);
		this._invalidating = global.requestAnimationFrame(this._invalidate);
	}

	requireNode(key: string): void {
		this._requiredNodes.add(key);

		if (!this.nodes.has(key)) {
			this.invalidate();
		}
	}
}

export default Base;
