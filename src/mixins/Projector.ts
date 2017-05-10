import global from '@dojo/core/global';
import { assign } from '@dojo/core/lang';
import { Handle } from '@dojo/interfaces/core';
import { ProjectionOptions, VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { dom, Projection } from 'maquette';
import 'pepjs';
import cssTransitions from '../animations/cssTransitions';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { WidgetBase } from './../WidgetBase';

/**
 * Represents the attach state of the projector
 */
export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

/**
 * Attach type for the projector
 */
export enum AttachType {
	Append = 1,
	Merge = 2,
	Replace = 3
}

export interface AttachOptions {

	/**
	 * If `'append'` it will appended to the root. If `'merge'` it will merged with the root. If `'replace'` it will
	 * replace the root.
	 */
	type: AttachType;

	/**
	 * Element to attach the projector.
	 */
	root?: Element;

	/**
	 * The virtual DOM node to use as the initial root
	 */
	vnode?: VNode;
}

export interface ProjectorMixin<P extends WidgetProperties> {

	/**
	 * Append the projector to the root.
	 */
	append(root?: Element, vnode?: VNode): Handle;

	/**
	 * Merge the projector onto the root.
	 */
	merge(root?: Element, vnode?: VNode): Handle;

	/**
	 * Replace the root with the projector node.
	 */
	replace(root?: Element, vnode?: VNode): Handle;

	/**
	 * Pause the projector.
	 */
	pause(): void;

	/**
	 * Resume the projector.
	 */
	resume(): void;

	/**
	 * Schedule a render.
	 */
	scheduleRender(): void;

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	setProperties(properties: P & { [index: string]: any }): void;

	/**
	 * Sets the widget's children
	 */
	setChildren(children: DNode[]): void;

	/**
	 * Serializes the current projection
	 *
	 * This is intended to make it easy to accomplish server side rendering, where a projection can be serialized and
	 * transferred to a different context to be re-hydrated by passing it as an argument to `.append()`, `.merge()`, or
	 * `.replace()`.
	 */
	toJSON(): VNode;

	/**
	 * Root element to attach the projector
	 */
	root: Element;

	/**
	 * The status of the projector
	 */
	readonly projectorState: ProjectorAttachState;
}

const eventHandlers = [
	'ontouchcancel',
	'ontouchend',
	'ontouchmove',
	'ontouchstart',
	'onblur',
	'onchange',
	'onclick',
	'ondblclick',
	'onfocus',
	'oninput',
	'onkeydown',
	'onkeypress',
	'onkeyup',
	'onload',
	'onmousedown',
	'onmouseenter',
	'onmouseleave',
	'onmousemove',
	'onmouseout',
	'onmouseover',
	'onmouseup',
	'onmousewheel',
	'onscroll',
	'onsubmit'
];

/**
 * A guard that ensure that the `value` is just a plain object
 */
function isPlainObject<T extends object>(value: any): value is T {
	return Boolean(
		value &&
		typeof value === 'object' &&
		(value.constructor === Object || value.constructor === undefined)
	);
}

/**
 * Take a `VNode` and return a _sanitized_ version which can be moved from one context to another
 */
function serializeVNode({ vnodeSelector, properties, children, text }: VNode): VNode {
	function filter(properties: VNodeProperties): VNodeProperties {
		const filtered: { [prop: string]: any } = {};
		Object.keys(properties).forEach((name) => {
			const propertyValue = properties[name];
			const typeOfProperty = typeof properties[name];
			if (typeOfProperty === 'function' || name === 'bind') {
				return;
			}
			if (propertyValue && typeOfProperty === 'object') {
				if (isPlainObject(propertyValue)) {
					(<any> filtered)[name] = assign({}, propertyValue);
				}
			}
			else {
				(<any> filtered)[name] = propertyValue;
			}
		});
		return filtered;
	}

	return {
		vnodeSelector,
		properties: properties ? filter(properties) : undefined,
		children: children ? children.map(serializeVNode) : undefined,
		text,
		domNode: null
	};
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(base: T): T & Constructor<ProjectorMixin<P>> {
	return class extends base {

		public projectorState: ProjectorAttachState;

		private _root: Element;
		private _rootVNode: VNode;
		private _attachHandle: Handle;
		private _projectionOptions: ProjectionOptions;
		private _projection: Projection | undefined;
		private _scheduled: number | undefined;
		private _paused: boolean;
		private _boundDoRender: FrameRequestCallback;
		private _boundRender: Function;

		constructor(...args: any[]) {
			super(...args);

			this._projectionOptions = {
				transitions: cssTransitions,
				eventHandlerInterceptor: this.eventHandlerInterceptor.bind(this)
			};

			this._boundDoRender = this.doRender.bind(this);
			this._boundRender = this.__render__.bind(this);

			this.own(this.on('widget:children', this.invalidate));
			this.own(this.on('properties:changed', () => {
				this.scheduleRender();
			}));
			this.own(this.on('invalidated', this.scheduleRender));

			this.root = document.body;
			this.projectorState = ProjectorAttachState.Detached;
		}

		public append(root?: Element, vnode?: VNode) {
			const options = {
				type: AttachType.Append,
				root,
				vnode
			};

			return this.attach(options);
		}

		public merge(root?: Element, vnode?: VNode) {
			const options = {
				type: AttachType.Merge,
				root,
				vnode
			};

			return this.attach(options);
		}

		public replace(root?: Element, vnode?: VNode) {
			const options = {
				type: AttachType.Replace,
				root,
				vnode
			};

			return this.attach(options);
		}

		public pause() {
			if (this._scheduled) {
				global.cancelAnimationFrame(this._scheduled);
				this._scheduled = undefined;
			}
			this._paused = true;
		}

		public resume() {
			this._paused = false;
			this.scheduleRender();
		}

		public scheduleRender() {
			if (this.projectorState === ProjectorAttachState.Attached && !this._scheduled && !this._paused) {
				this._scheduled = global.requestAnimationFrame(this._boundDoRender);
			}
		}

		public set root(root: Element) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		public get root(): Element {
			return this._root;
		}

		public setChildren(children: DNode[]): void {
			super.__setChildren__(children);
		}

		public setProperties(properties: P & { [index: string]: any }): void {
			super.__setProperties__(properties);
		}

		public toJSON(): VNode {
			if (!this._rootVNode) {
				throw new Error('Projector missing root VNode.');
			}
			return serializeVNode(this._rootVNode);
		}

		public __render__() {
			const result = super.__render__();
			if (typeof result === 'string' || result === null) {
				throw new Error('Must provide a VNode at the root of a projector');
			}

			return result;
		}

		private eventHandlerInterceptor(propertyName: string, eventHandler: Function, domNode: Element, properties: VNodeProperties) {
			if (eventHandlers.indexOf(propertyName) > -1) {
				return function(this: Node, ...args: any[]) {
					return eventHandler.apply(properties.bind || this, args);
				};
			}
			else {
				// remove "on" from event name
				const eventName = propertyName.substr(2);
				domNode.addEventListener(eventName, (...args: any[]) => {
					eventHandler.apply(properties.bind || this, args);
				});
			}
		}

		private doRender() {
			this._scheduled = undefined;

			if (this._projection) {
				this._projection.update(this._rootVNode = this._boundRender());
			}
		}

		private attach({ type, root, vnode }: AttachOptions): Handle {
			if (root) {
				this.root = root;
			}

			if (this.projectorState === ProjectorAttachState.Attached) {
				return this._attachHandle;
			}

			this.projectorState = ProjectorAttachState.Attached;

			this._attachHandle = this.own({
				destroy: () => {
					if (this.projectorState === ProjectorAttachState.Attached) {
						this.pause();
						this._projection = undefined;
						this.projectorState = ProjectorAttachState.Detached;
					}
					this._attachHandle = { destroy() { } };
				}
			});

			this._rootVNode = vnode || this._boundRender();

			switch (type) {
				case AttachType.Append:
					this._projection = dom.append(this.root, this._rootVNode, this._projectionOptions);
				break;
				case AttachType.Merge:
					this._projection = dom.merge(this.root, this._rootVNode, this._projectionOptions);
				break;
				case AttachType.Replace:
					this._projection = dom.replace(this.root, this._rootVNode, this._projectionOptions);
				break;
			}

			return this._attachHandle;
		}
	};
}

export default ProjectorMixin;
