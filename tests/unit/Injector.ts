import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { Injector } from './../../src/Injector';

registerSuite({
	name: 'Injector',
	get() {
		const context = {};
		const injector = new Injector(context);
		assert.strictEqual(injector.get(), context);
	},
	set() {
		let invalidateCalled = false;
		const context = {};
		const injector = new Injector(context);
		assert.strictEqual(injector.get(), context);
		injector.on('invalidate', () => {
			invalidateCalled = true;
		});
		injector.set({});
		assert.isTrue(invalidateCalled);
	}
});
