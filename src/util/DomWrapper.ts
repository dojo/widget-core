import { WidgetBase } from './../WidgetBase';
import { DNode, WidgetProperties } from './../interfaces';
import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperProperties extends WidgetProperties {
	domNode: Node;
}

export class DomWrapper extends WidgetBase<DomWrapperProperties> {

	private _vNode: VNode;

	public afterCreate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	public afterUpdate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	public __render__() {
		this._vNode = <VNode> super.__render__();
		return this._vNode;
	}

	protected render(): DNode {
		const dNode: any = super.render();
		const { afterCreate, afterUpdate } = this;

		assign(dNode.properties, {
			afterCreate,
			afterUpdate
		});

		return dNode;
	}

	private handleDomInsertion(newNode: Node | null | undefined) {
		let notNullNode = newNode;

		if (!notNullNode) {
			notNullNode = document.createElement('div'); // placeholder element
		}

		// replace the vNode domElement with our new element...
		if (this._vNode.domNode && this._vNode.domNode.parentNode) {
			this._vNode.domNode.parentNode.replaceChild(notNullNode, this._vNode.domNode);
		}

		// and update the reference to our vnode
		this._vNode.domNode = notNullNode;

		// set properties
		const skipKeys = ['bind', 'key', 'domNode'];

		Object.keys(this.properties).filter(key => skipKeys.indexOf(key) === -1).forEach((key: string) => {
			try {
				(<any> newNode)[key] = (<any> this.properties)[key];
			}
			catch (e) {
			}
		});
	}
}

export default DomWrapper;
