import Evented, { EventedOptions } from './bases/Evented';
import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { v, registry, isWNode } from './d';
import { assign } from '@dojo/core/lang';
import WeakMap from '@dojo/shim/WeakMap';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import {
	PropertyChangeRecord,
	PropertiesChangeEvent,
	PropertiesChangeRecord
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export interface WidgetOptions<P extends WidgetProperties> extends EventedOptions {
	properties?: P;
}

export interface WidgetProperties {
	[index: string]: any;
	id?: string;
	key?: string;
	bind?: any;
}

interface WidgetCacheWrapper {
	child: WidgetBase<WidgetProperties>;
	factory: WidgetBaseConstructor<WidgetProperties>;
	used: boolean;
}

export interface HNode {
	/**
	 * Array of processed VNode children.
	 */
	vNodes?: (string | VNode | null)[];
	/**
	 * Specified children
	 */
	children: (DNode | string)[];

	/**
	 * render function that wraps returns VNode
	 */
	render<T>(options?: { bind?: T }): VNode;

	/**
	 * The properties used to create the VNode
	 */
	properties: VNodeProperties;

	/**
	 * The type of node
	 */
	type: symbol;
}

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: WidgetBaseConstructor<WidgetProperties> | string;

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

export type WidgetBaseConstructor<P extends WidgetProperties> = new (options: WidgetOptions<P>) => WidgetBase<P>

const propertyFunctionNameRegex = /^diffProperty(.*)/;

export class WidgetBase<P extends WidgetProperties> extends Evented {

	private  _children: DNode[];
	private dirty: boolean;
	private cachedVNode?: VNode | string;
	private  _properties: P;
	private previousProperties: P;
	private initializedFactoryMap: Map<string, Promise<WidgetBaseConstructor<P>>>;
	private cachedChildrenMap: Map<string | Promise<WidgetBaseConstructor<WidgetProperties>> | WidgetBaseConstructor<WidgetProperties>, WidgetCacheWrapper[]>;
	private diffPropertyFunctionMap: Map<string, string>;
	private bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>;

	protected registry: FactoryRegistry | undefined;

	constructor(options: WidgetOptions<P> = {}) {
		super(options);
		const { properties = <P> {} } = options;

		this._children = [];
		this._properties = <P> {};
		this.previousProperties = <P> {};
		this.initializedFactoryMap = new Map<string, Promise<WidgetBaseConstructor<P>>>();
		this.cachedChildrenMap = new Map<string | Promise<WidgetBaseConstructor<WidgetProperties>> | WidgetBaseConstructor<WidgetProperties>, WidgetCacheWrapper[]>();
		this.diffPropertyFunctionMap = new Map<string, string>();
		this.bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();

		const self: { [index: string]: any } = this;
		for (let property in this) {
			const match = property.match(propertyFunctionNameRegex);
			if (match && (typeof self[match[0]] === 'function')) {
				this.diffPropertyFunctionMap.set(match[0], `${match[1].slice(0, 1).toLowerCase()}${match[1].slice(1)}`);
			}
		};

		this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<WidgetBase<WidgetProperties>, WidgetProperties>) => {
			this.invalidate();
		}));

		this.setProperties(properties);
	}

	public get id(): string | undefined {
		return this._properties.id;
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

	setProperties(this: WidgetBase<P>, properties: P) {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		this.diffPropertyFunctionMap.forEach((property: string, diffFunctionName: string) => {
			const previousProperty = this.previousProperties[property];
			const newProperty = properties[property];
			const self: { [index: string]: any } = this;
			const result: PropertyChangeRecord = self[diffFunctionName](previousProperty, newProperty);

			if (!result) {
				return;
			}

			if (result.changed) {
				diffPropertyChangedKeys.push(property);
			}
			delete properties[property];
			delete this.previousProperties[property];
			diffPropertyResults[property] = result.value;
		});

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

	public diffProperties(previousProperties: P, newProperties: P): PropertiesChangeRecord<P> {
		const changedKeys = Object.keys(newProperties).reduce((changedPropertyKeys: string[], propertyKey: string): string[] => {
			if (previousProperties[propertyKey] !== newProperties[propertyKey]) {
				changedPropertyKeys.push(propertyKey);
			}
			return changedPropertyKeys;
		}, []);

		return { changedKeys, properties: assign({}, newProperties) };
	}

	public render(): DNode {
		return v('div', {}, this.children);
	}

	protected __render__(): VNode | string | null {
		if (this.dirty || !this.cachedVNode) {
			const widget = this.dNodeToVNode(this.render());
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

	private bindFunctionProperties(properties: P): void {
		Object.keys(properties).forEach((propertyKey) => {
			const property = properties[propertyKey];
			const bind = properties.bind;

			if (typeof property === 'function') {
				const bindInfo = this.bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this.bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKey] = boundFunc;
			}
		});
	}

	private getFromRegistry(factoryLabel: string): Promise<WidgetBaseConstructor<WidgetProperties>> | WidgetBaseConstructor<WidgetProperties> | null {
		if (this.registry && this.registry.has(factoryLabel)) {
			return this.registry.get(factoryLabel);
		}
		return registry.get(factoryLabel);
	}

	private dNodeToVNode(dNode: DNode): VNode | string | null {

		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { factory } = dNode;
			let child: WidgetBase<WidgetProperties>;

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
					throw new Error();
				}
				factory = item;
			}

			const childrenMapKey = key || factory;
			let cachedChildren = this.cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;
			cachedChildren.some((cachedChildWrapper) => {
				if (cachedChildWrapper.factory === factory && !cachedChildWrapper.used) {
					cachedChild = cachedChildWrapper;
					return true;
				}
				return false;
			});

			if (!properties.hasOwnProperty('bind')) {
				properties.bind = this;
			}

			if (cachedChild) {
				child = cachedChild.child;
				child.setProperties(properties);
				cachedChild.used = true;
			}
			else {
				child = new factory({ properties });
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

		dNode.vNodes = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return this.dNodeToVNode(child);
		});

		return dNode.render({ bind: this });
	}

	private manageDetachedChildren(): void {
		this.cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren = cachedChildren.filter((cachedChild) => {
				if (cachedChild.used) {
					cachedChild.used = false;
					return true;
				}
				cachedChild.child.destroy();
				return false;
			});
			this.cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}
