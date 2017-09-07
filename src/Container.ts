import { WidgetBase } from './WidgetBase';
import { inject, GetProperties } from './decorators/inject';
import { Constructor, DNode, RegistryLabel } from './interfaces';
import { w } from './d';
import { isWidgetBaseConstructor } from './Registry';

export type Container<T extends WidgetBase> = Constructor<WidgetBase<Partial<T['properties']>>>;

export function Container<W extends WidgetBase> (
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	{ getProperties }: { getProperties: GetProperties }
): Container<W> {

	if (!isWidgetBaseConstructor(component)) {
		@inject({ name, getProperties })
		class RegistryItemContainer extends WidgetBase<Partial<W['properties']>> {
			protected render(): DNode {
				return w(component, this.properties, this.children);
			}
		}
		return RegistryItemContainer;
	}

	const Component: Constructor<WidgetBase<Partial<W['properties']>>> = component as any;
	@inject({ name, getProperties })
	class WidgetContainer extends Component { }
	return WidgetContainer;
}

export default Container;
