import { Handle, EventTargettedObject } from 'dojo-interfaces/core';
import { EventedListener } from 'dojo-interfaces/bases';
import { ComposeFactory } from 'dojo-compose/compose';
import createStateful from 'dojo-compose/bases/createStateful';
import { h, VNode, VNodeProperties } from 'maquette';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';

import { WidgetMixin, Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {}

interface WidgetInternalState {
	id?: string;
	dirty: boolean;
	widgetClasses: string[];
	cachedWidget?: VNode;
};

const widgetInternalStateMap = new WeakMap<Widget<WidgetState>, WidgetInternalState>();

const createWidget: WidgetFactory = createStateful
	.mixin<WidgetMixin, WidgetOptions<WidgetState>>({
		mixin: {
			childNodeRenderers: [],

			classes: [],

			getChildrenNodes(this: Widget<WidgetState>): (VNode | string)[] {
				let childrenNodes: (VNode | string)[] = [];

				this.childNodeRenderers.forEach((fn) => {
					const nodes = fn.call(childrenNodes);
					childrenNodes = childrenNodes.concat(nodes);
				});

				return childrenNodes;
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
				let { dirty } = widgetInternalStateMap.get(this);
				if (dirty) {
					return;
				}
				const parent = (<any> this).parent;
				dirty = true;
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

					let { widgetClasses } = widgetInternalStateMap.get(this);

					widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						widgetClasses =  this.state.classes;
					}

					return assign(baseIdProp, { key: this, classes, styles });
				}

			],

			on(type: 'invalidated', listener: EventedListener<Widget<WidgetState>, EventTargettedObject<Widget<WidgetState>>>): Handle {
				return {} as Handle;
			},

			render(this: Widget<WidgetState>): VNode {
				let { cachedWidget, dirty } = widgetInternalStateMap.get(this);
				if (dirty || !cachedWidget) {
					const widget = h(this.tagName, this.getNodeAttributes(), this.getChildrenNodes());
					cachedWidget = widget;
					dirty = false;
				}
				return cachedWidget;
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
				widgetClasses: []
			});

			instance.own(instance.on('state:initialized', () => instance.invalidate()));
			instance.own(instance.on('state:changed', () => instance.invalidate()));
		}
	});

export default createWidget;
