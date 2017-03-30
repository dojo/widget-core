import { includes } from '@dojo/shim/array';
import { propagateProperty } from '../decorators/propagateProperty';
import { PropertyChangeRecord, PropertiesChangeEvent, Constructor, WidgetProperties } from '../interfaces';
import WidgetRegistry from '../WidgetRegistry';
import { WidgetBase, onPropertiesChanged, diffProperty } from '../WidgetBase';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: WidgetRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<RegistryMixinProperties>>>(base: T): T {
	@propagateProperty('registry')
	class Registry extends base {

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: WidgetRegistry, value: WidgetRegistry): PropertyChangeRecord {
			return {
				changed: previousValue !== value,
				value: value
			};
		}

		@onPropertiesChanged()
		protected onPropertiesChanged(evt: PropertiesChangeEvent<this, RegistryMixinProperties>) {
			if (includes(evt.changedPropertyKeys, 'registry')) {
				this.registry = evt.properties.registry;
			}
		}
	};
	return Registry;
}

export default RegistryMixin;
