import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import Evented from '@dojo/core/Evented';
import { WidgetBaseConstructor } from './interfaces';

export type WidgetConstructorFunction = () => Promise<WidgetBaseConstructor>;

export type WidgetRegistryItem = WidgetBaseConstructor | Promise<WidgetBaseConstructor> | WidgetConstructorFunction;

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

/**
 * Widget Registry Interface
 */
export interface WidgetRegistry {

	/**
	 * define a WidgetRegistryItem for a specified label
	 *
	 * @param widgetLabel The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(widgetLabel: string, registryItem: WidgetRegistryItem): void;

	/**
	 * Return a WidgetRegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The WidgetRegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get(widgetLabel: string): WidgetBaseConstructor | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(widgetLabel: string): boolean;
}

/**
 * Checks is the item is a subclass of WidgetBase (or a WidgetBase)
 *
 * @param item the item to check
 * @returns true/false indicating if the item is a WidgetConstructor
 */
export function isWidgetBaseConstructor(item: any): item is WidgetBaseConstructor {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

/**
 * The WidgetRegistry implementation
 */
export class WidgetRegistry extends Evented implements WidgetRegistry {

	/**
	 * internal map of labels and WidgetRegistryItem
	 */
	private registry: Map<string, WidgetRegistryItem> = new Map<string, WidgetRegistryItem>();

	has(widgetLabel: string): boolean {
		return this.registry.has(widgetLabel);
	}

	define(widgetLabel: string, item: WidgetRegistryItem): void {
		if (this.registry.has(widgetLabel)) {
			throw new Error(`widget has already been registered for '${widgetLabel}'`);
		}

		this.registry.set(widgetLabel, item);

		if (item instanceof Promise) {
			item.then((widgetCtor) => {
				this.registry.set(widgetLabel, widgetCtor);
				this.emit({
					type: `loaded:${widgetLabel}`
				});
				return widgetCtor;
			}, (error) => {
				throw error;
			});
		}
		else {
			this.emit({
				type: `loaded:${widgetLabel}`
			});
		}
	}

	get(widgetLabel: string): WidgetBaseConstructor | null {
		if (!this.has(widgetLabel)) {
			return null;
		}

		const item = this.registry.get(widgetLabel);

		if (isWidgetBaseConstructor(item)) {
			return item;
		}

		if (item instanceof Promise) {
			return null;
		}

		const promise = (<WidgetConstructorFunction> item)();
		this.registry.set(widgetLabel, promise);

		promise.then((widgetCtor) => {
			this.registry.set(widgetLabel, widgetCtor);
			this.emit({
				type: `loaded:${widgetLabel}`
			});
			return widgetCtor;
		}, (error) => {
			throw error;
		});

		return null;
	}
}

export default WidgetRegistry;
