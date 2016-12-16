import { isComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import {
	DNode,
	WNode,
	Widget,
	WidgetMixin,
	WidgetState,
	WidgetOptions,
	WidgetProps,
	WidgetFactory,
	FactoryRegistryItem
} from './interfaces';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';
import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import { v, registry } from './d';
import FactoryRegistry from './FactoryRegistry';
import createVNodeEvented from './mixins/createVNodeEvented';

interface WidgetInternalState {
	children: DNode[];
	readonly id: string;
	dirty: boolean;
	widgetClasses: string[];
	cachedVNode?: VNode | string;
	factoryRegistry: FactoryRegistry;
	initializedFactoryMap: Map<string, Promise<WidgetFactory>>;
	previousProps: any;
	historicChildrenMap: Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProps>>;
	currentChildrenMap: Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProps>>;
};

/**
 * Internal state map for widget instances
 */
const widgetInternalStateMap = new WeakMap<Widget<WidgetState, WidgetProps>, WidgetInternalState>();

/**
 * The counter for generating a unique ID
 */
let widgetCount = 0;

function generateID(instance: Widget<WidgetState, WidgetProps>): string {
	return `widget-${++widgetCount}`;
}

function isWNode(child: DNode): child is WNode {
	return Boolean(child && (<WNode> child).factory !== undefined);
}

function getFromRegistry(instance: Widget<WidgetState, WidgetProps>, factoryLabel: string): FactoryRegistryItem | null {
	if (instance.registry.has(factoryLabel)) {
		return instance.registry.get(factoryLabel);
	}

	return registry.get(factoryLabel);
}

function dNodeToVNode(instance: Widget<WidgetState, WidgetProps>, dNode: DNode): VNode | string | null {
	const internalState = widgetInternalStateMap.get(instance);

	if (typeof dNode === 'string' || dNode === null) {
		return dNode;
	}

	if (isWNode(dNode)) {
		const { children, options: { id, props } } = dNode;

		let { factory } = dNode;
		let child: Widget<WidgetState, WidgetProps>;

		if (typeof factory === 'string') {
			const item = getFromRegistry(instance, factory);

			if (isComposeFactory(item)) {
				factory = <WidgetFactory> item;
			}
			else {
				if (item && !internalState.initializedFactoryMap.has(factory)) {
					const promise = (<Promise<WidgetFactory>> item).then((factory) => {
						instance.invalidate();
						return factory;
					});
					internalState.initializedFactoryMap.set(factory, promise);
				}
				return null;
			}
		}

		const childrenMapKey = id || factory;
		const cachedChild = internalState.historicChildrenMap.get(childrenMapKey);

		if (cachedChild) {
			child = cachedChild;
			if (props) {
				child.props = props;
			}
		}
		else {
			child = factory(dNode.options);
			child.own(child.on('invalidated', () => {
				instance.invalidate();
			}));
			internalState.historicChildrenMap.set(childrenMapKey, child);
			instance.own(child);
		}
		if (!id && internalState.currentChildrenMap.has(factory)) {
			const errorMsg = 'must provide unique keys when using the same widget factory multiple times';
			console.error(errorMsg);
			instance.emit({ type: 'error', target: instance, error: new Error(errorMsg) });
		}

		child.children = children;
		internalState.currentChildrenMap.set(childrenMapKey, child);

		return child.__render__();
	}

	dNode.children = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return dNodeToVNode(instance, child);
		});

	return dNode.render({ bind: instance });
}

function manageDetachedChildren(instance: Widget<WidgetState, WidgetProps>): void {
	const internalState = widgetInternalStateMap.get(instance);

	internalState.historicChildrenMap.forEach((child, key) => {
		if (!internalState.currentChildrenMap.has(key)) {
			internalState.historicChildrenMap.delete(key);
			child.destroy();
		}
	});
	internalState.currentChildrenMap.clear();
}

function formatTagNameAndClasses(tagName: string, classes: string[]) {
	if (classes.length) {
		return `${tagName}.${classes.join('.')}`;
	}
	return tagName;
}

function generateProps(instance: Widget<WidgetState, WidgetProps>, previousProps: any): any {
	const changedPropertyKeys = instance.diffProps(previousProps);
	const changedProps: { currentProps: any, previousProps: any } = {
		currentProps: {},
		previousProps: {}
	};

	changedPropertyKeys.forEach((key) => {
			changedProps.currentProps[key] = instance.props[key];
		if (previousProps[key]) {
			changedProps.previousProps[key] = previousProps[key];
		}
	});

	return changedProps;
}

