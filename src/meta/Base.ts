import global from '@dojo/core/global';
import Map from '@dojo/shim/Map';
import {
	WidgetMetaOptions,
	WidgetMetaProperties,
	WidgetMetaRequiredNodeCallback
} from './interfaces';

export abstract class Base<T, O extends WidgetMetaOptions = WidgetMetaOptions> {
	private _invalidate: () => void;
	private _boundInvalidate: () => void;
	private _invalidating: number;
	private _requiredNodes: Map<string, WidgetMetaRequiredNodeCallback[]>;
	protected nodes: Map<string, HTMLElement>;
	protected options: O;
	protected requiredKeys: string[] = [];

	constructor(properties: WidgetMetaProperties, options: O) {
		this._invalidate = properties.invalidate;
		this._boundInvalidate = () => {
			this._invalidate();
		};
		this._requiredNodes = properties.requiredNodes;

		this.nodes = properties.nodes;
		this.options = options;
	}

	protected invalidate(keys?: string[]): void {
		global.cancelAnimationFrame(this._invalidating);
		this._invalidating = global.requestAnimationFrame(this._boundInvalidate);
	}

	protected requireNode(key: string, callback?: WidgetMetaRequiredNodeCallback): void {
		if (this.requiredKeys.indexOf(key) < 0) {
			this.requiredKeys.push(key);
		}
		const node = this.nodes.get(key);
		if (node) {
			callback && callback.call(this, node);
		}
		else {
			const callbacks: WidgetMetaRequiredNodeCallback[] = this._requiredNodes.get(key) || [];
			callback && callbacks.push(callback);
			this._requiredNodes.set(key, callbacks);
			if (callback === undefined) {
				this.invalidate();
			}
		}
	}

	public abstract get(key: string): T;

	public has(key: string): boolean {
		return this.nodes.has(key);
	}

	public onKeysUpdated(keys: string[]): void {}
}

export default Base;
