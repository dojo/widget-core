/**
 * These represent the base classes and capabilties for widgets.
 *
 * Additional features and functionality are added to widgets by compositing mixins onto these
 * bases.
 */
import Promise from '@dojo/shim/Promise';
import { EventedListener, Evented, EventedOptions } from '@dojo/interfaces/bases';
import { EventTargettedObject, EventTypedObject, Handle } from '@dojo/interfaces/core';
import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { ComposeFactory } from '@dojo/compose/compose';

/**
 * A function that is called to return top level node
 */
export interface NodeFunction {
	(this: Widget<WidgetProperties>): DNode;
}

/**
 * A function that is called when collecting the children nodes on render.
 */
export interface ChildNodeFunction {
	(this: Widget<WidgetProperties>): DNode[];
}

/**
 * the event emitted on properties:changed
 */
export interface PropertiesChangeEvent<T, P extends WidgetProperties> extends EventTypedObject<'properties:changed'> {
	/**
	 * the full set of properties
	 */
	properties: P;
	/**
	 * the changed properties between setProperty calls
	 */
	changedPropertyKeys: string[];
	/**
	 * the target (this)
	 */
	target: T;
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

export type WidgetFactoryFunction = () => Promise<WidgetBaseFactory>

export type FactoryRegistryItem = WidgetBaseFactory | Promise<WidgetBaseFactory> | WidgetFactoryFunction

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
	get(factoryLabel: string): WidgetBaseFactory | Promise<WidgetBaseFactory> | null;

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
	render<T>(options?: { bind?: T }): VNode;

	/**
	 * The type of node
	 */
	type: symbol;
}

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: WidgetBaseFactory | string;

	/**
	 * Options used to create factory a widget
	 */
	properties: WidgetProperties;

	/**
	 * DNode children
	 */
	children: DNode[];

	/**
	 * The type of node
	 */
	type: symbol;
}

export type DNode = HNode | WNode | string | null;

export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

export type Widget<P extends WidgetProperties> = Evented & WidgetMixin<P> & WidgetOverloads<P>

export interface WidgetBaseFactory extends ComposeFactory<Widget<WidgetProperties>, WidgetOptions<WidgetProperties>> { }

export interface WidgetOverloads<P extends WidgetProperties> {
	/**
	 * Attach a listener to the invalidated event, which is emitted when the `.invalidate()` method is called
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'invalidated', listener: EventedListener<Widget<P>, EventTargettedObject<Widget<P>>>): Handle;
	/**
	 * Attach a listener to the properties changed event, which is emitted when a difference in properties passed occurs
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'properties:changed', listener: EventedListener<Widget<P>, PropertiesChangeEvent<Widget<P>, P>>): Handle;
}

export interface PropertiesChangeRecord<P extends WidgetProperties> {
	changedKeys: string[];
	properties: P;
}

export interface PropertyComparison<P extends WidgetProperties> {
	/**
	 * Determine changed or new property keys on setProperties and assign them on return.
	 */
	diffProperties<S>(this: S, previousProperties: P, newProperties: P): PropertiesChangeRecord<P>;
}

export interface WidgetMixin<P extends WidgetProperties> extends PropertyComparison<P> {

	/**
	 * index key
	 */
	readonly [index: string]: any;

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
	readonly children: DNode[];

	/**
	 * Set children
	 */
	setChildren(children: DNode | DNode[]): void;

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
	 * Properties passed to affect state
	 */
	readonly properties: Readonly<Partial<P>>;

	/*
	 * set properties on the widget
	 */
	setProperties(this: Widget<WidgetProperties>, properties: P): void;

	/**
	 * The ID of the widget, which gets automatically rendered in the VNode property `data-widget-id` when
	 * rendered.
	 */
	readonly id: string | undefined;

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
	nodeAttributes: NodeAttributeFunction<Widget<WidgetProperties>>[];

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
	 * The specific Factory Registry on the widget if passed
	 */
	registry: FactoryRegistryInterface | undefined;
}

export interface WidgetOptions<P extends WidgetProperties> extends EventedOptions {
	/**
	 * Properties used to affect internal widget state
	 */
	properties?: P;

	tagName?: string;
}

export interface WidgetProperties {
	[index: string]: any;
	id?: string;
	classes?: string[];
}

export interface WidgetFactory<W extends Widget<P>, P extends WidgetProperties> extends ComposeFactory<W, WidgetOptions<P>> {}
