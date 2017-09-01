import { RegistryLabel } from './../interfaces';
import { WidgetRegistryItem } from './../WidgetRegistry';
import { handleDecorator } from './../WidgetBase';

/**
 * The shape of the decorator configuration.
 */
export interface DefineDecoratorConfig {
	label: RegistryLabel;
	item: WidgetRegistryItem;
}

/**
 * Decorator function to registry items that will be defined against
 * the default registry of a widget.
 *
 * @param label The label of the registry item
 * @param item The registry item to define
 */
export function define(label: RegistryLabel, item: WidgetRegistryItem) {
	return handleDecorator((target) => {
		target.addDecorator('registryItem', { label, item });
	});
}

export default define;
