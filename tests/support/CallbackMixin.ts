import { Constructor, DNode, WidgetProperties } from '../../src/interfaces';
import { afterRender, WidgetBase } from '../../src/WidgetBase';

export default function CallbackMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(callCount: number, callback: Function, base: T): T {
	class CallbackMixinClass extends base {
		private _renderCalls = 0;
		private _called = false;

		@afterRender()
		checkForCallback(node: DNode) {
			this._renderCalls++;

			if (!this._called && this._renderCalls >= callCount) {
				callback();
				this._called = true;
			}

			return node;
		}
	}

	return CallbackMixinClass;
}
