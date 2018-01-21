const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { match, spy, stub, SinonStub, SinonSpy } from 'sinon';
import { createResolvers } from './../support/util';
import sendEvent from './../support/sendEvent';

import { dom, InternalVNode, InternalWNode, widgetInstanceMap, RenderResult } from '../../src/vdom';
import { v, w } from '../../src/d';
import { VNode, Render } from '../../src/interfaces';
import { WidgetBase } from '../../src/WidgetBase';
import { Registry } from '../../src/Registry';

let consoleStub: SinonStub;

const resolvers = createResolvers();

function getWidget(renderResult: RenderResult | Render) {
	return new class extends WidgetBase {
		private _renderResult = renderResult;
		private _nodeHandlerStub = {
			add: stub(),
			addRoot: stub()
		};
		private _onElementCreatedStub = stub();
		private _onElementUpdatedStub = stub();
		private _onAttachStub = stub();
		private _onDetachStub = stub();

		constructor() {
			super();
			const instanceData = widgetInstanceMap.get(this)!;
			const stubs: any = {
				nodeHandler: this._nodeHandlerStub,
				onElementCreated: this._onElementCreatedStub,
				onElementUpdated: this._onElementUpdatedStub,
				onAttach: this._onAttachStub,
				onDetach: this._onDetachStub
			};
			widgetInstanceMap.set(this, { ...instanceData, ...stubs });
		}

		render() {
			if (typeof this._renderResult === 'function') {
				return this._renderResult();
			}
			return this._renderResult;
		}

		public set renderResult(renderResult: RenderResult | Render) {
			this._renderResult = renderResult;
			this.invalidate();
		}

		public get nodeHandlerStub() {
			return this._nodeHandlerStub;
		}

		public get onAttachStub() {
			return this._onAttachStub;
		}

		public get onDetachStub() {
			return this._onDetachStub;
		}
	}();
}

class MainBar extends WidgetBase<any> {
	render() {
		return v('span', { innerHTML: 'Bar' });
	}
}

class MainFoo extends WidgetBase<any> {
	render() {
		const { show } = this.properties;
		return v('div', { classes: ['myClass'], foo: 'bar' }, [
			v('h1', { classes: ['myClass'], key: 'one' }, ['Hello Widget']),
			show ? w(MainBar, { classes: ['myClass'], key: 'first' }) : null,
			show ? w(MainBar, { key: 'second' }) : null,
			show ? null : v('div', { key: 'three' }, ['me']),
			`text node`,
			v('h1', { key: 'two', classes: ['myClass'], innerHTML: 'span' })
		]);
	}
}

class TestWidget extends WidgetBase<any> {
	render() {
		return v('span', { classes: ['myClass'] }, [w(MainFoo, { show: this.properties.show })]);
	}
}

