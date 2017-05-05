import { v, w, REGISTRY_ITEM } from './d';
import { DNode } from './interfaces';

import { WNode, VirtualDomProperties } from './interfaces';
declare global {
	namespace JSX {
		type Element = WNode;
		interface ElementAttributesProperty {
			properties: {};
		}
		interface IntrinsicElements {
			[key: string]: VirtualDomProperties;
		}
	}
}

export function tsx(tag: any, properties = {}, ...children: any[]): DNode {

	children = children.reduce((s, child) => {
		if (Array.isArray(child)) {
			return child.reduce((b, c) => {
				return [...b, c];
			}, s);
		}
		else {
			return [ ...s, child];
		}
	}, []);

	properties = properties === null ? {} : properties;
	if (typeof tag === 'string') {
		return v(tag, properties, children);
	}
	else if (tag.type === REGISTRY_ITEM) {
		const registryItem = new tag();
		return w(registryItem.name, properties, children);
	}
	else {
		return w(tag, properties, children);
	}
}
