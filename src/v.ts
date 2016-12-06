import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';
import { Children, HNode, DNode } from './interfaces';
import { h } from 'maquette';

function v(tag: string, options: VNodeProperties, children?: Children): HNode;
function v(tag: string, children: Children): HNode;
function v(tag: string): HNode;
function v(tag: string, optionsOrChildren: VNodeProperties = {}, children: Children = []): HNode {

		if (Array.isArray(optionsOrChildren)) {
			children = optionsOrChildren;
			optionsOrChildren = {};
		}

		const filteredChildren = <DNode[]> children.filter((child) => child);

		return {
			children: filteredChildren,
			render(this: { children: VNode[] }) {
				return h(tag, optionsOrChildren, this.children);
			}
		};
}

export default v;