describe('vdom', () => {
	const spys: SinonSpy[] = [];

	beforeEach(() => {
		consoleStub = stub(console, 'warn');
		resolvers.stub();
	});

	afterEach(() => {
		consoleStub.restore();
		resolvers.restore();
		for (let spy of spys) {
			spy.restore();
		}
		spys.length = 0;
	});

	describe('widgets', () => {
		it('should create elements for widgets', () => {
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ show: true });

			const projection = dom.create(widget);
			const span = (projection.domNode.childNodes[0] as Element) as HTMLSpanElement;
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

			const projection = dom.create(widget);
			const root = (projection.domNode.childNodes[0] as Element) as HTMLSpanElement;

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
			projection.update();

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
			projection.update();

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
				private _id = 0;

				private _onClick() {
					this._id++;
					this.invalidate();
				}

				render() {
					return v('div', { onclick: this._onClick }, [`${this._id}`]);
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [w(Foo, { key: '1' }), w(Foo, { key: '2' })]);
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [w(Bar, {})]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget);

			const root = (projection.domNode.childNodes[0] as Element) as HTMLElement;
			assert.lengthOf(root.childNodes, 1);
			const barDiv = root.childNodes[0];
			assert.lengthOf(barDiv.childNodes, 2);
			const fooOneDiv = barDiv.childNodes[0] as HTMLDivElement;
			const fooTwoDiv = barDiv.childNodes[1] as HTMLDivElement;
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			const fooOneTextNode = fooOneDiv.childNodes[0] as Text;
			const fooTwoTextNode = fooTwoDiv.childNodes[0] as Text;
			assert.strictEqual(fooOneTextNode.data, '0');
			assert.strictEqual(fooTwoTextNode.data, '0');
			projection.update();
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.strictEqual(fooOneDiv.childNodes[0], fooOneTextNode);
			assert.strictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			assert.strictEqual(fooOneTextNode.data, '0');
			assert.strictEqual(fooTwoTextNode.data, '0');
			sendEvent(fooOneDiv, 'click');
			projection.update();
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.notStrictEqual(fooOneDiv.childNodes[0], fooOneTextNode);
			assert.strictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			const updatedFooOneTextNode = fooOneDiv.childNodes[0] as Text;
			assert.strictEqual(updatedFooOneTextNode.data, '1');
			sendEvent(fooTwoDiv, 'click');
			projection.update();
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.strictEqual(fooOneDiv.childNodes[0], updatedFooOneTextNode);
			assert.notStrictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			const updatedFooTwoTextNode = fooTwoDiv.childNodes[0] as Text;
			assert.strictEqual(updatedFooTwoTextNode.data, '1');
			sendEvent(fooOneDiv, 'click');
			projection.update();
			assert.strictEqual((fooOneDiv.childNodes[0] as Text).data, '2');
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
			const projection: any = dom.create(widget);
			sendEvent(projection.domNode.childNodes[0], 'click', { eventInit: { bubbles: false } });
			sendEvent(projection.domNode.childNodes[0].childNodes[0], 'click', { eventInit: { bubbles: false } });
			sendEvent(projection.domNode.childNodes[0].childNodes[0].childNodes[0], 'click', {
				eventInit: { bubbles: false }
			});
			sendEvent(projection.domNode.childNodes[0].childNodes[0].childNodes[0].childNodes[0], 'click', {
				eventInit: { bubbles: false }
			});
			assert.strictEqual(widget.onClickCount, 4);
		});

		it('supports widget registry items', () => {
			const baseRegistry = new Registry();

			class Foo extends WidgetBase<any> {
				render() {
					return v('h1', [this.properties.text]);
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [this.properties.text]);
				}
			}

			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			class Baz extends WidgetBase {
				render() {
					return v('div', [w<Foo>('foo', { text: 'foo' }), w<Bar>('bar', { text: 'bar' })]);
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection: any = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
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
					return v('h1', [this.properties.text]);
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [this.properties.text]);
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [w<Foo>('foo', { text: 'foo' }), w<Bar>('bar', { text: 'bar' })]);
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 0);
			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			projection.update();
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
					const classes = this.myClass ? ['myClass'] : [];

					return [
						v('div', { classes }, ['1']),
						v('div', {}, ['2']),
						v('div', { classes: ['myClass'] }, ['3'])
					];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [w(Foo, {})]);
				}
			}

			const widget = new Bar();
			const projection: any = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
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
			const secondRenderResult = widget.__render__() as VNode;
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
					return v('div', [w(Foo, {}), w(Bar, {})]);
				}
			}

			const widget = new Baz();
			const projection: any = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
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
					const classes = this.myClass ? ['myClass'] : [];
					return v('div', { key: '1', classes }, ['content']);
				}
			}

			class Baz extends WidgetBase {
				private _show = false;

				set show(value: boolean) {
					this._show = value;
					this.invalidate();
				}

				render() {
					return v('div', [w(Foo, { show: this._show })]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 0);
			widget.show = true;
			projection.update();
			assert.lengthOf(root.childNodes, 1);
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(fooDiv.classList, 1);
			assert.lengthOf(fooDiv.childNodes, 1);
			const fooDivContent = fooDiv.childNodes[0] as Text;
			assert.strictEqual(fooDivContent.data, 'content');
			fooInvalidate();
			projection.update();
			assert.lengthOf(fooDiv.classList, 0);
			assert.lengthOf(fooDiv.childNodes, 1);
		});

		it('Should insert nodes at correct position the previous widget returned null', () => {
			class Foo extends WidgetBase {
				render() {
					return v('div', ['foo']);
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', ['bar']);
				}
			}

			class Baz extends WidgetBase<any> {
				render() {
					const { widget = 'default' } = this.properties;
					return v('div', [
						v('div', ['first']),
						w(widget, {}),
						w(widget, {}),
						v('div', ['second']),
						w(widget, {})
					]);
				}
			}

			const baseRegistry = new Registry();
			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection = dom.create(widget);
			const root: any = projection.domNode.childNodes[0];
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'other' });
			projection.update();
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'foo' });
			projection.update();
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'foo');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'foo');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'foo');
			widget.__setProperties__({ widget: 'bar' });
			projection.update();
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'bar');
			widget.__setProperties__({ widget: 'other' });
			projection.update();
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'bar' });
			projection.update();
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'bar');
		});

		it('should allow a widget returned from render', () => {
			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [`Hello, ${this.properties.foo}!`]);
				}
			}

			class Baz extends WidgetBase<any> {
				render() {
					return w(Bar, { foo: this.properties.foo });
				}
			}

			const widget = new Baz();
			widget.__setProperties__({ foo: 'foo' });
			const projection = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 1);
			let textNodeOne = root.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, 'Hello, foo!');
			widget.__setProperties__({ foo: 'bar' });
			projection.update();
			textNodeOne = root.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, 'Hello, bar!');
		});

		it('should create nodes for an array returned from the top level via a widget', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			const widget = new Bar();
			const projection = dom.create(widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('should update an array of nodes to single node', () => {
			class Foo extends WidgetBase {
				private _array = false;
				render() {
					this._array = !this._array;
					return this._array
						? [v('div', { key: '1' }, ['1']), v('div', { key: '2' }, ['2']), v('div', { key: '3' }, ['3'])]
						: v('div', { key: '1' }, ['2']);
				}
			}

			const widget = new Foo();
			const projection = dom.create(widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
			widget.invalidate();
			projection.update();
			assert.lengthOf(root.childNodes, 1);
			const textNodeChild = root.childNodes[0].childNodes[0] as Text;
			assert.strictEqual(textNodeChild.data, '2');
		});

		it('should append nodes for an array returned from the top level', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			const div = document.createElement('div');
			const widget = new Foo();
			const projection = dom.append(div, widget);
			const root = projection.domNode as Element;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('should append nodes for an array returned from the top level via a widget', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			const div = document.createElement('div');
			const widget = new Bar();
			const projection = dom.append(div, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('Do not break early for the same WNode', () => {
			class Foo extends WidgetBase<any> {
				render() {
					const children = this.children.map((child: any, index: number) => {
						child.properties.selected = this.properties.selected === index;
						return child;
					});

					return v('div', children);
				}
			}

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.selected ? 'selected' : 'not selected']);
				}
			}

			const widget = new Foo();
			widget.__setChildren__([w(Bar, { key: '1' }), w(Bar, { key: '2' })]);
			widget.__setProperties__({ selected: 0 });
			const projection = dom.create(widget);
			const root = projection.domNode.childNodes[0];
			assert.lengthOf(root.childNodes, 2);
			let firstTextNode = root.childNodes[0].childNodes[0] as Text;
			let secondTextNode = root.childNodes[1].childNodes[0] as Text;
			assert.strictEqual(firstTextNode.data, 'selected');
			assert.strictEqual(secondTextNode.data, 'not selected');
			widget.__setProperties__({ selected: 1 });
			projection.update();
			firstTextNode = root.childNodes[0].childNodes[0] as Text;
			secondTextNode = root.childNodes[1].childNodes[0] as Text;
			assert.strictEqual(firstTextNode.data, 'not selected');
			assert.strictEqual(secondTextNode.data, 'selected');
		});

		// it('should throw an error when attempting to merge an array of node', () => {
		// 	class Foo extends WidgetBase {
		// 		render() {
		// 			return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
		// 		}
		// 	}

		// 	const div = document.createElement('div');
		// 	const widget = new Foo();
		// 	assert.throws(
		// 		() => {
		// 			dom.merge(div, widget);
		// 		},
		// 		Error,
		// 		'Unable to merge an array of nodes. (consider adding one extra level to the virtual DOM)'
		// 	);
		// });

		// it('should throw an error when attempting to replace with an array of node', () => {
		// 	class Foo extends WidgetBase {
		// 		render() {
		// 			return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
		// 		}
		// 	}

		// 	const div = document.createElement('div');
		// 	const widget = new Foo();
		// 	assert.throws(
		// 		() => {
		// 			dom.replace(div, widget.__render__() as VNode, widget);
		// 		},
		// 		Error,
		// 		'Unable to replace a node with an array of nodes. (consider adding one extra level to the virtual DOM)'
		// 	);
		// });

		it('removes existing widget and uses new widget when widget changes', () => {
			let fooCreated = false;
			let barCreatedCount = 0;
			class Foo extends WidgetBase {
				constructor() {
					super();
					fooCreated = true;
				}

				render() {
					return v('div');
				}
			}

			class Bar extends WidgetBase {
				constructor() {
					super();
					barCreatedCount++;
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
						this._foo ? w(Foo, {}) : w(Bar, {}),
						this._foo ? w(Bar, { key: '1' }) : w(Bar, { key: '2' })
					]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget);
			resolvers.resolve();
			assert.isTrue(fooCreated);
			widget.foo = false;
			projection.update();
			resolvers.resolve();
			assert.strictEqual(barCreatedCount, 3);
		});

		it('calls onAttach when widget is rendered', () => {
			let onAttachCallCount = 0;
			class Foo extends WidgetBase {
				onAttach() {
					onAttachCallCount++;
				}
			}
			const widget = new Foo();
			const projection = dom.create(widget);
			resolvers.resolve();
			assert.strictEqual(onAttachCallCount, 1);
			widget.invalidate();
			projection.update();
			resolvers.resolve();
			assert.strictEqual(onAttachCallCount, 1);
		});

		it('calls onDetach when widget is removed', () => {
			let fooAttachCount = 0;
			let fooDetachCount = 0;
			let barAttachCount = 0;
			let barDetachCount = 0;
			let bazAttachCount = 0;
			let bazDetachCount = 0;
			let quxAttachCount = 0;
			let quxDetachCount = 0;

			class Qux extends WidgetBase {
				onAttach() {
					quxAttachCount++;
				}

				onDetach() {
					quxDetachCount++;
				}
			}

			class Foo extends WidgetBase {
				onAttach() {
					fooAttachCount++;
				}

				onDetach() {
					fooDetachCount++;
				}

				render() {
					return [w(Qux, {}), v('div', [w(Qux, {})])];
				}
			}

			class Bar extends WidgetBase {
				onAttach() {
					barAttachCount++;
				}

				onDetach() {
					barDetachCount++;
				}
			}

			class FooBar extends WidgetBase {}

			class Baz extends WidgetBase {
				private _foo = false;

				onAttach() {
					bazAttachCount++;
				}

				onDetach() {
					bazDetachCount++;
				}

				render() {
					this._foo = !this._foo;
					return v('div', [
						w(FooBar, {}),
						this._foo ? w(Foo, {}) : null,
						w(FooBar, {}),
						this._foo ? w(Foo, {}) : w(Bar, {})
					]);
				}
			}
			const widget = new Baz();
			const projection = dom.create(widget);
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 2);
			assert.strictEqual(fooDetachCount, 0);
			assert.strictEqual(barAttachCount, 0);
			assert.strictEqual(barDetachCount, 0);
			assert.strictEqual(quxAttachCount, 4);
			assert.strictEqual(quxDetachCount, 0);
			widget.invalidate();
			projection.update();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 2);
			assert.strictEqual(fooDetachCount, 2);
			assert.strictEqual(barAttachCount, 1);
			assert.strictEqual(barDetachCount, 0);
			assert.strictEqual(quxAttachCount, 4);
			assert.strictEqual(quxDetachCount, 4);
			widget.invalidate();
			projection.update();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 4);
			assert.strictEqual(fooDetachCount, 2);
			assert.strictEqual(barAttachCount, 1);
			assert.strictEqual(barDetachCount, 1);
			assert.strictEqual(quxAttachCount, 8);
			assert.strictEqual(quxDetachCount, 4);
			widget.invalidate();
			projection.update();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 4);
			assert.strictEqual(fooDetachCount, 4);
			assert.strictEqual(barAttachCount, 2);
			assert.strictEqual(barDetachCount, 1);
			assert.strictEqual(quxAttachCount, 8);
			assert.strictEqual(quxDetachCount, 8);
		});

		it('should not throw error running `onDetach` for widgets that do not have any rendered children', () => {
			class Foo extends WidgetBase {
				render() {
					return null;
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			class Baz extends WidgetBase {
				private _show = false;

				render() {
					this._show = !this._show;
					return this._show ? w(Bar, {}) : null;
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget);
			resolvers.resolve();
			widget.invalidate();
			projection.update();
			assert.doesNotThrow(() => {
				resolvers.resolve();
			});
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
					return v('div', [this._show ? w(Bar, {}) : null]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget);
			const root = projection.domNode.childNodes[0] as Element;
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.strictEqual(fooDiv.getAttribute('id'), 'foo');
			widget.show = false;
			projection.update();
			assert.isNull(fooDiv.parentNode);
		});

		it('should warn in the console for siblings for the same widgets with no key when added or removed', () => {
			class Foo extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.text]);
				}
			}

			class Baz extends WidgetBase {
				show = false;

				render() {
					return v('div', [
						w(Foo, { text: '1' }),
						this.show ? w(Foo, { text: '2' }) : null,
						w(Foo, { text: '3' }),
						v('div', [w(Foo, { text: '4' })])
					]);
				}
			}

			const widgetName = (Foo as any).name || 'unknown';
			const parentName = (Baz as any).name || 'unknown';

			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			const widget = new Baz();
			const projection = dom.create(widget);
			assert.isTrue(consoleStub.notCalled);
			widget.invalidate();
			widget.show = true;
			projection.update();
			resolvers.resolve();
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		// describe('supports merging with a widget returned a the top level', () => {
		// 	it('Supports merging DNodes onto existing HTML', () => {
		// 		const iframe = document.createElement('iframe');
		// 		document.body.appendChild(iframe);
		// 		iframe.contentDocument.write(
		// 			`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button></div>`
		// 		);
		// 		iframe.contentDocument.close();
		// 		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		// 		const childElementCount = root.childElementCount;
		// 		const select = root.childNodes[1] as HTMLSelectElement;
		// 		const button = root.childNodes[2] as HTMLButtonElement;
		// 		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		// 		const onclickListener = spy();
		// 		class Foo extends WidgetBase {
		// 			render() {
		// 				return v(
		// 					'div',
		// 					{
		// 						classes: ['foo', 'bar']
		// 					},
		// 					[
		// 						v(
		// 							'label',
		// 							{
		// 								for: 'baz'
		// 							},
		// 							['Select Me:']
		// 						),
		// 						v(
		// 							'select',
		// 							{
		// 								type: 'text',
		// 								name: 'baz',
		// 								id: 'baz',
		// 								disabled: false
		// 							},
		// 							[
		// 								v('option', { value: 'foo', selected: true }, ['label foo']),
		// 								v('option', { value: 'bar', selected: false }, ['label bar']),
		// 								v('option', { value: 'baz', selected: false }, ['label baz'])
		// 							]
		// 						),
		// 						v(
		// 							'button',
		// 							{
		// 								type: 'button',
		// 								disabled: false,
		// 								onclick: onclickListener
		// 							},
		// 							['Click Me!']
		// 						)
		// 					]
		// 				);
		// 			}
		// 		}

		// 		class Bar extends WidgetBase {
		// 			render() {
		// 				return w(Foo, {});
		// 			}
		// 		}
		// 		const widget = new Bar();
		// 		dom.merge(root, widget.__render__() as VNode, widget);
		// 		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		// 		assert.strictEqual(
		// 			root.childElementCount,
		// 			childElementCount,
		// 			'should have the same number of children'
		// 		);
		// 		assert.strictEqual(select, root.childNodes[1], 'should have been reused');
		// 		assert.strictEqual(button, root.childNodes[2], 'should have been reused');
		// 		assert.isFalse(select.disabled, 'select should be enabled');
		// 		assert.isFalse(button.disabled, 'button should be enabled');

		// 		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		// 		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		// 		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		// 		const clickEvent = document.createEvent('CustomEvent');
		// 		clickEvent.initEvent('click', true, true);
		// 		button.dispatchEvent(clickEvent);
		// 		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		// 		document.body.removeChild(iframe);
		// 	});

		// 	it('Supports merging DNodes with widgets onto existing HTML', () => {
		// 		const iframe = document.createElement('iframe');
		// 		document.body.appendChild(iframe);
		// 		iframe.contentDocument.write(
		// 			`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button><span>label</span><div>last node</div></div>`
		// 		);
		// 		iframe.contentDocument.close();
		// 		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		// 		const childElementCount = root.childElementCount;
		// 		const label = root.childNodes[0] as HTMLLabelElement;
		// 		const select = root.childNodes[1] as HTMLSelectElement;
		// 		const button = root.childNodes[2] as HTMLButtonElement;
		// 		const span = root.childNodes[3] as HTMLElement;
		// 		const div = root.childNodes[4] as HTMLElement;
		// 		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		// 		const onclickListener = spy();

		// 		class Button extends WidgetBase {
		// 			render() {
		// 				return [
		// 					v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
		// 					v('span', {}, ['label'])
		// 				];
		// 			}
		// 		}
		// 		class Foo extends WidgetBase {
		// 			render() {
		// 				return v(
		// 					'div',
		// 					{
		// 						classes: ['foo', 'bar']
		// 					},
		// 					[
		// 						v(
		// 							'label',
		// 							{
		// 								for: 'baz'
		// 							},
		// 							['Select Me:']
		// 						),
		// 						v(
		// 							'select',
		// 							{
		// 								type: 'text',
		// 								name: 'baz',
		// 								id: 'baz',
		// 								disabled: false
		// 							},
		// 							[
		// 								v('option', { value: 'foo', selected: true }, ['label foo']),
		// 								v('option', { value: 'bar', selected: false }, ['label bar']),
		// 								v('option', { value: 'baz', selected: false }, ['label baz'])
		// 							]
		// 						),
		// 						w(Button, {}),
		// 						v('div', ['last node'])
		// 					]
		// 				);
		// 			}
		// 		}
		// 		class Bar extends WidgetBase {
		// 			render() {
		// 				return w(Foo, {});
		// 			}
		// 		}
		// 		const widget = new Bar();
		// 		dom.merge(root, widget.__render__() as VNode, widget);
		// 		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		// 		assert.strictEqual(
		// 			root.childElementCount,
		// 			childElementCount,
		// 			'should have the same number of children'
		// 		);
		// 		assert.strictEqual(label, root.childNodes[0], 'should have been reused');
		// 		assert.strictEqual(select, root.childNodes[1], 'should have been reused');
		// 		assert.strictEqual(button, root.childNodes[2], 'should have been reused');
		// 		assert.strictEqual(span, root.childNodes[3], 'should have been reused');
		// 		assert.strictEqual(div, root.childNodes[4], 'should have been reused');
		// 		assert.isFalse(select.disabled, 'select should be enabled');
		// 		assert.isFalse(button.disabled, 'button should be enabled');

		// 		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		// 		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		// 		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		// 		const clickEvent = document.createEvent('CustomEvent');
		// 		clickEvent.initEvent('click', true, true);
		// 		button.dispatchEvent(clickEvent);
		// 		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		// 		document.body.removeChild(iframe);
		// 	});

		// 	it('Skips unknown nodes when merging', () => {
		// 		const iframe = document.createElement('iframe');
		// 		document.body.appendChild(iframe);
		// 		iframe.contentDocument.write(`
		// 			<div class="foo">
		// 				<label for="baz">Select Me:</label>
		// 				<select type="text" name="baz" id="baz" disabled="disabled">
		// 					<option value="foo">label foo</option>
		// 					<option value="bar" selected="">label bar</option>
		// 					<option value="baz">label baz</option>
		// 				</select>
		// 				<button type="button" disabled="disabled">Click Me!</button>
		// 				<span>label</span>
		// 				<div>last node</div>
		// 			</div>`);
		// 		iframe.contentDocument.close();
		// 		const root = iframe.contentDocument.body.firstChild as HTMLElement;
		// 		const childElementCount = root.childElementCount;
		// 		const label = root.childNodes[1] as HTMLLabelElement;
		// 		const select = root.childNodes[3] as HTMLSelectElement;
		// 		const button = root.childNodes[5] as HTMLButtonElement;
		// 		const span = root.childNodes[7] as HTMLElement;
		// 		const div = root.childNodes[9] as HTMLElement;
		// 		assert.strictEqual(select.value, 'bar', 'bar should be selected');
		// 		const onclickListener = spy();

		// 		class Button extends WidgetBase {
		// 			render() {
		// 				return [
		// 					v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
		// 					v('span', {}, ['label'])
		// 				];
		// 			}
		// 		}
		// 		class Foo extends WidgetBase {
		// 			render() {
		// 				return v(
		// 					'div',
		// 					{
		// 						classes: ['foo', 'bar']
		// 					},
		// 					[
		// 						v(
		// 							'label',
		// 							{
		// 								for: 'baz'
		// 							},
		// 							['Select Me:']
		// 						),
		// 						v(
		// 							'select',
		// 							{
		// 								type: 'text',
		// 								name: 'baz',
		// 								id: 'baz',
		// 								disabled: false
		// 							},
		// 							[
		// 								v('option', { value: 'foo', selected: true }, ['label foo']),
		// 								v('option', { value: 'bar', selected: false }, ['label bar']),
		// 								v('option', { value: 'baz', selected: false }, ['label baz'])
		// 							]
		// 						),
		// 						w(Button, {}),
		// 						v('div', ['last node'])
		// 					]
		// 				);
		// 			}
		// 		}
		// 		class Bar extends WidgetBase {
		// 			render() {
		// 				return w(Foo, {});
		// 			}
		// 		}
		// 		const widget = new Bar();
		// 		dom.merge(root, widget.__render__() as VNode, widget);
		// 		assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
		// 		assert.strictEqual(
		// 			root.childElementCount,
		// 			childElementCount,
		// 			'should have the same number of children'
		// 		);
		// 		assert.strictEqual(label, root.childNodes[1], 'should have been reused');
		// 		assert.strictEqual(select, root.childNodes[3], 'should have been reused');
		// 		assert.strictEqual(button, root.childNodes[5], 'should have been reused');
		// 		assert.strictEqual(span, root.childNodes[7], 'should have been reused');
		// 		assert.strictEqual(div, root.childNodes[9], 'should have been reused');
		// 		assert.isFalse(select.disabled, 'select should be enabled');
		// 		assert.isFalse(button.disabled, 'button should be enabled');

		// 		assert.strictEqual(select.value, 'foo', 'foo should be selected');
		// 		assert.strictEqual(select.children.length, 3, 'should have 3 children');

		// 		assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

		// 		const clickEvent = document.createEvent('CustomEvent');
		// 		clickEvent.initEvent('click', true, true);
		// 		button.dispatchEvent(clickEvent);
		// 		assert.isTrue(onclickListener.called, 'onclickListener should have been called');

		// 		document.body.removeChild(iframe);
		// 	});
		// });
	});

	describe('create', () => {
		it('should create and update single text nodes', () => {
			const widget = getWidget(v('div', ['text']));
			const projection = dom.create(widget);
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');

			widget.renderResult = v('div', ['text2']);
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');

			widget.renderResult = v('div', ['text2', v('span', ['a'])]);
			projection.update();
			assert.strictEqual(
				(projection.domNode.childNodes[0] as Element).outerHTML,
				'<div>text2<span>a</span></div>'
			);

			widget.renderResult = v('div', ['text2']);
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');

			widget.renderResult = v('div', ['text']);
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
		});

		it('should work correctly with adjacent text nodes', () => {
			const widget = getWidget(v('div', ['', '1', '']));
			const projection = dom.create(widget);
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>1</div>');

			widget.renderResult = v('div', [' ', '']);
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div> </div>');

			widget.renderResult = v('div', ['', '1', '']);
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>1</div>');
		});

		it('should break update when vdom object references are equal', () => {
			const vNode = v('div', ['text']);
			const widget = getWidget(vNode);
			const projection = dom.create(widget);
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
			vNode.text = 'new';
			widget.renderResult = vNode;
			projection.update();
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
		});

		it('should allow changing the root selector', () => {
			const widget = getWidget(v('div'));
			const projection = dom.create(widget);
			assert.strictEqual(projection.domNode.children[0].tagName, 'DIV');
			widget.renderResult = v('span');
			projection.update();
			assert.strictEqual(projection.domNode.children[0].tagName, 'SPAN');
		});

		it('should allow an existing dom node to be used', () => {
			const node = document.createElement('div');
			(node as any).foo = 'foo';
			const childNode = document.createElement('span');
			(childNode as any).bar = 'bar';
			node.appendChild(childNode);
			const appendChildSpy = spy(node, 'appendChild');

			const childVNode = v('span', { id: 'b' }) as InternalVNode;
			childVNode.domNode = childNode;
			const vNode = v('div', { id: 'a' }, [childVNode]) as InternalVNode;
			vNode.domNode = node;

			const widget = getWidget(vNode);
			const projection = dom.create(widget);
			const root = (projection.domNode.childNodes[0] as Element) as any;
			assert.strictEqual(root.outerHTML, '<div id="a"><span id="b"></span></div>');
			assert.strictEqual(root.foo, 'foo');
			assert.strictEqual(root.children[0].bar, 'bar');
			assert.isFalse(appendChildSpy.called);
		});

		it('will append nodes with attributes already attached', (test) => {
			const expected = '<div data-attr="test"></div>';
			const appendedHtml: string[] = [];

			const createElement = document.createElement.bind(document);
			const createElementStub = stub(document, 'createElement').callsFake((name: string) => {
				const node = createElement(name);
				const appendChild = node.appendChild.bind(node);
				stub(node, 'appendChild').callsFake((node: Element) => {
					appendedHtml.push(node.outerHTML);
					return appendChild(node);
				});
				return node;
			});
			spys.push(createElementStub);
			const widget = getWidget(v('div', { 'data-attr': 'test' }));
			const projection = dom.create(widget);

			assert.strictEqual(projection.domNode.innerHTML, expected);
			assert.lengthOf(appendedHtml, 1);
			assert.strictEqual(appendedHtml[0], expected);
		});
	});

	describe('properties', () => {
		it('updates attributes', () => {
			const widget = getWidget(v('a', { href: '#1' }));
			const projection = dom.create(widget);
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.strictEqual(link.getAttribute('href'), '#1');

			widget.renderResult = v('a', { href: '#2' });
			projection.update();
			assert.strictEqual(link.getAttribute('href'), '#2');

			widget.renderResult = v('a', { href: undefined });
			projection.update();
			assert.strictEqual(link.getAttribute('href'), '');
		});

		it('can add an attribute that was initially undefined', () => {
			const widget = getWidget(v('a', { href: undefined }));
			const projection = dom.create(widget);
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.isNull(link.getAttribute('href'));

			widget.renderResult = v('a', { href: '#2' });
			projection.update();
			assert.strictEqual(link.getAttribute('href'), '#2');
		});

		it('can remove disabled property when set to null or undefined', () => {
			const widget = getWidget(v('a', { disabled: true }));
			const projection = dom.create(widget);
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;

			assert.isTrue(link.disabled);
			// Unfortunately JSDom does not map the property value to the attribute as real browsers do
			// expect(link.getAttribute('disabled')).to.equal('');

			widget.renderResult = v('a', { disabled: null as any });
			projection.update();

			// What Chrome would do:
			// expect(link.disabled).to.equal(false);
			// expect(link.getAttribute('disabled')).to.be.null;

			// What JSDom does:
			assert.isFalse(!!link.disabled);
		});

		it('updates properties', () => {
			const widget = getWidget(v('a', { href: '#1', tabIndex: 1 }));
			const projection = dom.create(widget);
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.strictEqual(link.tabIndex, 1);

			widget.renderResult = v('a', { href: '#1', tabIndex: 2 });
			projection.update();
			assert.strictEqual(link.tabIndex, 2);

			widget.renderResult = v('a', { href: '#1', tabIndex: undefined });
			projection.update();
			assert.strictEqual(link.tabIndex, 0);
		});

		it('updates innerHTML', () => {
			const widget = getWidget(v('p', { innerHTML: '<span>INNER</span>' }));
			const projection = dom.create(widget);
			const paragraph = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'INNER');

			widget.renderResult = v('p', { innerHTML: '<span>UPDATED</span>' });
			projection.update();
			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'UPDATED');
		});

		it('does not mess up scrolling in Edge', () => {
			const widget = getWidget(v('div', { scrollTop: 0 }));
			const projection = dom.create(widget);
			const div = (projection.domNode.childNodes[0] as Element) as HTMLDivElement;
			Object.defineProperty(div, 'scrollTop', {
				get: () => 1,
				set: stub().throws('Setting scrollTop would mess up scrolling')
			}); // meaning: div.scrollTop = 1;
			widget.renderResult = v('div', { scrollTop: 1 });
			projection.update();
		});

		describe('classes', () => {
			it('adds and removes classes', () => {
				const widget = getWidget(v('div', { classes: ['a'] }));
				const projection = dom.create(widget);
				const div = (projection.domNode.childNodes[0] as Element) as HTMLDivElement;
				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div', { classes: ['a', 'b'] });
				projection.update();
				assert.strictEqual(div.className, 'a b');

				widget.renderResult = v('div', { classes: ['b'] });
				projection.update();
				assert.strictEqual(div.className, 'b');
			});

			it('should leave classes that are not controlled', () => {
				const div = document.createElement('div');
				div.className = 'c b';
				const widget = getWidget(v('div', { classes: ['a'] }));
				const projection = dom.merge(div, widget);
				assert.strictEqual(div.className, 'c b a');
				widget.renderResult = v('div', { classes: ['a', 'b'] });
				projection.update();
				assert.strictEqual(div.className, 'c b a');

				widget.renderResult = v('div', { classes: ['b'] });
				projection.update();
				assert.strictEqual(div.className, 'c b');

				widget.renderResult = v('div');
				projection.update();
				assert.strictEqual(div.className, 'c');
			});

			it('supports null, undefined and zero length strings in classes', () => {
				const div = document.createElement('div');
				div.className = 'b';
				const widget = getWidget(v('div', { classes: ['b', null, null, null] }));
				const projection = dom.merge(div, widget);
				assert.strictEqual(div.className, 'b');
				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });
				projection.update();
				assert.strictEqual(div.className, 'a');

				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });
				projection.update();
				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div', { classes: [] });
				projection.update();
				assert.strictEqual(div.className, '');
				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });
				projection.update();
				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div');
				projection.update();
				assert.strictEqual(div.className, '');
			});

			it('classes accepts a string', () => {
				const widget = getWidget(v('div', { classes: 'b' }));
				const div = document.createElement('div');
				const projection = dom.merge(div, widget);
				assert.strictEqual(div.className, 'b');
				widget.renderResult = v('div', { classes: 'b' });
				projection.update();
				assert.strictEqual(div.className, 'b');

				widget.renderResult = v('div', { classes: 'a' });
				projection.update();
				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div');
				projection.update();
				assert.strictEqual(div.className, '');
				widget.renderResult = v('div', { classes: null });
				projection.update();
				assert.strictEqual(div.className, '');
				widget.renderResult = v('div');
				projection.update();
				widget.renderResult = v('div', { classes: 'a b' });
				projection.update();
				assert.strictEqual(div.className, 'a b');
			});

			it('should split class names by space before applying/removing', () => {
				const widget = getWidget(v('div', { classes: 'a b' }));
				const div = document.createElement('div');
				const projection = dom.merge(div, widget);
				assert.strictEqual(div.className, 'a b');
				widget.renderResult = v('div');
				projection.update();
				assert.strictEqual(div.className, '');

				widget.renderResult = v('div', { classes: ['a b'] });
				projection.update();
				assert.strictEqual(div.className, 'a b');
				widget.renderResult = v('div');
				projection.update();
				assert.strictEqual(div.className, '');
			});

			it('should accept null as a class', () => {
				const widget = getWidget(v('div', { classes: null }));
				const div = document.createElement('div');
				dom.merge(div, widget);
				assert.strictEqual(div.className, '');
			});

			it('can add and remove multiple classes in IE11', () => {
				const widget = getWidget(v('div', { classes: 'a b c d' }));
				const projection = dom.create(widget);
				const root = projection.domNode.childNodes[0] as HTMLElement;
				assert.strictEqual(root.className, 'a b c d');
				widget.renderResult = v('div', { classes: 'a b' });
				projection.update();
			});
		});

		describe('styles', () => {
			it('should not allow non-string values', () => {
				const widget = getWidget(v('div', { styles: { height: 20 as any } }));
				try {
					dom.create(widget);
					assert.fail();
				} catch (e) {
					assert.isTrue(e.message.indexOf('strings') >= 0);
				}
			});

			it('should add styles to the real DOM', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const projection = dom.create(widget);
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 20px;"></div>'
				);
			});

			it('should update styles', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const projection = dom.create(widget);
				widget.renderResult = v('div', { styles: { height: '30px' } });
				projection.update();
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 30px;"></div>'
				);
			});

			it('should remove styles', () => {
				const widget = getWidget(v('div', { styles: { width: '30px', height: '20px' } }));
				const projection = dom.create(widget);
				widget.renderResult = v('div', { styles: { height: null, width: '30px' } });
				projection.update();
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="width: 30px;"></div>'
				);
			});

			it('should add styles', () => {
				const widget = getWidget(v('div', { styles: { height: undefined } }));
				const projection = dom.create(widget);
				widget.renderResult = v('div', { styles: { height: '20px' } });
				projection.update();
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 20px;"></div>'
				);
				widget.renderResult = v('div', { styles: { height: '20px' } });
				projection.update();
			});

			it('should use the provided styleApplyer', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const styleApplyer = (domNode: any, styleName: string, value: string) => {
					// Useless styleApplyer which transforms height to minHeight
					domNode.style['min' + styleName.substr(0, 1).toUpperCase() + styleName.substr(1)] = value;
				};
				const projection = dom.create(widget, {
					styleApplyer: styleApplyer
				});
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="min-height: 20px;"></div>'
				);
				widget.renderResult = v('div', { styles: { height: '30px' } });
				projection.update();
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="min-height: 30px;"></div>'
				);
			});
		});

		it('updates the value property', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);
			typedKeys = 'value1';
			widget.renderResult = renderFunction();
			projection.update();
			assert.strictEqual(inputElement.value, typedKeys);
		});

		it('does not clear a value that was set by a testing tool (like Ranorex) which manipulates input.value directly', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			inputElement.value = 'value written by a testing tool without invoking the input event';

			widget.renderResult = renderFunction();
			projection.update();
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
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);

			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, model);

			inputElement.value = '4';
			sendEvent(inputElement, 'input');
			widget.renderResult = renderFunction();
			projection.update();

			inputElement.value = '4,';
			sendEvent(inputElement, 'input');
			widget.renderResult = renderFunction();
			projection.update();

			assert.strictEqual(inputElement.value, '4.');

			model = '';
			widget.renderResult = renderFunction();
			projection.update();

			assert.strictEqual(inputElement.value, '');
		});

		it('removes the attribute when a role property is set to undefined', () => {
			let role: string | undefined = 'button';
			const renderFunction = () => v('div', { role: role });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element = projection.domNode.childNodes[0] as Element;

			assert.property(element.attributes, 'role');
			assert.strictEqual(element.getAttribute('role'), role);

			role = undefined;
			widget.renderResult = renderFunction();
			projection.update();
			assert.notProperty(element.attributes, 'role');
		});
	});

	describe('deferred properties', () => {
		it('can call a callback on render and on the next rAF for vnode properties', () => {
			let deferredCallbackCount = 0;
			let renderCount = 0;

			const renderFunction = () => {
				renderCount++;
				const div = v('div', (inserted) => {
					return {
						inserted,
						deferredCallbackCount: ++deferredCallbackCount,
						key: 'prop'
					};
				});
				(div.properties as any).renderCount = renderCount;
				return div;
			};

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element: any = projection.domNode.childNodes[0];

			assert.strictEqual(element.deferredCallbackCount, 1);
			assert.strictEqual(element.renderCount, 1);
			assert.isFalse(element.inserted);

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.deferredCallbackCount, 2);
			assert.strictEqual(element.renderCount, 1);
			assert.isTrue(element.inserted);

			widget.renderResult = renderFunction();
			projection.update();

			assert.strictEqual(projection.domNode.childNodes[0], element);
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
				(div.properties as any).foo = foo;
				return div;
			};

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element: any = projection.domNode.childNodes[0];

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			foo = 'qux';

			widget.renderResult = renderFunction();
			projection.update();

			assert.strictEqual(element.getAttribute('foo'), 'qux');
			assert.strictEqual(element.getAttribute('another'), 'property');

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'qux');
			assert.strictEqual(element.getAttribute('another'), 'property');
		});
	});

	describe('events', () => {
		it('should add an event listener', () => {
			const onclick = stub();
			const renderFunction = () => {
				return v('div', { onclick });
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.isTrue(onclick.called);
		});

		it('should be able to change event listener', () => {
			const onclickFirst = stub();
			const onclickSecond = stub();
			const renderFunction = (updated?: boolean) => {
				return v('div', { onclick: updated ? onclickSecond : onclickFirst });
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.strictEqual(onclickFirst.callCount, 1);

			widget.renderResult = renderFunction(true);
			projection.update();

			sendEvent(element, 'click');
			assert.strictEqual(onclickFirst.callCount, 1);
			assert.strictEqual(onclickSecond.callCount, 1);
		});

		it('should be able to drop an event listener across renders', () => {
			const onclick = stub();
			const renderFunction = (updated?: boolean) => {
				const props = updated ? {} : { onclick };
				return v('div', props);
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 1);

			widget.renderResult = renderFunction(true);
			projection.update();

			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 1);

			widget.renderResult = renderFunction();
			projection.update();
			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 2);
		});

		it('allows one to correct the value while being typed', () => {
			let typedKeys = '';
			const handleInput = (evt: any) => {
				typedKeys = evt.target.value.substr(0, 2);
			};
			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			inputElement.value = 'ab';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();
			projection.update();
			assert.strictEqual(inputElement.value, 'ab');

			inputElement.value = 'abc';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();
			projection.update();
			assert.strictEqual(inputElement.value, 'ab');
		});

		it('does not undo keystrokes, even if a browser runs an animationFrame between changing the value property and running oninput', () => {
			// Crazy internet explorer behavior
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			// Normal behavior
			inputElement.value = 'a';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'a');
			widget.renderResult = renderFunction();
			projection.update();

			// Crazy behavior
			inputElement.value = 'ab';
			widget.renderResult = renderFunction();
			projection.update();
			assert.strictEqual(typedKeys, 'a');
			assert.strictEqual(inputElement.value, 'ab');
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();
			projection.update();
		});
	});

	describe('children', () => {
		it('can remove child nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 1 }), v('span', { key: 2 }), v('span', { key: 3 })]));
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 1 }), v('span', { key: 3 })]);
			projection.update();

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], lastSpan);

			widget.renderResult = v('div', [v('span', { key: 3 })]);
			projection.update();

			assert.lengthOf(div.childNodes, 1);
			assert.strictEqual(div.childNodes[0], lastSpan);

			widget.renderResult = v('div');
			projection.update();
			assert.lengthOf(div.childNodes, 0);
		});

		it('can add child nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 2 }), v('span', { key: 4 })]));
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [
				v('span', { key: 1 }),
				v('span', { key: 2 }),
				v('span', { key: 3 }),
				v('span', { key: 4 }),
				v('span', { key: 5 })
			]);
			projection.update();

			assert.lengthOf(div.childNodes, 5);
			assert.strictEqual(div.childNodes[1], firstSpan);
			assert.strictEqual(div.childNodes[3], lastSpan);
		});

		it('can distinguish between string keys when adding', () => {
			const widget = getWidget(v('div', [v('span', { key: 'one' }), v('span', { key: 'three' })]));
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];

			widget.renderResult = v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'two' }),
				v('span', { key: 'three' })
			]);
			projection.update();

			assert.lengthOf(div.childNodes, 3);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], secondSpan);
		});

		it('can distinguish between falsy keys when replacing', () => {
			const widget = getWidget(
				v('div', [
					v('span', { key: false as any }),
					v('span', { key: null as any }),
					v('span', { key: '' }),
					v('span', {})
				])
			);
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 4);

			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];
			const thirdSpan = div.childNodes[2];
			const fourthSpan = div.childNodes[3];

			widget.renderResult = v('div', [v('span', { key: 0 })]);
			projection.update();

			assert.lengthOf(div.childNodes, 1);
			const newSpan = div.childNodes[0];

			assert.notStrictEqual(newSpan, firstSpan);
			assert.notStrictEqual(newSpan, secondSpan);
			assert.notStrictEqual(newSpan, thirdSpan);
			assert.notStrictEqual(newSpan, fourthSpan);
		});

		it('can distinguish between string keys when deleting', () => {
			const widget = getWidget(
				v('div', [v('span', { key: 'one' }), v('span', { key: 'two' }), v('span', { key: 'three' })])
			);
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 'one' }), v('span', { key: 'three' })]);
			projection.update();

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('can distinguish between falsy keys when deleting', () => {
			const widget = getWidget(
				v('div', [v('span', { key: 0 }), v('span', { key: false as any }), v('span', { key: null as any })])
			);
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 0 }), v('span', { key: null as any })]);
			projection.update();

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('does not reorder nodes based on keys', () => {
			const widget = getWidget(v('div', [v('span', { key: 'a' }), v('span', { key: 'b' })]));
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [v('span', { key: 'b' }), v('span', { key: 'a' })]);
			projection.update();

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], lastSpan);
			assert.notStrictEqual(div.childNodes[1], firstSpan);
		});

		it('can insert text nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 2 }), v('span', { key: 4 })]));
			const projection = dom.create(widget);

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [v('span', { key: 2 }), 'Text between', v('span', { key: 4 })]);
			projection.update();

			assert.lengthOf(div.childNodes, 3);

			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], lastSpan);
		});

		it('can update single text nodes', () => {
			const widget = getWidget(v('span', ['']));
			const projection = dom.create(widget);
			const span = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [undefined]);
			projection.update();
			assert.lengthOf(span.childNodes, 0);

			widget.renderResult = v('span', ['f']);
			projection.update();
			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [undefined]);
			projection.update();
			assert.lengthOf(span.childNodes, 0);

			widget.renderResult = v('span', ['']);
			projection.update();
			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [' ']);
			projection.update();
			assert.lengthOf(span.childNodes, 1);
		});

		it('will throw an error when vdom is not sure which node is added', () => {
			const widgetName = 'span';
			const widget = getWidget(v('div', [v('span', ['a']), v('span', ['c'])]));
			const parentName = (widget.constructor as any).name || 'unknown';
			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			const projection = dom.create(widget);

			assert.isTrue(consoleStub.notCalled);

			widget.renderResult = v('div', [v('span', ['a']), v('span', ['b']), v('span', ['c'])]);
			projection.update();

			resolvers.resolve();

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		it('will throw an error when vdom is not sure which node is removed', () => {
			const widgetName = 'span';
			const widget = getWidget(v('div', [v('span', ['a']), v('span', ['b']), v('span', ['c'])]));
			const parentName = (widget.constructor as any).name || 'unknown';
			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			const projection = dom.create(widget);

			assert.isTrue(consoleStub.notCalled);

			widget.renderResult = v('div', [v('span', ['a']), v('span', ['c'])]);
			projection.update();

			resolvers.resolve();

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		it('allows a contentEditable tag to be altered', () => {
			let text = 'initial value';
			const handleInput = (evt: any) => {
				text = evt.currentTarget.innerHTML;
			};
			const renderDNodes = () =>
				v('div', {
					contentEditable: true,
					oninput: handleInput,
					innerHTML: text
				});
			const widget = getWidget(renderDNodes());
			const projection = dom.create(widget);

			(projection.domNode.childNodes[0] as Element).removeChild(
				(projection.domNode.childNodes[0] as Element).childNodes[0]
			);
			handleInput({ currentTarget: projection.domNode.childNodes[0] as Element });
			widget.renderResult = renderDNodes();
			projection.update();

			(projection.domNode.childNodes[0] as Element).innerHTML = 'changed <i>value</i>';
			handleInput({ currentTarget: projection.domNode.childNodes[0] as Element });
			widget.renderResult = renderDNodes();
			projection.update();

			assert.strictEqual((projection.domNode.childNodes[0] as Element).innerHTML, 'changed <i>value</i>');
		});

		describe('svg', () => {
			it('creates and updates svg dom nodes with the right namespace', () => {
				const widget = getWidget(
					v('div', [
						v('svg', [
							v('circle', { cx: '2cm', cy: '2cm', r: '1cm', fill: 'red' }),
							v('image', { href: '/image.jpeg' })
						]),
						v('span')
					])
				);
				const projection = dom.create(widget);
				const svg = (projection.domNode.childNodes[0] as Element).childNodes[0];
				assert.strictEqual(svg.namespaceURI, 'http://www.w3.org/2000/svg');
				const circle = svg.childNodes[0];
				assert.strictEqual(circle.namespaceURI, 'http://www.w3.org/2000/svg');
				const image = svg.childNodes[1];
				assert.strictEqual(image.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
				const span = (projection.domNode.childNodes[0] as Element).childNodes[1];
				assert.strictEqual(span.namespaceURI, 'http://www.w3.org/1999/xhtml');

				widget.renderResult = v('div', [
					v('svg', [
						v('circle', { key: 'blue', cx: '2cm', cy: '2cm', r: '1cm', fill: 'blue' }),
						v('image', { href: '/image2.jpeg' })
					]),
					v('span')
				]);
				projection.update();

				const blueCircle = svg.childNodes[0];
				assert.strictEqual(blueCircle.namespaceURI, 'http://www.w3.org/2000/svg');
			});
		});
	});

	describe('merging', () => {
		it('Supports merging DNodes onto existing HTML', () => {
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write(
				`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button></div>`
			);
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;
			const childElementCount = root.childElementCount;
			const select = root.childNodes[1] as HTMLSelectElement;
			const button = root.childNodes[2] as HTMLButtonElement;
			assert.strictEqual(select.value, 'bar', 'bar should be selected');
			const onclickListener = spy();
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							v(
								'button',
								{
									type: 'button',
									disabled: false,
									onclick: onclickListener
								},
								['Click Me!']
							)
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
			assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
			assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
			assert.strictEqual(select, root.childNodes[1], 'should have been reused');
			assert.strictEqual(button, root.childNodes[2], 'should have been reused');
			assert.isFalse(select.disabled, 'select should be enabled');
			assert.isFalse(button.disabled, 'button should be enabled');

			assert.strictEqual(select.value, 'foo', 'foo should be selected');
			assert.strictEqual(select.children.length, 3, 'should have 3 children');

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			button.dispatchEvent(clickEvent);
			assert.isTrue(onclickListener.called, 'onclickListener should have been called');

			document.body.removeChild(iframe);
		});

		it('Supports merging DNodes with widgets onto existing HTML', () => {
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write(
				`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button><span>label</span><div>last node</div></div>`
			);
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;
			const childElementCount = root.childElementCount;
			const label = root.childNodes[0] as HTMLLabelElement;
			const select = root.childNodes[1] as HTMLSelectElement;
			const button = root.childNodes[2] as HTMLButtonElement;
			const span = root.childNodes[3] as HTMLElement;
			const div = root.childNodes[4] as HTMLElement;
			assert.strictEqual(select.value, 'bar', 'bar should be selected');
			const onclickListener = spy();

			class Button extends WidgetBase {
				render() {
					return [
						v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
						v('span', {}, ['label'])
					];
				}
			}
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							w(Button, {}),
							v('div', ['last node'])
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
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

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

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
			const onclickListener = spy();

			class Button extends WidgetBase {
				render() {
					return [
						v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
						v('span', {}, ['label'])
					];
				}
			}
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							w(Button, {}),
							v('div', ['last node'])
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
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

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			button.dispatchEvent(clickEvent);
			assert.isTrue(onclickListener.called, 'onclickListener should have been called');

			document.body.removeChild(iframe);
		});

		it('should only merge on first render', () => {
			let firstRender = true;
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write('<div><div>foo</div></div>');
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.value]);
				}
			}

			class Foo extends WidgetBase {
				render() {
					return v('div', [
						w(Bar, { key: '1', value: 'foo' }),
						firstRender ? null : w(Bar, { key: '2', value: 'bar' })
					]);
				}
			}
			const widget = new Foo();
			const projection = dom.merge(root, widget);
			const projectionRoot = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(projectionRoot.childNodes, 1, 'should have 1 child');

			firstRender = false;
			widget.invalidate();
			projection.update();
			assert.lengthOf(projectionRoot.childNodes, 2, 'should have 2 child');
			document.body.removeChild(iframe);
		});
	});

	describe('sync mode', () => {
		it('should run afterRenderCallbacks sync', () => {
			const widget = getWidget(v('div', { key: '1' }));
			const projection = dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
		});

		it('should run defferedRenderCallbacks sync', () => {
			let callCount = 0;
			const widget = getWidget(
				v('div', () => {
					callCount++;
					return {};
				})
			);
			dom.create(widget, { sync: true });
			assert.strictEqual(callCount, 2);
		});
	});

	describe('node callbacks', () => {
		it('element not added to node handler for nodes without a key', () => {
			const widget = getWidget(v('div'));
			const projection = dom.create(widget);
			resolvers.resolve();
			widget.renderResult = v('div');
			projection.update();
			resolvers.resolve();
			assert.isTrue(widget.nodeHandlerStub.add.notCalled);
		});

		it('element added on create to node handler for nodes with a key', () => {
			const widget = getWidget(v('div', { key: '1' }));
			const projection = dom.create(widget);
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
			widget.nodeHandlerStub.add.resetHistory();
			widget.renderResult = v('div', { key: '1' });
			projection.update();
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
		});

		it('element added on update to node handler for nodes with a key of 0', () => {
			const widget = getWidget(v('div', { key: 0 }));
			const projection = dom.create(widget);
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '0'));
			widget.nodeHandlerStub.add.resetHistory();
			widget.renderResult = v('div', { key: 0 });
			projection.update();
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '0'));
		});

		it('addRoot called on node handler for created widgets with a zero key', () => {
			const widget = getWidget(v('div', { key: 0 }));
			widget.__setProperties__({ key: 0 });

			const projection = dom.create(widget);
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
			widget.invalidate();
			projection.update();
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
		});

		it('addRoot called on node handler for updated widgets with key', () => {
			const widget = getWidget(v('div', { key: '1' }));

			const projection = dom.create(widget);
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
			widget.invalidate();
			projection.update();
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
		});
	});

	describe('animations', () => {
		describe('updateAnimation', () => {
			it('is invoked when a node contains only text and that text changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('div', { updateAnimation }, ['text']));
				const projection = dom.create(widget);
				widget.renderResult = v('div', { updateAnimation }, ['text2']);
				projection.update();
				assert.isTrue(updateAnimation.calledOnce);
				assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');
			});

			it('is invoked when a node contains text and other nodes and the text changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('div', { updateAnimation }, ['textBefore', v('span'), 'textAfter']));
				const projection = dom.create(widget);
				widget.renderResult = v('div', { updateAnimation }, ['textBefore', v('span'), 'newTextAfter']);
				projection.update();
				assert.isTrue(updateAnimation.calledOnce);
				updateAnimation.resetHistory();

				widget.renderResult = v('div', { updateAnimation }, ['textBefore', v('span'), 'newTextAfter']);
				projection.update();
				assert.isTrue(updateAnimation.notCalled);
			});

			it('is invoked when a property changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('a', { updateAnimation, href: '#1' }));
				const projection = dom.create(widget);
				widget.renderResult = v('a', { updateAnimation, href: '#2' });
				projection.update();
				assert.isTrue(
					updateAnimation.calledWith(
						projection.domNode.childNodes[0] as Element,
						match({ href: '#2' }),
						match({ href: '#1' })
					)
				);
			});
		});

		describe('enterAnimation', () => {
			it('is invoked when a new node is added to an existing parent node', () => {
				const enterAnimation = stub();
				const widget = getWidget(v('div', []));
				const projection = dom.create(widget);
				widget.renderResult = v('div', [v('span', { enterAnimation })]);
				projection.update();

				assert.isTrue(
					enterAnimation.calledWith((projection.domNode.childNodes[0] as Element).childNodes[0], match({}))
				);
			});
		});

		describe('exitAnimation', () => {
			it('is invoked when a node is removed from an existing parent node', () => {
				const exitAnimation = stub();
				const widget = getWidget(v('div', [v('span', { exitAnimation })]));
				const projection = dom.create(widget);
				widget.renderResult = v('div', []);
				projection.update();

				assert.isTrue(
					exitAnimation.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).childNodes[0],
						match({}),
						match({})
					)
				);

				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 1);
				exitAnimation.lastCall.callArg(1); // arg1: removeElement
				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 0);
			});
		});

		describe('transitionStrategy', () => {
			it('will be invoked when enterAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const widget = getWidget(v('div'));
				const projection = dom.create(widget, { transitions: transitionStrategy });
				widget.renderResult = v('div', [v('span', { enterAnimation: 'fadeIn' })]);
				projection.update();

				assert.isTrue(
					transitionStrategy.enter.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).firstChild,
						match({}),
						'fadeIn'
					)
				);
			});

			it('will be invoked when exitAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const widget = getWidget(v('div', [v('span', { exitAnimation: 'fadeOut' })]));
				const projection = dom.create(widget, {
					transitions: transitionStrategy
				});
				widget.renderResult = v('div', []);
				projection.update();

				assert.isTrue(
					transitionStrategy.exit.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).firstChild,
						match({}),
						'fadeOut',
						match({})
					)
				);

				transitionStrategy.exit.lastCall.callArg(3);
				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 0);
			});

			it('will complain about a missing transitionStrategy', () => {
				const widget = getWidget(v('div'));
				const projection = dom.create(widget);

				assert.throws(() => {
					widget.renderResult = v('div', [v('span', { enterAnimation: 'fadeIn' })]);
					projection.update();
				});
			});
		});
	});
});
