import { deepAssign } from '@dojo/core/lang';
import { WidgetBaseConstructor, WidgetProperties, WidgetOptions } from './../WidgetBase';

export interface State {
	[key: string]: any;
}

const stateChangedEventType = 'state:changed';

export function Stateful<S extends State>(base: WidgetBaseConstructor<WidgetProperties>) {
	return class extends base {

		private _state: S;

		constructor(options: WidgetOptions<WidgetProperties>) {
			super(options);
			this._state = Object.create(null);
			this.own(this.on('state:changed', () => {
				this.invalidate();
			}));
		}

		get state(): S {
			return this._state;
		}

		setState(state: Partial<S>) {
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
