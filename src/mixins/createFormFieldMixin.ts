import { VNodeProperties } from '@dojo-interfaces/vdom';
import { ComposeFactory } from '@dojo-compose/compose';
import createStateful from '@dojo-compose/bases/createStateful';
import createCancelableEvent from '@dojo-compose/bases/createCancelableEvent';
import { EventTargettedObject, EventCancelableObject, Handle } from '@dojo-interfaces/core';
import { EventedListener, Stateful, StatefulOptions } from '@dojo-interfaces/bases';
import { assign } from '@dojo-core/lang';
import { NodeAttributeFunction, DNode, Widget, WidgetOptions, WidgetState, WidgetProperties } from './../interfaces';
import { v } from '../d';

export interface FormFieldMixinOptions<V, S extends FormFieldMixinState<V>> extends StatefulOptions<S> {
	/**
	 * The type of the form field (equates to the `type` attribute in the DOM)
	 */
	type?: string;

	/**
	 * The value of the form field
	 */
	value?: V;

}

export interface FormFieldMixinState<V> {
	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: V;

	/**
	 * Accessibility attributes
	 */
	descriptionID?: string;
	disabled?: boolean;
	inputmode?: string;
	maxlength?: number | string;
	minlength?: number | string;
	multiple?: boolean;
	placeholder?: string;
	readonly?: boolean;
	required?: boolean;
	invalid?: boolean;
}

export interface ValueChangeEvent<V> extends EventCancelableObject<'valuechange', FormFieldMixin<V, FormFieldMixinState<V>>> {
	/**
	 * The event type (in this case, `valuechange`)
	 */
	type: 'valuechange';

	/**
	 * The previous value before this event
	 */
	oldValue: string;

	/**
	 * The current value when this event fires
	 */
	value: string;
}

export interface FormField<V> {
	/**
	 * An array of functions that generate the node attributes on a render
	 */
	nodeAttributes: NodeAttributeFunction<this>[];

	/**
	 * Override the default getNode function on createWidgetBase to return child input
	 */
	getNode(): DNode;

	/**
	 * The HTML type for this widget
	 */
	type?: string;

	/**
	 * The string value of this form widget, which is read from the widget state
	 */
	value?: string;

	/**
	 * Label settings
	 */
	label?: {
		content: string,
		position: string,
		hidden: boolean
	};
}

export interface FormFieldOverride<V> {
	/**
	 * Add listener for a `valuechange` event, emitted when the value on the widget changes
	 */
	on(type: 'valuechange', listener: EventedListener<FormFieldMixin<V, FormFieldMixinState<V>>, ValueChangeEvent<V>>): Handle;
	on(type: string, listener: EventedListener<V, EventTargettedObject<V>>): Handle;
}

export type FormFieldMixin<V, S extends FormFieldMixinState<V>> = FormField<V> & Stateful<S> & FormFieldOverride<V>;

export interface FormMixinFactory extends ComposeFactory<FormFieldMixin<any, FormFieldMixinState<any>>, FormFieldMixinOptions<any, FormFieldMixinState<any>>> {
	<V>(options?: FormFieldMixinOptions<V, FormFieldMixinState<V>>): FormFieldMixin<V, FormFieldMixinState<V>>;
}

function valueReplacer(key: string, value: any): any {
	if (value instanceof RegExp) {
		return (`__RegExp(${value.toString()})`);
	}
	return value;
}

function valueReviver(key: string, value: any): any {
	if (value.toString().indexOf('__RegExp(') === 0) {
		const [ , regExpStr ] = value.match(/__RegExp\(([^\)]*)\)/);
		const [ , regExp, flags ] = regExpStr.match(/^\/(.*?)\/([gimy]*)$/);
		return new RegExp(regExp, flags);
	}
	return value;
}

/**
 * Internal function to convert a state value to a string
 * @param value The value to be converted
 */
