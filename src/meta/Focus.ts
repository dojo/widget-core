import { Base } from './Base';
import { createHandle } from '@dojo/core/lang';
import { assign } from '@dojo/core/lang';
import global from '@dojo/shim/global';

export interface FocusResults {
	active: boolean;
	containsFocus: boolean;
}

const defaultResults = {
	active: false,
	containsFocus: false
};

export class Focus extends Base {
	private _activeElement: Element;
	private _boundFocusHandler = this._onFocus.bind(this);

	public get(key: string | number): FocusResults {
		const node = this.getNode(key);

		if (!node) {
			return assign({}, defaultResults);
		}

		if (!this._activeElement) {
			this._activeElement = global.document.activeElement;
			this._createListener();
		}

		return {
			active: node === this._activeElement,
			containsFocus: node.contains(this._activeElement)
		};
	}

	public set(key: string | number, selector?: string) {
		const node = this.getNode(key);
		const target = node && selector ? node.querySelector(selector) : node;
		target && (target as HTMLElement).focus();
	}

	private _onFocus() {
		this._activeElement = global.document.activeElement;
		this.invalidate();
	}

	private _createListener() {
		global.document.addEventListener('focusin', this._boundFocusHandler);
		this.own(createHandle(this._removeListener));
	}

	private _removeListener() {
		global.document.removeEventListener('focusin', this._onFocus);
	}
}

export default Focus;
