import { deepAssign } from '@dojo/core/lang';
import { Constructor, WidgetConstructor } from './../WidgetBase';

export interface State {
	[key: string]: any;
}

export interface Statful {
	readonly state: State;
	setState(state: Partial<State>): void;
}

const stateChangedEventType = 'state:changed';

export function StatefulMixin<T extends WidgetConstructor>(base: T): T & Constructor<Statful> {
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

		setState(state: Partial<State>): void {
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
