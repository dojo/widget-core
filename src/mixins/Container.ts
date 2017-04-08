import { WidgetBase, beforeRender } from './../WidgetBase';
import { w } from './../d';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { GetProperties, GetChildren, InjectorProperties } from './../Injector';

export interface Mappers {
	getProperties: GetProperties;
	getChildren: GetChildren;
}

const defautMappers: Mappers = {
	getProperties(inject: any) { return {}; },
	getChildren(inject: any) { return []; }
};

export function Container<P extends WidgetProperties, T extends Constructor<WidgetBase<P>>>(
	Base: T,
	name: string,
	{ getProperties = defautMappers.getProperties, getChildren = defautMappers.getChildren }: any = defautMappers
): T {

	class Container extends Base {
		@beforeRender()
		protected beforeRender(renderFunc: Function, properties: P, children: DNode[]) {
			return () => {
				return w<InjectorProperties<P>>(name, {
					getProperties,
					getChildren,
					properties,
					children,
					render: super.render
				});
			};

		}
	}
	return Container;
}
