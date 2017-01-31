import { initializeElement, CustomElementDescriptor, handleAttributeChanged } from './customElements';
import { Widget, WidgetFactory } from './interfaces';

declare namespace document {
	function registerElement(name: string, constructor: any): Function;
}

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
export function registerCustomElementV1(descriptorFactory: CustomElementDescriptorFactory) {
	const descriptor = descriptorFactory();
	let widgetInstance: Widget<any>;

	customElements.define(descriptor.tagName, class extends HTMLElement {
		constructor() {
			super();

			initializeElement(this);
		}

		attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
			handleAttributeChanged(this, name, newValue, oldValue);
		}

		getWidgetInstance(): Widget<any> {
			return widgetInstance;
		}

		setWidgetInstance(widget: Widget<any>): void {
			widgetInstance = widget;
		}

		getWidgetFactory(): WidgetFactory<any, any> {
			return this.getDescriptor().widgetFactory;
		}

		getDescriptor(): CustomElementDescriptor {
			return descriptor;
		}

		static get observedAttributes(): string[] {
			return (descriptor.attributes || []).map(attribute => attribute.attributeName);
		}
	});
}

/**
 * Register a custom element using the v0 spec of custom elements.
 *
 * @param descriptorFactory
 */
export function registerCustomElementV0(descriptorFactory: CustomElementDescriptorFactory) {
	let widgetInstance: any = null;

	const descriptor = descriptorFactory();
	const { tagName, widgetFactory } = descriptor;

	return document.registerElement(tagName, {
		prototype: Object.create(HTMLElement.prototype, {
			createdCallback: {
				value: function (this: HTMLElement) {
					initializeElement(<any> this);
				}
			},

			attributeChangedCallback: {
				value: function (this: HTMLElement, name: string, oldValue: string, newValue: string) {
					handleAttributeChanged(<any> this, name, newValue, oldValue);
				}
			},

			getWidgetFactory: {
				value: function () {
					return widgetFactory;
				}
			},

			getDescriptor: {
				value: function () {
					return descriptor;
				}
			},

			getWidgetInstance: {
				value: function () {
					return widgetInstance;
				}
			},

			setWidgetInstance: {
				value: function (instance: any) {
					widgetInstance = instance;
				}
			}
		})
	});
}

export default registerCustomElementV1;
