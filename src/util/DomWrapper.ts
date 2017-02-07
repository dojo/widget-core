import { WidgetBase, WidgetProperties } from './../WidgetBase';
import { isHNode } from '../d';
import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperProperties extends WidgetProperties {
	domNode: Node;
}

function handleDomInsertion(instance: DomWrapper, newNode: Node | null | undefined) {
	let notNullNode = newNode;

	if (!notNullNode) {
		notNullNode = document.createElement('div'); // placeholder element
	}

	if (instance.vNode) {
		// replace the vNode domElement with our new element...
		if (instance.vNode.domNode && instance.vNode.domNode.parentNode) {
			instance.vNode.domNode.parentNode.replaceChild(notNullNode, instance.vNode.domNode);
		}

		// and update the reference to our vnode
		instance.vNode.domNode = notNullNode;
	}
}

export class DomWrapper extends WidgetBase<DomWrapperProperties> {
	vNode: VNode | undefined;

	afterCreate() {
		handleDomInsertion(this, this.properties.domNode);
	}

	afterUpdate() {
		handleDomInsertion(this, this.properties.domNode);
	}

	render() {
		const dNode = super.render();
		if (isHNode(dNode)) {
			const { afterCreate, afterUpdate } = this;

			assign(dNode.properties, {
				afterCreate,
				afterUpdate
			});
		}

		return dNode;
	}

	__render__() {
		const vNode = super.__render__();
		if (vNode && typeof vNode !== 'string') {
			if (!this.vNode) {
				this.vNode = vNode;
			}
		}
		else {
			this.vNode = undefined;
		}

		return vNode;
	}
}
