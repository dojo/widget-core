import { Handle } from 'dojo-core/interfaces';
import { List, Map } from 'immutable';
import { Renderable } from './createRenderable';

export type Child = Renderable;

export interface ChildListEvent<T, C extends Child> {
	children: Map<string, C> | List<C>;
	target: T;
	type: 'childlist'
}

export interface Parent {
	append(child: Child | Child[]): Handle;
}