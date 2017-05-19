import { initializeElement, CustomElementDescriptor, handleAttributeChanged } from './customElements';
import { Constructor, WidgetProperties } from './interfaces';
import { WidgetBase } from './WidgetBase';

declare namespace customElements {
	function define(name: string, constructor: any): void;
}

/**
 * Describes a function that returns a CustomElementDescriptor
 */
export interface CustomElementDescriptorFactory {
	(): CustomElementDescriptor;
}

/**
 * Register a custom element using the v1 spec of custom elements. Note that
 * this is the default export, and, expects the proposal to work in the browser.
 * This will likely require the polyfill and native shim.
 *
 * @param descriptorFactory
 */
export function registerCustomElement(descriptorFactory: CustomElementDescriptorFactory) {
	const descriptor = descriptorFactory();
	let widgetInstance: WidgetBase<any>;

	customElements.define(descriptor.tagName, class extends HTMLElement {
		private _isAppended = false;
		private _appender: Function;

		constructor() {
			super();

			this._appender = initializeElement(this);
		}

		connectedCallback() {
			if (!this._isAppended) {
				this._appender();
				this._isAppended = true;
			}
		}

		attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
			handleAttributeChanged(this, name, newValue, oldValue);
		}

		getWidgetInstance(): WidgetBase<any> {
			return widgetInstance;
		}

		setWidgetInstance(widget: WidgetBase<any>): void {
			widgetInstance = widget;
		}

		getWidgetConstructor(): Constructor<WidgetBase<WidgetProperties>> {
			return this.getDescriptor().widgetConstructor;
		}

		getDescriptor(): CustomElementDescriptor {
			return descriptor;
		}

		static get observedAttributes(): string[] {
			return (descriptor.attributes || []).map(attribute => attribute.attributeName);
		}
	});
}

export default registerCustomElement;
