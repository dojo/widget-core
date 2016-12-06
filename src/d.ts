import { ComposeFactory } from 'dojo-compose/compose';
import {
	Children,
	DNode,
	HNode,
	WNode,
	Widget,
	WidgetOptions,
	WidgetState
} from './interfaces';
import w from './w';
import v from './v';
import { VNodeProperties } from 'dojo-interfaces/vdom';

export type TagNameOrFactory<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>> = string | ComposeFactory<W, O>;

export type DOptions<S extends WidgetState, O extends WidgetOptions<S>> = VNodeProperties | O;

function d(tagName: string, options: VNodeProperties, children?: Children): HNode;
function d(tagName: string, children: Children): HNode;
function d(tagName: string): HNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(factory: ComposeFactory<W, O>, options: O, children: Children): WNode;
function d<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	tagNameOrFactory: TagNameOrFactory<S, W, O>,
	optionsOrChildren: DOptions<S, O> = {},
	children: Children = []
): DNode {

	if (typeof tagNameOrFactory === 'string') {
		return v(tagNameOrFactory, <VNodeProperties> optionsOrChildren, children);
	}

	if (typeof tagNameOrFactory === 'function') {
		return w(tagNameOrFactory, <WidgetOptions<WidgetState>> optionsOrChildren, children);
	}

	throw new Error('Unsupported tagName or factory type');
}

export default d;
