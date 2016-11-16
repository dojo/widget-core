import { ComposeFactory } from 'dojo-compose/compose';
import { createHandle } from 'dojo-core/lang';
import {
	CreatableRegistry,
	Renderable
} from 'dojo-interfaces/abilities';
import { Handle } from 'dojo-interfaces/core';
import {
	ChildNodeFunction,
	CreateWidgetList,
	CreateWidgetMap,
	ContainerWidget,
	ContainerWidgetMixin,
	ContainerWidgetOptions,
	ContainerWidgetState,
	CreateWidgetResults,
	HNode,
	WidgetOptions,
	WidgetState
} from 'dojo-interfaces/widgetBases';
import { from as arrayFrom, includes } from 'dojo-shim/array';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import createWidgetBase from './createWidgetBase';

export interface RegistryProvider<T> {
	get<U extends T & Renderable>(type: 'widgets'): CreatableRegistry<U>;
}

/**
 * Extend the container widget mixin interfaces to allow a specification of a child node renderer
 */
interface ContainerWidgetMergeMixin extends ContainerWidgetMixin<Renderable> {
	childNodeRenderers: ChildNodeFunction[];
}

interface ContainerWidgetPrivateState {
	/**
	 * A map of the children currently associated with the container
	 */
	children: Map<string, Renderable>;

	/**
	 * Handles for listeners for the invalidated event on the children
	 */
	childrenHandles: Map<string, Handle>;

	/**
	 * Used to generate unique IDs for children
	 */
	childrenUID: number;

	/**
	 * A reference to the containers invalidate that is bound to the container
	 */
	selfInvalidate: () => void;

	/**
	 * A reference to a widget registry (if provided at startup)
	 */
	widgetRegistry: CreatableRegistry<Renderable> | undefined;
}

/**
 * The private state WeakMap for containers
 */
const containerWidgetPrivateState = new WeakMap<ContainerWidget<Renderable, ContainerWidgetState>, ContainerWidgetPrivateState>();

/**
 * Internal function that is used to provide a fill of the registryProvider functionality when there is none available
 *
 * @param factory The factory to use to create the instance
 * @param options Any options to pass the factory upon creation
 */
function createFill<T extends Renderable, O>(factory: ComposeFactory<T, O>, options?: O): Promise<[ string, T ]> {
	const instance = factory(options);
	return Promise.resolve([ instance.id, instance ]);
}

/**
 * A static empty array to be used to generate the `getRenderableHNode` function
 */
const emptyArray: null[] = [];

/**
 * Internal function which ensures that widget options, upon creation, have a unique ID
 *
 * @param container The container widget instance to use as reference
 * @param options Any value that will be converted to appropriate widget creation options
 */
function getOptions<O extends WidgetOptions<WidgetState>>(container: ContainerWidget<Renderable, ContainerWidgetState>, options: any): O {
	options = options || {};
	if (!options.id) {
		options.id = `${container.id}-child-${++containerWidgetPrivateState.get(container).childrenUID}`;
	}
	return options;
}

/**
 * Internal function that converts a Renderable into an HNode which then can be used internally in WidgetBase
 * when rendering
 *
 * TODO: This might be useful in other places?
 *
 * @param renderable The Renderable to convert into an HNode
 */
function getRenderableHNode(renderable: Renderable): HNode {
	return {
		children: emptyArray,
		render: renderable.render.bind(renderable)
	};
}

/**
 * An internal type guard t check if a value is a CreateWidgetList
 */
function isCreateWidgetList(value: any): value is CreateWidgetList<any, any> {
	return Array.isArray(value);
}

/**
 * An internal type guard to check if a value is an instance of Renderable
 *
 * TODO: Is there a better home for this?
 *
 * @param value The value to check to see if a Renderable
 */
function isRenderable(value: any): value is Renderable {
	return value && typeof value === 'object' && value.render && value.invalidate;
}

/**
 * A childNodeRender function that returns the current children as a set of `HNode`s as well as ensures that the
 * the current children are properly synched with the state of the widget.
 */
function renderChildren(this: ContainerWidget<Renderable, ContainerWidgetState>): HNode[] {
	syncChildren(this);
	return arrayFrom(containerWidgetPrivateState.get(this).children.values())
		.map((child) => getRenderableHNode(child));
}

