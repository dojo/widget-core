import { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-shim/Promise';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetOptions,
	WidgetState,
	WidgetFactory
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export let defaultFactoryRegistry = new FactoryRegistry();

export function setDefaultFactoryRegistry(factoryRegistry: FactoryRegistry) {
	defaultFactoryRegistry = factoryRegistry;
}

export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O,
	children?: DNode[]
): WNode;
export function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O,
	children: DNode[] = []
): WNode {

	let widgetFactory: WidgetFactory | Promise<WidgetFactory>;

	if (typeof factory === 'string') {
		const registry = options.factoryRegistry || defaultFactoryRegistry;
		widgetFactory = registry.get(factory);
	}
	else {
		widgetFactory = factory;
	}

	return {
		children,
		factory: widgetFactory,
		options
	};
}

export function v(tag: string, options: VNodeProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, optionsOrChildren: VNodeProperties = {}, children: DNode[] = []): HNode {

		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		return {
			children,
			render(this: { children: VNode[] }) {
				return h(tag, optionsOrChildren, this.children);
			}
		};
}
