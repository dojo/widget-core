import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from '@dojo/shim/Promise';
import RegistryHandler from '../../src/RegistryHandler';
import Registry from '../../src/Registry';
import { WidgetBase } from '../../src/WidgetBase';
import { WidgetBaseConstructor } from './../../src/interfaces';

const foo = Symbol();
const bar = Symbol();

const registry = new Registry();
registry.define('foo', WidgetBase);
registry.define(foo, WidgetBase);

const registryB = new Registry();
registryB.define('bar', WidgetBase);
registryB.define(bar, WidgetBase);

registerSuite({
	name: 'RegistryHandler',
	'has'() {
		const registryHandler = new RegistryHandler();
		registryHandler.base = registry;
		assert.isTrue(registryHandler.has('foo'));
		assert.isTrue(registryHandler.has(foo));
		registryHandler.define('bar', WidgetBase);
		registryHandler.define(bar, WidgetBase);
		assert.isTrue(registryHandler.has('bar'));
		assert.isTrue(registryHandler.has(bar));
	},
	'get'() {
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(WidgetBase);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.base = registry;
		registryHandler.define('baz', promise);
		return promise.then(() => {
			assert.equal(registryHandler.get('baz'), WidgetBase);
		});
	},
	'get with symbol label'() {
		const baz = Symbol();
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(WidgetBase);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.define(baz, promise);
		return promise.then(() => {
			assert.equal(registryHandler.get(baz), WidgetBase);
		});
	},
	'get passing generic to specify widget type'() {
		class TestWidget extends WidgetBase<{foo: string}> {}
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(TestWidget);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.define('baz-1', promise);
		return promise.then(() => {
			const RegistryWidget = registryHandler.get<TestWidget>('baz-1');
			assert.equal(RegistryWidget, TestWidget);
			const widget = new RegistryWidget!();

			// demonstrate registry widget is typed as TestWidget
			widget.__setProperties__({ foo: 'baz' });
		});
	},
	'invalidates once registry emits loaded event'() {
		const baz = Symbol();
		let promise: any = Promise.resolve();
		let invalidateCalled = false;
		const lazyWidget = () => {
			promise = new Promise((resolve) => {
				setTimeout(() => {
					resolve(WidgetBase);
				}, 1);
			});
			return promise;
		};
		const registryHandler = new RegistryHandler();
		registryHandler.on('invalidate', () => {
			invalidateCalled = true;
		});

		registryHandler.define(baz, lazyWidget);
		registryHandler.get(baz);
		return promise.then(() => {
			assert.isTrue(invalidateCalled);
		});
	},
	'noop when event action is not `loaded`'() {
		const baz = Symbol();
		let invalidateCalled = false;
		let promise: Promise<any> = Promise.resolve();
		const lazyWidget: any = () => {
			promise = new Promise((resolve) => {
			});
			return promise;
		};
		const registryHandler = new RegistryHandler();
		registryHandler.on('invalidate', () => {
			invalidateCalled = true;
		});

		registryHandler.define(baz, lazyWidget);
		registryHandler.get(baz);
		registry.emit({ type: baz, action: 'other' });
		assert.isFalse(invalidateCalled);
	}
});
