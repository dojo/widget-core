/**
 * These represent the base classes and capabilties for widgets.
 *
 * Additional features and functionality are added to widgets by compositing mixins onto these
 * bases.
 */

import Promise from 'dojo-shim/Promise';
import { EventedListener, State, Stateful, StatefulOptions } from 'dojo-interfaces/bases';
import { EventTargettedObject, Handle, StylesMap } from 'dojo-interfaces/core';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';

/**
 * A function that is called to return top level node
 */
export interface NodeFunction {
	(this: Widget<WidgetState>): DNode;
}

/**
 * A function that is called when collecting the children nodes on render.
 */
export interface ChildNodeFunction {
	(this: Widget<WidgetState>): DNode[];
}

/**
 * A function that is called when collecting the node attributes on render, accepting the current map of
 * attributes and returning a set of VNode properties that should mixed into the current attributes.
 */
export interface NodeAttributeFunction<T> {
	/**
	 * A function which can return additional VNodeProperties which are
	 *
	 * @param attributes The current VNodeProperties that will be part of the render
	 */
	(this: T, attributes: VNodeProperties): VNodeProperties;
}

export type WidgetFactoryFunction = () => Promise<WidgetFactory>

export type FactoryRegistryItem = WidgetFactory | Promise<WidgetFactory> | WidgetFactoryFunction

/**
 * Factory Registry
 */
export interface FactoryRegistryInterface {

	/**
	 * Define a FactoryRegistryItem against a factory label
	 */
	define(factoryLabel: string, registryItem: FactoryRegistryItem): void;

	/**
	 * Return the registered FactoryRegistryItem for the label.
	 */
	get(factoryLabel: string): WidgetFactory | Promise<WidgetFactory> | null;

	/**
	 * Check if the factory label has already been used to define a FactoryRegistryItem.
	 */
	has(factoryLabel: string): boolean;
}

export interface HNode {
	/**
	 * Specified children
	 */
	children: (DNode | (VNode | string))[];

	/**
	 * render function that wraps returns VNode
	 */
	render<T>(options?: { bind: T }): VNode;
}

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: WidgetFactory | string;

	/**
	 * Options used to create factory a widget
	 */
	options: WidgetOptions<WidgetState>;

	/**
	 * DNode children
	 */
	children: DNode[];
}

export type DNode = HNode | WNode | string | null;

export type Widget<S extends WidgetState> = Stateful<S> & WidgetMixin & WidgetOverloads & VNodeEvented;

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {}

export interface WidgetOverloads {
	/**
	 * Attach a listener to the invalidated event, which is emitted when the `.invalidate()` method is called
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'invalidated', listener: EventedListener<Widget<WidgetState>, EventTargettedObject<Widget<WidgetState>>>): Handle;
}

export interface WidgetMixin {
	/**
	 * Classes which are applied upon render.
	 *
	 * This property is intended for "static" classes.  Classes which are aligned to the instance should be
	 * stored in the instances state object.
	 */
	readonly classes: string[];

	/**
	 * An array of children `DNode`s returned via `getChildrenNodes`
	 */
	children: DNode[];

	/**
	 * Get the top level node and children when rendering the widget.
	 */
	getNode: NodeFunction;

	/**
	 * Generate the children nodes when rendering the widget.
	 */
	getChildrenNodes: ChildNodeFunction;

	/**
	 * Generate the node attributes when rendering the widget.
	 *
	 * Mixins should not override or aspect this method, but instead provide a function as part of the
	 * `nodeAttributes` property, which will automatically get called by this method upon render.
	 */
	getNodeAttributes(): VNodeProperties;

	/**
	 * The ID of the widget, which gets automatically rendered in the VNode property `data-widget-id` when
	 * rendered.
	 */
	readonly id: string;

	/**
	 * Signal to the widget that it is in an invalid state and that it should not re-use its cache on the
	 * next render.
	 *
	 * Calls to invalidate, will also cause the widget to invalidate its parent, if assigned.
	 */
	invalidate(): void;

	/**
	 * An array of functions that return a map of VNodeProperties which should be mixed into the final
	 * properties used when rendering this widget.  These are intended to be "static" and bund to the class,
	 * making it easy for mixins to alter the behaviour of the render process without needing to override or aspect
	 * the `getNodeAttributes` method.
	 */
	nodeAttributes: NodeAttributeFunction<Widget<WidgetState>>[];

	/**
	 * Render the widget, returing the virtual DOM node that represents this widget.
	 *
	 * It is not intended that mixins will override or aspect this method, as the render process is decomposed to
	 * allow easier modification of behaviour of the render process.  The base implementatin intelligently caches
	 * its render and essentially provides the following return for the method:
	 *
	 * ```typescript
	 * return h(this.tagName, this.getNodeAttributes(), this.getChildrenNodes());
	 * ```
	 */
	__render__(): VNode | string | null;

	/**
	 * The tagName (selector) that should be used when rendering the node.
	 *
	 * If there is logic that is required to determine this value on render, a mixin should consider overriding
	 * this property with a getter.
	 */
	tagName: string;

	/**
	 * The specific Factory Registry passed to the widget via the `WidgetOptions`
	 */
	readonly registry: FactoryRegistryInterface;
}

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S>, VNodeEventedOptions {
	/**
	 * Any classes that should be added to this instances
	 */
	classes?: string[];

	/**
	 * Any node attribute functions that should be added to this instance
	 */
	nodeAttributes?: NodeAttributeFunction<Widget<WidgetState>> | NodeAttributeFunction<Widget<WidgetState>>[];

	/**
	 * Override the tag name for this widget instance
	 */
	tagName?: string;
}

export interface WidgetState extends State {
	/**
	 * Any classes that should be mixed into the widget's VNode upon render.
	 *
	 * Any classes expressed in state will be additive to those provided in the widget's `.classes` property
	 */
	classes?: string[];

	/**
	 * The ID of the widget
	 */
	id?: string;

	/**
	 * Any inline styles which should be mixed into the widget's VNode upon render.
	 */
	styles?: StylesMap;
}
