import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';

import { WidgetBase, WidgetBaseConstructor, WidgetProperties } from './WidgetBase';

export type WidgetFactoryFunction = () => Promise<WidgetBaseConstructor<WidgetProperties>>

export type FactoryRegistryItem = WidgetBaseConstructor<WidgetProperties> | Promise<WidgetBaseConstructor<WidgetProperties>> | WidgetFactoryFunction

export interface FactoryRegistryInterface {

	define(factoryLabel: string, registryItem: FactoryRegistryItem): void;

	get(factoryLabel: string): WidgetBaseConstructor<WidgetProperties> | Promise<WidgetBaseConstructor<WidgetProperties>> | null;

	has(factoryLabel: string): boolean;
}

export function isWidgetBaseConstructor(item: any): item is WidgetBaseConstructor<WidgetProperties> {
	return WidgetBase.isPrototypeOf(item) || item === WidgetBase;
}

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

	get(factoryLabel: string): WidgetBaseConstructor<WidgetProperties> | Promise<WidgetBaseConstructor<WidgetProperties>> | null {
		if (!this.has(factoryLabel)) {
			return null;
		}

		const item = this.registry.get(factoryLabel);

		if (item instanceof Promise || isWidgetBaseConstructor(item)) {
			return item;
		}

		const promise = (<WidgetFactoryFunction> item)();

		this.registry.set(factoryLabel, promise);

		return promise.then((factory) => {
			this.registry.set(factoryLabel, factory);
			return factory;
		}, (error) => {
			throw error;
		});
	}
}
