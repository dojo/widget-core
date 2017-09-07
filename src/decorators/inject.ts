import WeakMap from '@dojo/shim/WeakMap';
import { handleDecorator, WidgetBase } from './../WidgetBase';
import { beforeProperties } from './beforeProperties';
import { RegistryLabel } from './../interfaces';

const registeredInjectorsMap: WeakMap<WidgetBase, any[]> = new WeakMap();

export interface GetProperties<T = any> {
	(context: any, properties: T): T;
}

export interface InjectConfig {
	name: RegistryLabel;
	getProperties: GetProperties;
}

export function inject({ name, getProperties }: InjectConfig) {
	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase, properties: any) {
			const context = this.registries.getInjector(name);
			if (context) {
				const registeredInjectors = registeredInjectorsMap.get(this) || [];
				if (registeredInjectors.length === 0) {
					registeredInjectorsMap.set(this, registeredInjectors);
				}
				if (registeredInjectors.indexOf(context) === -1) {
					context.on('invalidate', () => {
						this.emit({ type: 'invalidated', target: this });
					});
					registeredInjectors.push(context);
				}
				return getProperties(context.get(), properties);
			}
		})(target);
	});
}
