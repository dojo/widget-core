import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import WidgetRegistry, { WidgetRegistryEventObject } from './WidgetRegistry';

export default class RegistryHandler extends Evented {
	private _registries: { handle?: any, registry: WidgetRegistry }[] = [];

	add(registry: WidgetRegistry) {
		this._registries.unshift({ registry });
	}

	remove(registry: WidgetRegistry): boolean {
		return this._registries.some((registryWrapper, i) => {
			if (registryWrapper.registry === registry) {
				registry.destroy();
				this._registries.splice(i, 1);
				return true;
			}
			return false;
		});
	}

	replace(original: WidgetRegistry, replacement: WidgetRegistry): boolean {
		return this._registries.some((registryWrapper, i) => {
			if (registryWrapper.registry === original) {
				original.destroy();
				registryWrapper.registry = replacement;
				return true;
			}
			return false;
		});
	}

	has(widgetLabel: RegistryLabel): boolean {
		return this._registries.some((registryWrapper) => {
			return registryWrapper.registry.has(widgetLabel);
		});
	}

	get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null {
		for (let i = 0; i < this._registries.length; i++) {
			const registryWrapper = this._registries[i];
			const item = registryWrapper.registry.get<T>(widgetLabel);
			if (item) {
				return item;
			}
			else if (!registryWrapper.handle) {
				registryWrapper.handle = registryWrapper.registry.on(widgetLabel, (event: WidgetRegistryEventObject) => {
					if (event.action === 'loaded') {
						this.emit({ type: 'invalidate' });
						registryWrapper.handle.destroy();
						registryWrapper.handle = undefined;
					}
				});
			}
		}
		return null;
	}
}
