import { VNodeProperties } from '@dojo/interfaces/vdom';
import compose, { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';
import { NodeAttributeFunction, DNode, Widget, WidgetOptions, WidgetState, WidgetProperties, FormLabelProperties } from './../interfaces';
import { v } from '../d';

export interface FormLabelMixinProperties extends WidgetProperties {
	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: string;

	/**
	 * The type of the form field (equates to the `type` attribute in the DOM)
	 */
	type?: string;

	/**
	 * Prevents the user from interacting with the form field
	 */
	disabled?: boolean;

	/**
	 * Label settings for form label text, position, and visibility
	 */
	label?: string | FormLabelProperties;

	/**
	 * Accessibility attributes
	 */
	checked?: boolean;
	describedBy?: string;
	inputMode?: string;
	invalid?: boolean;
	maxLength?: number | string;
	minLength?: number | string;
	multiple?: boolean;
	placeholder?: string;
	readOnly?: boolean;
	required?: boolean;
}

export interface FormLabelMixin {
	/**
	 * A function that generates node attribtues for the child form field
	 */
	getFormFieldNodeAttributes: NodeAttributeFunction<this>;

	/**
	 * Override the default getNode function on createWidgetBase to return child input
	 */
	getNode(): DNode;
}

export type FormLabel = Widget<FormLabelMixinProperties> & FormLabelMixin;

export interface FormLabelMixinFactory extends ComposeFactory<FormLabelMixin, WidgetOptions<WidgetState, FormLabelMixinProperties>> {}

const createFormLabelMixin: FormLabelMixinFactory = compose({
	getFormFieldNodeAttributes(this: FormLabel): VNodeProperties {
		const { properties, type } = this;
		const attributeKeys = Object.keys(properties);

		if (type) {
			attributeKeys.push('type');
		}

		const allowedAttributes = ['checked', 'describedBy', 'disabled', 'inputMode', 'invalid', 'maxLength', 'minLength', 'multiple', 'name', 'placeholder', 'readOnly', 'required', 'type', 'value'];
		const nodeAttributes: any = {};

		for (const key of allowedAttributes) {

			if (attributeKeys.indexOf(key) === -1) {
				continue;
			}
			else if (key === 'type') {
				nodeAttributes['type'] = type;
			}
			else if (key === 'readOnly' && properties.readOnly) {
				nodeAttributes['readonly'] = 'readonly';
				nodeAttributes['aria-readonly'] = true;
			}
			else if (key === 'invalid') {
				nodeAttributes['aria-invalid'] = properties.invalid;
			}
			else if (key === 'describedBy') {
				nodeAttributes['aria-describedby'] = properties.describedBy;
			}
			else if ((key === 'maxLength' || key === 'minLength' || key === 'checked') && typeof properties[key] !== 'string') {
				nodeAttributes[key.toLowerCase()] = '' + properties[key];
			}
			else {
				nodeAttributes[key.toLowerCase()] = properties[key];
			}
		}

		return nodeAttributes;
	},

	getNode(this: FormLabel): DNode {
		const { label } = this.properties;
		let tag = label ? 'label' : 'div';

		if (this.classes.length) {
			tag = `${tag}.${this.classes.join('.')}`;
		}

		return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
	}
})
.mixin({
	aspectAdvice: {
		after: {
			getChildrenNodes(this: FormLabel, result: DNode[]) {
				let { label } = this.properties;
				const inputAttributes = this.getFormFieldNodeAttributes.call(this);
				const children = [
					v(this.tagName,
						inputAttributes,
						result
					)
				];

				if (label) {
					const labelDefaults = {
						content: '',
						position: 'after',
						hidden: false
					};

					// convert string label to object
					if (typeof label === 'string') {
						label = assign({}, labelDefaults, { content: label });
					}
					else {
						label = assign({}, labelDefaults, label);
					}

					// add label text
					if (label.content.length > 0) {
						children.push(v('span', {
							innerHTML: label.content,
							classes: { 'visually-hidden': label.hidden }
						}));
					}

					// set correct order
					if (label.position === 'before') {
						children.reverse();
					}
				}

				return children;
			}
		}
	}
});

export default createFormLabelMixin;
