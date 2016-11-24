import { CreatableRegistry } from 'dojo-interfaces/abilities';
import { Factory } from 'dojo-interfaces/core';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import { RegistryProvider } from '../../src/bases/createContainerWidgetBase';
import { RenderableSpy } from './createRenderableSpy';

let registryCount = 0;

const registry = new Map<string, RenderableSpy>();

const widgetRegistry: CreatableRegistry<RenderableSpy> = {
	create(factory: Factory<RenderableSpy, any>, options: any = {}): Promise<[string, RenderableSpy]> {
		if (!options.id) {
			options.id = `registry-${++registryCount}`;
		}
		const label: string = options.id;
		if (!registry.has(label)) {
			registry.set(label, factory(options));
			return Promise.resolve([ label, registry.get(label) ]);
		}
		return Promise.reject(new Error(`Duplicate registry ID: "${label}"`));
	},

	get(label: any): Promise<RenderableSpy> {
		const widget = registry.get(label);
		if (!widget) {
			return Promise.reject(new Error(`Non-registered widget id of "${label}"`));
		}
		return Promise.resolve(registry.get(label));
	},

	has(label: any): Promise<boolean> {
		return Promise.resolve(registry.has(label));
	},

	identify(item: RenderableSpy): string {
		return item.id;
	}
};

const registryProvider: RegistryProvider<RenderableSpy> & { _count: number; _registry: Map<string, RenderableSpy> } = {
	get(type: 'widgets'): CreatableRegistry<RenderableSpy> {
		return widgetRegistry;
	},
	get _count(): number {
		return registryCount;
	},
	set _count(value: number) {
		registryCount = 0;
	},
	_registry: registry
};

export default registryProvider;
