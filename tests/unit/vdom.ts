const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { match, spy, stub, SinonStub } from 'sinon';
import { createResolvers } from './../support/util';

import { dom, InternalHNode, InternalWNode } from '../../src/vdom';
import { v, w } from '../../src/d';
import { HNode } from '../../src/interfaces';
import { WidgetBase } from '../../src/WidgetBase';
import { Registry } from '../../src/Registry';
import eventHandlerInterceptor from '../../src/util/eventHandlerInterceptor';

let consoleStub: SinonStub;

const resolvers = createResolvers();

const noopEventHandlerInterceptor = (propertyName: string, functionPropertyArgument: Function) => {
	return function(this: Node) {
		return functionPropertyArgument.apply(this, arguments);
	};
};

const projectorStub: any = {
	on: stub(),
	emit: stub()
};

class MainBar extends WidgetBase<any> {
	render() {
		return v('span', { innerHTML: 'Bar' });
	}
}

class MainFoo extends WidgetBase<any> {
	render() {
		const { show } = this.properties;
		return v('div', { classes: [ 'myClass' ], foo: 'bar' }, [
			v('h1', { classes: [ 'myClass' ], key: 'one' }, [ 'Hello Widget' ]),
			show ? w(MainBar, { classes: [ 'myClass' ], key: 'first' }) : null,
			show ? w(MainBar, { key: 'second' }) : null,
			show ? null : v('div', { key: 'three' }, ['me']),
			`text node`,
			v('h1', { key: 'two', classes: [ 'myClass' ], innerHTML: 'span' })
		]);
	}
}

class TestWidget extends WidgetBase<any> {
	render() {
		return v('span', { classes: [ 'myClass' ] }, [
			w(MainFoo, { show: this.properties.show })
		]);
	}
}

