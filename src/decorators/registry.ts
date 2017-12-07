import { handleDecorator } from './handleDecorator';

export interface RegistryConfig {
	[ name: string ]: () => Promise<any>;
}

/**
 * Decorator that can be used to register a widget with the registry
 */
export function registry(nameOrConfig: string | RegistryConfig, loader?: () => Promise<any>) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('constructor', function(this: any) {
			if (typeof nameOrConfig === 'string') {
				this.registry.define(nameOrConfig, loader);
			} else {
				Object.keys(nameOrConfig).forEach(name => {
					this.registry.define(name, nameOrConfig[name]);
				});
			}
		});
	});
}

export default registry;
