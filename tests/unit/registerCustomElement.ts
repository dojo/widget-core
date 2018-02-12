import global from '@dojo/shim/global';
import customElement from '../../src/decorators/customElement';
import WidgetBase from '../../src/WidgetBase';
import { v } from '../../src/d';
import register, { create } from '../../src/registerCustomElement';
import { createResolvers } from './../support/util';

const { describe, it, beforeEach, afterEach, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

@customElement({
	tag: 'foo-element'
})
class Foo extends WidgetBase {
	render() {
		return v('div', ['hello world']);
	}
}

function createTestWidget(options: any) {
	const { properties, attributes, events } = options;
	@customElement<any>({
		tag: 'bar-element',
		properties,
		attributes,
		events
	})
	class Bar extends WidgetBase<any> {
		private _called = false;

		private _onClick() {
			const { onBar } = this.properties;
			onBar && onBar();
		}

		render() {
			if (this.children.length) {
				const [child] = this.children;
				(child as any).properties.myAttr = 'set attribute from parent';
				(child as any).properties.onBar = () => {
					this._called = true;
					this.invalidate();
				};
			}
			const { myProp = '', myAttr = '' } = this.properties;
			return v('div', [
				v('button', { classes: ['event'], onclick: this._onClick }),
				v('div', { classes: ['prop'] }, [`${myProp}`]),
				v('div', { classes: ['attr'] }, [`${myAttr}`]),
				v('div', { classes: ['handler'] }, [`${this._called}`]),
				v('div', { classes: ['children'] }, this.children)
			]);
		}
	}
	return Bar;
}

describe('registerCustomElement', () => {
	let element: Element | undefined;
	const resolvers = createResolvers();

	before((suite) => {
		if (global.customElements === undefined) {
			suite.skip();
		}
	});

	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
		if (element) {
			(element.parentNode as Element).removeChild(element);
		}
		element = undefined;
	});

	it('custom element', () => {
		register(Foo);
		element = document.createElement('foo-element');
		document.body.appendChild(element);
		assert.equal(element.outerHTML, '<foo-element><div>hello world</div></foo-element>');
	});

	it('custom element with property', () => {
		const Bar = createTestWidget({ properties: ['myProp'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-1', CustomElement);
		element = document.createElement('bar-element-1');
		(element as any).myProp = 'hello';
		document.body.appendChild(element);
		const prop = element.querySelector('.prop') as HTMLElement;
		assert.equal(prop.innerHTML, 'hello');
	});

	it('custom element with attribute', () => {
		const Bar = createTestWidget({ attributes: ['myAttr'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-2', CustomElement);
		element = document.createElement('bar-element-2');
		element.setAttribute('myAttr', 'world');
		document.body.appendChild(element);
		const attr = element.querySelector('.attr') as HTMLElement;
		assert.equal(attr.innerHTML, 'world');
	});

	it('custom element with event', () => {
		let called = false;
		const Bar = createTestWidget({ events: ['onBar'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-3', CustomElement);
		element = document.createElement('bar-element-3');
		element.addEventListener('bar', () => {
			called = true;
		});
		document.body.appendChild(element);
		const event = element.querySelector('.event') as HTMLElement;
		event.click();
		assert.isTrue(called);
	});

	it('custom element with child element', () => {
		const BarA = createTestWidget({});
		const CustomElementA = create((BarA.prototype as any).__customElementDescriptor, BarA);
		customElements.define('bar-a', CustomElementA);
		const BarB = createTestWidget({ attributes: ['myAttr'], properties: ['myProp'], events: ['onBar'] });
		const CustomElementB = create((BarB.prototype as any).__customElementDescriptor, BarB);
		customElements.define('bar-b', CustomElementB);
		element = document.createElement('bar-a');
		const barB = document.createElement('bar-b');
		document.body.appendChild(element);
		element.appendChild(barB);
		(barB as any).myProp = 'set property on child';

		resolvers.resolve();

		const container = element.querySelector('.children');
		const children = (container as any).children;
		let called = false;
		children[0].addEventListener('bar', () => {
			called = true;
		});
		const event = children[0].querySelector('.event') as HTMLElement;
		event.click();

		assert.equal(children[0].tagName, 'BAR-B');
		const attr = children[0].querySelector('.attr');
		const prop = children[0].querySelector('.prop');
		assert.equal(attr.innerHTML, 'set attribute from parent');
		assert.equal(prop.innerHTML, 'set property on child');
		assert.isTrue(called);

		resolvers.resolve();
		const handler = element.querySelector('.handler') as HTMLElement;
		assert.equal(handler.innerHTML, 'true');
	});
});