const createWidget: WidgetFactory = createStateful
	.mixin(createVNodeEvented)
	.mixin<WidgetMixin<WidgetProps>, WidgetOptions<WidgetState, WidgetProps>>({
		mixin: {
			props: {},

			classes: [],

			getNode(): DNode {
				const tag = formatTagNameAndClasses(this.tagName, this.classes);
				return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
			},

			set children(this: Widget<WidgetState, WidgetProps>, children: DNode[]) {
				const internalState = widgetInternalStateMap.get(this);
				internalState.children = children;
				this.emit({
					type: 'widget:children',
					target: this
				});
			},

			get children() {
				return widgetInternalStateMap.get(this).children;
			},

			getChildrenNodes(this: Widget<WidgetState, WidgetProps>): DNode[] {
				return this.children;
			},

			getNodeAttributes(this: Widget<WidgetState, WidgetProps>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this);
					if (newProps) {
						assign(props, newProps);
					}
				});

				return props;
			},

			invalidate(this: Widget<WidgetState, WidgetProps>): void {
				const internalState = widgetInternalStateMap.get(this);
				internalState.dirty = true;
				this.emit({
					type: 'invalidated',
					target: this
				});
			},

			get id(this: Widget<WidgetState, WidgetProps>): string {
				const { id } = widgetInternalStateMap.get(this);

				return id;
			},

			processPropsChange: function(this: Widget<WidgetState, WidgetProps>, previousProps: any, currentProps): void {
				if (Object.keys(currentProps).length) {
					this.state = currentProps;
				}
			},

			diffProps(this: Widget<WidgetState, WidgetProps>, previousProps: any): string[] {
				const changedPropertyKeys: string[] = [];
				Object.keys(this.props).forEach((key) => {
					if (previousProps[key]) {
						if (previousProps[key] !== this.props[key]) {
							changedPropertyKeys.push(key);
						}
					}
					else {
						changedPropertyKeys.push(key);
					}
				});
				return changedPropertyKeys;
			},

			nodeAttributes: [
				function (this: Widget<WidgetState, WidgetProps>): VNodeProperties {
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state || {};
					const classes: { [index: string]: boolean; } = {};

					const internalState = widgetInternalStateMap.get(this);

					internalState.widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						internalState.widgetClasses =  this.state.classes;
					}

					return assign(baseIdProp, { key: this, classes, styles });
				}

		],

			__render__(this: Widget<WidgetState, WidgetProps>): VNode | string | null {
				const internalState = widgetInternalStateMap.get(this);
				const updatedProps = generateProps(this, internalState.previousProps);
				this.processPropsChange(updatedProps.previousProps, updatedProps.currentProps);

				if (internalState.dirty || !internalState.cachedVNode) {
					const widget = dNodeToVNode(this, this.getNode());
					manageDetachedChildren(this);
					if (widget) {
						internalState.cachedVNode = widget;
					}
					internalState.dirty = false;
					internalState.previousProps = this.props;
					return widget;
				}
				return internalState.cachedVNode;
			},

			get registry(this: Widget<WidgetState, WidgetProps>): FactoryRegistry {
				return widgetInternalStateMap.get(this).factoryRegistry;
			},

			tagName: 'div'
		},
		initialize(instance: Widget<WidgetState, WidgetProps>, options: WidgetOptions<WidgetState, { id?: string }> = {}) {
			const { tagName, props = {} } = options;
			const id = props.id || options.id || generateID(instance);

			if (!props.id) {
				props.id = id;
			}

			instance.props = props;
			instance.tagName = tagName || instance.tagName;
			instance.processPropsChange({}, props);

			widgetInternalStateMap.set(instance, {
				id,
				dirty: true,
				widgetClasses: [],
				previousProps: props,
				factoryRegistry: new FactoryRegistry(),
				initializedFactoryMap: new Map<string, Promise<WidgetFactory>>(),
				historicChildrenMap: new Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProps>>(),
				currentChildrenMap: new Map<string | Promise<WidgetFactory> | WidgetFactory, Widget<WidgetState, WidgetProps>>(),
				children: []
			});

			instance.own(instance.on('state:changed', () => {
				instance.invalidate();
			}));
		}
	});

export default createWidget;
