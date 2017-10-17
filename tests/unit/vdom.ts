import { beforeEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import { match, spy, stub } from 'sinon';

import { dom, InternalHNode } from '../../src/vdom';
import { v } from '../../src/d';

const noopEventHandlerInterceptor = (propertyName: string, functionPropertyArgument: Function) => {
	return function(this: Node) {
		return functionPropertyArgument.apply(this, arguments);
	};
};

const projectorStub: any = {
	on: stub(),
	emit: stub()
};

describe('vdom', () => {
	beforeEach(() => {
		projectorStub.on.reset();
		projectorStub.emit.reset();
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
				const projection = dom.create(v('div', { classes: { a: true, b: false } }), projectorStub);
				const div = projection.domNode as HTMLDivElement;
				assert.strictEqual(div.className, 'a');

				projection.update(v('div', { classes: { a: true, b: true } }));
				assert.strictEqual(div.className, 'a b');

				projection.update(v('div', { classes: { a: false, b: true } }));
				assert.strictEqual(div.className, 'b');
			});

			it('allows a constant class to be applied to make JSX workable', () => {
				const projection = dom.create(v('div', { class: 'extra special' }), projectorStub);
				assert.strictEqual(projection.domNode.outerHTML, '<div class="extra special"></div>');
				projection.update(v('div', { class: 'extra special' }));
				assert.throws(() => {
					projection.update(v('div', { class: '' }));
				}, Error);
			});

			it('allows classes and class to be combined', () => {
				const projection = dom.create(v('div', {
					classes: { extra: true },
					class: 'special' }
				), projectorStub);
				assert.strictEqual(projection.domNode.outerHTML, '<div class="extra special"></div>');
				projection.update(v('div', { classes: { extra: false }, class: 'special' }));
				assert.strictEqual(projection.domNode.outerHTML, '<div class="special"></div>');
			});

			it('helps to prevent mistakes when using className', () => {
				assert.throws(() => {
					dom.create(v('div', { className: 'special' }), projectorStub);
				}, Error);
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
				const projection = dom.create(v('div', { styles: { height: '20px' } }), projectorStub);
				projection.update(v('div', { styles: { height: null } }));
				assert.strictEqual(projection.domNode.outerHTML, '<div style=""></div>');
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

		it('will throw an error when maquette is not sure which node is added', () => {
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

		it('will throw an error when maquette is not sure which node is removed', () => {
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
			const renderMaquette = () => v('div', {
				contentEditable: true,
				oninput: handleInput,
				innerHTML: text
			});
			const projection = dom.create(renderMaquette(), projectorStub);

			projection.domNode.removeChild(projection.domNode.childNodes[0]);
			handleInput({ currentTarget: projection.domNode });
			projection.update(renderMaquette());

			projection.domNode.innerHTML = 'changed <i>value</i>';
			handleInput({ currentTarget: projection.domNode });
			projection.update(renderMaquette());

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

	describe('node callbacks', () => {

		it('element-created not emitted for new nodes without a key', () => {
			dom.create(v('div'), projectorStub);
			assert.isTrue(projectorStub.emit.neverCalledWith({ type: 'element-created' }));
		});

		it('element-created emitted for new nodes with a key', () => {
			const projection = dom.create(v('div', { key: '1' }), projectorStub);
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-created', element: projection.domNode, key: '1' }));
		});

		it('element-updated not emitted for updated nodes without a key', () => {
			const projection = dom.create(v('div'), projectorStub);
			projection.update(v('div'));
			assert.isTrue(projectorStub.emit.neverCalledWith({ type: 'element-updated' }));
		});

		it('element-updated not emitted for updated nodes without a key', () => {
			const projection = dom.create(v('div'), projectorStub);
			projection.update(v('div', { key: '1' }));
			assert.isTrue(projectorStub.emit.calledWith({ type: 'element-updated', element: projection.domNode, key: '1' }));
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
