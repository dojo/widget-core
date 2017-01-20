import { Handle } from '@dojo/interfaces/core';
import { ObservablePatchableStore } from '@dojo/interfaces/abilities';
import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import Observable from '@dojo/core/Observable';
import { assign } from '@dojo/core/lang';
import { PropertiesChangeEvent } from './../interfaces';
import { State, StatefulMixin } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';

export type ExtendedObservablePatchableStore<S extends State> = ObservablePatchableStore<S> & {
	/**
	 * A method that allows the return of an `Observable` interface for the store
	 */
	observe(): Observable<State>;
	/**
	 * fetch all the items
	 */
	fetch(): Promise<State[]>;
}

/**
 * Properties required for the external state mixin
 */
export interface ExternalStateProperties {
	id?: string;
	externalState: ExtendedObservablePatchableStore<State>;
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
	readonly properties: ExternalStateProperties;
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
	handle: Handle;
}

/**
 * Private map for external state.
 */
const internalStateMap = new WeakMap<ExternalStateMixin, InternalState>();

const stateMap = new WeakMap<ExternalStateMixin, { state: State }>();

/**
 * state changed event type
 */
const stateChangedEventType = 'state:changed';

function replaceState(instance: ExternalState, state: State) {
	const internalState = stateMap.get(instance);
	internalState.state = state;
	const eventObject = {
		type: stateChangedEventType,
		state,
		target: instance
	};
	instance.emit(eventObject);
}

function onPropertiesChanged(instance: ExternalState, properties: ExternalStateProperties, changedPropertyKeys: string[]) {
	const internalState = internalStateMap.get(instance);
	if (internalState) {
		if (includes(changedPropertyKeys, 'externalState') || includes(changedPropertyKeys, 'id')) {
			internalState.handle.destroy();
		}
	}
	instance.observe();
}

/**
 * ExternalState Factory
 */
const externalStateFactory: ExternalStateFactory = createEvented.mixin({
	className: 'ExternalStateMixin',
	mixin: {
		get state(this: ExternalState) {
			return stateMap.get(this).state;
		},
		observe(this: ExternalState): void {
			const internalState = internalStateMap.get(this);
			const { properties: { id = 'all', externalState } } = this;
			if (!externalState) {
				throw new Error('externalState is required to observe state');
			}

			if (internalState) {
				if (internalState.id === id) {
					return;
				}
				throw new Error('Unable to observe state for a different id');
			}

			const observer = id !== 'all' ? externalState.observe(id) : externalState.observe();
			const subscription = observer.subscribe(
				(state) => {
					replaceState(this, state['afterAll'] ? state['afterAll'] : state);
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
			internalStateMap.set(this, { id, handle });
			this.own(handle);
		},
		setState(this: ExternalState, newState: Partial<State>): void {
			const { properties: { externalState, id } } = this;

			if (id || newState['id']) {
				externalState.patch(assign( { id }, newState))
					.then(() => id ? externalState.get(id) : externalState.fetch())
					.then((state: State) => {
						replaceState(this, state);
					});
			}
			else {
				throw new Error('Unable to set state without a specified `id`');
			}

		}
	},
	initialize(instance: ExternalState) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ExternalStateMixin, ExternalStateProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		stateMap.set(instance, { state: Object.create(null) });
		instance.observe();
	}
});

export default externalStateFactory;
