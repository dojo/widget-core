import { VNodeProperties } from '@dojo-interfaces/vdom';
import { ComposeFactory } from '@dojo-compose/compose';
import createStateful from '@dojo-compose/bases/createStateful';
import createCancelableEvent from 'dojo-compose/bases/createCancelableEvent';
import { EventTargettedObject, EventCancelableObject, Handle } from '@dojo-interfaces/core';
import { EventedListener, Stateful, StatefulOptions } from '@dojo-interfaces/bases';
import { assign } from '@dojo-core/lang';
import { NodeAttributeFunction, DNode, Widget, WidgetProperties, FormLabel } from './../interfaces';
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

export interface FormFieldMixinProperties extends WidgetProperties {
	label?: string | FormLabel;
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
	 * The type of the form field (equates to the `type` attribute in the DOM)
	 */
	type?: string;

	/**
	 * Prevents the user from interacting with the form field
	 */
	disabled?: boolean;

	/**
	 * Label settings
	 */
	label?: FormLabel;

	/**
	 * Accessibility attributes
	 */
	checked?: boolean;
	descriptionID?: string;
	inputmode?: string;
	invalid?: boolean;
	maxlength?: number | string;
	minlength?: number | string;
	multiple?: boolean;
	placeholder?: string;
	readonly?: boolean;
	required?: boolean;
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
	 * A function that generates node attribtues for the child form field
	 */
	getFormFieldNodeAttributes: NodeAttributeFunction<this>;

	/**
	 * Override the default getNode function on createWidgetBase to return child input
	 */
	getNode(): DNode;

	/**
	 * An array of functions that generate the node attributes on a render
	 */
	nodeAttributes?: NodeAttributeFunction<this>[];

	/**
	 * The HTML type for this widget
	 */
	type?: string;

	/**
	 * The string value of this form widget, which is read from the widget state
	 */
	value?: string;

	/**
	 * Default values for a form field label
	 */
	labelDefaults: FormLabel;
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

			labelDefaults: {
				content: '',
				position: 'below',
				hidden: false
			},

			getFormFieldNodeAttributes(this: FormFieldMixin<any, FormFieldMixinState<any>>): VNodeProperties {
				const { value, type, state } = this;
				const stateAttributeKeys = Object.keys(state);
				if (value) {
					stateAttributeKeys.push('value');
				}
				if (type) {
					stateAttributeKeys.push('type');
				}

				const allowedAttributes = ['value', 'type', 'checked', 'descriptionID', 'disabled', 'inputmode', 'maxlength', 'minlength', 'multiple', 'name', 'placeholder', 'readonly', 'required', 'invalid'];
				const nodeAttributes: any = {};

				for (const key of allowedAttributes) {

					if (stateAttributeKeys.indexOf(key) === -1) {
						continue;
					}

					// handle cases that aren't 1-to-1
					if (key === 'value') {
						nodeAttributes['value'] = value;
					}
					// use this.type if no state.type is included
					else if (key === 'type' && !state.type) {
						nodeAttributes['type'] = type;
					}
					else if (key === 'readonly' && state.readonly) {
						nodeAttributes['readonly'] = 'readonly';
						nodeAttributes['aria-readonly'] = true;
					}
					else if (key === 'invalid') {
						nodeAttributes['aria-invalid'] = state.invalid;
					}
					else if (key === 'descriptionID') {
						nodeAttributes['aria-describedby'] = state.descriptionID;
					}
					else if ((key === 'maxlength' || key === 'minlength' || key === 'checked') && typeof state[key] !== 'string') {
						nodeAttributes[key] = '' + state[key];
					}
					else {
						nodeAttributes[key] = state[key];
					}
				}
				return nodeAttributes;
			},

			getNode(this: Widget<FormFieldMixinState<any>, WidgetProperties> & FormField<any>): DNode {
				const { label } = this.state;
				let tag = label ? 'label' : 'div';

				if (this.classes.length) {
					tag = `${this.tagName}.${this.classes.join('.')}`;
				}

				return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
			}
		},
		aspectAdvice: {
			after: {
				getChildrenNodes(this: Widget<FormFieldMixinState<any>, WidgetProperties> & FormField<any>, result: DNode[]) {
					let { label } = this.state;
					const inputAttributes = this.getFormFieldNodeAttributes.call(this);
					const children = [
						v(this.tagName,
							inputAttributes,
							result
						)
					];

					if (label) {
						// convert string label to object
						if (typeof label === 'string') {
							label = assign({}, this.labelDefaults, { content: label });
						}
						else {
							label = assign({}, this.labelDefaults, label);
						}

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
			}
		},
		initialize(
			instance: FormFieldMixin<any, FormFieldMixinState<any>>,
			{ value, type }: FormFieldMixinOptions<any, FormFieldMixinState<any>> = {}
		) {
			if (value) {
				instance.setState({ value });
			}
			if (type) {
				instance.type = type;
			}
		}
	});

export default createFormMixin;
