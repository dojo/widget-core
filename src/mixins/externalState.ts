import { Handle } from 'dojo-interfaces/core';
import { ObservablePatchableStore } from 'dojo-interfaces/abilities';
import WeakMap from 'dojo-shim/WeakMap';
import { assign } from 'dojo-core/lang';
import { State, StatefulMixin } from 'dojo-interfaces/bases';
import createEvented from 'dojo-compose/bases/createEvented';
import { ComposeFactory } from 'dojo-compose/compose';

/**
 * Properties required for the external state mixin
 */
export interface ExternalStateProperties {
	id: string;
	externalState: ObservablePatchableStore<State>;
}

/**
 * External State Options
 */
export interface ExternalStateOptions {
	properties: ExternalStateProperties;
}

/**
 * External State Mixin
 */
export interface ExternalStateMixin extends StatefulMixin<State> {
	/**
	 * Observe the state using the id and stateFrom in the instances properties
	 */
	observe(): void;
}

/**
 * External State
 */
export interface ExternalState extends ExternalStateMixin {
	properties: ExternalStateProperties;
}

/**
 * Compose External State Factory interface
 */
export interface ExternalStateFactory extends ComposeFactory<ExternalStateMixin, ExternalStateOptions> {}

/**
 * internal state for the `ExternalStateMixin`
 */
interface InternalState {
	id: string;
	state: State;
	handle: Handle;
}

/**
 * Private map for external state.
 */
const internalStateMap = new WeakMap<ExternalStateMixin, InternalState>();

/**
 * state changed event type
 */
const stateChangedEventType = 'state:changed';

function replaceState(instance: ExternalState, state: State) {
	const internalState = internalStateMap.get(instance);
	internalState.state = state;
	const eventObject = {
		type: stateChangedEventType,
		state,
		target: instance
	};
	instance.emit(eventObject);
}

/**
 * ExternalState Factory
 */
const externalStateFactory: ExternalStateFactory = createEvented.mixin({
	className: 'ExternalStateMixin',
	mixin: {
		get state(this: ExternalState) {
			return internalStateMap.get(this).state;
		},
		observe(this: ExternalState): void {
			const internalState = internalStateMap.get(this);
			const { properties: { id, externalState } } = this;
			if (!id || !externalState) {
				throw new Error('id and stateFrom are required to observe state');
			}

			if (internalState) {
				if (internalState.id === id) {
					return;
				}
				throw new Error('Unable to observe state for a different id');
			}

			const subscription = externalState
			.observe(id)
			.subscribe(
				(state) => {
					replaceState(this, state);
				},
				(err) => {
					throw err;
				}
			);

			const handle = {
				destroy: () => {
					subscription.unsubscribe();
					internalStateMap.delete(this);
				}
			};
			internalStateMap.set(this, { id, handle, state: Object.create(null) });
			this.own(handle);
		},
		setState(this: ExternalState, newState: Partial<State>): void {
			const { properties: { externalState, id } } = this;
			externalState.patch(assign( { id }, newState))
				.then(() => externalState.get(id))
				.then((state: State) => {
					replaceState(this, state);
				});
		}
	},
	aspectAdvice: {
		before: {
			diffProperties(this: ExternalState, ...args: any[]): any[] {
				const internalState = internalStateMap.get(this);
				const { properties: { id, externalState } } = this;
				const [ previousProperties ] = args;

				if (internalState) {
					if (externalState !== previousProperties.externalState || id !== previousProperties.id) {
						internalState.handle.destroy();
					}
				}
				return args;
			},
			applyChangedProperties(this: ExternalStateMixin, ...args: any[]) {
				this.observe();
				return args;
			}
		}
	}
});

export default externalStateFactory;
