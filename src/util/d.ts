import { DWrapper, VWrapper, WWrapper, Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';
import { ComposeFactory } from 'dojo-compose/compose';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { h } from 'maquette';

export type TagNameOrFactory = string | ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>>;

export type DOptions = VNodeProperties | WidgetOptions<WidgetState>;

function d(tagName: string, options?: VNodeProperties, children?: VNode[]): VWrapper;
function d(factory: ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>>, options: WidgetOptions<WidgetState>): WWrapper;
function d(tagNameOrFactory: TagNameOrFactory, options: DOptions = {}, children?: VNode[]): DWrapper {
	children = children ? children : [];

	if (typeof tagNameOrFactory === 'string') {
		return {
			children: children.filter((child: any) => child),
			render(this: { children: VNode[] }) {
				return h(<string> tagNameOrFactory, <VNodeProperties> options, this.children);
			}
		};
	}
	else if (typeof tagNameOrFactory === 'function') {
		return {
			factory: tagNameOrFactory,
			options: <WidgetOptions<WidgetState>> options
		};
	}
	else {
		throw new Error();
	}
}

export default d;
