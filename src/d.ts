import Symbol from '@dojo/shim/Symbol';
import {
	Constructor,
	DefaultWidgetBaseInterface,
	DeferredVirtualProperties,
	DNode,
	HNode,
	RegistryLabel,
	VirtualDomProperties,
	WidgetBaseInterface,
	WNode
} from './interfaces';

/**
 * The symbol identifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol identifier for a HNode type
 */
export const HNODE = Symbol('Identifier for a HNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface>(child: DNode<W>): child is WNode<W> {
	return Boolean(child && (typeof child !== 'string') && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `HNode` using the `type` property
 */
export function isHNode(child: DNode): child is HNode {
	return Boolean(child && (typeof child !== 'string') && child.type === HNODE);
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes.
 */
export function decorate<T extends DNode>(dNodes: DNode, modifier: (dNode: T) => void, predicate: (dNode: DNode) => dNode is T): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], modifier: (dNode: T) => void, predicate: (dNode: DNode) => dNode is T): DNode[];
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void): DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[] {
	let nodes = Array.isArray(dNodes) ? [ ...dNodes ] : [ dNodes ];
	while (nodes.length) {
		const node = nodes.pop();
		if (node) {
			if (!predicate || predicate(node)) {
				modifier(node);
			}
			if ((isWNode(node) || isHNode(node)) && node.children) {
				nodes = [ ...nodes, ...node.children ];
			}
		}
	}
	return dNodes;
}

/**
 * Wrapper function for calls to create a widget.
 */
export function w<W extends WidgetBaseInterface>(widgetConstructor: Constructor<W> | RegistryLabel, properties: W['properties'], children: W['children'] = []): WNode<W> {

	return {
		children,
		widgetConstructor,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create HNodes.
 */
export function v(tag: string, properties: VirtualDomProperties | DeferredVirtualProperties, children?: DNode[]): HNode;
export function v(tag: string, children: undefined | DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VirtualDomProperties | DeferredVirtualProperties | DNode[] = {}, children: undefined | DNode[] = undefined): HNode {
		let properties: VirtualDomProperties | DeferredVirtualProperties = propertiesOrChildren;
		let deferredPropertiesCallback;

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			properties = {};
		}

		if (typeof properties === 'function') {
			deferredPropertiesCallback = properties;
			properties = {};
		}

		return {
			tag,
			deferredPropertiesCallback,
			children,
			properties,
			type: HNODE
		};
}
