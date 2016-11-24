import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createContainerWidgetBase from '../../../src/bases/createContainerWidgetBase';
import createRenderableSpy, { RenderableSpy } from '../../support/createRenderableSpy';
import registryProvider from '../../support/registryProviderMock';

registerSuite({
	name: 'bases/createContainerWidgetBase',

	afterEach() {
		registryProvider._registry.clear();
		registryProvider._count = 0;
	},

	'creation no options'() {
		const container = createContainerWidgetBase();
		assert.isFunction(container.createChildren);
		assert.isFunction(container.set);
		assert.isArray(container.childNodeRenderers);
		assert.strictEqual(container.childNodeRenderers.length, 1);
	},

	'creation with createChildren': {
		'map factory no options'(this: any) {
			const dfd = this.async();
			const container = createContainerWidgetBase({
				createChildren: {
					'foo': { factory: createRenderableSpy }
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(container.state.children, [ 'foo' ]);
				assert.isDefined(container.children.get('foo'));
				const foo = <RenderableSpy> container.children.get('foo');
				assert.deepEqual(foo._shadowProps.options, {
					id: `${container.id}-child-1`
				});
			}), 10);
		},

		'map factory with options map'(this: any) {
			const dfd = this.async();
			const container = createContainerWidgetBase({
				createChildren: {
					'foo': { factory: createRenderableSpy, options: { id: 'bar' } }
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(container.state.children, [ 'foo' ]);
				assert.isDefined(container.children.get('foo'));
				const foo = <RenderableSpy> container.children.get('foo');
				assert.deepEqual(foo._shadowProps.options, { id: 'bar' });
			}), 10);
		},

		'array factory with no options'(this: any) {
			const dfd = this.async();
			const container = createContainerWidgetBase({
				createChildren: [ [ createRenderableSpy ] ]
			});

			setTimeout(dfd.callback(() => {
				const childID = `${container.id}-child-1`;
				assert.deepEqual(container.state.children, [ childID ]);
				assert.isDefined(container.children.get(childID));
				const spy = <RenderableSpy> container.children.get(childID);
				assert.deepEqual(spy._shadowProps.options, { id: childID });
			}), 10);
		},

		'array factory with options'(this: any) {
			const dfd = this.async();
			const container = createContainerWidgetBase({
				createChildren: [ [ createRenderableSpy, { id: 'baz' } ] ]
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(container.state.children, [ 'baz' ]);
				assert.isDefined(container.children.get('baz'));
				const spy = <RenderableSpy> container.children.get('baz');
				assert.deepEqual(spy._shadowProps.options, { id: 'baz' });
			}), 10);
		}
	},

	'creation with registryProvider': {
		'with no createChildren'() {
			createContainerWidgetBase({
				registryProvider
			});
		},

		'with createChildren'(this: any) {
			const dfd = this.async();
			const container = createContainerWidgetBase({
				createChildren: {
					'foo': { factory: createRenderableSpy, options: { id: 'bar' } }
				},
				registryProvider
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(container.state.children, [ 'foo' ]);
				assert.isDefined(container.children.get('foo'));
				const foo = <RenderableSpy> container.children.get('foo');
				assert.deepEqual(foo._shadowProps.options, { id: 'bar' });
				assert.isTrue(registryProvider._registry.has('bar'));
				assert.strictEqual(registryProvider._registry.get('bar'), container.children.get('foo'));
			}), 10);
		}
	},

	'set()': {
		'no registryProvider': {
			'single with label'() {
				const foo = createRenderableSpy({ id: 'foo' });

				let invalidatedCount = 0;

				const container = createContainerWidgetBase();

				container.on('invalidated', () => {
					invalidatedCount++;
				});

				const handle = container.set('bar', foo);

				assert.strictEqual(container.children.get('bar'), foo, 'Child should match set item');
				assert.strictEqual(container.children.size, 1, 'container.children should only have one item');
				assert.deepEqual(container.state.children, [ 'bar' ], 'container.state.children should have child listed');

				assert.strictEqual(invalidatedCount, 1, 'Invalidated called once, due to state change');

				foo.invalidate();

				assert.strictEqual(invalidatedCount, 2, 'Container invalidated should have been called');

				handle.destroy();

				assert.strictEqual(invalidatedCount, 3, 'Invalidated called again, due to state change');

				foo.invalidate();

				assert.strictEqual(invalidatedCount, 3, 'Invalidated shouldn\'t have been called again');

				assert.strictEqual(container.children.size, 0, 'container.children should have no items');
				assert.deepEqual(container.state.children, [ ], 'container.state.children should be empty');
			},

			'single no label'() {
				const foo = createRenderableSpy({ id: 'foo' });

				let invalidatedCount = 0;

				const container = createContainerWidgetBase();

				container.on('invalidated', () => {
					invalidatedCount++;
				});

				const handle = container.set(foo);

				assert.strictEqual(container.children.get('foo'), foo, 'Child should match set item');
				assert.strictEqual(container.children.size, 1, 'container.children should only have one item');
				assert.deepEqual(container.state.children, [ 'foo' ], 'container.state.children should have child listed');

				handle.destroy();

				assert.strictEqual(container.children.size, 0, 'child should be removed');
			},

			'array'() {
				const foo = createRenderableSpy({ id: 'foo' });
				const bar = createRenderableSpy({ id: 'bar' });
				const baz = createRenderableSpy({ id: 'baz' });

				const container = createContainerWidgetBase();

				container.set('foo', foo);

				const handle = container.set([ bar, baz ]);

				assert.strictEqual(container.children.get('bar'), bar);
				assert.strictEqual(container.children.get('baz'), baz);
				assert.strictEqual(container.children.size, 3);
				assert.deepEqual(container.state.children, [ 'foo', 'bar', 'baz' ]);

				handle.destroy();

				assert.strictEqual(container.children.size, 1);
				assert.deepEqual(container.state.children, [ 'foo' ]);
			},

			'map'() {
				const foo = createRenderableSpy({ id: 'foo' });
				const bar = createRenderableSpy({ id: 'bar' });
				const baz = createRenderableSpy({ id: 'baz' });

				const container = createContainerWidgetBase();

				container.set('qat', foo);

				const handle = container.set({
					'foo': bar,
					'baz': baz
				});

				assert.strictEqual(container.children.get('foo'), bar);
				assert.strictEqual(container.children.get('baz'), baz);
				assert.strictEqual(container.children.size, 3);
				assert.deepEqual(container.state.children, [ 'qat', 'foo', 'baz' ]);

				handle.destroy();

				assert.strictEqual(container.children.size, 1);
				assert.deepEqual(container.state.children, [ 'qat' ]);
			}
		},

		'invalid arguments'() {
			const container = createContainerWidgetBase();

			assert.throws(() => {
				(<any> container).set('foo');
			}, TypeError, 'Child not passed to .set()');
		}
	},

	'createChildren()': {
		'no registry provider': {
			'array'() {
				const container = createContainerWidgetBase();

				return container.createChildren([ [ createRenderableSpy ], [ createRenderableSpy, { id: 'foo'} ] ])
					.then((results) => {
						const childID = `${container.id}-child-1`;
						assert.deepEqual(Object.keys(results), [ childID , 'foo' ]);
						assert.deepEqual(container.state.children, [ childID , 'foo' ]);
						assert.isDefined(container.children.get(childID));
						assert.isDefined(container.children.get('foo'));
						assert.strictEqual(container.children.size, 2);
					});
			},

			'map'() {
				const container = createContainerWidgetBase();

				return container.createChildren({
						foo: {
							factory: createRenderableSpy
						},
						bar: {
							factory: createRenderableSpy,
							options: { id: 'foo' }
						}
					})
					.then((results) => {
						assert.deepEqual(Object.keys(results), [ 'foo' , 'bar' ]);
						assert.deepEqual(container.state.children, [ 'foo', 'bar' ]);
						assert.isDefined(container.children.get('foo'));
						assert.isDefined(container.children.get('bar'));
						assert.strictEqual(container.children.get('bar')!.id, 'foo');
					});
			}
		},

		'registryProvider': {
			'array'() {
				const container = createContainerWidgetBase({
					registryProvider
				});

				return container.createChildren([ [ createRenderableSpy ], [ createRenderableSpy, { id: 'foo'} ] ])
					.then((results) => {
						const childID = `${container.id}-child-1`;
						assert.deepEqual(Object.keys(results), [ childID , 'foo' ]);
						assert.deepEqual(container.state.children, [ childID , 'foo' ]);
						assert.strictEqual(container.children.get(childID), registryProvider._registry.get(childID));
						assert.strictEqual(container.children.get('foo'), registryProvider._registry.get('foo'));
						assert.strictEqual(container.children.size, 2);
					});
			},

			'map'() {
				const container = createContainerWidgetBase({
					registryProvider
				});

				return container.createChildren({
						foo: {
							factory: createRenderableSpy
						},
						bar: {
							factory: createRenderableSpy,
							options: { id: 'foo' }
						}
					})
					.then((results) => {
						assert.deepEqual(Object.keys(results), [ 'foo' , 'bar' ]);
						assert.deepEqual(container.state.children, [ 'foo', 'bar' ]);
						assert.strictEqual(container.children.get('bar')!.id, 'foo');
						assert.strictEqual(container.children.get('foo'), registryProvider._registry.get(`${container.id}-child-1`));
						assert.strictEqual(container.children.get('bar'), registryProvider._registry.get('foo'));
					});
			}
		}
	},

	'rendering': {
		'no registry provider': {
			'.render()'() {
				let invalidatedCount = 0;

				const container = createContainerWidgetBase({
					listeners: {
						invalidated() {
							invalidatedCount++;
						}
					}
				});
				const foo = createRenderableSpy({ id: 'foo' });
				const bar = createRenderableSpy({ id: 'bar' });

				const handle = container.set([ foo, bar ]);

				let vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'bar');

				handle.destroy();

				vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 0);
			},

			'swap children in state'() {
				let invalidatedCount = 0;

				const container = createContainerWidgetBase({
					listeners: {
						invalidated() {
							invalidatedCount++;
						}
					}
				});
				const foo = createRenderableSpy({ id: 'foo' });
				const bar = createRenderableSpy({ id: 'bar' });

				container.set([ foo, bar ]);

				container.setState({ children: [ 'bar', 'foo' ] });

				let vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'bar');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'foo');
			}
		}
	},

	'registry provider': {
		'.render()'() {
			let invalidatedCount = 0;

				const container = createContainerWidgetBase({
					listeners: {
						invalidated() {
							invalidatedCount++;
						}
					},
					registryProvider
				});
				const foo = createRenderableSpy({ id: 'foo' });
				const bar = createRenderableSpy({ id: 'bar' });

				const handle = container.set([ foo, bar ]);

				let vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'bar');

				handle.destroy();

				vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 0);
		},

		'children via state'(this: any) {
			const dfd = this.async();
			registryProvider._registry.set('foo', createRenderableSpy({ id: 'foo' }));
			registryProvider._registry.set('bar', createRenderableSpy({ id: 'bar' }));
			registryProvider._registry.set('baz', createRenderableSpy({ id: 'baz' }));

			let invalidatedCount = 0;

			const container = createContainerWidgetBase({
				listeners: {
					invalidated() {
						invalidatedCount++;
					}
				},
				registryProvider
			});

			container.setState({ children: [ 'bar', 'foo' ] });

			let vnode = container.render();
			assert.strictEqual(vnode.children && vnode.children.length, 0, 'no children, as lazy synching');

			setTimeout(() => {
				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'bar');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'foo');

				container.setState({ children: [ 'foo', 'baz' ] });

				vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 1, 'only "foo", baz resolved later');
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');

				const bar = registryProvider._registry.get('bar')!;

				const currentCount = invalidatedCount;

				bar.invalidate();

				assert(currentCount);
				assert.strictEqual(currentCount, invalidatedCount, 'calls to bar should not invalidate container');

				setTimeout(dfd.callback(() => {
					vnode = container.render();

					assert.strictEqual(vnode.children && vnode.children.length, 2, 'baz is present');
					assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');
					assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'baz');
				}));
			}, 10);
		},

		'children via state on creation'(this: any) {
			const dfd = this.async();
			registryProvider._registry.set('foo', createRenderableSpy({ id: 'foo' }));
			registryProvider._registry.set('bar', createRenderableSpy({ id: 'bar' }));

			const container = createContainerWidgetBase({
				registryProvider,
				state: { children: [ 'bar', 'foo' ] }
			});

			let vnode = container.render();
			assert.strictEqual(vnode.children && vnode.children.length, 0, 'no children, as lazy synching');

			setTimeout(dfd.callback(() => {
				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'bar');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'foo');
			}), 10);
		},

		'swap children in state'(this: any) {
			const dfd = this.async();
			registryProvider._registry.set('foo', createRenderableSpy({ id: 'foo' }));
			registryProvider._registry.set('bar', createRenderableSpy({ id: 'bar' }));

			const container = createContainerWidgetBase({
				registryProvider
			});

			container.setState({ children: [ 'bar', 'foo' ] });

			let vnode = container.render();
			assert.strictEqual(vnode.children && vnode.children.length, 0, 'no children, as lazy synching');

			setTimeout(dfd.callback(() => {
				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'bar');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'foo');

				container.setState({ children: [ 'foo', 'bar' ] });

				vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 2, 'all children sould be resolve sync');
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'bar');
			}), 10);
		},

		'swap children and add in state'(this: any) {
			const dfd = this.async();
			registryProvider._registry.set('foo', createRenderableSpy({ id: 'foo' }));
			registryProvider._registry.set('bar', createRenderableSpy({ id: 'bar' }));
			registryProvider._registry.set('baz', createRenderableSpy({ id: 'baz' }));

			const container = createContainerWidgetBase({
				registryProvider
			});

			container.setState({ children: [ 'bar', 'foo' ] });

			let vnode = container.render();
			assert.strictEqual(vnode.children && vnode.children.length, 0, 'no children, as lazy synching');

			setTimeout(() => {
				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 2);
				assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'bar');
				assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'foo');

				container.setState({ children: [ 'foo', 'bar', 'baz' ] });

				vnode = container.render();

				assert.strictEqual(vnode.children && vnode.children.length, 2, 'only existing children resolved snyc');

				setTimeout(dfd.callback(() => {
					vnode = container.render();

					assert.strictEqual(vnode.children && vnode.children.length, 3, 'baz is present');
					assert.strictEqual(vnode.children && vnode.children[0].properties!['data-widget-id'], 'foo');
					assert.strictEqual(vnode.children && vnode.children[1].properties!['data-widget-id'], 'bar');
					assert.strictEqual(vnode.children && vnode.children[2].properties!['data-widget-id'], 'baz');
				}), 10);
			}, 10);
		},

		'widget not registered'(this: any) {
			const dfd = this.async();

			const container = createContainerWidgetBase({
				registryProvider
			});

			container.setState({ children: [ 'foo' ] });

			container.render();

			container.on('error', dfd.callback((evt: any) => {
				assert.strictEqual(evt.target, container);
				assert.strictEqual(evt.error.message, 'Non-registered widget id of "foo"');
			}));
		}
	},

	'clear()': {
		'no registry provider'() {
			const foo = createRenderableSpy({ id: 'foo' });

			const container = createContainerWidgetBase();

			container.set('foo', foo);

			assert.strictEqual(container.children.size, 1, 'container.children should only have one item');

			container.clear();

			assert.strictEqual(container.children.size, 1, 'children aren\'t pruned until render');

			container.render(); // children won't be pruned until render

			assert.strictEqual(container.children.size, 0, 'container.children should only have one item');
		},

		'registry provider'(this: any) {
			const dfd = this.async();
			registryProvider._registry.set('foo', createRenderableSpy({ id: 'foo' }));
			registryProvider._registry.set('bar', createRenderableSpy({ id: 'bar' }));

			const container = createContainerWidgetBase({
				registryProvider,
				state: { children: [ 'bar', 'foo' ] }
			});

			let vnode = container.render();
			assert.strictEqual(vnode.children && vnode.children.length, 0, 'no children, as lazy synching');

			setTimeout(dfd.callback(() => {
				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 2);

				container.clear();

				vnode = container.render();
				assert.strictEqual(vnode.children && vnode.children.length, 0);
			}), 10);
		}
	}
});
