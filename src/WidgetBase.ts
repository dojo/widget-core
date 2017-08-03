import { Evented } from '@dojo/core/Evented';
import { ProjectionOptions, VNodeProperties } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import '@dojo/shim/Promise'; // Imported for side-effects
import Set from '@dojo/shim/Set';
import WeakMap from '@dojo/shim/WeakMap';
import { isWNode, registry, v } from './d';
import { auto } from './diff';
import {
	AfterRender,
	BeforeRender,
	DiffPropertyFunction,
	DiffPropertyReaction,
	DNode,
	RegistryLabel,
	Render,
	VirtualDomNode,
	WidgetMetaConstructor,
	WidgetBaseConstructor,
	WidgetBaseInterface,
	WidgetProperties
} from './interfaces';
import MetaBase from './meta/Base';
import RegistryHandler from './RegistryHandler';
import { isWidgetBaseConstructor, WIDGET_BASE_TYPE } from './WidgetRegistry';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
	widgetConstructor: WidgetBaseConstructor;
	used: boolean;
}

enum WidgetRenderState {
	IDLE = 1,
	PROPERTIES,
	CHILDREN,
	RENDER
}

interface ReactionFunctionArguments {
	previousProperties: any;
	newProperties: any;
	changed: boolean;
}

interface ReactionFunctionConfig {
	propertyName: string;
	reaction: DiffPropertyReaction;
}

export type BoundFunctionData = { boundFunc: (...args: any[]) => any, scope: any };

const decoratorMap = new Map<Function, Map<string, any[]>>();

/**
 * Decorator that can be used to register a function to run as an aspect to `render`
 */
export function afterRender(method: Function): (target: any) => void;
export function afterRender(): (target: any, propertyKey: string) => void;
export function afterRender(method?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('afterRender', propertyKey ? target[propertyKey] : method);
	});
}

/**
 * Decorator that can be used to register a reducer function to run as an aspect before to `render`
 */
export function beforeRender(method: Function): (target: any) => void;
export function beforeRender(): (target: any, propertyKey: string) => void;
export function beforeRender(method?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('beforeRender', propertyKey ? target[propertyKey] : method);
	});
}

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName  The name of the property of which the diff function is applied
 * @param diffType      The diff type, default is DiffType.AUTO.
 * @param diffFunction  A diff function to run if diffType if DiffType.CUSTOM
 */
export function diffProperty(propertyName: string, diffFunction: DiffPropertyFunction, reactionFunction?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator(`diffProperty:${propertyName}`, diffFunction.bind(null));
		target.addDecorator('registeredDiffProperty', propertyName);
		if (reactionFunction || propertyKey) {
			target.addDecorator('diffReaction', {
				propertyName,
				reaction: propertyKey ? target[propertyKey] : reactionFunction
			});
		}
	});
}

/**
 * Generic decorator handler to take care of whether or not the decorator was called at the class level
 * or the method level.
 *
 * @param handler
 */
export function handleDecorator(handler: (target: any, propertyKey?: string) => void) {
	return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (typeof target === 'function') {
			handler(target.prototype, undefined);
		}
		else {
			handler(target, propertyKey);
		}
	};
}

