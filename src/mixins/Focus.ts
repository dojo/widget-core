import { Constructor } from './../interfaces';
import { WidgetBase } from './../WidgetBase';
import { DNode, VNode, WNode } from '../interfaces';
import { decorate, isWNode, isVNode } from '../d';
import { diffProperty } from './../decorators/diffProperty';
import { afterRender } from './../decorators/afterRender';

export interface FocusProperties {
	focus?: (() => boolean);
}

export interface FocusMixin {
	focus: (key: string) => void;
	focusKey?: string | number;
	properties: FocusProperties;
}

function diffFocus(previousProperty: Function, newProperty: Function) {
	const result = newProperty && newProperty();
	return {
		changed: result,
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
			return this.properties.focus && this.focusKey !== undefined;
		}

		@diffProperty('focus', diffFocus)
		protected isFocusedReaction() {
			this._currentToken++;
		}

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

		public focus(key: string | number) {
			this._currentFocusKey = key;
			this._currentToken++;
			this.invalidate();
		}
	}
	return Focus;
}

export default FocusMixin;
