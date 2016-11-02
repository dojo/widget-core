import { ComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import {
	VWrapper,
	DWrapper,
	WWrapper,
	Widget,
	WidgetMixin,
	WidgetState,
	WidgetOptions
} from 'dojo-interfaces/widgetBases';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { Factory } from 'dojo-interfaces/core';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';
import d from './../util/d';

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {}

interface WidgetInternalState {
	readonly id?: string;
	dirty: boolean;
	widgetClasses: string[];
	cachedWidget?: VNode;
	historicChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
	currentChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
};

const widgetInternalStateMap = new WeakMap<Widget<WidgetState>, WidgetInternalState>();

function isWWrapper(child: VWrapper | WWrapper): child is WWrapper {
	return child && (<WWrapper> child).factory !== undefined;
}

const createWidget: WidgetFactory = createStateful
	.mixin<WidgetMixin, WidgetOptions<WidgetState>>({
		mixin: {
			childNodeRenderers: [],

			classes: [],

			getVNode(this: Widget<WidgetState>, dWrapper: DWrapper): VNode {
				const internalState = widgetInternalStateMap.get(this);
				let child: VWrapper | Widget<WidgetState>;
				if (isWWrapper(dWrapper)) {
					const { factory, options: { id, state } } = dWrapper;
					const cachedChild = internalState.historicChildrenMap.get(id || factory);
					if (cachedChild) {
						child = cachedChild;
						if (state) {
							child.setState(state);
						}
					} else {
						child = factory(dWrapper.options);
						internalState.historicChildrenMap.set(id || factory, child);
						this.own(child);
					}
					if (!id && internalState.currentChildrenMap.has(factory)) {
						console.error('must provide unique keys when using the same widget factory multiple times');
					}
					internalState.currentChildrenMap.set(id || factory, child);
				}
				else {
					child = dWrapper;
					if (child.children) {
						child.children = child.children.map((child: DWrapper) => {
							return this.getVNode(child);
						});
					}
				}
				return child.render();
			},

			pruneChildren(this: Widget<WidgetState>): void {
				const internalState = widgetInternalStateMap.get(this);

				internalState.historicChildrenMap.forEach((child, key) => {
					if (!internalState.currentChildrenMap.has(key)) {
						internalState.historicChildrenMap.delete(key);
						console.log(`destory widget ${child.id}`);
						child.destroy();
					}
				});
				internalState.currentChildrenMap.clear();
			},

			getChildrenNodes(this: Widget<WidgetState>): DWrapper[] {
				let childrenWrappers: DWrapper[] = [];

				this.childNodeRenderers.forEach((fn) => {
					const wrappers = fn.call(this);
					childrenWrappers = childrenWrappers.concat(wrappers);
				});

				return childrenWrappers.filter((child) => child);
			},

			getNodeAttributes(this: Widget<WidgetState>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this, assign({}, props));
					if (newProps) {
						assign(props, newProps);
					}
				});

				if (overrides) {
					assign(props, overrides);
				}
				return props;
			},

			invalidate(this: Widget<WidgetState>): void {
				const internalState = widgetInternalStateMap.get(this);
				if (internalState.dirty) {
					return;
				}
				const parent = (<any> this).parent;
				internalState.dirty = true;
				if (parent && parent.invalidate) {
					parent.invalidate();
				}
			},

			get id(this: Widget<WidgetState>): string {
				const { id } = widgetInternalStateMap.get(this);

				return id || (this.state && this.state.id) || '';
			},

			nodeAttributes: [
				function (this: Widget<WidgetState>): VNodeProperties {
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state;
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

			render(this: Widget<WidgetState>): VNode {
				const internalState = widgetInternalStateMap.get(this);
				if (internalState.dirty || !internalState.cachedWidget) {
					const dWrapper = d(this.tagName, this.getNodeAttributes(), this.getChildrenNodes());
					const widget = this.getVNode(dWrapper);
					internalState.cachedWidget = widget;
					internalState.dirty = false;
				}
				return internalState.cachedWidget;
			},

			tagName: 'div'
		},
		initialize(instance: Widget<WidgetState>, options: WidgetOptions<WidgetState> = {}) {
			const { id, tagName, parent } = options;
			instance.tagName = tagName || instance.tagName;

			if (parent) {
				parent.append(instance);
			}

			widgetInternalStateMap.set(instance, {
				id,
				dirty: true,
				widgetClasses: [],
				historicChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>(),
				currentChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>()
			});

			instance.own(instance.on('state:initialized', instance.invalidate));
			instance.own(instance.on('state:changed', instance.invalidate));
		}
	});

export default createWidget;