/**
 * Internal function which syncs the children with their state representation
 *
 * @param container The ContainerWidget instance to sync the children for
 */
function syncChildren(container: ContainerWidget<Renderable, ContainerWidgetState>): void {

	const { children: stateChildren } = container.state;
	const { children, childrenHandles, widgetRegistry, selfInvalidate } = containerWidgetPrivateState.get(container);

	/* check to see if any current widgets need to be removed */
	let dirty = false;
	arrayFrom(children.keys())
		.filter((label) => !includes(stateChildren, label))
		.forEach((label) => {
			dirty = true;
			children.delete(label);
			const handle = childrenHandles.get(label);
			/* istanbul ignore else: too difficult to create */
			if (handle) {
				handle.destroy();
				childrenHandles.delete(label);
			}
		});

	const childrenNames = arrayFrom(children.keys());

	/**
	 * Checks if the children map and container.state.children are in the same order
	 */
	function isChildrenInSameOrder(): boolean {
		return childrenNames.every((label, index) => {
			return label === stateChildren[index];
		});
	}

	/**
	 * Ensures that the children map and container.state.children are in the same order and invalidates the
	 * container if *dirty*
	 */
	function checkChildOrder(): void {
		if (!isChildrenInSameOrder()) {
			dirty = true;
			const newChildrenMap = containerWidgetPrivateState.get(container).children = new Map<string, Renderable>();
			stateChildren.forEach((label) => {
				newChildrenMap.set(label, children.get(label)!);
			});
		}
		if (dirty) {
			selfInvalidate();
		}
	}

	if (stateChildren && widgetRegistry) { /* we have state.children and a widget registry */
		const addedChildren = stateChildren.reduce((requests, label) => { /* determine if any children were added to state */
			if (!includes(childrenNames, label)) {
				requests.push(widgetRegistry.get(label)
					.then((hasLabel) => hasLabel ? widgetRegistry.get(label) : undefined)
					.then((widget) => widget ? <[string, Renderable]> [ label, widget ] : undefined));
			}
			return requests;
		}, <Promise<[string, Renderable] | undefined>[]> []);

		if (addedChildren.length) {
			Promise.all(addedChildren)
				.then((results) => {
					if (isChildrenInSameOrder()) { /* we can just "append" the added widgets */
						results.forEach((result) => {
							/* istanbul ignore else: too difficult to create */
							if (result) {
								children.set(result[0], result[1]);
								/* istanbul ignore else: too difficult to create */
								if (!childrenHandles.has(result[0])) {
									childrenHandles.set(result[0], result[1].on('invalidated', selfInvalidate));
								}
							}
						});
					}
					else { /* we have to recreate the whole map */
						const newChildrenMap = containerWidgetPrivateState.get(container).children = new Map<string, Renderable>();
						const resultsMap = results.reduce((resultsMap, result) => {
							/* istanbul ignore else: too difficult to create */
							if (result) {
								resultsMap.set(result[0], result[1]);
							}
							return resultsMap;
						}, new Map<string, Renderable>());
						stateChildren.forEach((label) => {
							const child = children.has(label) ? children.get(label) : resultsMap.get(label);
							/* istanbul ignore else: too difficult to create */
							if (child) {
								newChildrenMap.set(label, child);
								if (!childrenHandles.has(label)) {
									childrenHandles.set(label, child.on('invalidated', selfInvalidate));
								}
							}
						});
					}
					selfInvalidate();
				})
				.catch((error) => {
					container.emit({
						type: 'error',
						target: container,
						error
					});
				});
		}
		else { /* no widgets added from registry */
			checkChildOrder();
		}
	}
	else { /* no registry */
		checkChildOrder();
	}
}

/**
 * The ContainerWidgetMixin which adds functionality to the WidgetBase
 */
