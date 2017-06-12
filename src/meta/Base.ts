import Map from '@dojo/shim/Map';
import { WidgetMeta, WidgetMetaProperties } from '../interfaces';

export class Base implements WidgetMeta {
	protected nodes: Map<string, HTMLElement>;

	constructor(properties: WidgetMetaProperties) {
		this.nodes = properties.nodes;
		this.invalidate = properties.invalidate;
		this.requireNode = properties.requireNode;
	}

	public has(key: string): boolean {
		this.requireNode(key);
		return this.nodes.has(key);
	}

	protected invalidate(): void {}

	protected requireNode(key: string): void {}
}

export default Base;