describe('vdom', () => {
	beforeEach(() => {
		projectorStub.on.reset();
		projectorStub.emit.reset();
		consoleStub = stub(console, 'warn');
		resolvers.stub();
	});

	afterEach(() => {
		consoleStub.restore();
		resolvers.restore();
	});

	describe('widgets', () => {

		it('should create elements for widgets', () => {
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ show: true });

			const renderResult = widget.__render__() as HNode;
			const projection = dom.create(renderResult, widget);
			const span = projection.domNode as HTMLSpanElement;
			assert.lengthOf(span.childNodes, 1);
			const div = span.childNodes[0] as HTMLDivElement;
			assert.lengthOf(div.childNodes, 5);
			assert.strictEqual(div.getAttribute('foo'), 'bar');

			const headerOne = div.childNodes[0] as HTMLHeadElement;
			const spanOne = div.childNodes[1] as HTMLSpanElement;
			const spanTwo = div.childNodes[2] as HTMLSpanElement;
			const text = div.childNodes[3] as Text;
			const headerTwo = div.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');
		});

		it('should update elements for widget changes', () => {
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ show: true });

			const renderResult = widget.__render__() as HNode;
			const projection = dom.create(renderResult, widget);
			const root = projection.domNode as HTMLSpanElement;

			assert.lengthOf(root.childNodes, 1);
			let rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 5);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			let headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			let spanOne = rootChild.childNodes[1] as HTMLSpanElement;
			let spanTwo = rootChild.childNodes[2] as HTMLSpanElement;
			let text = rootChild.childNodes[3] as Text;
			let headerTwo = rootChild.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');

			widget.__setProperties__({ show: false });
			projection.update(widget.__render__() as HNode);

			assert.lengthOf(root.childNodes, 1);
			rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 4);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			let insertedDiv = rootChild.childNodes[1] as HTMLDivElement;
			text = rootChild.childNodes[2] as Text;
			headerTwo = rootChild.childNodes[3] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(insertedDiv.childNodes, 1);
			assert.strictEqual((insertedDiv.childNodes[0] as Text).data, 'me');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');

			widget.__setProperties__({ show: true });
			projection.update(widget.__render__() as HNode);

			assert.lengthOf(root.childNodes, 1);
			rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 5);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			spanOne = rootChild.childNodes[1] as HTMLSpanElement;
			spanTwo = rootChild.childNodes[2] as HTMLSpanElement;
			text = rootChild.childNodes[3] as Text;
			headerTwo = rootChild.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');
		});

		it('invalidates up the widget tree', () => {
			class Foo extends WidgetBase {
				private _text = 'first';

				private _onClick() {
					this._text = 'second';
					this.invalidate();
				}

				render() {
					return v('div', { onclick: this._onClick }, [ this._text ]);
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [
						w(Foo, {})
					]);
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [
						w(Bar, {})
					]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(
				widget.__render__() as HNode,
				widget,
				{ eventHandlerInterceptor: eventHandlerInterceptor.bind(widget) }
			);

			const root = projection.domNode as HTMLElement;
			assert.lengthOf(root.childNodes, 1);
			const barDiv = root.childNodes[0];
			assert.lengthOf(barDiv.childNodes, 1);
			const fooDiv = barDiv.childNodes[0] as HTMLDivElement;
			assert.lengthOf(fooDiv.childNodes, 1);
			const fooTextNode = fooDiv.childNodes[0] as Text;
			assert.strictEqual(fooTextNode.data, 'first');
			projection.update(widget.__render__() as HNode);
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 1);
			assert.strictEqual(barDiv.childNodes[0], fooDiv);
			assert.lengthOf(fooDiv.childNodes, 1);
			assert.strictEqual(fooDiv.childNodes[0], fooTextNode);
			assert.strictEqual(fooTextNode.data, 'first');
			fooDiv.onclick({} as any);
			projection.update(widget.__render__() as HNode);
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 1);
			assert.strictEqual(barDiv.childNodes[0], fooDiv);
			assert.lengthOf(fooDiv.childNodes, 1);
			assert.notStrictEqual(fooDiv.childNodes[0], fooTextNode);
			const updatedFooTextNode = fooDiv.childNodes[0] as Text;
			assert.strictEqual(updatedFooTextNode.data, 'second');
		});

		it('DNodes are bound to the parent widget', () => {
			class Foo extends WidgetBase<any> {
				render() {
					return v('div', { onclick: this.properties.onClick }, this.children);
				}
			}

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', { onclick: this.properties.onClick });
				}
			}
			class App extends WidgetBase {

				public onClickCount = 0;

				_onClick() {
					this.onClickCount++;
				}

				render() {
					return v('div', { onclick: this._onClick }, [
						w(Foo, { onClick: this._onClick }, [
							v('div', { onclick: this._onClick }, [
								w(Bar, {
									onClick: this._onClick
								})
							])
						])
					]);
				}
			}

			const widget = new App();
			const projection: any = dom.create(
				widget.__render__() as HNode,
				widget,
				{ eventHandlerInterceptor: eventHandlerInterceptor.bind(widget) }
			);
			projection.domNode.onclick();
			projection.domNode.childNodes[0].onclick();
			projection.domNode.childNodes[0].childNodes[0].onclick();
			projection.domNode.childNodes[0].childNodes[0].childNodes[0].onclick();
			assert.strictEqual(widget.onClickCount, 4);
		});

		it('supports widget registry items', () => {
			const baseRegistry = new Registry();

			class Foo extends WidgetBase<any> {
				render() {
					return v('h1', [ this.properties.text ]);
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [ this.properties.text ]);
				}
			}

			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			class Baz extends WidgetBase {
				render() {
					return v('div', [
						w<Foo>('foo', { text: 'foo' }),
						w<Bar>('bar', { text: 'bar' })
					]);
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection: any = dom.create(widget.__render__() as HNode, widget);
			const root = projection.domNode;
			const headerOne = root.childNodes[0];
			const headerOneText = headerOne.childNodes[0] as Text;
			const headerTwo = root.childNodes[1];
			const headerTwoText = headerTwo.childNodes[0] as Text;
			assert.strictEqual(headerOneText.data, 'foo');
			assert.strictEqual(headerTwoText.data, 'bar');
		});

		it('should invalidate when a registry items is loaded', () => {
			const baseRegistry = new Registry();

			class Foo extends WidgetBase<any> {
				render() {
					return v('h1', [ this.properties.text ]);
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [ this.properties.text ]);
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [
						w<Foo>('foo', { text: 'foo' }),
						w<Bar>('bar', { text: 'bar' })
					]);
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection: any = dom.create(widget.__render__() as HNode, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 0);
			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			projection.update(widget.__render__() as HNode);
			const headerOne = root.childNodes[0];
			const headerOneText = headerOne.childNodes[0] as Text;
			const headerTwo = root.childNodes[1];
			const headerTwoText = headerTwo.childNodes[0] as Text;
			assert.strictEqual(headerOneText.data, 'foo');
			assert.strictEqual(headerTwoText.data, 'bar');
		});

		it('supports an array of DNodes', () => {
			class Foo extends WidgetBase {
				private myClass = false;

				render() {
					this.myClass = !this.myClass;
					const classes = this.myClass ? [ 'myClass' ] : [];

					return [
						v('div', { classes }, [ '1' ]),
						v('div', {}, [ '2' ]),
						v('div', { classes: [ 'myClass' ] }, [ '3' ])
					];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [
						w(Foo, {})
					]);
				}
			}

			const widget = new Bar();
			const renderResult = widget.__render__() as HNode;
			const projection: any = dom.create(renderResult, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const childOne = root.childNodes[0];
			assert.lengthOf(childOne.childNodes, 1);
			const textNodeOne = childOne.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, '1');
			const childTwo = root.childNodes[1];
			assert.lengthOf(childTwo.childNodes, 1);
			const textNodeTwo = childTwo.childNodes[0] as Text;
			assert.strictEqual(textNodeTwo.data, '2');
			const childThree = root.childNodes[2];
			assert.lengthOf(childThree.childNodes, 1);
			const textNodeThree = childThree.childNodes[0] as Text;
			assert.strictEqual(textNodeThree.data, '3');

			widget.invalidate();
			const secondRenderResult = widget.__render__() as HNode;
			projection.update(secondRenderResult);
			const firstWNode = secondRenderResult.children![0] as InternalWNode;
			const secondWNode = secondRenderResult.children![0] as InternalWNode;
			assert.strictEqual(firstWNode.rendered, secondWNode.rendered);
		});

		it('supports null and undefined return from render', () => {
			class Foo extends WidgetBase {
				render() {
					return null;
				}
			}

			class Bar extends WidgetBase {
				render() {
					return undefined;
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [
						w(Foo, {}),
						w(Bar, {})
					]);
				}
			}

			const widget = new Baz();
			const projection: any = dom.create(widget.__render__() as HNode, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 0);
		});

		it('supports null return from render and subsequent return on re-render', () => {
			let fooInvalidate: any;
			class Foo extends WidgetBase<any> {

				private myClass = false;

				constructor() {
					super();
					fooInvalidate = this.invalidate.bind(this);
				}

				render() {

					if (!this.properties.show) {
						return null;
					}
					this.myClass = !this.myClass;
					const classes = this.myClass ? [ 'myClass' ] : [];
					return v('div', { key: '1', classes }, [
						'content'
					]);
				}
			}

			class Baz extends WidgetBase {

				private _show = false;

				set show(value: boolean) {
					this._show = value;
					this.invalidate();
				}

				render() {
					return v('div', [
						w(Foo, { show: this._show })
					]);
				}
			}

			const widget = new Baz();
			const projection: any = dom.create(widget.__render__() as HNode, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 0);
			widget.show = true;
			projection.update(widget.__render__() as HNode);
			assert.lengthOf(root.childNodes, 1);
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(fooDiv.classList, 1);
			assert.lengthOf(fooDiv.childNodes, 1);
			const fooDivContent = fooDiv.childNodes[0] as Text;
			assert.strictEqual(fooDivContent.data, 'content');
			fooInvalidate();
			projection.update(widget.__render__() as HNode);
			assert.lengthOf(fooDiv.classList, 0);
			assert.lengthOf(fooDiv.childNodes, 1);
		});

		it('should destroy widgets when they are no longer required', () => {
			let fooDestroyedCount = 0;

			class Foo extends WidgetBase {
				destroy() {
					fooDestroyedCount++;
					return super.destroy();
				}
				render() {
					return null;
				}
			}

			class Bar extends WidgetBase {
				private _count = 20;

				set count(value: number) {
					this._count = value;
					this.invalidate();

				}

				render() {
					const children: any[] = [];
					for (let i = 0; i < this._count; i++) {
						children.push(w(Foo, { key: i}));
					}

					return v('div', children);
				}
			}

			const widget = new Bar();
			const projection = dom.create(widget.__render__() as HNode, widget);
			resolvers.resolve();
			widget.count = 10;
			projection.update(widget.__render__() as HNode);
			resolvers.resolve();
			assert.strictEqual(fooDestroyedCount, 10);
			fooDestroyedCount = 0;
			widget.count = 10;
			projection.update(widget.__render__() as HNode);
			resolvers.resolve();
			assert.strictEqual(fooDestroyedCount, 0);
			widget.count = 20;
			projection.update(widget.__render__() as HNode);
			resolvers.resolve();
			assert.strictEqual(fooDestroyedCount, 0);
			widget.count = 0;
			projection.update(widget.__render__() as HNode);
			resolvers.resolve();
			assert.strictEqual(fooDestroyedCount, 20);
		});

		it('destroys existing widget and uses new widget when widget changes', () => {
			let fooDestroyed = false;
			let fooCreated = false;
			let barCreated = false;
			class Foo extends WidgetBase {

				constructor() {
					super();
					fooCreated = true;
				}

				destroy() {
					fooDestroyed = true;
					return super.destroy();

				}
				render() {
					return v('div');
				}
			}

			class Bar extends WidgetBase {
				constructor() {
					super();
					barCreated = true;
				}

				render() {
					return v('span');
				}
			}

			class Baz extends WidgetBase {
				private _foo = true;

				set foo(value: boolean) {
					this._foo = value;
					this.invalidate();
				}

				render() {
					return v('div', [
						this._foo ? w(Foo, {}) : w(Bar, {})
					]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget.__render__() as HNode, widget);
			resolvers.resolve();
			assert.isTrue(fooCreated);
			widget.foo = false;
			projection.update(widget.__render__() as HNode);
			resolvers.resolve();
			assert.isTrue(fooDestroyed);
			assert.isTrue(barCreated);
		});

		it('remove elements for embedded WNodes', () => {
			class Foo extends WidgetBase {
				render() {
					return v('div', { id: 'foo' });
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			class Baz extends WidgetBase {
				private _show = true;

				set show(value: boolean) {
					this._show = value;
					this.invalidate();
				}

				render() {
					return v('div', [
						this._show ? w(Bar, {}) : null
					]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget.__render__() as HNode, widget);
			const root = projection.domNode;
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.strictEqual(fooDiv.getAttribute('id'), 'foo');
			widget.show = false;
			projection.update(widget.__render__() as HNode);
			assert.isNull(fooDiv.parentNode);
		});

		it('should warn in the console for siblings for the same widgets with no key when added or removed', () => {
			class Foo extends WidgetBase<any> {
				render() {
					return v('div', [ this.properties.text ]);
				}
			}

			const widgetName = (Foo as any).name;
			let errorMsg = 'It is recommended to provide a unique \'key\' property when using the same widget multiple times as siblings';

			if (widgetName) {
				errorMsg = `It is recommended to provide a unique 'key' property when using the same widget (${widgetName}) multiple times as siblings`;
			}

			class Baz extends WidgetBase {

				show = false;

				render() {
					return v('div', [
						w(Foo, { text: '1' }),
						this.show ? w(Foo, { text: '2' }) : null,
						w(Foo, { text: '3' }),
						v('div', [
							w(Foo, { text: '4' })
						])
					]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget.__render__() as HNode, widget);
			assert.isTrue(consoleStub.notCalled);
			widget.invalidate();
			widget.show = true;
			projection.update(widget.__render__() as HNode);
			assert.isTrue(consoleStub.calledTwice);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

	});

	describe('create', () => {

		it('should create and update single text nodes', () => {
			const projection = dom.create(v('div', [ 'text' ]), projectorStub);
			assert.strictEqual(projection.domNode.outerHTML, '<div>text</div>');

			projection.update(v('div', [ 'text2' ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div>text2</div>');

			projection.update(v('div', [ 'text2', v('span', [ 'a' ]) ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div>text2<span>a</span></div>');

			projection.update(v('div', [ 'text2' ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div>text2</div>');

			projection.update(v('div', [ 'text' ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div>text</div>');
		});

		it('should work correctly with adjacent text nodes', () => {
			const projection = dom.create(v('div', [ '', '1', '' ]), projectorStub);
			assert.strictEqual(projection.domNode.outerHTML, '<div>1</div>');

			projection.update(v('div', [ ' ', '' ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div> </div>');

			projection.update(v('div', [ '', '1', '' ]));
			assert.strictEqual(projection.domNode.outerHTML, '<div>1</div>');
		});

		it('should break update when vdom object references are equal', () => {
			const hNode = v('div', [ 'text' ]);
			const projection = dom.create(hNode, projectorStub);
			assert.strictEqual(projection.domNode.outerHTML, '<div>text</div>');
			hNode.text = 'new';
			projection.update(hNode);
			assert.strictEqual(projection.domNode.outerHTML, '<div>text</div>');
		});

		it('should give a meaningful error when the root selector is changed', () => {
			const projection = dom.create(v('div'), projectorStub);
			assert.throws(() => {
				projection.update(v('span'));
			}, Error, 'may not be changed');
		});

		it('should allow an existing dom node to be used', () => {
			const node = document.createElement('div');
			(node as any).foo = 'foo';
			const childNode = document.createElement('span');
			(childNode as any).bar = 'bar';
			node.appendChild(childNode);
			const appendChildSpy = spy(node, 'appendChild');

			const childHNode = v('span', { id: 'b' }) as InternalHNode;
			childHNode.domNode = childNode;
			const hNode = v('div', { id: 'a' }, [ childHNode ]) as InternalHNode;
			hNode.domNode = node;

			const projection = dom.create(hNode, projectorStub);
			const root = projection.domNode as any;
			assert.strictEqual(root.outerHTML, '<div id="a"><span id="b"></span></div>');
			assert.strictEqual(root.foo, 'foo');
			assert.strictEqual(root.children[0].bar, 'bar');
			assert.isFalse(appendChildSpy.called);
		});

	});

	describe('properties', () => {

		it('updates attributes', () => {
			const projection = dom.create(v('a', { href: '#1' }), projectorStub);
			const link = projection.domNode as HTMLLinkElement;
			assert.strictEqual(link.getAttribute('href'), '#1');

			projection.update(v('a', { href: '#2' }));
			assert.strictEqual(link.getAttribute('href'), '#2');

			projection.update(v('a', { href: undefined }));
			assert.strictEqual(link.getAttribute('href'), '');
		});

		it('can add an attribute that was initially undefined', () => {
			const projection = dom.create(v('a', { href: undefined }), projectorStub);
			const link = projection.domNode as HTMLLinkElement;
			assert.isNull(link.getAttribute('href'));

			projection.update(v('a', { href: '#2' }));
			assert.strictEqual(link.getAttribute('href'), '#2');
		});

		it('can remove disabled property when set to null or undefined', () => {
			const projection = dom.create(v('a', { disabled: true }), projectorStub);
			const link = projection.domNode as HTMLLinkElement;

			assert.isTrue(link.disabled);
			// Unfortunately JSDom does not map the property value to the attribute as real browsers do
			// expect(link.getAttribute('disabled')).to.equal('');

			projection.update(v('a', { disabled: null as any }));

			// What Chrome would do:
			// expect(link.disabled).to.equal(false);
			// expect(link.getAttribute('disabled')).to.be.null;

			// What JSDom does:
			assert.isNull(link.disabled);
		});

		it('updates properties', () => {
			const projection = dom.create(v('a', { href: '#1', tabIndex: 1 }), projectorStub);
			const link = projection.domNode as HTMLLinkElement;
			assert.strictEqual(link.tabIndex, 1);

			projection.update(v('a', { href: '#1', tabIndex: 2 }));
			assert.strictEqual(link.tabIndex, 2);

			projection.update(v('a', { href: '#1', tabIndex: undefined }));
			assert.strictEqual(link.tabIndex, 0);
		});

		it('updates innerHTML', () => {
			const projection = dom.create(v('p', { innerHTML: '<span>INNER</span>' }), projectorStub);
			const paragraph = projection.domNode;
			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'INNER');
			projection.update(v('p', { innerHTML: '<span>UPDATED</span>' }));
			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'UPDATED');
		});

		it('does not mess up scrolling in Edge', () => {
			const projection = dom.create(v('div', { scrollTop: 0 }), projectorStub);
			const div = projection.domNode as HTMLDivElement;
			Object.defineProperty(div, 'scrollTop', {
				get: () => 1,
				set: stub().throws('Setting scrollTop would mess up scrolling')
			}); // meaning: div.scrollTop = 1;
			projection.update(v('div', { scrollTop: 1 }));
		});

		describe('classes', () => {

			it('adds and removes classes', () => {
				const projection = dom.create(v('div', { classes: [ 'a' ] }), projectorStub);
				const div = projection.domNode as HTMLDivElement;
				assert.strictEqual(div.className, 'a');
				projection.update(v('div', { classes: [ 'a', 'b' ] }));
				assert.strictEqual(div.className, 'a b');

				projection.update(v('div', { classes: [ 'b' ] }));
				assert.strictEqual(div.className, 'b');
			});

			it('should leave classes that are not controlled', () => {
				const div = document.createElement('div');
				div.className = 'c b';
				const projection = dom.merge(div, v('div', { classes: [ 'a' ] }), projectorStub);
				assert.strictEqual(div.className, 'c b a');
				projection.update(v('div', { classes: [ 'a', 'b' ] }));
				assert.strictEqual(div.className, 'c b a');

				projection.update(v('div', { classes: [ 'b' ] }));
				assert.strictEqual(div.className, 'c b');

				projection.update(v('div'));
				assert.strictEqual(div.className, 'c');
			});

			it('supports null, undefined and zero length strings in classes', () => {
				const div = document.createElement('div');
				div.className = 'b';
				const projection = dom.merge(div, v('div', { classes: [ 'b', null, null, null ] }), projectorStub);
				assert.strictEqual(div.className, 'b');
				projection.update(v('div', { classes: [ 'a' , null, undefined, '' ] }));
				assert.strictEqual(div.className, 'a');

				projection.update(v('div', { classes: [ 'a', null, undefined, '' ] }));
				assert.strictEqual(div.className, 'a');
				projection.update(v('div', { classes: [] }));
				assert.strictEqual(div.className, '');
				projection.update(v('div', { classes: [ 'a', null, undefined, '' ] }));
				assert.strictEqual(div.className, 'a');
				projection.update(v('div'));
				assert.strictEqual(div.className, '');
			});

			it('classes accepts a string', () => {
				const div = document.createElement('div');
				const projection = dom.merge(div, v('div', { classes: 'b' }), projectorStub);
				assert.strictEqual(div.className, 'b');
				projection.update(v('div', { classes: 'b' }));
				assert.strictEqual(div.className, 'b');

				projection.update(v('div', { classes: 'a' }));
				assert.strictEqual(div.className, 'a');
				projection.update(v('div'));
				assert.strictEqual(div.className, '');
				projection.update(v('div', { classes: null }));
				assert.strictEqual(div.className, '');
				projection.update(v('div'));
				projection.update(v('div', { classes: 'a b' }));
				assert.strictEqual(div.className, 'a b');
			});

			it('should split class names by space before applying/removing', () => {
				const div = document.createElement('div');
				const projection = dom.merge(div, v('div', { classes: 'a b' }), projectorStub);
				assert.strictEqual(div.className, 'a b');
				projection.update(v('div'));
				assert.strictEqual(div.className, '');

				projection.update(v('div', { classes: [ 'a b' ] }));
				assert.strictEqual(div.className, 'a b');
				projection.update(v('div'));
				assert.strictEqual(div.className, '');
			});

			it('should accept null as a class', () => {
				const div = document.createElement('div');
				dom.merge(div, v('div', { classes: null }), projectorStub);
				assert.strictEqual(div.className, '');
			});
		});

		describe('styles', () => {

			it('should not allow non-string values', () => {
				try {
					dom.create(v('div', { styles: { height: 20 as any } }), projectorStub);
					assert.fail();
				} catch (e) {
					assert.isTrue(e.message.indexOf('strings') >= 0);
				}
			});

			it('should add styles to the real DOM', () => {
				const projection = dom.create(v('div', { styles: { height: '20px' } }), projectorStub);
				assert.strictEqual(projection.domNode.outerHTML, '<div style="height: 20px;"></div>');
			});

			it('should update styles', () => {
				const projection = dom.create(v('div', { styles: { height: '20px' } }), projectorStub);
				projection.update(v('div', { styles: { height: '30px' } }));
				assert.strictEqual(projection.domNode.outerHTML, '<div style="height: 30px;"></div>');
			});

			it('should remove styles', () => {
				const projection = dom.create(v('div', { styles: { width: '30px', height: '20px' } }), projectorStub);
				projection.update(v('div', { styles: { height: null, width: '30px' } }));
				assert.strictEqual(projection.domNode.outerHTML, '<div style="width: 30px;"></div>');
			});

			it('should add styles', () => {
				const projection = dom.create(v('div', { styles: { height: undefined } }), projectorStub);
				projection.update(v('div', { styles: { height: '20px' } }));
				assert.strictEqual(projection.domNode.outerHTML, '<div style="height: 20px;"></div>');
				projection.update(v('div', { styles: { height: '20px' } }));
			});

			it('should use the provided styleApplyer', () => {
				const styleApplyer = (domNode: any, styleName: string, value: string) => {
					// Useless styleApplyer which transforms height to minHeight
					domNode.style['min' + styleName.substr(0, 1).toUpperCase() + styleName.substr(1)] = value;
				};
				const projection = dom.create(v('div', { styles: { height: '20px' } }), projectorStub, { styleApplyer: styleApplyer });
				assert.strictEqual(projection.domNode.outerHTML, '<div style="min-height: 20px;"></div>');
				projection.update(v('div', { styles: { height: '30px' } }));
				assert.strictEqual(projection.domNode.outerHTML, '<div style="min-height: 30px;"></div>');
			});

		});

		describe('event handlers', () => {

			it('allows one to correct the value while being typed', () => {
				let typedKeys = '';
				const handleInput = (evt: any) => {
					typedKeys = evt.target.value.substr(0, 2);
				};
				const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
				const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
				const inputElement = projection.domNode as HTMLInputElement;
				assert.strictEqual(inputElement.value, typedKeys);

				inputElement.value = 'ab';
				inputElement.oninput({ target: inputElement } as any);
				assert.strictEqual(typedKeys, 'ab');
				projection.update(renderFunction());
				assert.strictEqual(inputElement.value, 'ab');

				inputElement.value = 'abc';
				inputElement.oninput({ target: inputElement } as any);
				assert.strictEqual(typedKeys, 'ab');
				projection.update(renderFunction());
				assert.strictEqual(inputElement.value, 'ab');
			});

			it('does not undo keystrokes, even if a browser runs an animationFrame between changing the value property and running oninput', () => {
				// Crazy internet explorer behavior
				let typedKeys = '';
				const handleInput = (evt: Event) => {
					typedKeys = (evt.target as HTMLInputElement).value;
				};

				const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

				const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
				const inputElement = (projection.domNode as HTMLInputElement);
				assert.strictEqual(inputElement.value, typedKeys);

				// Normal behavior
				inputElement.value = 'a';
				inputElement.oninput({ target: inputElement } as any);
				assert.strictEqual(typedKeys, 'a');
				projection.update(renderFunction());

				// Crazy behavior
				inputElement.value = 'ab';
				projection.update(renderFunction());
				assert.strictEqual(typedKeys, 'a');
				assert.strictEqual(inputElement.value, 'ab');
				inputElement.oninput({ target: inputElement } as any);
				assert.strictEqual(typedKeys, 'ab');
				projection.update(renderFunction());
			});

			it('does not allow event handlers to be updated, for performance reasons', () => {
				const handler1 = () => undefined as void;
				const handler2 = () => undefined as void;
				const projection = dom.create(v('button', { onclick: handler1 }), projectorStub);
				assert.throws(() => {
					projection.update(v('button', { onclick: handler2 }));
				});
			});

		});

		it('updates the value property', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
			const inputElement = (projection.domNode as HTMLInputElement);
			assert.strictEqual(inputElement.value, typedKeys);
			typedKeys = 'value1';
			projection.update(renderFunction());
			assert.strictEqual(inputElement.value, typedKeys);
		});

		it('does not clear a value that was set by a testing tool (like Ranorex) which manipulates input.value directly', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
			const inputElement = (projection.domNode as HTMLInputElement);
			assert.strictEqual(inputElement.value, typedKeys);

			inputElement.value = 'value written by a testing tool without invoking the input event';

			projection.update(renderFunction());
			assert.notStrictEqual(inputElement.value, typedKeys);
		});

		it('Can handle oninput event handlers which pro-actively change element.value to correct user input when typing faster than 60 keys per second', () => {
			let model = '';
			const handleInput = (evt: Event) => {
				const inputElement = evt.target as HTMLInputElement;
				model = inputElement.value;
				if (model.indexOf(',') > 0) {
					model = model.replace(/,/g, '.');
					inputElement.value = model;
				}
			};

			const renderFunction = () => v('input', { value: model, oninput: handleInput });
			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });

			const inputElement = (projection.domNode as HTMLInputElement);
			assert.strictEqual(inputElement.value, model);

			inputElement.value = '4';
			inputElement.oninput({target: inputElement} as any as Event);
			projection.update(renderFunction());

			inputElement.value = '4,';
			inputElement.oninput({target: inputElement} as any as Event);
			projection.update(renderFunction());

			assert.strictEqual(inputElement.value, '4.');

			model = '';
			projection.update(renderFunction());

			assert.strictEqual(inputElement.value, '');
		});

		it('removes the attribute when a role property is set to undefined', () => {
			let role: string | undefined = 'button';
			const renderFunction = () => v('div', { role: role });

			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
			const element = projection.domNode;

			assert.property(element.attributes, 'role');
			assert.strictEqual(element.getAttribute('role'), role);

			role = undefined;
			projection.update(renderFunction());
			assert.notProperty(element.attributes, 'role');
		});

	});

	describe('deferred properties', () => {
		it('can call a callback on render and on the next rAF for hnode properties', () => {
			let deferredCallbackCount = 0;
			let renderCount = 0;

			const renderFunction = () => {
				renderCount++;
				const div = v('div', (inserted) => {
					return {
						inserted,
						deferredCallbackCount: ++deferredCallbackCount
					};
				});
				div.properties.renderCount = renderCount;
				return div;
			};

			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
			const element: any = projection.domNode;

			assert.strictEqual(element.deferredCallbackCount, 1);
			assert.strictEqual(element.renderCount, 1);
			assert.isFalse(element.inserted);

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.deferredCallbackCount, 2);
			assert.strictEqual(element.renderCount, 1);
			assert.isTrue(element.inserted);

			projection.update(renderFunction());

			assert.strictEqual(element.deferredCallbackCount, 3);
			assert.strictEqual(element.renderCount, 2);
			assert.isTrue(element.inserted);

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.deferredCallbackCount, 4);
			assert.strictEqual(element.renderCount, 2);
			assert.isTrue(element.inserted);
		});

		it('should still allow properties to be decorated on a DNode', () => {
			let foo = 'bar';

			const renderFunction = () => {
				const div = v('div', (inserted) => {
					return {
						foo: 'this should not override the decorated property',
						another: 'property'
					};
				});
				div.properties.foo = foo;
				return div;
			};

			const projection = dom.create(renderFunction(), projectorStub, { eventHandlerInterceptor: noopEventHandlerInterceptor });
			const element: any = projection.domNode;

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			foo = 'qux';

			projection.update(renderFunction());

			assert.strictEqual(element.getAttribute('foo'), 'qux');
			assert.strictEqual(element.getAttribute('another'), 'property');

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'qux');
			assert.strictEqual(element.getAttribute('another'), 'property');
		});
	});

	describe('children', () => {

		it('can remove child nodes', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 1 }),
				v('span', { key: 2 }),
				v('span', { key: 3 })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[2];

			projection.update(v('div', [
				v('span', { key: 1 }),
				v('span', { key: 3 })
			]));

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], lastSpan);

			projection.update(v('div', [
				v('span', { key: 3 })
			]));

			assert.lengthOf(div.childNodes, 1);
			assert.strictEqual(div.childNodes[0], lastSpan);

			projection.update(v('div'));
			assert.lengthOf(div.childNodes, 0);
		});

		it('can add child nodes', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 2 }),
				v('span', { key: 4 })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			projection.update(v('div', [
				v('span', { key: 1 }),
				v('span', { key: 2 }),
				v('span', { key: 3 }),
				v('span', { key: 4 }),
				v('span', { key: 5 })
			]));

			assert.lengthOf(div.childNodes, 5);
			assert.strictEqual(div.childNodes[1], firstSpan);
			assert.strictEqual(div.childNodes[3], lastSpan);
		});

		it('can distinguish between string keys when adding', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'three' })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];

			projection.update(v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'two' }),
				v('span', { key: 'three' })
			]));

			assert.lengthOf(div.childNodes, 3);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], secondSpan);
		});

		it('can distinguish between falsy keys when replacing', () => {
			const projection = dom.create(v('div', [
				v('span', { key: false }),
				v('span', { key: null as any }),
				v('span', { key: '' }),
				v('span', {})
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 4);

			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];
			const thirdSpan = div.childNodes[2];
			const fourthSpan = div.childNodes[3];

			projection.update(v('div', [
				v('span', { key: 0 })
			]));

			assert.lengthOf(div.childNodes, 1);
			const newSpan = div.childNodes[0];

			assert.notStrictEqual(newSpan, firstSpan);
			assert.notStrictEqual(newSpan, secondSpan);
			assert.notStrictEqual(newSpan, thirdSpan);
			assert.notStrictEqual(newSpan, fourthSpan);
		});

		it('can distinguish between string keys when deleting', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'two' }),
				v('span', { key: 'three' })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			projection.update(v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'three' })
			]));

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('can distinguish between falsy keys when deleting', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 0 }),
				v('span', { key: false }),
				v('span', { key: null as any })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			projection.update(v('div', [
				v('span', { key: 0 }),
				v('span', { key: null as any })
			]));

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('does not reorder nodes based on keys', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 'a' }),
				v('span', { key: 'b' })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			projection.update(v('div', [
				v('span', { key: 'b' }),
				v('span', { key: 'a' })
			]));

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], lastSpan);
			assert.notStrictEqual(div.childNodes[1], firstSpan);
		});

		it('can insert text nodes', () => {
			const projection = dom.create(v('div', [
				v('span', { key: 2 }),
				v('span', { key: 4 })
			]), projectorStub);

			const div = projection.domNode;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			projection.update(v('div', [
				v('span', { key: 2 }),
				'Text between',
				v('span', { key: 4 })
			]));

			assert.lengthOf(div.childNodes, 3);

			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], lastSpan);
		});

		it('can update single text nodes', () => {
			const projection = dom.create(v('span', [ '' ]), projectorStub);
			const span = projection.domNode;
			assert.lengthOf(span.childNodes, 1);

			projection.update(v('span', [ undefined ]));
			assert.lengthOf(span.childNodes, 0);

			projection.update(v('span', [ 'f' ]));
			assert.lengthOf(span.childNodes, 1);

			projection.update(v('span', [ undefined ]));
			assert.lengthOf(span.childNodes, 0);

			projection.update(v('span', [ '' ]));
			assert.lengthOf(span.childNodes, 1);

			projection.update(v('span', [ ' ' ]));
			assert.lengthOf(span.childNodes, 1);
		});

		it('will throw an error when vdom is not sure which node is added', () => {
			const projection = dom.create(v('div', [
				v('span', [ 'a' ]),
				v('span', [ 'c' ])
			]), projectorStub);
			assert.throws(() => {
				projection.update(v('div', [
					v('span', [ 'a' ]),
					v('span', [ 'b' ]),
					v('span', [ 'c' ])
				]));
			});
		});

		it('will throw an error when vdom is not sure which node is removed', () => {
			const projection = dom.create(v('div', [
				v('span', [ 'a' ]),
				v('span', [ 'b' ]),
				v('span', [ 'c' ])
			]), projectorStub);
			assert.throws(() => {
				projection.update(v('div', [
					v('span', [ 'a' ]),
					v('span', [ 'c' ])
				]));
			});
		});

		it('allows a contentEditable tag to be altered', () => {
			let text = 'initial value';
			const handleInput = (evt: any) => {
				text = evt.currentTarget.innerHTML;
			};
			const renderDNodes = () => v('div', {
				contentEditable: true,
				oninput: handleInput,
				innerHTML: text
			});
			const projection = dom.create(renderDNodes(), projectorStub);

			projection.domNode.removeChild(projection.domNode.childNodes[0]);
			handleInput({ currentTarget: projection.domNode });
			projection.update(renderDNodes());

			projection.domNode.innerHTML = 'changed <i>value</i>';
			handleInput({ currentTarget: projection.domNode });
			projection.update(renderDNodes());

			assert.strictEqual(projection.domNode.innerHTML, 'changed <i>value</i>');
		});

		describe('svg', () => {

			it('creates and updates svg dom nodes with the right namespace', () => {
				const projection = dom.create(v('div', [
					v('svg', [
						v('circle', { cx: '2cm', cy: '2cm', r: '1cm', fill: 'red' }),
						v('image', { href: '/image.jpeg' })
					]),
					v('span')
				]), projectorStub);
				const svg = projection.domNode.childNodes[0];
				assert.strictEqual(svg.namespaceURI, 'http://www.w3.org/2000/svg');
				const circle = svg.childNodes[0];
				assert.strictEqual(circle.namespaceURI, 'http://www.w3.org/2000/svg');
				const image = svg.childNodes[1];
				assert.strictEqual(image.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
				const span = projection.domNode.childNodes[1];
				assert.strictEqual(span.namespaceURI, 'http://www.w3.org/1999/xhtml');

				projection.update(v('div', [
					v('svg', [
						v('circle', { key: 'blue', cx: '2cm', cy: '2cm', r: '1cm', fill: 'blue' }),
						v('image', { href: '/image2.jpeg' })
					]),
					v('span')
				]));

				const blueCircle = svg.childNodes[0];
				assert.strictEqual(blueCircle.namespaceURI, 'http://www.w3.org/2000/svg');
			});
		});

	});

	it('Supports merging DNodes onto existing HTML', () => {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		iframe.contentDocument.write(`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button></div>`);
		iframe.contentDocument.close();
		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		const childElementCount = root.childElementCount;
		const select = root.childNodes[1] as HTMLSelectElement;
		const button = root.childNodes[2] as HTMLButtonElement;
		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		const onchangeListener = spy();
		const onclickListener = spy();
		class Foo extends WidgetBase {
			render() {
				return v('div', {
					classes: [ 'foo', 'bar' ]
				}, [
					v('label', {
						for: 'baz'
					}, [ 'Select Me:' ]),
					v('select', {
						type: 'text',
						name: 'baz',
						id: 'baz',
						disabled: false,
						onchange: onchangeListener
					}, [
						v('option', { value: 'foo', selected: true }, [ 'label foo' ]),
						v('option', { value: 'bar', selected: false }, [ 'label bar' ]),
						v('option', { value: 'baz', selected: false }, [ 'label baz' ])
					]),
					v('button', {
						type: 'button',
						disabled: false,
						onclick: onclickListener
					}, [ 'Click Me!' ])
				]);
			}
		}
		const widget = new Foo();
		dom.merge(root, widget.__render__() as HNode, widget);
		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
		assert.strictEqual(select, root.childNodes[1], 'should have been reused');
		assert.strictEqual(button, root.childNodes[2], 'should have been reused');
		assert.isFalse(select.disabled, 'select should be enabled');
		assert.isFalse(button.disabled, 'button should be enabled');

		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		assert.isFalse(onchangeListener.called, 'onchangeListener should not have been called');
		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		const changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', true, true);
		select.onchange(changeEvent); // firefox doesn't like to dispatch this event, either due to trust issues or
									// that firefox doesn't generally dispatch this event until the element is blurred
									// which is different than other browsers.  Either way this is not material to testing
									// the functionality of this test, so calling the listener directly.
		assert.isTrue(onchangeListener.called, 'onchangeListener should have been called');

		const clickEvent = document.createEvent('CustomEvent');
		clickEvent.initEvent('click', true, true);
		button.dispatchEvent(clickEvent);
		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		document.body.removeChild(iframe);
	});

	it('Supports merging DNodes with widgets onto existing HTML', () => {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		iframe.contentDocument.write(`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button><span>label</span><div>last node</div></div>`);
		iframe.contentDocument.close();
		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		const childElementCount = root.childElementCount;
		const label = root.childNodes[0] as HTMLLabelElement;
		const select = root.childNodes[1] as HTMLSelectElement;
		const button = root.childNodes[2] as HTMLButtonElement;
		const span = root.childNodes[3] as HTMLElement;
		const div = root.childNodes[4] as HTMLElement;
		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		const onchangeListener = spy();
		const onclickListener = spy();

		class Button extends WidgetBase {
			render() {
				return [
					v('button', { type: 'button', disabled: false, onclick: onclickListener }, [ 'Click Me!' ]),
					v('span', {}, [ 'label' ])
				];
			}
		}
		class Foo extends WidgetBase {
			render() {
				return v('div', {
					classes: [ 'foo', 'bar' ]
				}, [
					v('label', {
						for: 'baz'
					}, [ 'Select Me:' ]),
					v('select', {
						type: 'text',
						name: 'baz',
						id: 'baz',
						disabled: false,
						onchange: onchangeListener
					}, [
						v('option', { value: 'foo', selected: true }, [ 'label foo' ]),
						v('option', { value: 'bar', selected: false }, [ 'label bar' ]),
						v('option', { value: 'baz', selected: false }, [ 'label baz' ])
					]),
					w(Button, {}),
					v('div', [ 'last node'])
				]);
			}
		}
		const widget = new Foo();
		dom.merge(root, widget.__render__() as HNode, widget);
		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
		assert.strictEqual(label, root.childNodes[0], 'should have been reused');
		assert.strictEqual(select, root.childNodes[1], 'should have been reused');
		assert.strictEqual(button, root.childNodes[2], 'should have been reused');
		assert.strictEqual(span, root.childNodes[3], 'should have been reused');
		assert.strictEqual(div, root.childNodes[4], 'should have been reused');
		assert.isFalse(select.disabled, 'select should be enabled');
		assert.isFalse(button.disabled, 'button should be enabled');

		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		assert.isFalse(onchangeListener.called, 'onchangeListener should not have been called');
		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		const changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', true, true);
		select.onchange(changeEvent); // firefox doesn't like to dispatch this event, either due to trust issues or
									// that firefox doesn't generally dispatch this event until the element is blurred
									// which is different than other browsers.  Either way this is not material to testing
									// the functionality of this test, so calling the listener directly.
		assert.isTrue(onchangeListener.called, 'onchangeListener should have been called');

		const clickEvent = document.createEvent('CustomEvent');
		clickEvent.initEvent('click', true, true);
		button.dispatchEvent(clickEvent);
		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		document.body.removeChild(iframe);
	});

	it('Skips unknown nodes when merging', () => {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		iframe.contentDocument.write(`
			<div class="foo">
				<label for="baz">Select Me:</label>
				<select type="text" name="baz" id="baz" disabled="disabled">
					<option value="foo">label foo</option>
					<option value="bar" selected="">label bar</option>
					<option value="baz">label baz</option>
				</select>
				<button type="button" disabled="disabled">Click Me!</button>
				<span>label</span>
				<div>last node</div>
			</div>`);
		iframe.contentDocument.close();
		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		const childElementCount = root.childElementCount;
		const label = root.childNodes[1] as HTMLLabelElement;
		const select = root.childNodes[3] as HTMLSelectElement;
		const button = root.childNodes[5] as HTMLButtonElement;
		const span = root.childNodes[7] as HTMLElement;
		const div = root.childNodes[9] as HTMLElement;
		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		const onchangeListener = spy();
		const onclickListener = spy();

		class Button extends WidgetBase {
			render() {
				return [
					v('button', { type: 'button', disabled: false, onclick: onclickListener }, [ 'Click Me!' ]),
					v('span', {}, [ 'label' ])
				];
			}
		}
		class Foo extends WidgetBase {
			render() {
				return v('div', {
					classes: [ 'foo', 'bar' ]
				}, [
					v('label', {
						for: 'baz'
					}, [ 'Select Me:' ]),
					v('select', {
						type: 'text',
						name: 'baz',
						id: 'baz',
						disabled: false,
						onchange: onchangeListener
					}, [
						v('option', { value: 'foo', selected: true }, [ 'label foo' ]),
						v('option', { value: 'bar', selected: false }, [ 'label bar' ]),
						v('option', { value: 'baz', selected: false }, [ 'label baz' ])
					]),
					w(Button, {}),
					v('div', [ 'last node'])
				]);
			}
		}
		const widget = new Foo();
		dom.merge(root, widget.__render__() as HNode, widget);
		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
		assert.strictEqual(label, root.childNodes[1], 'should have been reused');
		assert.strictEqual(select, root.childNodes[3], 'should have been reused');
		assert.strictEqual(button, root.childNodes[5], 'should have been reused');
		assert.strictEqual(span, root.childNodes[7], 'should have been reused');
		assert.strictEqual(div, root.childNodes[9], 'should have been reused');
		assert.isFalse(select.disabled, 'select should be enabled');
		assert.isFalse(button.disabled, 'button should be enabled');

		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		assert.isFalse(onchangeListener.called, 'onchangeListener should not have been called');
		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		const changeEvent = document.createEvent('Event');
		changeEvent.initEvent('change', true, true);
		select.onchange(changeEvent); // firefox doesn't like to dispatch this event, either due to trust issues or
									// that firefox doesn't generally dispatch this event until the element is blurred
									// which is different than other browsers.  Either way this is not material to testing
									// the functionality of this test, so calling the listener directly.
		assert.isTrue(onchangeListener.called, 'onchangeListener should have been called');

		const clickEvent = document.createEvent('CustomEvent');
		clickEvent.initEvent('click', true, true);
		button.dispatchEvent(clickEvent);
		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		document.body.removeChild(iframe);
	});

	describe('node callbacks', () => {

		it('element-created not emitted for new nodes without a key', () => {
			dom.create(v('div'), projectorStub);
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.neverCalledWith({ type: 'element-created' }));
		});

		it('element-created emitted for new nodes with a key', () => {
			const projection = dom.create(v('div', { key: '1' }), projectorStub);
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-created', element: projection.domNode, key: '1' }));
		});

		it('element-created emitted for new nodes with a key of 0', () => {
			const projection = dom.create(v('div', { key: 0 }), projectorStub);
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-created', element: projection.domNode, key: 0 }));
		});

		it('element-updated not emitted for updated nodes without a key', () => {
			const projection = dom.create(v('div'), projectorStub);
			resolvers.resolve();
			projection.update(v('div'));
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.neverCalledWith({ type: 'element-updated' }));
		});

		it('element-updated emitted for updated nodes with a key', () => {
			const projection = dom.create(v('div'), projectorStub);
			resolvers.resolve();
			projection.update(v('div', { key: '1' }));
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-updated', element: projection.domNode, key: '1' }));
		});

		it('element-updated emitted for updated nodes with a key of 0', () => {
			const projection = dom.create(v('div'), projectorStub);
			resolvers.resolve();
			projection.update(v('div', { key: 0 }));
			resolvers.resolve();
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-updated', element: projection.domNode, key: 0 }));
		});

	});

	describe('animations', () => {

		describe('updateAnimation', () => {

			it('is invoked when a node contains only text and that text changes', () => {
				const updateAnimation = stub();
				const projection = dom.create(v('div', { updateAnimation }, [ 'text' ]), projectorStub);
				projection.update(v('div', { updateAnimation }, [ 'text2' ]));
				assert.isTrue(updateAnimation.calledOnce);
				assert.strictEqual(projection.domNode.outerHTML, '<div>text2</div>');
			});

			it('is invoked when a node contains text and other nodes and the text changes', () => {
				const updateAnimation = stub();
				const projection = dom.create(v('div', { updateAnimation }, [
					'textBefore',
					v('span'),
					'textAfter'
				]), projectorStub);
				projection.update(v('div', { updateAnimation }, [
					'textBefore',
					v('span'),
					'newTextAfter'
				]));
				assert.isTrue(updateAnimation.calledOnce);
				updateAnimation.reset();

				projection.update(v('div', { updateAnimation }, [
					'textBefore',
					v('span'),
					'newTextAfter'
				]));
				assert.isTrue(updateAnimation.notCalled);
			});

			it('is invoked when a property changes', () => {
				const updateAnimation = stub();
				const projection = dom.create(v('a', { updateAnimation, href: '#1' }), projectorStub);
				projection.update(v('a', { updateAnimation, href: '#2' }));
				assert.isTrue(updateAnimation.calledWith(
					projection.domNode,
					match({ href: '#2' }),
					match({ href: '#1' })
				));
			});
		});

		describe('enterAnimation', () => {

			it('is invoked when a new node is added to an existing parent node', () => {
				const enterAnimation = stub();
				const projection = dom.create(v('div', []), projectorStub);

				projection.update(v('div', [
					v('span', { enterAnimation })
				]));

				assert.isTrue(enterAnimation.calledWith(projection.domNode.childNodes[0], match({})));
			});
		});

		describe('exitAnimation', () => {

			it('is invoked when a node is removed from an existing parent node', () => {
				const exitAnimation = stub();
				const projection = dom.create(v('div', [
					v('span', { exitAnimation })
				]), projectorStub);

				projection.update(v('div', []));

				assert.isTrue(exitAnimation.calledWithExactly(projection.domNode.childNodes[0], match({}), match({})));

				assert.lengthOf(projection.domNode.childNodes, 1);
				exitAnimation.lastCall.callArg(1); // arg1: removeElement
				assert.lengthOf(projection.domNode.childNodes, 0);
			});

		});

		describe('transitionStrategy', () => {

			it('will be invoked when enterAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const projection = dom.create(v('div'), projectorStub, { transitions: transitionStrategy });

				projection.update(v('div', [
					v('span', { enterAnimation: 'fadeIn' })
				]));

				assert.isTrue(transitionStrategy.enter.calledWithExactly(
					projection.domNode.firstChild,
					match({}),
					'fadeIn'
				));
			});

			it('will be invoked when exitAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const projection = dom.create(
					v('div', [
						v('span', { exitAnimation: 'fadeOut' })
					]),
					projectorStub,
					{ transitions: transitionStrategy }
				);

				projection.update(v('div', []));

				assert.isTrue(transitionStrategy.exit.calledWithExactly(
					projection.domNode.firstChild,
					match({}),
					'fadeOut',
					match({})
				));

				transitionStrategy.exit.lastCall.callArg(3);
				assert.lengthOf(projection.domNode.childNodes, 0);
			});

			it('will complain about a missing transitionStrategy', () => {
				const projection = dom.create(v('div'), projectorStub, {});

				assert.throws(() => {
					projection.update(v('div', [
						v('span', { enterAnimation: 'fadeIn' })
					]));
				});
			});

		});

	});

});
