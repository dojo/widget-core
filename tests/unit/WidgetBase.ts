import { VNode } from '@dojo/interfaces/vdom';
import Promise from '@dojo/shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, spy, SinonStub } from 'sinon';
import { v, w, registry } from '../../src/d';
import { DNode, WidgetProperties } from '../../src/interfaces';
import {
	WidgetBase,
	diffProperty,
	DiffType,
	afterRender,
	beforeRender,
	onPropertiesChanged
} from '../../src/WidgetBase';
import WidgetRegistry, { WIDGET_BASE_TYPE } from './../../src/WidgetRegistry';

interface TestProperties extends WidgetProperties {
	id: string;
	foo: string;
	bar?: null | string;
	baz?: number;
	qux?: boolean;
}

class TestWidget extends WidgetBase<TestProperties> {}

let consoleStub: SinonStub;

registerSuite({
	name: 'WidgetBase',
	beforeEach() {
		consoleStub = stub(console, 'warn');
	},
	afterEach() {
		consoleStub.restore();
	},
	api() {
		const widgetBase = new WidgetBase();
		assert(widgetBase);
		assert.isFunction(widgetBase.__render__);
		assert.isFunction(widgetBase.invalidate);
	},
	'deprecated api warning'() {
		class TestWidgetOne extends WidgetBase<any> {
			onElementUpdated(element: Element, key: string) {

			}
			onElementCreated(element: Element, key: string) {

			}
		}
		class TestWidgetTwo extends WidgetBase<any> {}

		const name = (<any> TestWidgetOne).name || 'unknown';
		new TestWidgetOne();
		new TestWidgetTwo();
		assert.isTrue(consoleStub.calledTwice);
		assert.isTrue(consoleStub.firstCall.calledWith(`Usage of 'onElementedCreated' has been deprecated and will be removed in a future version, see https://github.com/dojo/widget-core/issues/559 for details (${name})`));
		assert.isTrue(consoleStub.secondCall.calledWith(`Usage of 'onElementUpdated' has been deprecated and will be removed in a future version, see https://github.com/dojo/widget-core/issues/559 for details (${name})`));
	},
	children() {
		let childrenEventEmitted = false;
		const expectedChild = v('div');
		const widget = new WidgetBase();
		widget.on('widget:children', () => {
			childrenEventEmitted = true;
		});

		assert.lengthOf(widget.children, 0);
		widget.__setChildren__([expectedChild]);
		assert.lengthOf(widget.children, 1);
		assert.strictEqual(widget.children[0], expectedChild);
		assert.isTrue(childrenEventEmitted);
	},
	'invalidate': {
		'should emit event and mark as dirty when invalidating during idle'() {
			let invalidateCalled = false;
			let renderCount = 0;
			class Foo extends WidgetBase {
				render() {
					renderCount++;
					return v('div', [ 'hello world ' ]);
				}
			}

			const foo = new Foo();
			foo.on('invalidated', () => {
				invalidateCalled = true;
			});
			foo.__render__();
			assert.equal(renderCount, 1);
			foo.invalidate();
			foo.__render__();
			assert.equal(renderCount, 2);
			assert.isTrue(invalidateCalled);
		},
		'should not emit event but mark as dirty when invalidating during property diff'() {
			let invalidateCalled = false;
			let renderCount = 0;
			class Foo extends WidgetBase<{ bar: string }> {
				@diffProperty('bar')
				barDiff() {
					this.invalidate();
					return {
						changed: false
					};
				}
				render() {
					renderCount++;
					return v('div', [ 'hello world ' ]);
				}
			}

			const foo = new Foo();
			foo.on('invalidated', () => {
				invalidateCalled = true;
			});
			foo.__render__();
			assert.equal(renderCount, 1);
			foo.__setProperties__({ bar: 'qux' });
			foo.__render__();
			assert.equal(renderCount, 2);
			assert.isFalse(invalidateCalled);
		},
		'should not emit event or mark as dirty when invalidating during render'() {
			let invalidateCalled = false;
			let renderCount = 0;
			class Foo extends WidgetBase {
				render() {
					this.invalidate();
					renderCount++;
					return v('div', [ 'hello world ' ]);
				}
			}

			const foo = new Foo();
			foo.on('invalidated', () => {
				invalidateCalled = true;
			});
			foo.__render__();
			assert.equal(renderCount, 1);
			foo.__render__();
			assert.equal(renderCount, 1);
			assert.isFalse(invalidateCalled);
		}
	},
	'Applies div as default tag'() {
			const widget = new WidgetBase();
			const renderedWidget = <VNode> (<any> widget).__render__();
			assert.deepEqual(renderedWidget.vnodeSelector, 'div');
	},
	diffProperties: {
		'no updated properties'() {
			const widgetBase = new TestWidget();
			widgetBase.__setProperties__({ id: 'id', foo: 'bar' });

			widgetBase.on('properties:changed', result => {
				assert.lengthOf(result.changedPropertyKeys, 0);
			});

			widgetBase.__setProperties__({ id: 'id', foo: 'bar' });
		},
		'updated properties'() {
			const widgetBase = new TestWidget();
			widgetBase.__setProperties__({ id: 'id', foo: 'bar' });

			widgetBase.on('properties:changed', result => {
				assert.lengthOf(result.changedPropertyKeys, 1);
			});

			widgetBase.__setProperties__({ id: 'id', foo: 'baz' });
		},
		'new properties'() {
			const widgetBase = new TestWidget();
			widgetBase.__setProperties__({ id: 'id', foo: 'bar' });

			widgetBase.on('properties:changed', result => {
				assert.lengthOf(result.changedPropertyKeys, 1);
			});

			widgetBase.__setProperties__({ id: 'id', foo: 'bar', bar: 'baz' });
		},
		'updated / new properties with falsy values'() {
			const widgetBase = new TestWidget();
			widgetBase.__setProperties__({ id: 'id', foo: 'bar' });

			widgetBase.on('properties:changed', result => {
				assert.lengthOf(result.changedPropertyKeys, 4);
				assert.deepEqual(result.changedPropertyKeys, ['foo', 'bar', 'baz', 'qux']);
			});

			widgetBase.__setProperties__({ id: 'id', foo: '', bar: null, baz: 0, qux: false });
		}
	},
	diffProperty: {
		'decorator at class level'() {
				let callCount = 0;
				let value;

				@diffProperty('foo', DiffType.CUSTOM, (previousProperty: any, newProperty: any) => {
					callCount++;
					return {
						changed: true,
						value: 'new-value'
					};
				})
				class TestWidget extends WidgetBase<any> {
					render() {
						value = this.properties.foo;
						return 'foo';
					}
				}

				const testWidget = new TestWidget();
				testWidget.__setProperties__({ foo: 'bar' });
				testWidget.__render__();
				assert.equal(callCount, 1);
				assert.equal(value, 'new-value');
		},
		decorator() {
			let callCount = 0;

			class TestWidget extends WidgetBase<any> {

				@diffProperty('foo')
				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					callCount++;
					assert.equal(newProperty, 'bar');
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const testWidget = new TestWidget();
			testWidget.__setProperties__({ foo: 'bar' });

			assert.equal(callCount, 1);
		},
		'non decorator'() {
			let callCount = 0;

			class TestWidget extends WidgetBase<any> {

				constructor() {
					super();
					diffProperty('foo', DiffType.CUSTOM, this.diffPropertyFoo)(this);
				}

				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					callCount++;
					assert.equal(newProperty, 'bar');
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const testWidget = new TestWidget();
			testWidget.__setProperties__({ foo: 'bar' });

			assert.equal(callCount, 1);
		},
		'decorators can be applied at instance level'() {
			let renderCallCount = 0;

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();

					afterRender((node: DNode) => {
						renderCallCount++;
						return node;
					})(this);
				}

				render() {
					return v('div');
				}
			}

			new TestWidget();
			const widget2 = new TestWidget();
			widget2.__render__();

			assert.equal(renderCallCount, 1);
		},
		'multiple decorators on the same method cause the first matching decorator to win'() {
			const calls: string[] = [];

			class TestWidget extends WidgetBase<any> {
				@diffProperty('prop')
				ignoreProp(previousValue: any, newValue: any) {
					calls.push('ignore');

					return {
						changed: false,
						value: newValue
					};
				}
			}

			class SubWidget extends TestWidget {
				@diffProperty('prop')
				alwaysProp(previousValue: any, newValue: any) {
					calls.push('always');

					return {
						changed: true,
						value: newValue
					};
				}
			}

			const widget = new SubWidget();
			widget.__setProperties__({
				prop: true
			});

			assert.deepEqual(calls, ['ignore', 'always']);
		},

		'diffProperty properties are excluded from catch-all'() {
			class TestWidget extends WidgetBase<any> {
				@diffProperty('prop')
				ignoreProp(previousValue: any, newValue: any) {
					return {
						changed: false,
						value: newValue
					};
				}
			}

			const widget = new TestWidget();
			widget.on('properties:changed', result => {
				assert.deepEqual(result.changedPropertyKeys, ['anotherProp']);
			});

			widget.__setProperties__({
				prop: true,
				anotherProp: true
			});
		},

		'properties that are deleted dont get returned'() {
			const widget = new WidgetBase<any>();
			widget.__setProperties__({
				a: 1,
				b: 2,
				c: 3
			});

			assert.deepEqual(widget.properties, { a: 1, b: 2, c: 3 });

			widget.__setProperties__({
				a: 4,
				c: 5
			});

			assert.deepEqual(widget.properties, { a: 4, c: 5 });
		}
	},
	setProperties: {
		'result from diff property override diff and assign'() {
			class TestWidget extends WidgetBase<any> {

				@diffProperty('foo')
				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					return {
						changed: true,
						value: newProperty
					};
				}

				@diffProperty('baz')
				diffPropertyBaz(this: any, previousProperty: any, newProperty: any): any {
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const widget = new TestWidget();
			widget.__setProperties__({ foo: 'bar', baz: 'qux' });

			widget.on('properties:changed', (event: any) => {
				assert.include(event.changedPropertyKeys, 'foo');
				assert.notInclude(event.changedPropertyKeys, 'baz');
			});

			widget.__setProperties__({ foo: 'bar', baz: 'bar' });
		},
		'widgets function properties are bound to the parent by default'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			class TestWidget extends WidgetBase<any> {
				count: number;
				constructor() {
					super();
					this.count = 0;
				}

				foo() {
					this.count++;
				}

				render(): DNode {
					return w(TestChildWidget, { foo: this.foo, bar: Math.random() });
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 2);
		},
		'widget function properties do not get re-bound when nested'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			class TestNestedWidget extends WidgetBase<any> {
				render(): DNode {
					const { foo, bar } = this.properties;

					return w(TestChildWidget, { foo, bar });
				}
			}

			class TestWidget extends WidgetBase<any> {
				count: number;

				foo(this: any) {
					this.count++;
				}

				constructor() {
					super();
					this.count = 0;
				}

				render(): DNode {
					return w(TestNestedWidget, { foo: this.foo, bar: Math.random() });
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 2);
		},
		'widget constructors are not bound'() {
			const widgetConstructorSpy: any = function(this: any) {
				this.functionIsBound = true;
			};
			widgetConstructorSpy._type = WIDGET_BASE_TYPE;

			class TestWidget extends WidgetBase<any> {
				functionIsBound = false;

				public callWidgetSpy() {
					this.properties.widgetConstructorSpy();
				}
			}

			const testWidget = new TestWidget();
			const properties = {
				widgetConstructorSpy,
				functionIsBound: false
			};
			testWidget.__setProperties__(properties);
			testWidget.callWidgetSpy();
			assert.isFalse(testWidget.functionIsBound);
			assert.isTrue(testWidget.properties.functionIsBound);
		}
	},
	beforeRender: {
		decorator() {
			let beforeRenderCount = 1;
			type RenderFunction = () => DNode;
			class TestWidget extends WidgetBase<any> {
				@beforeRender()
				firstAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount++, 1);
					return () => {
						const rendered = renderFunction();
						const clonedProperties = { ...properties };
						return v('bar', clonedProperties, [ rendered, ...children ]);
					};
				}

				@beforeRender()
				secondAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount++, 2);
					return () => {
						const rendered = renderFunction();
						properties.bar = 'foo';
						return v('qux', properties, [ rendered ]);
					};
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@beforeRender()
				thirdAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount, 3);
					return renderFunction;
				}

				render() {
					return v('foo', this.children);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__setChildren__([v('baz', { baz: 'qux' })]);
			widget.__setProperties__({ foo: 'bar' });
			const qux: any = widget.__render__();
			assert.equal(qux.vnodeSelector, 'qux');
			assert.deepEqual(qux.properties, { bind: widget, bar: 'foo', foo: 'bar' });
			assert.lengthOf(qux.children, 1);
			const bar = qux.children[0];
			assert.equal(bar.vnodeSelector, 'bar');
			assert.deepEqual(bar.properties, { bind: widget, foo: 'bar' });
			assert.lengthOf(bar.children, 2);
			const foo = bar.children[0];
			assert.equal(foo.vnodeSelector, 'foo');
			assert.deepEqual(foo.properties, { bind: widget });
			assert.lengthOf(foo.children, 1);
			const baz1 = foo.children[0];
			assert.equal(baz1.vnodeSelector, 'baz');
			assert.deepEqual(baz1.properties, { bind: widget, baz: 'qux' });
			assert.lengthOf(baz1.children, 0);
			const baz2 = bar.children[1];
			assert.equal(baz2.vnodeSelector, 'baz');
			assert.deepEqual(baz2.properties, { bind: widget, baz: 'qux' });
			assert.lengthOf(baz2.children, 0);
		},
		'class level decorator'() {
			let beforeRenderCount = 0;

			@beforeRender(function (node: any) {
				beforeRenderCount++;
				return node;
			})
			class TestWidget extends WidgetBase<any> {
			}

			const widget = new TestWidget();
			widget.__render__();
			assert.strictEqual(beforeRenderCount, 1);
		}
	},
	afterRender: {
		decorator() {
			let afterRenderCount = 1;
			class TestWidget extends WidgetBase<any> {
				@afterRender()
				firstAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 1);
					return result;
				}

				@afterRender()
				secondAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 2);
					return result;
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@afterRender()
				thirdAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount, 3);
					return result;
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 3);
		},
		'non decorator'() {
			let afterRenderCount = 1;
			class TestWidget extends WidgetBase<any> {

				constructor() {
					super();
					afterRender()(this, 'firstAfterRender');
					afterRender()(this, 'secondAfterRender');
				}

				firstAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 1);
					return result;
				}

				secondAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 2);
					return result;
				}
			}

			class ExtendedTestWidget extends TestWidget {

				constructor() {
					super();
					afterRender(this.thirdAfterRender)(this);
				}

				thirdAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount, 3);
					return result;
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 3);
		},
		'class level decorator'() {
			let afterRenderCount = 0;

			@afterRender(function (node: any) {
				afterRenderCount++;
				return node;
			})
			class TestWidget extends WidgetBase<any> {
			}

			const widget = new TestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 1);
		},
		'class level without decorator'() {
			let afterRenderCount = 0;

			function afterRenderFn(node: any) {
				afterRenderCount++;

				return node;
			}

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					afterRender(afterRenderFn)(this);
				}
			}

			const widget = new TestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 1);
		}
	},
	'properties:changed event': {
		decorator() {
			let onPropertiesChangedCount = 1;
			class TestWidget extends WidgetBase<any> {
				@onPropertiesChanged()
				firstOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 1);
				}

				@onPropertiesChanged()
				secondOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 2);
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@onPropertiesChanged()
				thirdOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount, 3);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.emit({ type: 'properties:changed' });
			assert.strictEqual(onPropertiesChangedCount, 3);
		},
		'non decorator'() {

			let onPropertiesChangedCount = 1;
			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					onPropertiesChanged(this.firstOnPropertiesChanged)(this);
					onPropertiesChanged(this.secondOnPropertiesChanged)(this);
				}
				firstOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 1);
				}
				secondOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 2);
				}
			}

			class ExtendedTestWidget extends TestWidget {
				constructor() {
					super();
					onPropertiesChanged(this.thirdOnPropertiesChanged)(this);
				}
				thirdOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount, 3);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.emit({ type: 'properties:changed' });
			assert.strictEqual(onPropertiesChangedCount, 3);
		},

		'class level decorator'() {
			let called = 0;

			@onPropertiesChanged(function () {
				called++;
			})
			class TestWidget extends WidgetBase<any> {
			}

			const widget = new TestWidget();
			widget.__setProperties__({
				test: true
			});
			assert.strictEqual(called, 1);
		},

		'extendable'() {
			let called = false;

function PropertyLogger() {
	return onPropertiesChanged(function() {
		called = true;
	});
}

@PropertyLogger()
class TestWidget extends WidgetBase<any> {
}

const widget = new TestWidget();
widget.__setProperties__({
	test: true
});

			assert.strictEqual(called, true);
		}
	},
	render: {
		'render with non widget children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header')
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children && result.children[0].vnodeSelector, 'header');
		},
		'lazily defined widget in registry renders when ready'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w('my-header3', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}
			const myWidget: any = new TestWidget();
			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);
			registry.define('my-header3', TestHeaderWidget);
			result = myWidget.__render__();
			assert.lengthOf(result.children, 1);
		},
		'lazily defined widget using a symbol in registry renders when ready'() {
			const myHeader = Symbol();
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(myHeader, <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}
			const myWidget: any = new TestWidget();
			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);
			registry.define(myHeader, TestHeaderWidget);
			result = myWidget.__render__();
			assert.lengthOf(result.children, 1);
		},
		'locally defined widget in registry eventually replaces global one'() {
			const localRegistry = new WidgetRegistry();

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					this.registries.add(localRegistry);
				}
				render() {
					return v('div', [
						w('my-header4', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('global-header');
				}
			}

			class TestHeaderLocalWidget extends WidgetBase<any> {
				render() {
					return v('local-header');
				}
			}
			registry.define('my-header4', TestHeaderWidget);
			const myWidget: any = new TestWidget();
			let result = <any> myWidget.__render__();
			assert.equal(result.children[0].vnodeSelector, 'global-header');
			localRegistry.define('my-header4', TestHeaderLocalWidget);
			result = <any> myWidget.__render__();
			assert.equal(result.children[0].vnodeSelector, 'local-header');
		},
		'async factories only initialise once'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header', loadFunction);

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w('my-header', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			let invalidateCount = 0;

			const myWidget: any = new TestWidget();
			myWidget.on('invalidated', () => {
				invalidateCount++;
			});

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			myWidget.invalidate();
			myWidget.__render__();
			myWidget.invalidate();
			myWidget.__render__();

			resolveFunction(TestHeaderWidget);

			const promise = new Promise((resolve) => setTimeout(resolve, 100));
			return promise.then(() => {
				assert.equal(invalidateCount, 3);
				result = <VNode> myWidget.__render__();
				assert.lengthOf(result.children, 1);
				assert.strictEqual(result.children![0].vnodeSelector, 'header');
			});
		},
		'render with async factory'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header1', loadFunction);

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w('my-header1', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			const myWidget: any = new TestWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			resolveFunction(TestHeaderWidget);
			return new Promise((resolve) => {
				myWidget.on('invalidated', () => {
					result = <VNode> myWidget.__render__();
					assert.lengthOf(result.children, 1);
					assert.strictEqual(result.children![0].vnodeSelector, 'header');
					resolve();
				});
			});
		},
		'render using scoped factory registry'() {
			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			const registry = new WidgetRegistry();
			registry.define('my-header', TestHeaderWidget);

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					this.registries.add(registry);
				}

				render() {
					return v('div', [
						w('my-header', <any> undefined)
					]);
				}
			}

			const myWidget: any = new TestWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
		},
		'render with nested children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header', [
							v('section')
						])
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
			assert.strictEqual(result.children![0].children![0].vnodeSelector, 'section');
		},
		'render with a text node children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [ 'I am a text node' ]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.isUndefined(result.children);
			assert.equal(result.text, 'I am a text node');
		},
		'render returns array'() {
			class TestChildWidget extends WidgetBase {
				render() {
					return [
						v('div', [ 'text' ]),
						v('span', { key: 'span' })
					];
				}
			}

			class TestWidget extends WidgetBase {
				render() {
					return v('div', [ w(TestChildWidget, {}) ]);
				}
			}

			const widget = new TestWidget();
			const result: any = widget.__render__();
			assert.strictEqual(result.vnodeSelector, 'div');
			assert.lengthOf(result.children, 2);
			assert.strictEqual(result.children![0].vnodeSelector, 'div');
			assert.strictEqual(result.children![0].text, 'text');
			assert.strictEqual(result.children![1].vnodeSelector, 'span');
			assert.strictEqual(result.children![1].properties.key, 'span');
		},
		'instance gets passed to VNodeProperties as bind to widget and all children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header', [
							v('section')
						])
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.properties!.bind, widget);
			assert.strictEqual(result.children![0].properties!.bind, widget);
			assert.strictEqual(result.children![0].children![0].properties!.bind, widget);
		},
		'render with multiple text node children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [ 'I am a text node', 'Second text node' ]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.isUndefined(result.text);
			assert.lengthOf(result.children, 2);
			assert.strictEqual(result.children![0].text, 'I am a text node');
			assert.strictEqual(result.children![1].text, 'Second text node');
		},
		'render with widget children'() {
			let countWidgetCreated = 0;
			let countWidgetDestroyed = 0;

			class TestChildWidget extends WidgetBase<any> {
				constructor() {
					super();
					countWidgetCreated++;
				}

				render() {
					return v('footer', this.children);
				}

				destroy() {
					countWidgetDestroyed++;
					return super.destroy();
				}
			}

			class TestWidget extends WidgetBase<any> {
				render() {
					const properties = this.properties.classes ? { classes: this.properties.classes } : {};

					return v('div', [
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties)
					]);
				}
			}

			const widget: any = new TestWidget();
			const firstRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(firstRenderResult.children, 4);
			const firstRenderChild: any = firstRenderResult.children && firstRenderResult.children[0];
			assert.strictEqual(firstRenderChild.vnodeSelector, 'footer');

			widget.invalidate();

			const secondRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(secondRenderResult.children, 4);
			const secondRenderChild: any = secondRenderResult.children && secondRenderResult.children[0];
			assert.strictEqual(secondRenderChild.vnodeSelector, 'footer');

			widget.__setProperties__(<any> { hide: true });
			widget.invalidate();

			const thirdRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 4);
			assert.lengthOf(thirdRenderResult.children, 0);

			widget.__setProperties__(<any> { hide: false });
			widget.invalidate();

			const lastRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 8);
			assert.strictEqual(countWidgetDestroyed, 4);
			assert.lengthOf(lastRenderResult.children, 4);
			const lastRenderChild: any = lastRenderResult.children && lastRenderResult.children[0];
			assert.strictEqual(lastRenderChild.vnodeSelector, 'footer');
		},
		'render with multiple children of the same type without an id'() {
			class TestWidgetOne extends WidgetBase<any> {}
			class TestWidgetTwo extends WidgetBase<any> {}
			const widgetName = (<any> TestWidgetTwo).name;
			let warnMsg = 'It is recommended to provide a unique \'key\' property when using the same widget multiple times';

			if (widgetName) {
				warnMsg = `It is recommended to provide a unique 'key' property when using the same widget (${widgetName}) multiple times`;
			}

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(TestWidgetOne, {}),
						w(TestWidgetTwo, {}),
						w(TestWidgetTwo, {})
					]);
				}
			}

			const widget: any = new TestWidget();
			widget.__render__();
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(warnMsg));
			widget.invalidate();
			widget.__render__();
			assert.isTrue(consoleStub.calledThrice);
			assert.isTrue(consoleStub.calledWith(warnMsg));
		},
		'__render__ with updated array properties'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget = new WidgetBase<any>();
			myWidget.__setProperties__(properties);
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			properties.items.push('c');
			myWidget.__setProperties__(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
			properties.items.push('d');
			myWidget.__setProperties__(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c', 'd' ]);
		},
		'__render__ with internally updated array state'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget: any = new WidgetBase();
			myWidget.__setProperties__(properties);
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			myWidget.__setProperties__(<any> { items: [ 'a', 'b', 'c'] });
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
		},
		'__render__() and invalidate()'() {
			const widgetBase: any = new WidgetBase();
			widgetBase.__setProperties__({ id: 'foo', label: 'foo' });
			const result1 = <VNode> widgetBase.__render__();
			const result2 = <VNode> widgetBase.__render__();
			widgetBase.invalidate();
			const result3 = widgetBase.__render__();
			const result4 = widgetBase.__render__();
			assert.strictEqual(result1, result2);
			assert.strictEqual(result3, result4);
			assert.notStrictEqual(result1, result3);
			assert.notStrictEqual(result2, result4);
			assert.deepEqual(result1, result3);
			assert.deepEqual(result2, result4);
			assert.strictEqual(result1.vnodeSelector, 'div');
		},
		'render multiple child widgets using the same factory'() {
			let childWidgetInstantiatedCount = 0;

			class TestChildWidget extends WidgetBase<any> {
				constructor() {
					super();
					childWidgetInstantiatedCount++;
				}
			}

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(TestChildWidget, {}),
						v('div', {}, [
							'text',
							w(TestChildWidget, {}, [
								w(TestChildWidget, {})
							]),
							v('div', {}, [
								w(TestChildWidget, {})
							])
						]),
						w(TestChildWidget, {})
					]);
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();

			assert.equal(childWidgetInstantiatedCount, 5);
		},
		'support updating factories for children with an `key`'() {
			let renderWidgetOne = true;
			let widgetOneInstantiated = false;
			let widgetTwoInstantiated = false;

			class WidgetOne extends WidgetBase<any> {
				constructor() {
					super();
					widgetOneInstantiated = true;
				}
			}
			class WidgetTwo extends WidgetBase<any> {
				constructor() {
					super();
					widgetTwoInstantiated = true;
				}
			}
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						renderWidgetOne ? w(WidgetOne, { key: '1' }) : w(WidgetTwo, { key: '1' })
					]);
				}
			}

			const myWidget: any = new TestWidget();
			myWidget.__render__();
			assert.isTrue(widgetOneInstantiated);
			renderWidgetOne = false;
			myWidget.invalidate();
			myWidget.__render__();
			assert.isTrue(widgetTwoInstantiated);
		}
	},
	'child invalidation invalidates parent'() {
		let childInvalidate = () => {};
		let childInvalidateCalled = false;
		let parentInvalidateCalled = false;

		class TestChildWidget extends WidgetBase<any> {
			constructor() {
				super();
				childInvalidate = () => {
					childInvalidateCalled = true;
					this.invalidate();
				};
			}
		}

		class Widget extends WidgetBase<any> {
			render(): any {
				return v('div', [
					w(TestChildWidget, {})
				]);
			}
			invalidate() {
				super.invalidate();
				parentInvalidateCalled = true;
			}
		}

		const widget = new Widget();

		(<any> widget).__render__();
		childInvalidate();
		assert.isTrue(childInvalidateCalled);
		assert.isTrue(parentInvalidateCalled);
	},
	'setting children should mark the enclosing widget as dirty'() {
		let foo = 0;
		class FooWidget extends WidgetBase<any> {
			render() {
				foo = this.properties.foo;
				return v('div', []);
			}
		}

		class ContainerWidget extends WidgetBase<any> {
			render() {
				return v('div', {}, this.children);
			}
		}

		class TestWidget extends WidgetBase<any> {
			private foo = 0;

			render() {
				this.foo++;
				return w(ContainerWidget, {}, [
					w(FooWidget, { foo: this.foo })
				]);
			}
		}

		const widget: any = new TestWidget();
		widget.__render__();
		assert.equal(foo, 1);
		widget.invalidate();
		widget.__render__();
		assert.equal(foo, 2);
	},
	'widget should not be marked as dirty if previous and current children are empty'() {
		let foo = 0;
		class FooWidget extends WidgetBase<any> {
			render() {
				foo++;
				return v('div');
			}
		}

		class TestWidget extends WidgetBase<any> {
			render() {
				return w(FooWidget, { key: '1' });
			}
		}

		const widget: any = new TestWidget();
		widget.__render__();
		assert.equal(foo, 1);
		widget.invalidate();
		widget.__render__();
		assert.equal(foo, 1);
	},
	'properties:changed should mark as dirty but not invalidate'() {
		let foo = 0;

		class FooWidget extends WidgetBase<any> {
			render() {
				foo = this.properties.foo;
				return v('div', []);
			}
		}

		class TestWidget extends WidgetBase<any> {
			private foo = 0;

			render() {
				this.foo++;
				return w(FooWidget, { foo: this.foo });
			}
		}

		const widget: any = new TestWidget();
		const invalidateSpy = spy(widget, 'invalidate');
		widget.__render__();
		assert.equal(foo, 1);
		widget.invalidate();
		widget.__render__();
		assert.equal(foo, 2);
		assert.equal(invalidateSpy.callCount, 1);
	},
	'decorators are cached'() {
		class TestWidget extends WidgetBase<any> {
			@afterRender()
			running(result: DNode): DNode {
				return result;
			}

			render() {
				return v('div');
			}

			callGetDecorator(decoratorKey: string) {
				return this.getDecorator(decoratorKey);
			}
		}

		const widget = new TestWidget();
		const decoratorSpy = spy(widget, '_buildDecoratorList');

		widget.callGetDecorator('afterRender');

		// first call calls the method
		assert.equal(decoratorSpy.callCount, 1);

		widget.callGetDecorator('afterRender');

		// second call is cached
		assert.equal(decoratorSpy.callCount, 1);
	},
	'decorators applied to subclasses are not applied to base classes'() {
		class TestWidget extends WidgetBase<any> {
			@afterRender()
			firstRender(result: DNode): DNode {
				return result;
			}

			getAfterRenders(): Function[] {
				return this.getDecorator('afterRender');
			}
		}

		class TestWidget2 extends TestWidget {
			@afterRender()
			secondRender(result: DNode): DNode {
				return result;
			}
		}

		const testWidget = new TestWidget();
		const testWidget2 = new TestWidget2();

		assert.equal(testWidget.getAfterRenders().length, 4);
		assert.equal(testWidget2.getAfterRenders().length, 5);
	}
});
