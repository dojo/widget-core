import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject } from './Registry';
import { Injector } from './Injector';

export default class RegistryHandler extends Evented {
	private _baseRegistry = new Registry();
	private _registry = new Registry();
	private _widgetHandles: RegistryLabel[] = [];
	private _injectorHandles: RegistryLabel[] = [];

	constructor() {
		super();
		this.own(this._registry);
		this.own(this._baseRegistry);
	}

	public set base(baseRegistry: Registry) {
		this._baseRegistry = baseRegistry;
		this._widgetHandles = [];
		this._injectorHandles = [];
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

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel): Constructor<T> | null {
		const item = this._registry.get<T>(label) || this._baseRegistry.get<T>(label);
		if (item) {
			return item;
		}

		if (this._widgetHandles.indexOf(label) === -1) {
			const baseHandle = this._baseRegistry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					baseHandle.destroy();
				}
			});

			const localHandle = this._registry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					baseHandle.destroy();
					localHandle.destroy();
				}
			});

			this._baseRegistry.own(baseHandle);
			this._registry.own(localHandle);
			this._widgetHandles.push(label);
		}
		return null;
	}

	public getInjector(label: RegistryLabel): Injector | null {
		const item = this._registry.getInjector(label) || this._baseRegistry.getInjector(label);
		if (item) {
			return item;
		}
		if (this._widgetHandles.indexOf(label) === -1) {
			const baseHandle = this._baseRegistry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					baseHandle.destroy();
				}
			});

			const localHandle = this._registry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					baseHandle.destroy();
					localHandle.destroy();
				}
			});

			this._baseRegistry.own(baseHandle);
			this._registry.own(localHandle);
			this._injectorHandles.push(label);
		}
		return null;
	}
}
