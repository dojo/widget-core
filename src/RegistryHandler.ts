import { Handle } from '@dojo/interfaces/core';
import { Map } from '@dojo/shim/Map';
import { Destroyable } from '@dojo/core/Destroyable';
import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject } from './Registry';
import { Injector } from './Injector';

/**
 * Interface for the primary and secondary registry handles
 */
interface Handles {
	primary: Handle;
	secondary?: Handle;
}

/**
 * Manages primary and secondary handles for a widget label
 */
class RegistryHandles extends Destroyable {
	private _handles: Map<RegistryLabel, Handles> = new Map();

	/**
	 * Removes and destroys the handles for the label
	 *
	 * @param label the widget label to remove
	 */
	public delete(label: RegistryLabel): boolean {
		const handles = this._handles.get(label);
		if (handles) {
			handles.primary.destroy();
			if (handles.secondary) {
				handles.secondary.destroy();
			}
			return this._handles.delete(label);
		}
		return false;
	}

	/**
	 * Sets the primary handle, will destroy the existing handle if it exists.
	 *
	 * @param label The label to set the handle for.
	 * @param handle The listener handle.
	 */
	public setPrimary(label: RegistryLabel, handle: Handle): void {
		this.delete(label);
		const handles = {
			primary: handle
		};
		this.own(handle);
		this._handles.set(label, handles);
	}

	/**
	 * Sets the secondary handle, will destroy the existing handle if it exists.
	 *
	 * Passing undefined will destroy an existing handle and clear the reference.
	 *
	 * @param label The label to set the handle for.
	 * @param handle The listener handle.
	 */
	public setSecondary(label: RegistryLabel, handle?: Handle): void {
		let handles = this._handles.get(label);
		if (handles) {
			if (handles && handles.secondary) {
				handles.secondary.destroy();
			}
			if (handle) {
				this.own(handle);
			}
			handles.secondary = handle;
			this._handles.set(label, handles);
		}
	}
}

export class RegistryHandler extends Evented {
	private _registry = new Registry();
	private _baseRegistry: Registry;
	private _widgetHandles = new RegistryHandles();
	private _injectorHandles = new RegistryHandles();

	constructor() {
		super();
		this.own(this._registry);
		this.own(this._widgetHandles);
		this.own(this._injectorHandles);
	}

	public set base(baseRegistry: Registry) {
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
		let primaryRegistry = this._registry;
		let secondaryRegistry = this._baseRegistry ? this._baseRegistry : undefined;

		if (globalPrecedence && secondaryRegistry) {
			primaryRegistry = this._baseRegistry;
			secondaryRegistry = this._registry;
		}

		let item = primaryRegistry.get<T>(label);
		if (item) {
			return item;
		}

		const primaryHandle = primaryRegistry.on(label, (event: RegistryEventObject) => {
			if (event.action === 'loaded') {
				this.emit({ type: 'invalidate' });
				this._widgetHandles.delete(label);
			}
		});
		this._widgetHandles.setPrimary(label, primaryHandle);

		if (secondaryRegistry) {
			item = secondaryRegistry.get<T>(label);
			if (item) {
				return item;
			}
			const secondaryHandle = secondaryRegistry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					this._widgetHandles.setSecondary(label);
				}
			});
			this._widgetHandles.setSecondary(label, secondaryHandle);
		}
		return null;
	}

	public getInjector(label: RegistryLabel, globalPrecedence: boolean = false): Injector | null {
		let primaryRegistry = this._registry;
		let secondaryRegistry = this._baseRegistry ? this._baseRegistry : undefined;

		if (globalPrecedence && secondaryRegistry) {
			primaryRegistry = this._baseRegistry;
			secondaryRegistry = this._registry;
		}

		let item = primaryRegistry.getInjector(label);
		if (item) {
			return item;
		}

		const primaryHandle = primaryRegistry.on(label, (event: RegistryEventObject) => {
			if (event.action === 'loaded') {
				this.emit({ type: 'invalidate' });
				this._injectorHandles.delete(label);
			}
		});
		this._injectorHandles.setPrimary(label, primaryHandle);

		if (secondaryRegistry) {
			item = secondaryRegistry.getInjector(label);
			if (item) {
				return item;
			}
			const secondaryHandle = secondaryRegistry.on(label, (event: RegistryEventObject) => {
				if (event.action === 'loaded') {
					this.emit({ type: 'invalidate' });
					this._injectorHandles.setSecondary(label);
				}
			});
			this._injectorHandles.setSecondary(label, secondaryHandle);
		}
		return null;
	}
}

export default RegistryHandler;
