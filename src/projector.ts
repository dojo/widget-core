import { h, createProjector as createMaquetteProjector, Projector as MaquetteProjector, VNode, VNodeProperties } from 'maquette/maquette';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, EventedOptions, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import { Handle } from 'dojo-core/interfaces';
import { assign } from 'dojo-core/lang';
import { queueTask } from 'dojo-core/queue';
import Promise from 'dojo-core/Promise';
import WeakMap from 'dojo-core/WeakMap';
import createVNodeEvented, { VNodeEvented } from './mixins/createVNodeEvented';
import createParentListMixin, { ParentListMixin, ParentListMixinOptions } from './mixins/createParentListMixin';
import { Child } from './mixins/interfaces';

export type AttachType = 'append' | 'merge' | 'replace';

export interface ProjectorOptions extends ParentListMixinOptions<Child>, EventedOptions {
	/**
	 * The root element for the projector
	 */
	root?: Element;

	/**
	 * If `true`, automatically attach to the DOM during creation (by merging). Do the same if a valid attach type is
	 * provided (see `AttachOptions`). The attach type determines how the projector is attached.
	 */
	autoAttach?: boolean | AttachType;
}

export interface AttachOptions {
	/**
	 * If `'append'` it will append to the root. If `'merge'` it will merge with the root. If `'replace'` it will
	 * replace the root.
	 */

	type?: AttachType;
	/**
	 * If `type` is `'append'` or `'replace'` then `tagName` will be used to determine what tag name
	 * is used to append to or replace the root element. Defaults to `div`.
	 */
	tagName?: string;
}

export interface ProjectorMixin {
	/**
	 * Get the projector's VNode attributes
	 */
	getNodeAttributes(overrides?: VNodeProperties): VNodeProperties;

	/**
	 * Returns a VNode which represents the DOM for the projector
	 */
	render(): VNode;

	/**
	 * Attach the projector to the DOM and return a promise.
	 *
	 * The promise is fulfilled when all previously appended children have been created.
	 * It is fulfilled with a handle which can be used to detach the projector. The same promise is
	 * returned when called more than once.
	 *
	 * @param options An optional map of options that change the default behaviour of the attachment
	 */
	attach(options?: AttachOptions): Promise<Handle>;

	/**
	 * Inform the projector that it is in a dirty state and should re-render.  Calling event handles will automatically
	 * schedule a re-render.
	 */
	invalidate(): void;

	/**
	 * If unattached, set the root element for the projector.
	 * @param root The Element that should serve as the root for the projector
	 */
	setRoot(root: Element): void;

	/**
	 * The native maquette Projector that is being managed
	 */
	projector: MaquetteProjector;

	/**
	 * The root of the projector
	 */
	root: Element;

	/**
	 * An array of classes that should be applied to the root of the projector
	 */
	classes?: string[];

	/**
	 * A hash of inline styles that should be applied to the root of the projector
	 */
	styles?: { [style: string]: string; };

	/**
	 * A reference to the document that the projector is attached to
	 */
	document: Document;

	/**
	 * The current state of the projector
	 */
	state: ProjectorState;
}

