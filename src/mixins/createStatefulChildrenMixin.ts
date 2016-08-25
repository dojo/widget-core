import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { List, Map as ImmutableMap } from 'immutable/immutable';
import { Child, ChildListEvent, CreatableRegistry, RegistryProvider } from './interfaces';
import { isList } from '../util/lang';

export interface StatefulChildrenState {
	children?: string[];
}

export interface StatefulChildrenOptions<C extends Child, S extends StatefulChildrenState> extends StatefulOptions<S> {
	registryProvider?: RegistryProvider<C>;
}

export type StatefulChildren<C extends Child, S extends StatefulChildrenState> = Stateful<S> & {
	/**
	 * The children that are associated with this widget
	 */
	children: List<C> | ImmutableMap<string, C>;

	/**
	 * Creates an instance based on the supplied factory and adds the child to this parent
	 * returning a promise which resolves with the ID and the instace.
	 */
	createChild<D extends C, O extends { id?: string }>(factory: ComposeFactory<D, O>, options?: O): Promise<[string, D]>;

	id?: string;
}

export interface StatefulChildrenMixinFactory extends ComposeFactory<StatefulChildren<Child, StatefulChildrenState>, StatefulChildrenOptions<Child, StatefulChildrenState>> {
	<C extends Child>(options?: StatefulChildrenOptions<C, StatefulChildrenState>): StatefulChildren<C, StatefulChildrenState>;
}

interface ManagementState {
	cache?: Map<string, Child>;
	current?: List<string>;
	generation: number;
	childrenUID: number;
	id: string | undefined;
	registry: CreatableRegistry<Child>;
}

/**
 * Map that holds state for manageChildren and manageChildrenState by widget instance.
 */
const managementMap = new WeakMap<StatefulChildren<Child, StatefulChildrenState>, ManagementState>();

/**
 * Internal statechange listener which deals with
 */
function manageChildren(evt: StateChangeEvent<StatefulChildrenState>): void {
	const parent: StatefulChildren<Child, StatefulChildrenState> = <any> evt.target;

	/* Assume this function cannot be called without the widget being in the management map */
	const internalState = managementMap.get(parent);
	/* Initialize cache */
	if (!internalState.cache) {
		internalState.cache = new Map<string, Child>();
	}
	/* Initialize current children IDs */
	if (!internalState.current) {
		internalState.current = List<string>();
	}
	/* Increment the generation vector. Used when children are replaced asynchronously to ensure
	 * no newer state is overriden. */
	const generation = ++internalState.generation;

	const currentChildrenIDs = List(evt.state.children);
	if (currentChildrenIDs.equals(internalState.current)) {
		/* There are no changes to the children */
		return;
	}

	internalState.current = currentChildrenIDs;
	const resolvingWidgets: [ Promise<Child>, string, number ][] = [];

	/* Sometimes we are dealing with children that are a list, somtimes, a Map */
	const childrenList: Child[] = [];
	const childrenMap: { [ id: string ]: Child } = {};
	const childrenIsList = isList(parent.children);

	/* Iterate through children ids, retrieving reference to widget or otherwise
	 * requesting the widget from the registry */
	currentChildrenIDs.forEach((id, key) => internalState.cache.has(id)
		? childrenIsList
			? childrenList[key] = internalState.cache.get(id)
			: childrenMap[id] = internalState.cache.get(id)
		/* Tuple of Promise, child ID, position in child list */
		: resolvingWidgets.push([ internalState.registry.get(id), id, key ]));

	/* If we have requests for widgets outstanding, we need to wait for them to be
	 * resolved and then populate them in the children */
	if (resolvingWidgets.length) {
		Promise.all(resolvingWidgets.map(([ promise ]) => promise))
			.then((widgets) => {
				/* Only replace children if there is no newer state that either already has, or soon will,
				 * replace the original listeners. */
				if (internalState.generation !== generation) {
					return;
				}

				widgets.forEach((widget, idx) => {
					const [ , id, key ] = resolvingWidgets[idx];
					if (childrenIsList) {
						childrenList[key] = widget;
					}
					else {
						childrenMap[id] = widget;
					}
					internalState.cache.set(id, widget);
				});
				/* Some parents have a List, some have a Map, so setting them varies */
				parent.children = isList(parent.children) ? List(childrenList) : ImmutableMap<string, Child>(childrenMap);
			}, (error) => {
				/* A promise got rejected for some reason */
				parent.emit({
					type: 'error',
					target: parent,
					error: error
				});
			});
	}
	else {
		/* Otherwise we can just set the children */
		parent.children = isList(parent.children) ? List(childrenList) : ImmutableMap<string, Child>(childrenMap);
	}
}

function manageChildrenState(evt: ChildListEvent<any, Child>) {
	const parent: StatefulChildren<Child, StatefulChildrenState> = evt.target;

	/* Assume this function cannot be called without the widget being in the management map */
	const { registry } = managementMap.get(parent);

	const evtChildren = evt.children;

	const currentChildrenIDs = <List<string>> (isList(evtChildren)
		? evtChildren.map((widget) => registry.identify(widget))
		: List(evtChildren.keys()));

	if (!currentChildrenIDs.equals(List(parent.state.children))) {
		const children = currentChildrenIDs.toArray();
		parent.setState({ children });
	}
}

const createStatefulChildrenMixin = compose({
		createChild<C extends Child>(
			this: StatefulChildren<Child, StatefulChildrenState>,
			factory: ComposeFactory<C, any>,
			options: any = {}
		): Promise<[string, C]> {
			if (managementMap.has(this)) {
				const management = managementMap.get(this);
				const { registry, id } = management;
				if (!options.id) {
					/* depending upon the construction lifecycle, the this.id may not have been properly set and will
					 * auto-generate an ID, therefore we have copied the ID out of options, if it was present and will
					 * use that as a base for autogenerating the child widget's ID */
					options.id = id
						? `${id}-child-${++management.childrenUID}`
						: `${this.id}-child-${++management.childrenUID}`;
				}
				return registry.create(factory, options)
					.then(([ id, child ]): [ string, C ] => {
						/* This mixin doesn't understand how to directly append a child widget, so instead it will modify
						 * the widget's state and append the id to the children state */
						this.setState({ children: (this.state.children || []).concat([ id ]) });
						return [ id, child ];
					});
			}
			return Promise.reject(new Error('Unable to create child, unable to resolve registry'));
		}
	})
	.mixin(createStateful)
	.mixin({
		mixin: createEvented,
		initialize(instance: StatefulChildren<Child, StatefulChildrenState>, { registryProvider, id }: StatefulChildrenOptions<Child, StatefulChildrenState> = {}) {
			if (registryProvider) {
				const registry = registryProvider.get('widgets');
				managementMap.set(instance, {
					registry,
					generation: 0,
					childrenUID: 0,
					id: id
				});

				instance.own(instance.on('statechange', manageChildren));
				instance.own(instance.on('childlist', manageChildrenState));
			}
		}
	}) as StatefulChildrenMixinFactory;

export default createStatefulChildrenMixin;
