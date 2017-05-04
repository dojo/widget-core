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