export interface ProjectorOverrides {
	/**
	 * Event emitted after the projector has been attached to the DOM.
	 */
	on(type: 'attach', listener: EventedListener<TargettedEventObject>): Handle;

	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type Projector = VNodeEvented & ParentListMixin<Child> & ProjectorMixin;

export interface ProjectorFactory extends ComposeFactory<Projector, ProjectorOptions> { }

export enum ProjectorState {
	Attached = 1,
	Detached
};

interface ProjectorData {
	afterInitialCreate?: () => void;
	attachHandle?: Handle;
	attachPromise?: Promise<Handle>;
	boundRender?: () => VNode;
	projector?: MaquetteProjector;
	root?: Element;
	state?: ProjectorState;
	tagName?: string;
}

const projectorDataMap = new WeakMap<Projector, ProjectorData>();

const noopHandle = { destroy() { } };
const emptyVNode = h('div');
const noopVNode = function(): VNode { return emptyVNode; };

export const createProjector: ProjectorFactory = compose<ProjectorMixin, ProjectorOptions>({
		getNodeAttributes(overrides?: VNodeProperties): VNodeProperties {
			/* TODO: This is the same logic as createCachedRenderMixin, merge somehow */
			const projector: Projector = this;
			const props: VNodeProperties = {};
			for (let key in projector.listeners) {
				props[key] = projector.listeners[key];
			}
			const classes: { [index: string]: boolean; } = {};
			if (projector.classes) {
				projector.classes.forEach((c) => classes[c] = true);
			}
			props.classes = classes;
			props.styles = projector.styles || {};
			if (overrides) {
				assign(props, overrides);
			}
			return props;
		},
		render(): VNode {
			const projector: Projector = this;
			const projectorData = projectorDataMap.get(projector);
			const childVNodes: VNode[] = [];
			projector.children.forEach((child) => childVNodes.push(child.render()));
			const props = projector.getNodeAttributes();
			props.afterCreate = projectorData.afterInitialCreate;
			return h(projectorData.tagName, props, childVNodes);
		},
		attach({ type, tagName = 'div' }: AttachOptions = {}): Promise<Handle> {
			const projector: Projector = this;
			const projectorData = projectorDataMap.get(projector);
			if (projectorData.state === ProjectorState.Attached) {
				return projectorData.attachPromise;
			}
			projectorData.boundRender = projector.render.bind(projector);
			projectorData.tagName = tagName;
			projectorData.state = ProjectorState.Attached;
			projectorData.attachHandle = projector.own({
				destroy() {
					if (projectorData.state === ProjectorState.Attached) {
						projectorData.projector.stop();
						try {
							/* Sometimes Maquette can't seem to find function */
							projectorData.projector.detach(projectorData.boundRender);
						}
						catch (e) {
							if (e.message !== 'renderMaquetteFunction was not found') {
								throw e;
							}
							/* else, swallow */
						}
						/* for some reason, Maquette still trys to call this in some situations, so the noopVNode is
						 * used to return an empty structure */
						projectorData.boundRender = noopVNode;
						projectorData.state = ProjectorState.Detached;
					}
					projectorData.attachHandle = noopHandle;
				}
			});
			projectorData.attachPromise = new Promise((resolve, reject) => {
				projectorData.afterInitialCreate = () => {
					try {
						projector.emit({ type: 'attach' });
						resolve(projectorData.attachHandle);
					} catch (err) {
						reject(err);
					}
				};
			});

			/* attaching async, in order to help ensure that if there are any other async behaviours scheduled at the end of the
			 * turn, they are executed before this, since the attachement is actually done in turn, but subsequent schedule
			 * renders are done out of turn */
			queueTask(() => {
				const { projector } = projectorData;
				switch (type) {
					case 'append':
						projector.append(projectorData.root, projectorData.boundRender);
						break;
					case 'replace':
						projector.replace(projectorData.root, projectorData.boundRender);
						break;
					case 'merge':
					default:
						projector.merge(projectorData.root, projectorData.boundRender);
						break;
				}
			});

			return projectorData.attachPromise;
		},
		invalidate(): void {
			const projector: Projector = this;
			const projectorData = projectorDataMap.get(projector);
			if (projectorData.state === ProjectorState.Attached) {
				projector.emit({
					type: 'schedulerender',
					target: projector
				});
				projectorData.projector.scheduleRender();
			}
		},
		setRoot(root: Element): void {
			const projectorData = projectorDataMap.get(this);
			if (projectorData.state === ProjectorState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			projectorData.root = root;
		},

		get root(): Element {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.root;
		},

		get projector(): MaquetteProjector {
			return projectorDataMap.get(this).projector;
		},

		get document(): Document {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.root && projectorData.root.ownerDocument;
		},

		get state(): ProjectorState {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.state;
		}
	})
	.mixin({
		mixin: createVNodeEvented,
		initialize(instance) {
			/* We have to stub out listeners for Maquette, otherwise it won't allow us to change them down the road */
			instance.on('touchend', function () {});
			instance.on('touchmove', function () {});
		}
	})
	.mixin({
		mixin: createParentListMixin,
		initialize(instance: Projector, { autoAttach = false, root = document.body }: ProjectorOptions = {}) {
			const projector = createMaquetteProjector({});
			projectorDataMap.set(instance, {
				projector,
				root,
				state: ProjectorState.Detached
			});
			if (autoAttach === true) {
				instance.attach({ type: 'merge' });
			}
			else if (typeof autoAttach === 'string') {
				instance.attach({ type: autoAttach });
			}
		},
		aspectAdvice: {
			after: {
				clear(): void {
					const projector: Projector = this;
					projector.invalidate();
				}
			}
		}
	});

const defaultProjector: Projector = typeof global.document === 'undefined' ? null : createProjector();

export default defaultProjector;
