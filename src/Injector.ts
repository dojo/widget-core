import { assign } from '@dojo/core/lang';
import { WidgetBase } from './WidgetBase';
import { Constructor, DNode, WidgetProperties } from './interfaces';

export interface GetProperties {
	<C, W extends WidgetProperties>(inject: C, properties: W): W;
}

export interface GetChildren {
	<C, W extends WidgetProperties>(inject: C, children: DNode[]): DNode[];
}

export interface InjectorProperties<P extends WidgetProperties> extends WidgetProperties {
	render(): DNode;
	getProperties: GetProperties;
	properties: P;
	getChildren: GetChildren;
	children: DNode[];
}

export class BaseInjector<C> extends WidgetBase<InjectorProperties<C>> {
	public toInject(): C {
		return <C> {};
	}
}

export function InjectorMixin<C, T extends Constructor<BaseInjector<C>>>(Base: T, context: C): Constructor<BaseInjector<any>> {

	class Injector extends Base {

		constructor(...args: any[]) {
			super(context);
		}

		protected render(): DNode {
			const {
				render,
				properties,
				getProperties,
				children,
				getChildren
			} = this.properties;

			assign(properties, getProperties(this.toInject(), properties));
			assign(children, getChildren(this.toInject(), children));

			return render();
		}

	};
	return Injector;
}
