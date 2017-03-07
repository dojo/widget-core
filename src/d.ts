import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';
import Symbol from '@dojo/shim/Symbol';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	VirtualDomProperties,
	WidgetProperties,
	WidgetBaseConstructor
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

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
export function isWNode(child: DNode): child is WNode {
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
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode[];
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
 * Global factory registry instance
 */
export const registry = new FactoryRegistry();

/**
 * Wrapper function for calls to create a widget.
 */
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P): WNode;
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P, children?: DNode[]): WNode;
export function w<P extends WidgetProperties>(factory: WidgetBaseConstructor<P> | string, properties: P, children?: DNode[]): WNode {

	return {
		children,
		factory,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create hyperscript, lazily executes the hyperscript creation
 */
export function v(tag: string, properties: VirtualDomProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VirtualDomProperties = {}, children: DNode[] = []): HNode {
		let properties = propertiesOrChildren;

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			properties = {};
		}

		return {
			children,
			properties,
			render<T>(this: { vNodes: VNode[], properties: VirtualDomProperties }, options: { bind?: T } = { }) {
				let properties = this.properties;

				if (this.properties) {
					let { classes } = this.properties;
					if (typeof classes === 'function') {
						classes = classes();
						properties = assign(this.properties, { classes });
					}
				}

				return h(tag, assign(options, properties), this.vNodes);
			},
			type: HNODE
		};
}
