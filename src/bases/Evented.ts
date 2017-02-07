import { on } from '@dojo/core/aspect';
import {
	EventObject,
	EventTargettedObject,
	EventErrorObject,
	Handle
} from '@dojo/interfaces/core';
import {
	EventedListener,
	EventedListenerOrArray,
	EventedListenersMap,
	EventedCallback
} from '@dojo/interfaces/bases';
import { Actionable } from '@dojo/interfaces/abilities';
import Map from '@dojo/shim/Map';
import Destroyable from './Destroyable';

function isActionable(value: any): value is Actionable<any, any> {
	return Boolean(value && typeof value.do === 'function');
}

export function resolveListener<T, E extends EventTargettedObject<T>>(listener: EventedListener<T, E>): EventedCallback<E> {
	return isActionable(listener) ? (event: E) => listener.do({ event }) : listener;
}

function handlesArraytoHandle(handles: Handle[]): Handle {
	return {
		destroy() {
			handles.forEach((handle) => handle.destroy());
		}
	};
}

export interface EventedOptions {
	listeners?: EventedListenersMap<any>;
}

const regexMap = new Map<string, RegExp>();

function isGlobMatch(globString: string, targetString: string): boolean {
	if (globString.indexOf('*') !== -1) {
		let regex: RegExp;
		if (regexMap.has(globString)) {
			regex = regexMap.get(globString)!;
		}
		else {
			regex = new RegExp(`^${ globString.replace(/\*/g, '.*') }$`);
			regexMap.set(globString, regex);
		}
		return regex.test(targetString);

	} else {
		return globString === targetString;
	}
}

class Evented extends Destroyable {
	protected listenersMap: Map<string, EventedCallback<EventObject>> = new Map<string, EventedCallback<EventObject>>();

	constructor(options: EventedOptions) {
		super();
		const { listeners } = options;
		if (listeners) {
			this.own(this.on(listeners));
		}
	}

	emit<E extends EventObject>(this: Evented, event: E): void {
		this.listenersMap.forEach((method, type) => {
			if (isGlobMatch(type, event.type)) {
				method.call(this, event);
			}
		});
	}

	on(listeners: EventedListenersMap<Evented>): Handle;
	on(type: string, listener: EventedListenerOrArray<Evented, EventTargettedObject<Evented>>): Handle;
	on(type: 'error', listener: EventedListenerOrArray<Evented, EventErrorObject<Evented>>): Handle;
	on(...args: any[]): Handle {
		if (args.length === 2) {
			const [ type, listeners ] = <[ string, EventedListenerOrArray<any, EventTargettedObject<any>>]> args;
			if (Array.isArray(listeners)) {
				const handles = listeners.map((listener) => on(this.listenersMap, type, resolveListener(listener)));
				return handlesArraytoHandle(handles);
			}
			else {
				return on(this.listenersMap, type, resolveListener(listeners));
			}
		}
		else if (args.length === 1) {
			const [ listenerMapArg ] = <[EventedListenersMap<any>]> args;
			const handles = Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type]));
			return handlesArraytoHandle(handles);
		}
		else {
			throw new TypeError('Invalid arguments');
		}
	}
}

export default Evented;