const containerWidgetMixin: ContainerWidgetMergeMixin = {
	childNodeRenderers: [ renderChildren ],

	get children(this: ContainerWidget<Renderable, ContainerWidgetState>): Map<string, Renderable> {
		return containerWidgetPrivateState.get(this).children;
	},

	clear(this: ContainerWidget<Renderable, ContainerWidgetState>): void {
		this.setState({ children: [] });
	},

	createChildren<O extends WidgetOptions<WidgetState>>(
		this: ContainerWidget<Renderable, ContainerWidgetState>,
		children: CreateWidgetList<Renderable, O> | CreateWidgetMap<Renderable, O>
	): Promise<CreateWidgetResults<Renderable>> {
		const { widgetRegistry } = containerWidgetPrivateState.get(this);

		const create = widgetRegistry ? widgetRegistry.create : createFill;
		const creationIndex: string[] = [];
		const promises: Promise<[string, Renderable]>[] = [];
		if (isCreateWidgetList(children)) {
			children.forEach((value) => {
				promises.push(create(value[0], getOptions<O>(this, value[1])));
			});
		}
		else {
			for (const label in children) {
				const { factory, options } = children[label];
				promises.push(create(factory, getOptions<O>(this, options)));
				creationIndex.push(label);
			}
		}

		return Promise.all(promises)
			.then((results) => {
				const isChildrenCreateWidgetList = isCreateWidgetList(children);
				const { children: childrenMap, childrenHandles, selfInvalidate } = containerWidgetPrivateState.get(this);
				const createWidgetResults = results.reduce((createWidgetResults, [ returnedLabel, child ], index) => {
					const label = isChildrenCreateWidgetList ? returnedLabel : creationIndex[index];
					createWidgetResults[label] = child;
					childrenMap.set(label, child);
					childrenHandles.set(label, child.on('invalidated', selfInvalidate));
					return createWidgetResults;
				}, <CreateWidgetResults<Renderable>> {});

				this.setState({ children: arrayFrom(childrenMap.keys()) });

				return createWidgetResults;
			});
	},

	set(
		this: ContainerWidget<Renderable, ContainerWidgetState>,
		label: string | Renderable | Renderable[] | { [label: string]: Renderable },
		child?: Renderable
	): Handle {
		let children: { [label: string]: Renderable } = Object.create(null);
		const { children: childrenMap, childrenHandles, selfInvalidate } = containerWidgetPrivateState.get(this);
		if (typeof label === 'string') {
			if (!child) {
				throw new TypeError('Child not passed to .set()');
			}
			children[label] = child;
		}
		else if (Array.isArray(label)) {
			children = label.reduce((children, child) => {
				children[child.id] = child;
				return children;
			}, children);
		}
		else if (isRenderable(label)) {
			children[label.id] = label;
		}
		else {
			children = label;
		}

		for (const label in children) {
			const child = children[label];
			childrenMap.set(label, child);
			childrenHandles.set(label, child.on('invalidated', selfInvalidate));
		}

		this.setState({ children: arrayFrom(childrenMap.keys()) });

		return createHandle(() => {
			for (const label in children) {
				childrenMap.delete(label);
				const handle = childrenHandles.get(label);
				/* istanbul ignore else: too difficult to create */
				if (handle) {
					handle.destroy();
					childrenHandles.delete(label);
				}
			}
			this.setState({ children: arrayFrom(childrenMap.keys()) });
		});
	}
};

interface ContainerWidgetBaseFactory<C extends Renderable, S extends ContainerWidgetState> extends ComposeFactory<ContainerWidget<C, S>, ContainerWidgetOptions<C, S>> {
	<T extends ContainerWidget<D, S>, D extends C>(options?: ContainerWidgetOptions<D, S>): T;
}

const createContainerWidgetBase = createWidgetBase
	.mixin({
		className: 'ContainerWidgetBase',

		/* The childNodeRenders in the mixin causes issues, so coercion is required */
		mixin: containerWidgetMixin as ContainerWidgetMixin<Renderable>,

		initialize(
			instance: ContainerWidget<Renderable, ContainerWidgetState>,
			{ createChildren, registryProvider }: ContainerWidgetOptions<Renderable, ContainerWidgetState> = {}
		) {
			let widgetRegistry: CreatableRegistry<Renderable> | undefined;
			if (registryProvider) {
				widgetRegistry = registryProvider.get('widgets');
			}
			containerWidgetPrivateState.set(instance, {
				children: new Map<string, Renderable>(),
				childrenHandles: new Map<string, Handle>(),
				childrenUID: 0,
				widgetRegistry,
				selfInvalidate() {
					instance.invalidate();
				}
			});
			if (createChildren) {
				instance.createChildren(createChildren);
			}
		}
	}) as ContainerWidgetBaseFactory<Renderable, ContainerWidgetState>;

export default createContainerWidgetBase;