const boundAuto = auto.bind(null);

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P = WidgetProperties, C extends DNode = DNode> extends Evented implements WidgetBaseInterface<P, C> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * children array
	 */
	private _children: (C | null)[];

	/**
	 * marker indicating if the widget requires a render
	 */
	private _dirty: boolean;

	/**
	 * cachedVNode from previous render
	 */
	private _cachedVNode?: VirtualDomNode | VirtualDomNode[];

	/**
	 * internal widget properties
	 */
	private _properties: P & WidgetProperties & { [index: string]: any };

	/**
	 * cached chldren map for instance management
	 */
	private _cachedChildrenMap: Map<RegistryLabel | Promise<WidgetBaseConstructor> | WidgetBaseConstructor, WidgetCacheWrapper[]>;

	/**
	 * map of specific property diff functions
	 */
	private _diffPropertyFunctionMap: Map<string, string>;

	/**
	 * map of decorators that are applied to this widget
	 */
	private _decoratorCache: Map<string, any[]>;

	private _registries: RegistryHandler;

	/**
	 * Map of functions properties for the bound function
	 */
	private _bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, BoundFunctionData>;

	private _renderState: WidgetRenderState = WidgetRenderState.IDLE;

	private _metaMap = new WeakMap<WidgetMetaConstructor<any>, MetaBase>();

	private _nodeMap = new Map<string, HTMLElement>();

	private _requiredNodes = new Set<string>();

	private _boundRenderFunc: Render;

	private _boundInvalidate: () => void;

	/**
	 * @constructor
	 */
	constructor() {
		super({});

		this._children = [];
		this._decoratorCache = new Map<string, any[]>();
		this._properties = <P> {};
		this._cachedChildrenMap = new Map<string | Promise<WidgetBaseConstructor> | WidgetBaseConstructor, WidgetCacheWrapper[]>();
		this._diffPropertyFunctionMap = new Map<string, string>();
		this._bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();
		this._registries = new RegistryHandler();
		this._registries.add(registry);
		this.own(this._registries);
		this._boundRenderFunc = this.render.bind(this);
		this._boundInvalidate = this.invalidate.bind(this);

		this.own(this._registries.on('invalidate', this._boundInvalidate));
		this._checkOnElementUsage();
	}

	protected meta<T extends MetaBase>(MetaType: WidgetMetaConstructor<T>): T {
		let cached = this._metaMap.get(MetaType);
		if (!cached) {
			cached = new MetaType({
				nodes: this._nodeMap,
				requiredNodes: this._requiredNodes,
				invalidate: this._boundInvalidate
			});
			this._metaMap.set(MetaType, cached);
		}

		return cached as T;
	}

	/**
	 * A render decorator that verifies nodes required in
	 * 'meta' calls in this render,
	 */
	@beforeRender()
	protected verifyRequiredNodes(renderFunc: () => DNode, properties: WidgetProperties, children: DNode[]): () => DNode {
		return () => {
			this._requiredNodes.forEach((element, key) => {
				if (!this._nodeMap.has(key)) {
					throw new Error(`Required node ${key} not found`);
				}
			});
			this._requiredNodes.clear();
			const dNodes = renderFunc();
			this._nodeMap.clear();
			return dNodes;
		};
	}

	/**
	 * vnode afterCreate callback that calls the onElementCreated lifecycle method.
	 */
	private _afterCreateCallback(
		element: Element,
		projectionOptions: ProjectionOptions,
		vnodeSelector: string,
		properties: VNodeProperties
	): void {
		this._setNode(element, properties);
		this.onElementCreated(element, String(properties.key));
	}

	/**
	 * vnode afterUpdate callback that calls the onElementUpdated lifecycle method.
	 */
	private _afterUpdateCallback(
		element: Element,
		projectionOptions: ProjectionOptions,
		vnodeSelector: string,
		properties: VNodeProperties
	): void {
		this._setNode(element, properties);
		this.onElementUpdated(element, String(properties.key));
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

	private _setNode(element: Element, properties: VNodeProperties): void {
		this._nodeMap.set(String(properties.key), <HTMLElement> element);
	}

	public get properties(): Readonly<P> & Readonly<WidgetProperties> {
		return this._properties;
	}

	public __setProperties__(originalProperties: this['properties']): void {
		const { bind, ...properties } = originalProperties as any;
		const changedPropertyKeys: string[] = [];
		const allProperties = [ ...Object.keys(properties), ...Object.keys(this._properties) ];
		const checkedProperties: string[] = [];
		const diffPropertyResults: any = {};
		const registeredDiffPropertyNames = this.getDecorator('registeredDiffProperty');
		let runReactions = false;

		this._renderState = WidgetRenderState.PROPERTIES;

		for (let i = 0; i < allProperties.length; i++) {
			const propertyName = allProperties[i];
			if (checkedProperties.indexOf(propertyName) > 0) {
				continue;
			}
			checkedProperties.push(propertyName);
			const previousProperty = this._properties[propertyName];
			const newProperty = this._bindFunctionProperty(properties[propertyName], bind);
			if (registeredDiffPropertyNames.indexOf(propertyName) !== -1) {
				runReactions = true;
				const diffFunctions = this.getDecorator(`diffProperty:${propertyName}`);
				for (let i = 0; i < diffFunctions.length; i++) {
					const result = diffFunctions[i](previousProperty, newProperty);
					if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
						changedPropertyKeys.push(propertyName);
					}
					if (propertyName in properties) {
						diffPropertyResults[propertyName] = result.value;
					}
				}
			}
			else {
				const result = boundAuto(previousProperty, newProperty);
				if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
					changedPropertyKeys.push(propertyName);
				}
				if (propertyName in properties) {
					diffPropertyResults[propertyName] = result.value;
				}
			}
		}

		if (runReactions) {
			this._mapDiffPropertyReactions(properties, changedPropertyKeys).forEach((args, reaction) => {
				if (args.changed) {
					reaction.call(this, args.previousProperties, args.newProperties);
				}
			});
		}

		this._properties = diffPropertyResults;

		if (changedPropertyKeys.length > 0) {
			this.invalidate();
		}
	}

	public get children(): (C | null)[] {
		return this._children;
	}

	public __setChildren__(children: (C | null)[]): void {
		this._renderState = WidgetRenderState.CHILDREN;
		if (this._children.length > 0 || children.length > 0) {
			this._children = children;
			this.invalidate();
		}
	}

	public __render__(): VirtualDomNode | VirtualDomNode[] {
		this._renderState = WidgetRenderState.RENDER;
		if (this._dirty === true || this._cachedVNode === undefined) {
			this._dirty = false;
			const render = this._runBeforeRenders();
			let dNode = render();
			dNode = this.runAfterRenders(dNode);
			const widget = this._dNodeToVNode(dNode);
			this._manageDetachedChildren();
			this._cachedVNode = widget;
			this._renderState = WidgetRenderState.IDLE;
			return widget;
		}
		this._renderState = WidgetRenderState.IDLE;
		return this._cachedVNode;
	}

	protected invalidate(): void {
		if (this._renderState === WidgetRenderState.IDLE) {
			this._dirty = true;
			this.emit({
				type: 'invalidated',
				target: this
			});
		}
		else if (this._renderState === WidgetRenderState.PROPERTIES) {
			this._dirty = true;
		}
		else if (this._renderState === WidgetRenderState.CHILDREN) {
			this._dirty = true;
		}
	}

	protected render(): DNode | DNode[] {
		return v('div', {}, this.children);
	}

	/**
	 * Function to add decorators to WidgetBase
	 *
	 * @param decoratorKey The key of the decorator
	 * @param value The value of the decorator
	 */
	protected addDecorator(decoratorKey: string, value: any): void {
		value = Array.isArray(value) ? value : [ value ];
		if (this.hasOwnProperty('constructor')) {
			let decoratorList = decoratorMap.get(this.constructor);
			if (!decoratorList) {
				decoratorList = new Map<string, any[]>();
				decoratorMap.set(this.constructor, decoratorList);
			}

			let specificDecoratorList = decoratorList.get(decoratorKey);
			if (!specificDecoratorList) {
				specificDecoratorList = [];
				decoratorList.set(decoratorKey, specificDecoratorList);
			}
			specificDecoratorList.push(...value);
		}
		else {
			const decorators = this.getDecorator(decoratorKey);
			this._decoratorCache.set(decoratorKey, [ ...decorators, ...value ]);
		}
	}

	/**
	 * Function to build the list of decorators from the global decorator map.
	 *
	 * @param decoratorKey  The key of the decorator
	 * @return An array of decorator values
	 * @private
	 */
	private _buildDecoratorList(decoratorKey: string): any[] {
		const allDecorators = [];

		let constructor = this.constructor;

		while (constructor) {
			const instanceMap = decoratorMap.get(constructor);
			if (instanceMap) {
				const decorators = instanceMap.get(decoratorKey);

				if (decorators) {
					allDecorators.unshift(...decorators);
				}
			}

			constructor = Object.getPrototypeOf(constructor);
		}

		return allDecorators;
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values
	 */
	protected getDecorator(decoratorKey: string): any[] {
		let allDecorators = this._decoratorCache.get(decoratorKey);

		if (allDecorators !== undefined) {
			return allDecorators;
		}

		allDecorators = this._buildDecoratorList(decoratorKey);

		this._decoratorCache.set(decoratorKey, allDecorators);
		return allDecorators;
	}

	private _mapDiffPropertyReactions(newProperties: any, changedPropertyKeys: string[]): Map<Function, ReactionFunctionArguments> {
		const reactionFunctions: ReactionFunctionConfig[] = this.getDecorator('diffReaction');

		return reactionFunctions.reduce((reactionPropertyMap, { reaction, propertyName }) => {
			let reactionArguments = reactionPropertyMap.get(reaction);
			if (reactionArguments === undefined) {
				reactionArguments = {
					previousProperties: {},
					newProperties: {},
					changed: false
				};
			}
			reactionArguments.previousProperties[propertyName] = this._properties[propertyName];
			reactionArguments.newProperties[propertyName] = newProperties[propertyName];
			if (changedPropertyKeys.indexOf(propertyName) !== -1) {
				reactionArguments.changed = true;
			}
			reactionPropertyMap.set(reaction, reactionArguments);
			return reactionPropertyMap;
		}, new Map<Function, ReactionFunctionArguments>());

	}

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private _bindFunctionProperty(property: any, bind: any): any {
		if (typeof property === 'function' && isWidgetBaseConstructor(property) === false) {
			const bindInfo: Partial<BoundFunctionData> = this._bindFunctionPropertyMap.get(property) || {};
			let { boundFunc, scope } = bindInfo;

			if (boundFunc === undefined || scope !== bind) {
				boundFunc = property.bind(bind) as (...args: any[]) => any;
				this._bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
			}
			return boundFunc;
		}
		return property;
	}

	protected getRegistries(): RegistryHandler {
		return this._registries;
	}

	/**
	 * Run all registered before renders and return the updated render method
	 */
	private _runBeforeRenders(): Render {
		const beforeRenders = this.getDecorator('beforeRender');

		if (beforeRenders.length > 0) {
			return beforeRenders.reduce((render: Render, beforeRenderFunction: BeforeRender) => {
				const updatedRender = beforeRenderFunction.call(this, render, this._properties, this._children);
				if (!updatedRender) {
					console.warn('Render function not returned from beforeRender, using previous render');
					return render;
				}
				return updatedRender;
			}, this._boundRenderFunc);
		}
		return this._boundRenderFunc;
	}

	/**
	 * Run all registered after renders and return the decorated DNodes
	 *
	 * @param dNode The DNodes to run through the after renders
	 */
	protected runAfterRenders(dNode: DNode | DNode[]): DNode | DNode[] {
		const afterRenders = this.getDecorator('afterRender');

		if (afterRenders.length > 0) {
			return afterRenders.reduce((dNode: DNode | DNode[], afterRenderFunction: AfterRender) => {
				return afterRenderFunction.call(this, dNode);
			}, dNode);
		}
		return dNode;
	}

	/**
	 * Process a structure of DNodes into VNodes, string or null. `null` results are filtered.
	 *
	 * @param dNode the dnode to process
	 * @returns a VNode, string or null
	 */
	private _dNodeToVNode(dNode: DNode): VirtualDomNode;
	private _dNodeToVNode(dNode: DNode[]): VirtualDomNode[];
	private _dNodeToVNode(dNode: DNode | DNode[]): VirtualDomNode | VirtualDomNode[];
	private _dNodeToVNode(dNode: DNode | DNode[]): VirtualDomNode | VirtualDomNode[] {
		if (typeof dNode === 'string' || dNode === null || dNode === undefined) {
			return dNode;
		}

		if (Array.isArray(dNode)) {
			return dNode.map((node) => this._dNodeToVNode(node));
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { widgetConstructor } = dNode;
			let child: WidgetBaseInterface<WidgetProperties>;

			if (!isWidgetBaseConstructor(widgetConstructor)) {
				const item = this.getRegistries().get(widgetConstructor);
				if (item === null) {
					return null;
				}
				widgetConstructor = <WidgetBaseConstructor> item;
			}

			const childrenMapKey = key || widgetConstructor;
			let cachedChildren = this._cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;

			for (let i = 0; i < cachedChildren.length; i++) {
				const cachedChildWrapper = cachedChildren[i];
				if (cachedChildWrapper.widgetConstructor === widgetConstructor && cachedChildWrapper.used === false) {
					cachedChild = cachedChildWrapper;
					break;
				}
			}

			if ((<any> properties).bind === undefined) {
				(<any> properties).bind = this;
			}

			if (cachedChild !== undefined) {
				child = cachedChild.child;
				child.__setProperties__(properties);
				cachedChild.used = true;
			}
			else {
				child = new widgetConstructor();
				child.__setProperties__(properties);
				child.own(child.on('invalidated', this._boundInvalidate));
				cachedChildren = [...cachedChildren, { child, widgetConstructor, used: true }];
				this._cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (typeof childrenMapKey !== 'string' && cachedChildren.length > 1) {
				const widgetName = (<any> childrenMapKey).name;
				let errorMsg = 'It is recommended to provide a unique \'key\' property when using the same widget multiple times';

				if (widgetName) {
					errorMsg = `It is recommended to provide a unique 'key' property when using the same widget (${widgetName}) multiple times`;
				}

				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			child.__setChildren__(children);
			return child.__render__();
		}

		if (dNode.properties.key !== undefined) {
			dNode.properties.afterCreate = this._afterCreateCallback;
			dNode.properties.afterUpdate = this._afterUpdateCallback;
		}

		if (dNode.properties.bind === undefined) {
			(<any> dNode).properties.bind = this;
		}

		dNode.vNodes = [];
		for (let i = 0; i < dNode.children.length; i++) {
			const child = dNode.children[i];
			if (child === null || child === undefined) {
				continue;
			}
			dNode.vNodes.push(this._dNodeToVNode(child));
		}

		return dNode.render();
	}

	/**
	 * Manage widget instances after render processing
	 */
	private _manageDetachedChildren(): void {
		this._cachedChildrenMap.forEach((cachedChildren, key) => {
			const filteredCacheChildren: WidgetCacheWrapper[] = [];
			for (let i = 0; i < cachedChildren.length; i++) {
				const cachedChild = cachedChildren[i];
				if (cachedChild.used === false) {
					cachedChild.child.destroy();
					continue;
				}
				cachedChild.used = false;
				filteredCacheChildren.push(cachedChild);
			}
			this._cachedChildrenMap.set(key, filteredCacheChildren);
		});
	}

	private _checkOnElementUsage() {
		const name = (<any> this).constructor.name || 'unknown';
		if (this.onElementCreated !== WidgetBase.prototype.onElementCreated) {
			console.warn(`Usage of 'onElementCreated' has been deprecated and will be removed in a future version, see https://github.com/dojo/widget-core/issues/559 for details (${name})`);
		}
		if (this.onElementUpdated !== WidgetBase.prototype.onElementUpdated) {
			console.warn(`Usage of 'onElementUpdated' has been deprecated and will be removed in a future version, see https://github.com/dojo/widget-core/issues/559 for details (${name})`);
		}
	}
}

export default WidgetBase;
