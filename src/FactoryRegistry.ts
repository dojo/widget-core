import { isComposeFactory } from 'dojo-compose/compose';
import {
	FactoryRegistryInterface,
	FactoryRegistryItem,
	WidgetFactoryFunction
} from './interfaces';

export default class FactoryRegistry implements FactoryRegistryInterface {
	protected registry: Map<string, FactoryRegistryItem>;

	constructor() {
		this.registry = new Map<string, FactoryRegistryItem>();
	}

	has(factoryLabel: string): boolean {
		return this.registry.has(factoryLabel);
	}

	define(factoryLabel: string, registryItem: FactoryRegistryItem): void {
		if (this.registry.has(factoryLabel)) {
			throw new Error(`factory has already been registered for '${factoryLabel}'`);
		}
		this.registry.set(factoryLabel, registryItem);
	}

	get(factoryLabel: string): any {
		if (!this.has(factoryLabel)) {
			throw new Error(`No factory has been registered for '${factoryLabel}'`);
		}

		const item = this.registry.get(factoryLabel);

		if (isComposeFactory(item) || item instanceof Promise) {
			return item;
		}

		const promise = (<WidgetFactoryFunction> item)();
		this.registry.set(factoryLabel, promise);

		return (<WidgetFactoryFunction> item)().then((factory) => {
			this.registry.set(factoryLabel, factory);
			return factory;
		}, (error) => {
			throw error;
		});
	}
}
