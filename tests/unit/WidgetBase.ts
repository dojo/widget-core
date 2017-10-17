import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';

import { WidgetBase } from './../../src/WidgetBase';
import { v } from './../../src/d';
import { WIDGET_BASE_TYPE } from './../../src/Registry';
import { HNode, WidgetMetaConstructor } from './../../src/interfaces';
import { handleDecorator } from './../../src/decorators/handleDecorator';
import { diffProperty } from './../../src/decorators/diffProperty';

interface TestProperties {
	foo?: string;
	bar?: boolean;
	baz?: Function;
	qux?: object;
	quux?: any[];
	foobar?: number;
}

class BaseTestWidget extends WidgetBase<TestProperties> {
	public meta(metaType: WidgetMetaConstructor<any>) {
		return super.meta(metaType);
	}

	public render() {
		return super.render();
	}

	callGetDecorator(decoratorKey: string) {
		return this.getDecorator(decoratorKey);
	}
}

function testDecorator(func?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('test-decorator', func);
	});
}

describe('WidgetBase', () => {

	it('default render returns a `div` with the current widgets children', () => {
		const widget = new BaseTestWidget();
		widget.__setChildren__([ 'child' ]);
		const renderResult = widget.render() as HNode;
		assert.strictEqual(renderResult.tag, 'div');
		assert.deepEqual(renderResult.properties, {});
		assert.lengthOf(renderResult.children, 1);
		assert.strictEqual(renderResult.children![0], 'child');
	});

	describe('__render__', () => {

		it('returns render result', () => {
			class TestWidget extends BaseTestWidget {
				render() {
					return v('my-app', [ 'child' ]);
				}
			}
			const widget = new TestWidget();
			const renderResult = widget.__render__() as HNode;
			assert.strictEqual(renderResult.tag, 'my-app');
			assert.lengthOf(renderResult.children, 1);
			assert.strictEqual(renderResult.children![0], 'child');
		});

		it('returns cached DNode when widget is ', () => {
			class TestWidget extends BaseTestWidget {
				render() {
					return v('my-app', [ 'child' ]);
				}
			}
			const widget = new TestWidget();
			const renderResult = widget.__render__();
			const secondRenderResult = widget.__render__();
			assert.strictEqual(secondRenderResult, renderResult);
			widget.invalidate();
			const thirdRenderResult = widget.__render__();
			assert.notStrictEqual(thirdRenderResult, secondRenderResult);
		});

	});

	describe('__setProperties__', () => {

		it('diffs properties using `auto` strategy by default', () => {
			const widget = new BaseTestWidget();
			const invalidateSpy = spy(widget, 'invalidate');

			function baz() {}
			const qux = {
				foo: 'bar',
				bar: 'foo'
			};
			const quux = [ 1, 2, 3, 4 ];

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				qux,
				quux
			});

			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, [ 'foo', 'bar', 'qux', 'quux' ]);

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				qux,
				quux
			});

			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, [ ]);

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				quux
			});

			assert.isTrue(invalidateSpy.calledTwice);
			assert.deepEqual(widget.changedPropertyKeys, [ 'qux' ]);
		});

		it('Supports custom diffProperty function', () => {
			function customDiff(previousValue: any = 0, newValue: any) {
				return {
					changed: true,
					value: previousValue + newValue
				};
			}
			@diffProperty('foobar', customDiff)
			class TestWidget extends BaseTestWidget {}
			const widget = new TestWidget();
			const invalidateSpy = spy(widget, 'invalidate');

			widget.__setProperties__({ foobar: 2 });
			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, [ 'foobar' ]);
			assert.strictEqual(widget.properties.foobar, 2);

			widget.__setProperties__({ foobar: 4 });
			assert.isTrue(invalidateSpy.calledTwice);
			assert.deepEqual(widget.changedPropertyKeys, [ 'foobar' ]);
			assert.strictEqual(widget.properties.foobar, 6);

			widget.__setProperties__({ });
			assert.isTrue(invalidateSpy.calledThrice);
			assert.deepEqual(widget.changedPropertyKeys, [ 'foobar' ]);
			assert.isUndefined(widget.properties.foobar);
		});

		it('Runs registered reactions when property is considered changed', () => {

		});

		it('Automatically binds functions properties', () => {
			class TestWidget extends BaseTestWidget {
				public called = false;
			}

			function baz(this: TestWidget) {
				this.called = true;
			}

			const widget = new TestWidget();

			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ baz });
			widget.properties.baz && widget.properties.baz();
			assert.isTrue(widget.called);
		});

		it('Does not bind Widget constructor properties', () => {
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
		});
	});

	describe('__setChildren__', () => {

	});

	describe('__setCoreProperties__', () => {
		it('a new registry causes an invalidation', () => {

		});

		it('passing the same registry does not causes an invalidation', () => {

		});

		it('passing a different registry does not causes an invalidation', () => {

		});
	});

	describe('meta', () => {
		it('meta providers are cached', () => {

		});

		it('elements are added to node handler on create', () => {

		});

		it('elements are added to node handler on update', () => {

		});

		it('root added to node handler on widget create', () => {

		});

		it('root added to node handler on widget update', () => {

		});
	});

	describe('onElementCreated', () => {

	});

	describe('onElementUpdated', () => {

	});

	describe('decorators', () => {

		it('returns an empty array for decorators that do not exist', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}
			const widget = new TestWidget();
			const decorators = widget.callGetDecorator('unknown-decorator');
			assert.lengthOf(decorators, 0);
		});

		it('decorators are cached', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}

			const widget = new TestWidget();
			const decorators = widget.callGetDecorator('test-decorator');
			assert.lengthOf(decorators, 1);
			const cachedDecorators = widget.callGetDecorator('test-decorator');
			assert.lengthOf(cachedDecorators, 1);
			assert.strictEqual(cachedDecorators, decorators);
		});

		it('decorators applied to subclasses are not applied to base classes', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}
			@testDecorator()
			@testDecorator()
			class TestWidget2 extends TestWidget {}

			const baseWidget = new TestWidget();
			const widget = new TestWidget2();

			assert.equal(baseWidget.callGetDecorator('test-decorator').length, 1);
			assert.equal(widget.callGetDecorator('test-decorator').length, 3);
		});

		it('decorator cache is populated when addDecorator is called after instantiation', () => {
			class TestWidget extends BaseTestWidget {
				constructor() {
					super();
					this.addDecorator('test-decorator-one', function() {});
					this.addDecorator('test-decorator-two', function() {});
				}
			}

			const testWidget = new TestWidget();

			assert.lengthOf(testWidget.callGetDecorator('test-decorator-one'), 1);
			assert.lengthOf(testWidget.callGetDecorator('test-decorator-two'), 1);
		});

		it('addDecorator accepts an array of decorators', () => {
			class TestWidget extends BaseTestWidget {
				constructor() {
					super();
					this.addDecorator('test-decorator', [ () => {}, () => {} ]);
				}
			}

			const testWidget = new TestWidget();

			assert.lengthOf(testWidget.callGetDecorator('test-decorator'), 2);
		});
	});
});
