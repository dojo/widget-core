import { ComposeFactory } from 'dojo-compose/compose';
import { VNode } from 'maquette';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import createWidgetBase from '../bases/createWidgetBase';

import { VWrapper, DWrapper, WWrapper, Widget, WidgetState, WidgetOptions, CompositeMixin, CompositeWidget } from 'dojo-interfaces/widgetBases';
import { Factory } from 'dojo-interfaces/core';

export interface CompositeWidgetFactory extends ComposeFactory<CompositeWidget<WidgetState>, WidgetOptions<WidgetState>> {}

interface CompositeInternalState {
	historicChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
	currentChildrenMap: Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>;
};

function isWWrapper(child: VWrapper | WWrapper): child is WWrapper {
	return (<WWrapper> child).factory !== undefined;
}

const compositeInternalStateMap = new WeakMap<CompositeWidget<WidgetState>, CompositeInternalState>();

const createCompositeWidget: CompositeWidgetFactory = createWidgetBase
	.mixin<CompositeMixin, WidgetOptions<WidgetState>>({
		mixin: {
			children: [],

			getVNode(this: CompositeWidget<WidgetState>, dWrapper: DWrapper): VNode {
				const internalState = compositeInternalStateMap.get(this);
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

			pruneChildren(this: CompositeWidget<WidgetState>): void {
				const internalState = compositeInternalStateMap.get(this);

				internalState.historicChildrenMap.forEach((child, key) => {
					if (!internalState.currentChildrenMap.has(key)) {
						internalState.historicChildrenMap.delete(key);
						child.destroy();
					}
				});
				internalState.currentChildrenMap.clear();
			}
		},
		initialize(instance: CompositeWidget<WidgetState>) {
			const internalState = {
				historicChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>(),
				currentChildrenMap: new Map<string | Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>, Widget<WidgetState>>()
			};
			compositeInternalStateMap.set(instance, internalState);
		}
	})
	.extend({
		getChildrenNodes(this: CompositeWidget<WidgetState>): VNode[] {
			let children: DWrapper[] = [];
			this.children.map((nodeFunction) => {
				children = children.concat(nodeFunction.call(this));
			});
			const vNodes: VNode[] = children.map((dWrapper) => this.getVNode(dWrapper));
			this.pruneChildren();
			return vNodes;
		}
	});

export default createCompositeWidget;
