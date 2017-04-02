import has, { add as hasAdd } from '@dojo/has/has';

hasAdd('customevent-constructor', () => {
	try {
		new window.CustomEvent('foo');
		return true;
	}
	catch (e) {
		return false;
	}
});

/**
 * Create a custom event and dispatch it to the target node
 * @param target The target the event should be dispatched to
 * @param eventType The string name of the event
 * @param eventInit Any event initialisation parameters
 * @param beforeDispatch An optional function that will be called with the event before it is dispatched
 */
export default function (target: Element, eventType: string, eventInit?: CustomEventInit, beforeDispatch?: (evt: CustomEvent) => void) {
	let event: CustomEvent;
	if (has('customevent-constructor')) {
		event = new window.CustomEvent(eventType, eventInit);
	}
	else {
		event = document.createEvent('CustomEvent');
		const { bubbles, cancelable } = eventInit || { bubbles: false, cancelable: false };
		event.initCustomEvent(eventType, bubbles || false, cancelable || false, {});
	}
	if (beforeDispatch) {
		beforeDispatch(event);
	}
	target.dispatchEvent(event);
}
