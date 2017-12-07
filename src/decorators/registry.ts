import { handleDecorator } from './handleDecorator';

/**
 * Decorator that can be used to register a widget with the registry
 */
export function registry(name: string, loader: any) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('constructor', () => {
			target.registry.define(name, loader);
		});
	});
}

export default registry;
