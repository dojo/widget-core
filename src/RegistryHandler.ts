import { Handle } from '@dojo/interfaces/core';
import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject } from './Registry';
import { Injector } from './Injector';

export default class RegistryHandler extends Evented {
	private _registry = new Registry();
	private _baseRegistry = this._registry;

	private _widgetLabels: RegistryLabel[] = [];

	constructor() {
		super();
		this.own(this._registry);
	}

	public set base(baseRegistry: Registry) {
		this._baseRegistry = baseRegistry;

	}

	public define(label: RegistryLabel, widget: any): void {
		this._registry.define(label, widget);
	}

	public has(label: RegistryLabel): boolean {
		return this._registry.has(label) || this._baseRegistry.has(label);
	}

	public hasInjector(label: RegistryLabel): boolean {
		return this._registry.hasInjector(label) || this._baseRegistry.hasInjector(label);
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel, globalPrecedence: boolean = false): Constructor<T> | null {
		let primaryRegistry = this._registry;
		let secondaryRegistry = this._baseRegistry;

		if (globalPrecedence) {
			primaryRegistry = this._baseRegistry;
			secondaryRegistry = this._registry;
		}

		let item = primaryRegistry.get<T>(label);
		if (item) {
			return item;
		}

		const handles: Handle[] = [];
		if (this._widgetLabels.indexOf(label) === -1) {
			const primaryHandle = primaryRegistry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					handles.forEach((handle) => {
						handle.destroy();
					});
				}
			});
			handles.push(primaryHandle);
			this.own(primaryHandle);
		}

		if (secondaryRegistry !== primaryRegistry) {
			item = secondaryRegistry.get<T>(label);
			if (item) {
				this._widgetLabels.push(label);
				return item;
			}
			if (this._widgetLabels.indexOf(label) === -1) {
				const secondaryHandle = secondaryRegistry.on(label, (event: RegistryEventObject) => {
					if (event.action === 'loaded') {
						this.emit({ type: 'invalidate' });
						secondaryHandle.destroy();
					}
				});
				handles.push(secondaryHandle);
				this.own(secondaryHandle);
				this._widgetLabels.push(label);
			}
		}
		return null;
	}

	public getInjector(label: RegistryLabel): Injector | null {
		const item = this._registry.getInjector(label) || this._baseRegistry.getInjector(label);
		if (item) {
			return item;
		}
		return null;
	}
}
