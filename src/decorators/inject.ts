import WeakMap from '@dojo/shim/WeakMap';
import { handleDecorator, WidgetBase } from './../WidgetBase';
import { Injector } from './../Injector';
import { beforeProperties } from './beforeProperties';
import { RegistryLabel } from './../interfaces';

/**
 * Map of instances against registered injectors.
 */
const registeredInjectorsMap: WeakMap<WidgetBase, Injector[]> = new WeakMap();

/**
 * Defines the contract requires for the get properties function
 * used to map the injected properties.
 */
export interface GetProperties<T = any> {
	(context: any, properties: T): T;
}

/**
 * Defines the inject configuration required for use of the `inject` decorator
 */
export interface InjectConfig {

	/**
	 * The label of the registry injector
	 */
	name: RegistryLabel;

	/**
	 * Function that returns propertues to inject using the passed properties
	 * and the injected context.
	 */
	getProperties: GetProperties;
}

/**
 * Decorator retrieves a context from an available registry using the name and
 * returns calls the `getProperties` function with the existing found context
 * and passed properties to return the injected properties.
 *
 * @param InjectConfig the inject configuration
 */
export function inject({ name, getProperties }: InjectConfig) {
	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase, properties: any) {
			const injector = this.registries.getInjector(name);
			if (injector) {
				const registeredInjectors = registeredInjectorsMap.get(this) || [];
				if (registeredInjectors.length === 0) {
					registeredInjectorsMap.set(this, registeredInjectors);
				}
				if (registeredInjectors.indexOf(injector) === -1) {
					injector.on('invalidate', () => {
						this.emit({ type: 'invalidated', target: this });
					});
					registeredInjectors.push(injector);
				}
				return getProperties(injector.get(), properties);
			}
		})(target);
	});
}
