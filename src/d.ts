import { ComposeFactory } from 'dojo-compose/compose';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetState,
	WidgetOptions
} from './interfaces';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';

export type selectorOrFactory<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>> = string | ComposeFactory<W, O>;

export type DOptions<S extends WidgetState, O extends WidgetOptions<S>> = VNodeProperties | O;

export type Children = (DNode | VNode | null)[];

function d(selector: string, options: VNodeProperties, children?: Children): HNode;
function d(selector: string, children: Children): HNode;
function d(selector: string): HNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O, children: DNode[]): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	selectorOrFactory: selectorOrFactory<S, W, O>,
	optionsOrChildren: DOptions<S, O> = {},
	children: Children = []
): DNode {

	if (typeof selectorOrFactory === 'string') {
		if (selectorOrFactory.length === 0) {
			throw new Error('Invalid selector: cannot be empty string.');
		}

		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		children = children.filter((child) => child);

		return {
			children: children,
			render(this: { children: VNode[] }) {
				return h(<string> selectorOrFactory, <VNodeProperties> optionsOrChildren, this.children);
			}
		};
	}

	if (typeof selectorOrFactory === 'function') {
		return {
			children: <DNode[]> children,
			factory: selectorOrFactory,
			options: <WidgetOptions<WidgetState>> optionsOrChildren
		};
	}

	throw new Error('Unsupported selector or factory type');
}

export default d;
