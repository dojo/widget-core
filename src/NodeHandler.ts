import { Evented } from '@dojo/core/Evented';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';

export enum Type {
	Projector = 'Projector',
	Widget = 'Widget'
}

export default class NodeHandler extends Evented {

	private _nodeMap = new Map<string, Element>();

	public get(key: string): Element | undefined {
		return this._nodeMap.get(key);
	}

	public has(key: string): Boolean {
		return this._nodeMap.has(key);
	}

	public add(element: Element, properties: VNodeProperties) {
		const key = String(properties.key);
		this._nodeMap.set(key, element);
		this.emit({ type: key });
	}

	public addRoot(element: Element, properties: VNodeProperties) {
		this.add(element, properties);
		this.emit({ type: Type.Widget });
	}

	public addProjector(element: Element, properties: VNodeProperties) {
		if (properties && properties.key) {
			this.add(element, properties);
		}

		this.emit({ type: Type.Projector });
	}

	public clear() {
		this._nodeMap.clear();
	}
}
