import { WidgetBase, beforeRender } from './../WidgetBase';
import { w } from './../d';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { GetProperties, GetChildren, InjectorProperties } from './../Injector';

/**
 * The binding mappers for properties and children
 */
export interface Mappers {
	getProperties: GetProperties;
	getChildren: GetChildren;
}

/**
 * Default noop Mappers for the container.
 */
const defaultMappers: Mappers = {
	getProperties(inject: any, properties: any): any {
		return {};
	},
	getChildren(inject: any, children: DNode[]): DNode[] {
		return [];
	}
};

/**
 * Given the registered name of an Injector entry with property and child binding mappers, the
 * container proxies the provided Widget and modifies the properties and children with the
 * instructions provided by the mappers using the context provided by the registered Injector.
 */
export function Container<P extends WidgetProperties, T extends Constructor<WidgetBase<P>>>(
	Base: T,
	name: string,
	{ getProperties = defaultMappers.getProperties, getChildren = defaultMappers.getChildren }: any = defaultMappers
): T {

	class Container extends Base {
		@beforeRender()
		protected beforeRender(renderFunc: Function, properties: P, children: DNode[]) {
			return () => {
				return w<InjectorProperties>(name, {
					render: super.render,
					getProperties,
					properties,
					getChildren,
					children
				});
			};
		}
	}
	return Container;
}

export default Container;
