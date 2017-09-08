import { Destroyable } from '@dojo/core/Destroyable';
import global from '@dojo/shim/global';
import { WidgetMetaBase, WidgetMetaProperties, NodeHandlerInterface } from '../interfaces';

export class Base extends Destroyable implements WidgetMetaBase {
	private _invalidate: () => void;
	private _invalidating: number;
	protected nodeHandler: NodeHandlerInterface;

	constructor(properties: WidgetMetaProperties) {
		super();

		this._invalidate = properties.invalidate;
		this.nodeHandler = properties.nodeHandler;
	}

	public has(key: string): boolean {
		return this.nodeHandler.has(key);
	}

	protected invalidate(): void {
		global.cancelAnimationFrame(this._invalidating);
		this._invalidating = global.requestAnimationFrame(this._invalidate);
	}
}

export default Base;
