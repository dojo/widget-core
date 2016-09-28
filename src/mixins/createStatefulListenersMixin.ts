import { ComposeFactory } from 'dojo-compose/compose';
import { Actionable, EventedListenersMap, EventedListenerOrArray, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { Registry, RegistryProvider } from './interfaces';

export type ListenerOrArray = string | symbol | (string | symbol)[];

export interface ListenersMap {
	[type: string]: ListenerOrArray;
}

export interface StatefulListenersState {
	listeners?: ListenersMap;
}

export interface StatefulListenersOptions<S extends StatefulListenersState> extends StatefulOptions<S> {
	registryProvider?: RegistryProvider<Actionable<TargettedEventObject>>;
}

export type StatefulListeners<S extends StatefulListenersState> = Stateful<S>;

export interface StatefulListenersMixinFactory extends ComposeFactory<Stateful<StatefulListenersState>, StatefulListenersOptions<StatefulListenersState>> {
	(options?: StatefulListenersOptions<StatefulListenersState>): Stateful<StatefulListenersState>;
}

/**
 * Internal function that resolves listeners from the registry and then attaches them to the instance
 *
 * @param registry The action registry that contains the listeners to resolve
 * @param cache The cache of already resolved listeners
 * @param ref The reference to resolve
 */
function resolveListeners(
	registry: Registry<Actionable<TargettedEventObject>>,
	cache: Map<string | symbol, Actionable<TargettedEventObject>>,
	ref: ListenerOrArray
): [(EventedListenerOrArray<TargettedEventObject>), Promise<(EventedListenerOrArray<TargettedEventObject>)>] {
	if (Array.isArray(ref)) {
		let isSync = true;
		const results: (Actionable<TargettedEventObject> | Promise<Actionable<TargettedEventObject>>)[] = [];
		for (const item of ref) {
			const [value, promise] = <[Actionable<TargettedEventObject>, Promise<Actionable<TargettedEventObject>>]> resolveListeners(registry, cache, item);
			if (value) {
				results.push(value);
			}
			else {
				isSync = false;
				results.push(promise);
			}
		}

		if (isSync) {
			return [<Actionable<TargettedEventObject>[]> results, undefined];
		}
		return [ undefined, Promise.all(results) ];
	}

	const id = <string | symbol> ref;
	if (cache.has(id)) {
		return [ cache.get(id), undefined ];
	}

	const promise = registry.get(id);
	promise.then((action) => {
		cache.set(id, action);
	});
	return [ undefined, promise ];
}

interface ManagementState {
	/**
	 * A cache of actions that are already resolved
	 */
	cache?: Map<string | symbol, Actionable<TargettedEventObject>>;

	/**
	 * A generation marker to be able to deal with conflicts
	 */
	generation?: number;

	/**
	 * A reference to a destruction handle to remove listeners
	 */
	handle?: Handle;

	/**
	 * A reference to the action registry which should resolve named actions
	 */
	registry: Registry<Actionable<TargettedEventObject>>;
}

/**
 * Map that holds state for manageListeners by widget instance.
 */
const managementMap = new WeakMap<StatefulListeners<StatefulListenersState>, ManagementState>();

/**
 * Internal statechange listener which replaces the listeners on the instance.
 */
function manageListeners(evt: StateChangeEvent<StatefulListenersState>): void {
	const widget: StatefulListeners<StatefulListenersState> = <any> evt.target;

	// Assume this function cannot be called without the widget being in the management map.
	const internalState = managementMap.get(widget);
	// Initialize cache.
	const { cache = new Map<string | symbol, EventedListener<TargettedEventObject>>() } = internalState;
	if (!internalState.cache) {
		internalState.cache = cache;
	}
	// Increment the generation vector. Used when listeners are replaced asynchronously to ensure
	// no newer state is overriden.
	const generation = internalState.generation = (internalState.generation || 0) + 1;

	// Unsetting listeners causes previous listeners to be removed.
	const listeners: ListenersMap = evt.state.listeners || {};
	// Resolve the actions, create a listeners map that is compatible with widget.on()
	const eventTypes = Object.keys(listeners);

	const newListeners: EventedListenersMap = {};
	// `promise` will be undefined if all actions are resolved synchronously
	const promise = eventTypes.reduce<Promise<void>>((promise, eventType) => {
		const [ value, listenersPromise ] = resolveListeners(internalState.registry, cache, listeners[eventType]);
		if (value) {
			newListeners[eventType] = value;
			return promise;
		}

		return listenersPromise.then((value) => {
			newListeners[eventType] = value;
			return promise;
		});
	}, undefined);

	const replaceListeners = () => {
		// Only replace listeners if there is no newer state that either already has, or soon will,
		// replace the original listeners.
		if (internalState.generation !== generation) {
			return;
		}

		if (internalState.handle) {
			internalState.handle.destroy();
		}
		internalState.handle = widget.on(newListeners);
	};

	if (promise) {
		promise
			.then(replaceListeners)
			.catch((error) => {
				widget.emit({
					type: 'error',
					target: widget,
					error
				});
			});
	} else {
		replaceListeners();
	}
}

const createStatefulListenersMixin: StatefulListenersMixinFactory = createStateful
	.mixin({
		initialize(instance: StatefulListeners<any>, { registryProvider, state }: StatefulListenersOptions<any> = {}) {
			if (registryProvider) {
				const registry = registryProvider.get('actions');
				managementMap.set(instance, { registry });

				instance.own(instance.on('statechange', manageListeners));

				/* Stateful will have already fired the statechange event at this point */
				if (state) {
					instance.setState(state);
				}
			}
		}
});

export default createStatefulListenersMixin;
