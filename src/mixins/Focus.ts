import { Constructor } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { DNode, VNode, WNode, NodeOperationPredicate } from '../interfaces';
import { decorate, isWNode, isVNode } from '../d';
import { diffProperty } from './../decorators/diffProperty';
import { afterRender } from './../decorators/afterRender';

export interface FocusProperties {
	/**
	 * The focus property allows a widget to be focused by a parent.
	 * It must be used in conjunction with focusKey, or have a custom implementation within the widget
	 */
	focus?: boolean | NodeOperationPredicate;
}

export interface FocusMixin {
	/**
	 * The focus method marks a specific node for decoration with focus: () => true;
	 */
	focus: (key: string) => void;
	/**
	 * The focusKey property is used with the focus widget property to allow a widget to be focused by a parent.
	 * If present, a truthy FocusProperties.focus will decorate this node with focus: () => true
	 */
	focusKey?: string | number;
	properties: FocusProperties;
}

function diffFocus(previousProperty: Function, newProperty: Function) {
	let changed = newProperty !== previousProperty;
	if (typeof newProperty === 'function') {
		changed = newProperty();
	}

	return {
		changed,
		value: newProperty
	};
}

export function FocusMixin<T extends Constructor<WidgetBase<FocusProperties>>>(Base: T): T & Constructor<FocusMixin> {
	abstract class Focus extends Base {
		public abstract properties: FocusProperties;
		public focusKey: string | number;

		private _currentToken = 0;

		private _previousToken = 0;

		private _currentFocusKey: string | number;

		private _shouldFocusChild() {
			return this._currentFocusKey && this._shouldFocus();
		}

		private _shouldFocusSelf() {
			let { focus } = this.properties;
			if (typeof focus === 'function') {
				focus = focus();
			}
			return focus && this.focusKey !== undefined;
		}

		@diffProperty('focus', diffFocus)
		@afterRender()
		protected updateFocusProperties(result: DNode | DNode[]): DNode | DNode[] {
			if (!this._shouldFocusChild() && !this._shouldFocusSelf()) {
				return result;
			}

			decorate(result, {
				modifier: (node, breaker) => {
					if (this._shouldFocusSelf() && node.properties.key === this.focusKey) {
						node.properties = { ...node.properties, focus: this.properties.focus };
					} else if (node.properties.key === this._currentFocusKey) {
						node.properties = { ...node.properties, focus: () => true };
					}
					breaker();
				},
				predicate: (node: DNode): node is VNode | WNode => {
					if (!isVNode(node) && !isWNode(node)) {
						return false;
					}
					const { key } = node.properties;
					return key === this._currentFocusKey || (!!this.focusKey && key === this.focusKey);
				}
			});
			return result;
		}

		private _shouldFocus = () => {
			const result = this._currentToken !== this._previousToken;
			this._previousToken = this._currentToken;
			return result;
		};

		/**
		 * Will mark a node for decoration with the focus property and trigger a render
		 *
		 * @param key The key to call focus on
		 */
		public focus(key: string | number) {
			this._currentFocusKey = key;
			this._currentToken++;
			this.invalidate();
		}
	}
	return Focus;
}

export default FocusMixin;
