import { Evented, BaseEventedEvents } from '@dojo/core/Evented';
import { assign } from '@dojo/core/lang';
import { EventedListenerOrArray } from '@dojo/interfaces/bases';
import { VNode, ProjectionOptions, VNodeProperties } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import Set from '@dojo/shim/Set';
import WeakMap from '@dojo/shim/WeakMap';
import { v, registry, isWNode, decorate, isHNode } from './d';
import FactoryRegistry, { WIDGET_BASE_TYPE } from './FactoryRegistry';
import {
	DNode,
	WidgetConstructor,
	WidgetProperties,
	WidgetBaseInterface,
	PropertyChangeRecord,
	PropertiesChangeRecord,
	PropertiesChangeEvent,
	HNode
} from './interfaces';
import { Handle } from '@dojo/interfaces/core';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
	factory: WidgetConstructor;
	used: boolean;
}

/**
 * Diff property configuration
 */
interface DiffPropertyConfig {
	propertyName: string;
	diffFunction: Function;
}

export interface WidgetBaseEvents<P extends WidgetProperties> extends BaseEventedEvents {
	(type: 'properties:changed', handler: EventedListenerOrArray<WidgetBase<P>, PropertiesChangeEvent<WidgetBase<P>, P>>): Handle;
}

/**
 * Decorator that can be used to register a function to run as an aspect to `render`
 */
export function afterRender(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('afterRender', target[propertyKey]);
}

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName The name of the property of which the diff function is applied
 */
export function diffProperty(propertyName: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		target.addDecorator('diffProperty', { propertyName, diffFunction: target[propertyKey] });
	};
}

/**
 * Decorator used to register listeners to the `properties:changed` event.
 */
export function onPropertiesChanged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('onPropertiesChanged', target[propertyKey]);
}

/**
 * Function that identifies DNodes that are HNodes with key properties.
 */
