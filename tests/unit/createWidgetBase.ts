import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from '@dojo/shim/Promise';
import createWidgetBase from '../../src/createWidgetBase';
import { DNode, HNode, WidgetProperties } from './../../src/interfaces';
import { VNode } from '@dojo/interfaces/vdom';
import { v, w, registry } from '../../src/d';
import { stub } from 'sinon';
import FactoryRegistry from './../../src/FactoryRegistry';

registerSuite({
	name: 'bases/createWidgetBase',
	api() {
		const widgetBase = createWidgetBase();
		assert(widgetBase);
		assert.isFunction(widgetBase.getNodeAttributes);
		assert.isFunction(widgetBase.getChildrenNodes);
		assert.isFunction(widgetBase.invalidate);
	},
	children() {
		let childrenEventEmitted = false;
		const expectedChild = v('div');
		const widget = createWidgetBase();
		widget.on('widget:children', () => {
			childrenEventEmitted = true;
		});

		assert.lengthOf(widget.children, 0);
		widget.setChildren([expectedChild]);
		assert.lengthOf(widget.children, 1);
		assert.strictEqual(widget.children[0], expectedChild);
		assert.isTrue(childrenEventEmitted);
	},
	tagName: {
		'Applies default tagName'() {
			const widget = createWidgetBase();
			assert.deepEqual(widget.tagName, 'div');
			const renderedWidget = <VNode> widget.__render__();
			assert.deepEqual(renderedWidget.vnodeSelector, 'div');
		},
		'Applies overridden tagName'() {
			const widget = createWidgetBase.override({ tagName: 'header' })();
			assert.deepEqual(widget.tagName, 'header');
			const renderedWidget = <VNode> widget.__render__();
			assert.deepEqual(renderedWidget.vnodeSelector, 'header');
		}
		},
		'Applies classes to tagName'() {
			const widget = createWidgetBase.override({ tagName: 'header', classes: [ 'class-one', 'classTwo' ] })();
			const renderedWidget = <VNode> widget.__render__();
			assert.deepEqual(renderedWidget.vnodeSelector, 'header.class-one.classTwo');
	},
	'getNodeAttributes()'() {
		const widgetBase = createWidgetBase({
			properties: { id: 'foo', classes: [ 'bar' ] }
		});

		let nodeAttributes = widgetBase.getNodeAttributes();

		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 4);

		widgetBase.setProperties({ 'id': 'foo', classes: ['foo'] });

		nodeAttributes = widgetBase.getNodeAttributes();

		assert.deepEqual(nodeAttributes.classes, { foo: true, bar: false });
	},
	diffProperties: {
		'no updated properties'() {
			const properties = { id: 'id', foo: 'bar' };
			const widgetBase = createWidgetBase();
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 0);
		},
		'updated properties'() {
			const widgetBase = createWidgetBase();
			const properties = { id: 'id', foo: 'baz' };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 1);
		},
		'new properties'() {
			const widgetBase = createWidgetBase();
			const properties = { id: 'id', foo: 'bar', bar: 'baz' };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 1);
		},
		'updated / new properties with falsy values'() {
			const widgetBase = createWidgetBase();
			const properties = { id: 'id', foo: '', bar: null, baz: 0, qux: false };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 4);
			assert.deepEqual(result.changedKeys, [ 'foo', 'bar', 'baz', 'qux']);
		}
	},
	setProperties: {
		'call diff property functions if available'() {
			let callCount = 0;
			createWidgetBase.mixin({
				mixin: {
					diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
						callCount++;
						assert.equal(newProperty, 'bar');
						return {
							changed: false,
							value: newProperty
						};
					}
				}
			})({ properties: { foo: 'bar' } });

			assert.equal(callCount, 1);
		},
		'result from diff property override diff and assign'() {
			const widgetBase = createWidgetBase.mixin({
				mixin: {
					diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
						return {
							changed: true,
							value: newProperty
						};
					},
					diffPropertyBaz(this: any, previousProperty: any, newProperty: any): any {
						return {
							changed: false,
							value: newProperty
						};
					}
				}
			})({ properties: { foo: 'bar', baz: 'qux' }});

			widgetBase.on('properties:changed', (event: any) => {
				assert.include(event.changedPropertyKeys, 'foo');
				assert.notInclude(event.changedPropertyKeys, 'baz');
			});

			widgetBase.setProperties({ foo: 'bar', baz: 'bar' });
		},
		'uses base diff when an individual property diff returns null'() {
			const widgetBase = createWidgetBase.mixin({
				mixin: {
					diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
						return null;
					}
				}
			})({ properties: { foo: 'bar' } });

			widgetBase.on('properties:changed', (event: any) => {
				assert.include(event.changedPropertyKeys, 'foo');
			});

			widgetBase.setProperties({ foo: 'baz' });
		}
	},
	getChildrenNodes: {
		'getChildrenNodes with no ChildNodeRenderers'() {
			const widgetBase = createWidgetBase();
			assert.deepEqual(widgetBase.getChildrenNodes(), []);
		},
		'getChildrenNodes with a ChildNodeRenderer'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ v('div') ];
						}
					}
				})();

			const childrenNodes = widgetBase.getChildrenNodes();

			assert.lengthOf(childrenNodes, 1);
			assert.isOk((<HNode> childrenNodes[0]).children);
			assert.lengthOf((<HNode> childrenNodes[0]).children, 0);
		}
	},
	render: {
		'render with non widget children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ v('header') ];
						}
					}
				})();

			const result = <VNode> widgetBase.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children && result.children[0].vnodeSelector, 'header');
		},
		'async factorys only initialise once'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header', loadFunction);

			const createMyWidget = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ w('my-header', {}) ];
						}
					}
				});

			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
				});

			let invalidateCount = 0;

			const myWidget = createMyWidget();
			myWidget.on('invalidated', () => {
				invalidateCount++;
			});

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			myWidget.invalidate();
			myWidget.__render__();
			myWidget.invalidate();
			myWidget.__render__();

			resolveFunction(createHeader);

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

			const createMyWidget = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ w('my-header1', {}) ];
						}
					}
				});

			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
				});

			const myWidget = createMyWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			resolveFunction(createHeader);
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
			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
			});
			const registry = new FactoryRegistry();
			registry.define('my-header', createHeader);

			const createMyWidget = createWidgetBase.mixin({
				mixin: {
					registry,
					getChildrenNodes: function(this: any): DNode[] {
						return [ w('my-header', {}) ];
					}
				}
			});

			const myWidget = createMyWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
		},
		'render with nested children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [
								v('header', [
									v('section')
								])
							];
						}
					}
				})();

			const result = <VNode> widgetBase.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
			assert.strictEqual(result.children![0].children![0].vnodeSelector, 'section');
		},
		'render with a text node children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ 'I am a text node' ];
						}
					}
				})();

			const result = <VNode> widgetBase.__render__();
			assert.isUndefined(result.children);
			assert.equal(result.text, 'I am a text node');
		},
		'instance gets passed to VNodeProperties as bind to widget and all children'() {
			const widgetBase = createWidgetBase
			.mixin({
				mixin: {
					getChildrenNodes: function(): DNode[] {
						return [
							v('header', [
								v('section')
							])
						];
					}
				}
			})();

			const result = <VNode> widgetBase.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.properties!.bind, widgetBase);
			assert.strictEqual(result.children![0].properties!.bind, widgetBase);
			assert.strictEqual(result.children![0].children![0].properties!.bind, widgetBase);
		},
		'bind does not get overriden when specifically configured for the element'() {
			const customThis = {};
			const widgetBase = createWidgetBase
			.mixin({
				mixin: {
					getChildrenNodes: function(): DNode[] {
						return [
							v('header', { bind: customThis }, [
								v('section')
							])
						];
					}
				}
			})();

			const result = <VNode> widgetBase.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.properties!.bind, widgetBase);
			assert.strictEqual(result.children![0].properties!.bind, customThis);
			assert.strictEqual(result.children![0].children![0].properties!.bind, widgetBase);
		},
		'render with multiple text node children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ 'I am a text node', 'Second text node' ];
						}
					}
				})();

			const result = <VNode> widgetBase.__render__();
			assert.isUndefined(result.text);
			assert.lengthOf(result.children, 2);
			assert.strictEqual(result.children![0].text, 'I am a text node');
			assert.strictEqual(result.children![1].text, 'Second text node');
		},
		'render with widget children'() {
			let countWidgetCreated = 0;
			let countWidgetDestroyed = 0;
			const testChildWidget = createWidgetBase.mixin({
				mixin: {
					tagName: 'footer'
				},
				aspectAdvice: {
					before: {
						destroy() {
							countWidgetDestroyed++;
						}
					}
				},
				initialize() {
					countWidgetCreated++;
				}
			});

			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(this: any): (DNode | null)[] {
							const properties: WidgetProperties = this.properties.classes ? { classes: this.properties.classes } : {};
							return [
								this.properties.hide ? null : w(testChildWidget, properties)
							];
						}
					}
				})();

			const firstRenderResult = <VNode> widgetBase.__render__();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(firstRenderResult.children, 1);
			const firstRenderChild: any = firstRenderResult.children && firstRenderResult.children[0];
			assert.strictEqual(firstRenderChild.vnodeSelector, 'footer');

			widgetBase.invalidate();

			const secondRenderResult = <VNode> widgetBase.__render__();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(secondRenderResult.children, 1);
			const secondRenderChild: any = secondRenderResult.children && secondRenderResult.children[0];
			assert.strictEqual(secondRenderChild.vnodeSelector, 'footer');

			widgetBase.setProperties({ 'classes': ['test-class'] });
			widgetBase.invalidate();
			const thirdRenderResult = <VNode> widgetBase.__render__();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(thirdRenderResult.children, 1);
			const thirdRenderChild: any = thirdRenderResult.children && thirdRenderResult.children[0];
			assert.strictEqual(thirdRenderChild.vnodeSelector, 'footer');
			assert.isTrue(thirdRenderChild.properties.classes['test-class']);

			widgetBase.setProperties(<any> { hide: true });
			widgetBase.invalidate();

			const forthRenderResult = <VNode> widgetBase.__render__();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(forthRenderResult.children, 0);

			widgetBase.setProperties(<any> { hide: false });
			widgetBase.invalidate();

			const lastRenderResult = <VNode> widgetBase.__render__();
			assert.strictEqual(countWidgetCreated, 2);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(lastRenderResult.children, 1);
			const lastRenderChild: any = lastRenderResult.children && lastRenderResult.children[0];
			assert.strictEqual(lastRenderChild.vnodeSelector, 'footer');
		},
		'render with multiple children of the same type without an id'() {

			const createWidgetOne = createWidgetBase.mixin({});
			const createWidgetTwo = createWidgetBase.mixin({});

			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(this: any): (DNode | null)[] {
							return [
								w(createWidgetOne, {}),
								w(createWidgetTwo, {}),
								w(createWidgetTwo, {})
							];
						}
					}
				})();

			const consoleStub = stub(console, 'warn');
			widgetBase.__render__();
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith('It is recommended to provide unique keys when using the same widget factory multiple times'));
			widgetBase.invalidate();
			widgetBase.__render__();
			assert.isTrue(consoleStub.calledThrice);
			assert.isTrue(consoleStub.calledWith('It is recommended to provide unique keys when using the same widget factory multiple times'));
			consoleStub.restore();
		},
		'render with updated properties'() {
			let renderCount = 0;
			const createMyWidget = createWidgetBase.mixin({
				mixin: {
					nodeAttributes: [
						function(this: any): any {
							const { properties: { foo, bar } } = this;

							return { foo, bar };
						}
					]
				}
			});
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							const properties: WidgetProperties & { foo: string, bar?: string } = { foo: 'bar' };

							if (renderCount === 1) {
								properties!.bar = 'baz';
								properties!.foo = 'baz';
							}

							renderCount++;

							return [
								w(createMyWidget, <WidgetProperties> properties)
							];
						}
					}
				})();

			let result = <VNode> widgetBase.__render__();
			assert.isUndefined(result!.children![0].properties!['bar']);
			assert.equal(result!.children![0].properties!['foo'], 'bar');

			widgetBase.invalidate();
			result = <VNode> widgetBase.__render__();
			assert.equal(result!.children![0].properties!['foo'], 'baz');
			assert.equal(result!.children![0].properties!['bar'], 'baz');
		},
		'__render__ with updated array properties'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget = createWidgetBase({ properties });
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			properties.items.push('c');
			myWidget.setProperties(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
			properties.items.push('d');
			myWidget.setProperties(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c', 'd' ]);
		},
		'__render__ with internally updated array state'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget = createWidgetBase({ properties });
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			myWidget.setProperties(<any> { items: [ 'a', 'b', 'c'] });
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
		},
		'__render__() and invalidate()'() {
			const widgetBase = createWidgetBase({
				properties: <any> { id: 'foo', label: 'foo' }
			});
			const result1 = <VNode> widgetBase.__render__();
			const result2 = <VNode> widgetBase.__render__();
			widgetBase.invalidate();
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
			assert.strictEqual(result1.properties!['data-widget-id'], 'foo');
		},
		'render multiple child widgets using the same factory'() {
			let childWidgetInstantiatedCount = 0;
			const createChildWidget = createWidgetBase.mixin({
				initialize() {
					childWidgetInstantiatedCount++;
				}
			});

			const createTestWidget = createWidgetBase.mixin({
				mixin: {
					getChildrenNodes(): DNode[] {
						return [
							w(createChildWidget, {}),
							v('div', {}, [
								'text',
								w(createChildWidget, {}, [
									w(createChildWidget, {})
								]),
								v('div', {}, [
									w(createChildWidget, {})
								])
							]),
							w(createChildWidget, {})
						];
					}
				}
			});

			const testWidget = createTestWidget();
			testWidget.__render__();

			assert.equal(childWidgetInstantiatedCount, 5);
		},
		'support updating factories for children with an `id`'() {
			let renderWidgetOne = true;
			let widgetOneInstantiated = false;
			let widgetTwoInstantiated = false;
			const createWidgetOne = createWidgetBase.mixin({
				initialize() {
					widgetOneInstantiated = true;
				}
			});
			const createWidgetTwo = createWidgetBase.mixin({
				initialize() {
					widgetTwoInstantiated = true;
				}
			});
			const createMyWidget = createWidgetBase.mixin({
				mixin: {
					getChildrenNodes(): DNode[] {
						return [
							renderWidgetOne ? w(createWidgetOne, { id: '1' }) : w(createWidgetTwo, { id: '1' })
						];
					}
				}
			});

			const myWidget = createMyWidget();
			myWidget.__render__();
			assert.isTrue(widgetOneInstantiated);
			renderWidgetOne = false;
			myWidget.invalidate();
			myWidget.__render__();
			assert.isTrue(widgetTwoInstantiated);
		}
	},
	'id': {
		'in properties'() {
			const widgetBase = createWidgetBase({
				properties: {
					id: 'foo'
				}
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'not in properties'() {
			const widgetBase = createWidgetBase();

			assert.isUndefined(widgetBase.id);
		},
		'is read only'() {
			const widgetBase = createWidgetBase();
			assert.throws(() => {
				(<any> widgetBase).id = 'foo'; /* .id is readonly, so TypeScript will prevent mutation */
			});
		}
	},
	'invalidate emits invalidated event'() {
		const widgetBase = createWidgetBase();
		let count = 0;
		widgetBase.on('invalidated', function() {
			console.log('invalid');
			count++;
		});
		widgetBase.__render__();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	}
});
