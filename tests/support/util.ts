/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error?: any) => U | Thenable<U>): Thenable<U>;
}

export function isEventuallyRejected<T>(promise: Thenable<T>): Thenable<boolean> {
	return promise.then<any>(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}

let _hasConfigurableName: boolean;

/**
 * Detects if functions have configurable names, some browsers that are not 100% ES2015
 * compliant do not.
 */
export function hasConfigurableName(): boolean {
	if (_hasConfigurableName !== undefined) {
		return _hasConfigurableName;
	}
	const nameDescriptor = Object.getOwnPropertyDescriptor(function foo() {}, 'name');
	if (nameDescriptor && !nameDescriptor.configurable) {
		return _hasConfigurableName = false;
	}
	return _hasConfigurableName = true;
}
