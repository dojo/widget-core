import { Map } from '@dojo/shim/Map';
import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject } from './Registry';
import { Injector } from './Injector';

export class RegistryHandler extends Evented {
	private _registry = new Registry();
	private _baseRegistry: Registry;
	private _registryWidgetLabelMap: Map<Registry, RegistryLabel[]> = new Map();
	private _registryInjectorLabelMap: Map<Registry, RegistryLabel[]> = new Map();

	constructor() {
		super();
		this.own(this._registry);
	}

	public set base(baseRegistry: Registry) {
		this._registryWidgetLabelMap.delete(this._baseRegistry);
		this._registryInjectorLabelMap.delete(this._baseRegistry);
		this._baseRegistry = baseRegistry;
	}

	public define(label: RegistryLabel, widget: Constructor<WidgetBaseInterface>): void {
		this._registry.define(label, widget);
	}

	public defineInjector(label: RegistryLabel, injector: Injector): void {
		this._registry.defineInjector(label, injector);
	}

	public has(label: RegistryLabel): boolean {
		return this._registry.has(label) || this._baseRegistry.has(label);
	}

	public hasInjector(label: RegistryLabel): boolean {
		return this._registry.hasInjector(label) || this._baseRegistry.hasInjector(label);
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel, globalPrecedence: boolean = false): Constructor<T> | null {
		const registries = globalPrecedence ? [ this._baseRegistry, this._registry ] : [ this._registry, this._baseRegistry ];

		for (let i = 0; i < registries.length; i++) {
			const registry = registries[i];
			if (!registry) {
				continue;
			}
			const item = registry.get<T>(label);
			const registeredLabels = this._registryWidgetLabelMap.get(registry) || [];
			if (item) {
				return item;
			}
			else if (registeredLabels.indexOf(label) === -1) {
				const handle = registry.on(label, (event: RegistryEventObject) => {
					if (event.action === 'loaded' && registry.get(label) === event.item) {
						this.emit({ type: 'invalidate' });
					}
				});
				this.own(handle);
				this._registryWidgetLabelMap.set(registry, [ ...registeredLabels, label]);
			}
		}
		return null;
	}

	public getInjector(label: RegistryLabel, globalPrecedence: boolean = false): Injector | null {
		const registries = globalPrecedence ? [ this._baseRegistry, this._registry ] : [ this._registry, this._baseRegistry ];

		for (let i = 0; i < registries.length; i++) {
			const registry = registries[i];
			if (!registry) {
				continue;
			}
			const item = registry.getInjector(label);
			const registeredLabels = this._registryInjectorLabelMap.get(registry) || [];
			if (item) {
				return item;
			}
			else if (registeredLabels.indexOf(label) === -1) {
				const handle = registry.on(label, (event: RegistryEventObject) => {
					if (event.action === 'loaded' && registry.getInjector(label) === event.item) {
						this.emit({ type: 'invalidate' });
					}
				});
				this.own(handle);
				this._registryInjectorLabelMap.set(registry, [ ...registeredLabels, label]);
			}
		}
		return null;
	}
}

export default RegistryHandler;
