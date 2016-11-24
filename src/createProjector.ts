import { ComposeFactory } from 'dojo-compose/compose';
import { Handle } from 'dojo-interfaces/core';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';
import WeakMap from 'dojo-shim/WeakMap';
import { createProjector as createMaquetteProjector, Projector as MaquetteProjector } from 'maquette';
import cretateWidgetBase from './bases/createWidgetBase';

/**
 * Represents the state of the projector
 */
export enum ProjectorState {
	Attached = 1,
	Detached
};

/**
 * Projector interface
 */
export interface ProjectorOptions extends WidgetOptions<WidgetState> {

	/**
	 * An optional root of the projector
	 */
	root?: Element;
}

export interface ProjectorMixin {

	/**
	 * Attach the projector to the an element provided as the root.
	 */
	attach(): Promise<Handle>;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The Maquette projector
	 */
	readonly projector: MaquetteProjector;

	/**
	 * The status of the projector
	 */
	state: ProjectorState;
}

/**
 * Internal projector state
 */
interface ProjectorData {
	projector: MaquetteProjector;
	root: Element;
	state: ProjectorState;
	attachPromise?: Promise<Handle>;
	attachHandle?: Handle;
	afterCreate?: () => void;
}

export type Projector = Widget<WidgetState> & ProjectorMixin;

export interface ProjectorFactory extends ComposeFactory<Projector, ProjectorOptions> { }

/**
 * Private state map keyed by instance.
 */
const projectorDataMap = new WeakMap<Projector, ProjectorData>();

/**
 * Projector Factory
 */
const createProjector: ProjectorFactory = cretateWidgetBase
.mixin({
	mixin: {
		attach(this: Projector) {
			const projectorData = projectorDataMap.get(this);
			const render = this.render.bind(this);

			if (projectorData.state === ProjectorState.Attached) {
				return projectorData.attachPromise || Promise.resolve({});
			}
			projectorData.state = ProjectorState.Attached;

			projectorData.attachHandle = this.own({
				destroy() {
					if (projectorData.state === ProjectorState.Attached) {
						projectorData.projector.stop();
						projectorData.projector.detach(render);
						projectorData.state = ProjectorState.Detached;
					}
					projectorData.attachHandle = { destroy() {} };
				}
			});

			projectorData.attachPromise = new Promise((resolve, reject) => {
				projectorData.afterCreate = () => {
					try {
						this.emit({ type: 'attach' });
						resolve(projectorData.attachHandle);
					} catch (err) {
						reject(err);
					}
				};
			});

			projectorData.projector.merge(projectorData.root, render);

			return projectorData.attachPromise;
		},

		set root(this: Projector, root: Element) {
			const projectorData = projectorDataMap.get(this);
			if (projectorData.state === ProjectorState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			projectorData.root = root;
		},

		get root(this: Projector): Element {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.root;
		},

		get projector(this: Projector): MaquetteProjector {
			return projectorDataMap.get(this).projector;
		},
		get state(this: Projector): ProjectorState {
			const projectorData = projectorDataMap.get(this);
			return projectorData && projectorData.state;
		}
	},
	initialize(instance: Projector, options: ProjectorOptions) {
		const { root = document.body } = options;
		const projector = createMaquetteProjector(options);

		projectorDataMap.set(instance, {
			projector,
			root,
			state: ProjectorState.Detached
		});
	}
})
.mixin({
	mixin: {
		nodeAttributes: [
			function(this: Projector): VNodeProperties {
				const { afterCreate } = projectorDataMap.get(this);
				return { afterCreate };
			}
		]
	},
	aspectAdvice: {
		after: {
			invalidate(this: Projector): void {
				const projectorData = projectorDataMap.get(this);
				if (projectorData.state === ProjectorState.Attached) {
					this.emit({
						type: 'schedulerender',
						target: this
					});
					projectorData.projector.scheduleRender();
				}
			}
		}
	}
});

export default createProjector;