export function valueToString(value: any): string {
	return value
		? Array.isArray(value) || typeof value === 'object'
			? JSON.stringify(value, valueReplacer) : String(value)
		: value === 0
			? '0' : value === false
				? 'false' : '';
}

/**
 * Internal function to convert a string to the likely more complex value stored in
 * state
 * @param str The string to convert to a state value
 */
export function stringToValue(str: string): any {
	try {
		const value = JSON.parse(str, valueReviver);
		return value;
	}
	catch (e) {
		if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(str)) {
			return Number(str);
		}
		if (str) {
			return str;
		}
		return undefined;
	}
}

export function getFormFieldNodeAttributes(state: any): VNodeProperties {
	const allowedAttributes = ['value', 'type', 'descriptionID', 'disabled', 'inputmode', 'maxlength', 'minlength', 'multiple', 'name', 'placeholder', 'readonly', 'required', 'invalid'];
	const nodeAttributes: any = {};

	for (const key in state) {
		if (allowedAttributes.indexOf(key) === -1) {
			continue;
		}

		// handle cases that aren't 1-to-1
		if (key === 'readonly' && state.readonly) {
			nodeAttributes['readonly'] = 'readonly';
			nodeAttributes['aria-readonly'] = true;
		}
		else if (key === 'invalid') {
			nodeAttributes['aria-invalid'] = state.invalid;
		}
		else if (key === 'descriptionID') {
			nodeAttributes['aria-describedby'] = state.descriptionID;
		}
		else {
			nodeAttributes[key] = state[key];
		}
	}
	return nodeAttributes;
}

function generateWrappedChildren(this: Widget<WidgetState, WidgetProperties> & FormField<any>): DNode[] {
	const { type, label, value, state } = this;
	const inputAttributes = getFormFieldNodeAttributes(Object.assign({}, state, { type, value }));
	const children = [
		v(this.tagName,
			inputAttributes,
			this.getChildrenNodes()
		)
	];

	if (label) {
		// add label text
		if (label.content.length > 0) {
			children.push(v('span', {
				innerHTML: label.content,
				classes: { 'visually-hidden': label.hidden }
			}));
		}

		// set correct order
		if (label.position === 'above') {
			children.reverse();
		}
	}

	return children;
}

const createFormMixin: FormMixinFactory = createStateful
	.mixin({
		mixin: <FormField<any>> {
			get value(this: FormFieldMixin<any, FormFieldMixinState<any>>): string {
				return valueToString(this.state.value);
			},

			set value(this: FormFieldMixin<any, FormFieldMixinState<any>>, value: string) {
				if (value !== this.state.value) {
					const event = assign(createCancelableEvent({
						type: 'valuechange',
						target: this
					}), {
						oldValue: valueToString(this.state.value),
						value
					});
					this.emit(event);
					if (!event.defaultPrevented) {
						this.setState({ value: stringToValue(event.value) });
					}
				}
			},

			getNode(this: Widget<WidgetState, WidgetProperties> & FormField<any>): DNode {
				const { label } = this;
				let tag = label ? 'label' : 'div';

				if (this.classes.length) {
					tag = `${this.tagName}.${this.classes.join('.')}`;
				}

				return v(tag, this.getNodeAttributes(), generateWrappedChildren.call(this));
			}
		},
		initialize(
			instance: FormFieldMixin<any, FormFieldMixinState<any>>,
			{ value, type, properties }: FormFieldMixinOptions<any, FormFieldMixinState<any>> & WidgetOptions<WidgetState, WidgetProperties> = {}
		) {
			if (value) {
				instance.setState({ value });
			}
			if (type) {
				instance.type = type;
			}
			if (properties && properties.hasOwnProperty('label')) {
				const labelDefaults = {
					content: '',
					position: 'below',
					hidden: false
				};

				// convert string label to object
				if (typeof properties['label'] === 'string') {
					instance.label = Object.assign(labelDefaults, { content: properties['label'] });
				}
				else {
					instance.label = Object.assign(labelDefaults, properties['label']);
				}
			}
		}
	});

export default createFormMixin;