function isHNodeWithKey(node: DNode): node is HNode {
	return isHNode(node) && node && (node.properties != null) && (node.properties.key != null);
}

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P extends WidgetProperties> extends Evented implements WidgetBaseInterface<P> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * children array
	 */
	private  _children: DNode[];

	/**
	 * marker indicating if the widget requires a render
	 */
	private dirty: boolean;

	/**
	 * cachedVNode from previous render
	 */
	private cachedVNode?: VNode | string;

	on: WidgetBaseEvents<P>;

	/**
	 * internal widget properties
	 */
	private  _properties: P;

	/**
	 * properties from the previous render
	 */
	private previousProperties: P & { [index: string]: any };

	/**
	 * Map of factory promises
	 */
	private initializedFactoryMap: Map<string, Promise<WidgetConstructor>>;

	/**
	 * cached chldren map for instance management
	 */
	private cachedChildrenMap: Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>;

	/**
	 * map of specific property diff functions
	 */
	private diffPropertyFunctionMap: Map<string, string>;

	/**
	 * set of render decorators
	 */
	private renderDecorators: Set<string>;

	/**
	 * Map of functions properties for the bound function
	 */
	private bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>;

	/**
	 * A generic property bag for decorators
	 */
	private _decorators: Map<string, any[]>;

	/**
	 * Internal factory registry
	 */
	protected registry: FactoryRegistry | undefined;

	/**
	 * @constructor
	 */
	constructor() {
		super({});

		this._children = [];
		this._properties = <P> {};
		this.previousProperties = <P> {};
		this.initializedFactoryMap = new Map<string, Promise<WidgetConstructor>>();
		this.cachedChildrenMap = new Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>();
		this.diffPropertyFunctionMap = new Map<string, string>();
		this.renderDecorators = new Set<string>();
		this.bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();

		// Create Maquette afterCreate and afterUpdate callback functions that will be set on vnodes
		// that have keys.
		const afterCreateCallback = (element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string,
			properties: VNodeProperties, children: VNode[]): void => {
			this.onElementCreated(element, String(properties.key));
		};

		const afterUpdateCallback = (element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string,
			properties: VNodeProperties, children: VNode[]): void => {
			this.onElementUpdated(element, String(properties.key));
		};

		this.own(this.on('properties:changed', (evt) => {
			this.invalidate();

			const propertiesChangedListeners = this.getDecorator('onPropertiesChanged') || [];
			for (let i = 0; i < propertiesChangedListeners.length; i++) {
				propertiesChangedListeners[i].call(this, evt);
			}
		}));

		// Add a render decorator that will register callbacks for the v-node 'afterCreate' and
		// 'afterUpdate' lifecycle methods to call the widget lifecycle methods onElementCreated
		// and onElementUpdated
		this.addDecorator('afterRender', (node: DNode) => {
			// Using callback functions that were bound outside of this render call to make sure
			// the functions don't change.
			decorate(node, (node: HNode) => {
				node.properties.afterCreate = afterCreateCallback;
				node.properties.afterUpdate = afterUpdateCallback;
			}, isHNodeWithKey);
			
			return node;
		});
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node is created for a vnode.
	 * Override this method to access the dom nodes that were inserted into the dom.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	protected onElementCreated(element: Element, key: string): void {
		// Do nothing by default.
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node that is associated with a vnode is updated.
	 * Note: this method is dependant on the Maquette afterUpdate callback which is called if a dom
	 * node might have been updated.  Maquette does not guarantee the dom node was updated.
	 * Override this method to access the dom node.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	protected onElementUpdated(element: Element, key: string): void {
		// Do nothing by default.
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

	public setProperties(properties: P): void {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		const registeredDiffPropertyConfigs: DiffPropertyConfig[] = this.getDecorator('diffProperty') || [];

		for (let i = 0; i < registeredDiffPropertyConfigs.length; i++) {
			const { propertyName, diffFunction } = registeredDiffPropertyConfigs[i];
			const previousProperty = this.previousProperties[propertyName];
			const newProperty = (<any> properties)[propertyName];
			const result: PropertyChangeRecord = diffFunction(previousProperty, newProperty);

			if (!result) {
				return;
			}

			if (result.changed) {
				diffPropertyChangedKeys.push(propertyName);
			}
			delete (<any> properties)[propertyName];
			delete this.previousProperties[propertyName];
			diffPropertyResults[propertyName] = result.value;
		}

		const diffPropertiesResult = this.diffProperties(this.previousProperties, properties);
		this._properties = assign(diffPropertiesResult.properties, diffPropertyResults);

		const changedPropertyKeys = [...diffPropertiesResult.changedKeys, ...diffPropertyChangedKeys];

		if (changedPropertyKeys.length) {
			this.emit({
				type: 'properties:changed',
				target: this,
				properties: this.properties,
				changedPropertyKeys
			});
		}
		this.previousProperties = this.properties;
	}

	public get children(): DNode[] {
		return this._children;
	}

	public setChildren(children: DNode[]): void {
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	public diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P> {
		const changedKeys: string[] = [];
		const propertyKeys = Object.keys(newProperties);

		for (let i = 0; i < propertyKeys.length; i++) {
			if (previousProperties[propertyKeys[i]] !== newProperties[propertyKeys[i]]) {
				changedKeys.push(propertyKeys[i]);
			}
		}
		return { changedKeys, properties: assign({}, newProperties) };
	}

	public render(): DNode {
		return v('div', {}, this.children);
	}

	public __render__(): VNode | string | null {
		if (this.dirty || !this.cachedVNode) {
			let dNode = this.render();
			const afterRenders = this.getDecorator('afterRender') || [];
			for (let i = 0; i < afterRenders.length; i++) {
				dNode = afterRenders[i].call(this, dNode);
			}
			const widget = this.dNodeToVNode(dNode);
			this.manageDetachedChildren();
			if (widget) {
				this.cachedVNode = widget;
			}
			this.dirty = false;
			return widget;
		}
		return this.cachedVNode;
	}

	public invalidate(): void {
		this.dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
	}

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private bindFunctionProperties(properties: P & { [index: string]: any }): void {
		const propertyKeys = Object.keys(properties);

		for (let i = 0; i < propertyKeys.length; i++) {
			const property = properties[propertyKeys[i]];
			const bind = properties.bind;

			if (typeof property === 'function') {
				const bindInfo = this.bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this.bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKeys[i]] = boundFunc;
			}
		}
	}

	/**
	 * Function to add decorators to WidgetBase
	 *
	 * @param decoratorKey The key of the decorator
	 * @param value The value of the decorator
	 */
	protected addDecorator(decoratorKey: string, value: any): void {
		value = Array.isArray(value) ? value : [ value ];
		if (!this._decorators) {
			this._decorators = new Map<string, any[]>();
		}

		const currentValue = this._decorators.get(decoratorKey) || [];
		this._decorators.set(decoratorKey, [ ...currentValue, ...value ]);
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values or undefined
	 */
	protected getDecorator(decoratorKey: string): any[] | undefined {
		if (this._decorators) {
			return this._decorators.get(decoratorKey);
		}
		return undefined;
	}

	/**
	 * Returns the factory from the registry for the specified label. First checks a local registry passed via
	 * properties, if no local registry or the factory is not found fallback to the global registry
	 *
	 * @param factoryLabel the label to look up in the registry
	 */
	private getFromRegistry(factoryLabel: string): Promise<WidgetConstructor> | WidgetConstructor | null {
		if (this.registry && this.registry.has(factoryLabel)) {
			return this.registry.get(factoryLabel);
		}
		return registry.get(factoryLabel);
	}

	/**
	 * Process a structure of DNodes into VNodes, string or null. `null` results are filtered.
	 *
	 * @param dNode the dnode to process
	 * @returns a VNode, string or null
	 */
	private dNodeToVNode(dNode: DNode): VNode | string | null {

		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { factory } = dNode;
			let child: WidgetBaseInterface<WidgetProperties>;

			if (typeof factory === 'string') {
				const item = this.getFromRegistry(factory);

				if (item instanceof Promise) {
					if (item && !this.initializedFactoryMap.has(factory)) {
						const promise = item.then((factory) => {
							this.invalidate();
							return factory;
						});
						this.initializedFactoryMap.set(factory, promise);
					}
					return null;
				}
				else if (item === null) {
					console.warn(`Unable to render unknown widget factory ${factory}`);
					return null;
				}
				factory = item;
			}

			const childrenMapKey = key || factory;
			let cachedChildren = this.cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;

			for (let i = 0; i < cachedChildren.length; i++) {
				const cachedChildWrapper = cachedChildren[i];
				if (cachedChildWrapper.factory === factory && !cachedChildWrapper.used) {
					cachedChild = cachedChildWrapper;
					break;
				}
			}

			if (!properties.hasOwnProperty('bind')) {
				properties.bind = this;
			}

			if (cachedChild) {
				child = cachedChild.child;
				child.setProperties(properties);
				cachedChild.used = true;
			}
			else {
				child = new factory();
				child.setProperties(properties);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				cachedChildren = [...cachedChildren, { child, factory, used: true }];
				this.cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (!key && cachedChildren.length > 1) {
				const errorMsg = 'It is recommended to provide a unique `key` property when using the same widget factory multiple times';
				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			child.setChildren(children);
			return child.__render__();
		}

		dNode.vNodes = [];
		for (let i = 0; i < dNode.children.length; i++) {
			const child = dNode.children[i];
			if (child !== null) {
				dNode.vNodes.push(this.dNodeToVNode(child));
			}
		}

		return dNode.render({ bind: this });
	}

	/**
	 * Manage widget instances after render processing
	 */
	private manageDetachedChildren(): void {
		this.cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren: WidgetCacheWrapper[] = [];
			for (let i = 0; i < cachedChildren.length; i++) {
				if (!cachedChildren[i].used) {
					cachedChildren[i].child.destroy();
					break;
				}
				cachedChildren[i].used = false;
				filterCachedChildren.push(cachedChildren[i]);
			}
			this.cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}

export default WidgetBase;
