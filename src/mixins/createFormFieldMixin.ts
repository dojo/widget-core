
import { VNodeProperties } from '@dojo-interfaces/vdom';
import { ComposeFactory } from '@dojo-compose/compose';
import createStateful from '@dojo-compose/bases/createStateful';
import createCancelableEvent from '@dojo-compose/bases/createCancelableEvent';
import { EventTargettedObject, EventCancelableObject, Handle } from '@dojo-interfaces/core';
import { EventedListener, Stateful, StatefulOptions } from '@dojo-interfaces/bases';
import { assign } from '@dojo-core/lang';
import { NodeAttributeFunction, DNode, Widget } from './../interfaces';
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

	/**
	 * Label settings
	 */
	label?: string | {
		content: string,
		position: string,
		hidden: boolean
	};
}

export interface FormFieldMixinState<V> {
	/**
	 * Whether the field is currently disabled or not
	 */
	disabled?: boolean;

	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: V;
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

/**
 * Internal function to identify properties that should pass to child input element
 * on basic form widgets that have a root label element
 * @param state: state object passed into the widget
 */
export function sortFormFieldState(state: any): {parent: any, input: any} {
	const parentPropKeys = ['id', 'classes', 'for', 'dir', 'draggable', 'lang', 'slot', 'translate'];
	const parent: any = {}, input: any = {};

	for (const key in state) {
		if (parentPropKeys.indexOf(key) > -1) {
			parent[key] = state[key];
		}
		else {
			input[key] = state[key];
		}
	}

	return {parent, input};
}

function generateWrappedChildren(
	this: Widget<FormFieldMixinState<any>, FormFieldMixinOptions<any, FormFieldMixinState<any>>> & FormField<any>,
	label: { content: string, position: string, hidden: boolean}
): DNode[] {
	const { type, value } = this;
	const inputAttributes = sortFormFieldState(Object.assign(this.state, { type, value }));
	const children = [
		v(this.tagName,
			inputAttributes.input,
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

			getNode(this: Widget<FormFieldMixinState<any>, FormFieldMixinOptions<any, FormFieldMixinState<any>>>): DNode {
				const { label } = this.properties;
				let tag = label ? 'label' : 'div';

				if (this.classes.length) {
					tag = `${this.tagName}.${this.classes.join('.')}`;
				}

				return v(tag, this.getNodeAttributes(), generateWrappedChildren.call(this, label));
			},

			nodeAttributes: [
				function (this: FormFieldMixin<any, FormFieldMixinState<any>>): VNodeProperties {
					const parentNodeAttributes = sortFormFieldState(this.state);

					return parentNodeAttributes.parent;
				}
			]
		},
		initialize(
			instance: FormFieldMixin<any, FormFieldMixinState<any>>,
			{ value, type, label }: FormFieldMixinOptions<any, FormFieldMixinState<any>> = {}
		) {
			if (value) {
				instance.setState({ value });
			}
			if (type) {
				instance.type = type;
			}
			if (label) {
				const labelDefaults = {
					content: '',
					position: 'below',
					hidden: false
				};

				// convert string label to object
				if (typeof label === 'string') {
					instance.label = Object.assign(labelDefaults, { content: label });
				}
				else {
					instance.label = Object.assign(labelDefaults, label);
				}
			}
		}
	});

export default createFormMixin;
