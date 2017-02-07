import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent, PropertyChangeRecord } from './../interfaces';
import FactoryRegistry from '../FactoryRegistry';
import {
	WidgetBaseConstructor,
	WidgetOptions,
	WidgetProperties
} from '../WidgetBase';

/**
 * Properties required for the RegistryMixin
 */
export interface RegistryMixinProperties extends WidgetProperties {
	registry?: FactoryRegistry;
}

export function RegistryMixin(base: WidgetBaseConstructor<RegistryMixinProperties>) {
	return class extends base {
		constructor(options: WidgetOptions<RegistryMixinProperties>) {
			super(options);
			this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<this, RegistryMixinProperties>) => {
				if (includes(evt.changedPropertyKeys, 'registry')) {
					this.registry = evt.properties.registry;
				}
			}));
			const { properties: { registry } } = this;
			if (registry) {
				this.registry = registry;
			}
		}

		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			return {
				changed: previousValue !== value,
				value: value
			};
		}
	};
}
