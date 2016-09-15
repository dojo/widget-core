import { EventObject, Handle } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import { assign } from 'dojo-core/lang';
import { ComposeFactory } from 'dojo-compose/compose';
import createEvented, {
	Evented,
	EventedOptions,
	EventedListenerOrArray,
	EventedListenersMap,
	resolveListener,
	TargettedEventObject
} from 'dojo-compose/mixins/createEvented';
import Set from 'dojo-shim/Set';
import { VNodeProperties } from 'maquette';
import { NodeAttributeFunction } from './createRenderMixin';

export interface VNodeListeners {
	[on: string]: (ev?: TargettedEventObject) => boolean | undefined | null;
	ontouchcancel?(ev?: TouchEvent): boolean | undefined | null;
	ontouchend?(ev?: TouchEvent): boolean | undefined | null;
	ontouchmove?(ev?: TouchEvent): boolean | undefined | null;
	ontouchstart?(ev?: TouchEvent): boolean | undefined | null;
	onblur?(ev?: FocusEvent): boolean | undefined | null;
	onchange?(ev?: Event): boolean | undefined | null;
	onclick?(ev?: MouseEvent): boolean | undefined | null;
	ondblclick?(ev?: MouseEvent): boolean | undefined | null;
	onfocus?(ev?: FocusEvent): boolean | undefined | null;
	oninput?(ev?: Event): boolean | undefined | null;
	onkeydown?(ev?: KeyboardEvent): boolean | undefined | null;
	onkeypress?(ev?: KeyboardEvent): boolean | undefined | null;
	onkeyup?(ev?: KeyboardEvent): boolean | undefined | null;
	onload?(ev?: Event): boolean | undefined | null;
	onmousedown?(ev?: MouseEvent): boolean | undefined | null;
	onmouseenter?(ev?: MouseEvent): boolean | undefined | null;
	onmouseleave?(ev?: MouseEvent): boolean | undefined | null;
	onmousemove?(ev?: MouseEvent): boolean | undefined | null;
	onmouseout?(ev?: MouseEvent): boolean | undefined | null;
	onmouseover?(ev?: MouseEvent): boolean | undefined | null;
	onmouseup?(ev?: MouseEvent): boolean | undefined | null;
	onmousewheel?(ev?: MouseWheelEvent): boolean | undefined | null;
	onscroll?(ev?: UIEvent): boolean | undefined | null;
	onsubmit?(ev?: Event): boolean | undefined | null;
}

const vnodeEvents = new Set([
	'touchcancel',
	'touchend',
	'touchmove',
	'touchstart',
	'blur',
	'change',
	'click',
	'dblclick',
	'focus',
	'input',
	'keydown',
	'keypress',
	'keyup',
	'load',
	'mousedown',
	'mouseenter',
	'mouseleave',
	'mousemove',
	'mouseout',
	'mouseover',
	'mouseup',
	'mousewheel',
	'scroll',
	'submit'
]);

export interface VNodeEventedMixin {
	/**
	 * A map of listeners that are exposed for use by the virutal DOM
	 */
	listeners: VNodeListeners;

	/**
	 * An array of functions the provide the VNode attributes when rendering
	 */
	nodeAttributes: NodeAttributeFunction[];
}

export interface VNodeEventedOverrides {
	on(type: 'touchcancel', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'touchend', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'touchmove', listener: EventedListenerOrArray<TouchEvent>): Handle;
	on(type: 'blur', listener: EventedListenerOrArray<FocusEvent>): Handle;
	on(type: 'change', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'click', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'dblclick', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'focus', listener: EventedListenerOrArray<FocusEvent>): Handle;
	on(type: 'input', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'keydown', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'keypress', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'keyup', listener: EventedListenerOrArray<KeyboardEvent>): Handle;
	on(type: 'load', listener: EventedListenerOrArray<Event>): Handle;
	on(type: 'mousedown', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseenter', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseleave', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mousemove', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseout', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseover', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mouseup', listener: EventedListenerOrArray<MouseEvent>): Handle;
	on(type: 'mousewheel', listener: EventedListenerOrArray<MouseWheelEvent>): Handle;
	on(type: 'scroll', listener: EventedListenerOrArray<UIEvent>): Handle;
	on(type: 'submit', listener: EventedListenerOrArray<Event>): Handle;
	/**
	 * Add a listener to an event by type
	 *
	 * @param type The type of event to listen for
	 * @param listener The event listener to attach
	 */
	on(type: string, listener: EventedListenerOrArray<TargettedEventObject>): Handle;
}

export type VNodeEvented = Evented & VNodeEventedMixin & VNodeEventedOverrides;

export type VNodeEventedOptions = EventedOptions;

export interface VNodeEventedFactory extends ComposeFactory<VNodeEvented, VNodeEventedOptions> { }

/**
 * Internal function to convert an array of handles to a single array
 *
 * TODO: This is used in a couple places, maybe should migrate to a better place
 *
 * @params handles An array of handles
 */
function handlesArraytoHandle(handles: Handle[]): Handle {
	return {
		destroy() {
			handles.forEach((handle) => handle.destroy());
		}
	};
}

const createVNodeEvented: VNodeEventedFactory = createEvented
	.mixin({
		mixin: {
			listeners: <VNodeListeners> null,

			nodeAttributes: [ function (this: VNodeEvented): VNodeProperties {
				return assign({}, this.listeners);
			} ]
		},
		aspectAdvice: {
			around: {
				on(origFn): (...args: any[]) => Handle {
					return function (this: VNodeEvented, ...args: any[]): Handle {
						if (args.length === 2) { /* overload: on(type, listener) */
							/* During initialization, sometimes the initialize functions occur out of order,
							* and Evented's initialize function could be called before this mixins, therefore
							* leaving this.listeners with an uninitiliazed value, therefore it is better to
							* determine if the value is unitialized here, ensuring that this.listeners is
							* always valid.
							*/
							if (this.listeners === null) {
								this.listeners = {};
							}
							let type: string;
							let listeners: EventedListenerOrArray<TargettedEventObject>;
							[ type, listeners ] = args;
							if (Array.isArray(listeners)) {
								const handles = listeners.map((listener) => vnodeEvents.has(type) ?
									on(this.listeners, 'on' + type, resolveListener(listener)) :
									origFn.call(this, type, listener));
								return handlesArraytoHandle(handles);
							}
							else {
								return vnodeEvents.has(type) ?
									on(this.listeners, 'on' + type, resolveListener(listeners)) :
									origFn.call(this, type, listeners);
							}
						}
						else if (args.length === 1) { /* overload: on(listeners) */
							const listenerMapArg: EventedListenersMap = args[0];
							return handlesArraytoHandle(Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type])));
						}
						else { /* unexpected signature */
							throw new TypeError('Invalid arguments');
						}
					};
				},

				emit(origFn): <T extends EventObject>(event: T) => void {
					return function <T extends EventObject>(this: VNodeEvented, event: T): void {
						if (vnodeEvents.has(event.type)) {
							if (this.listeners === null) {
								this.listeners = {};
							}
							const method = this.listeners['on' + event.type];
							if (method) {
								method.call(this, event);
							}
						}
						else {
							origFn.call(this, event);
						}
					};
				}
			}
		}
	});

export default createVNodeEvented;
