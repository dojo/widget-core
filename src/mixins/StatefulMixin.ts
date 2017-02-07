import { deepAssign } from '@dojo/core/lang';
import { WidgetConstructor } from './../WidgetBase';

export interface State {
	[key: string]: any;
}

const stateChangedEventType = 'state:changed';

export function Stateful<T extends WidgetConstructor>(base: T) {
	return class extends base {

		private _state: State;

		constructor(...args: any[]) {
			super(...args);
			this._state = Object.create(null);
			this.own(this.on('state:changed', () => {
				this.invalidate();
			}));
		}

		get state(): State {
			return this._state;
		}

		setState(state: Partial<State>) {
			this._state = deepAssign({}, this._state, state);
			const eventObject = {
				type: stateChangedEventType,
				state: this._state,
				target: this
			};
			this.emit(eventObject);
		}
	};
}
