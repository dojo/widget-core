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

export function waitForAsyncResult(test: () => boolean, callback: () => void, timeout = 5000) {
	const timeStep = 10;
	const timeoutTime = new Date();
	timeoutTime.setMilliseconds(timeoutTime.getMilliseconds() + timeout);

	function checkForSolution() {
		if (test()) {
			return callback();
		}
		else if (Date.now() > timeoutTime.getTime()) {
			return;
		} else {
			setTimeout(checkForSolution, timeStep);
		}
	}

	checkForSolution();
}
