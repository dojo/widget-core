import { ComposeFactory } from 'dojo-compose/compose';
import { assign } from 'dojo-core/lang';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';
import {
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetOptions,
	WidgetState,
	WidgetProps
} from './interfaces';
import FactoryRegistry from './FactoryRegistry';

export const registry = new FactoryRegistry();

export function w<P extends WidgetProps, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	props: P
): WNode;
export function w<P extends WidgetProps, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	props: P,
	children?: DNode[]
): WNode;
export function w<P extends WidgetProps, S extends WidgetState, W extends Widget<S, P>, O extends WidgetOptions<S, P>>(
	factory: ComposeFactory<W, O> | string,
	props: P,
	children: DNode[] = []
): WNode {

	const options = <O> {
		props
	};

	if (props.id) {
		options.id = props.id;
	}

	if (props.tagName) {
		options.tagName = props.tagName;
	}

	return {
		children,
		factory,
		options
	};
}

export function v(tag: string, props: VNodeProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propsOrChildren: VNodeProperties = {}, children: DNode[] = []): HNode {

		if (Array.isArray(propsOrChildren)) {
			children = propsOrChildren;
			propsOrChildren = {};
		}

		return {
			children,
			render<T>(this: { children: VNode[] }, options: { bind?: T } = { }) {
				return h(tag, assign(options, propsOrChildren), this.children);
			}
		};
}
