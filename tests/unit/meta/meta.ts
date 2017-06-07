import global from '@dojo/core/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { WidgetMeta, WidgetMetaProperties } from '../../../src/interfaces';
import { ProjectorMixin } from '../../../src/main';
import { stub } from 'sinon';

let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta base',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame').returns(1);
	},

	afterEach() {
		rAF.restore();
	},

	'meta returns a singleton'() {
		class TestMeta implements WidgetMeta {
			nodes: any;

			constructor(props: WidgetMetaProperties) {
				this.nodes = props.nodes;
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta() {
				return this.meta(TestMeta);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.strictEqual(widget.getMeta(), widget.getMeta());
	},

	'meta with options return singletons'() {
		class TestMeta implements WidgetMeta {
			nodes: any;

			constructor(props: WidgetMetaProperties) {
				this.nodes = props.nodes;
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta(id: string) {
				return this.meta(TestMeta, { id });
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.strictEqual(widget.getMeta('foo'), widget.getMeta('foo'), 'foo equals foo');
		assert.strictEqual(widget.getMeta('bar'), widget.getMeta('bar'), 'bar equals bar');
		assert.notStrictEqual(widget.getMeta('foo'), widget.getMeta('bar'), 'foo does not equal bar');
	},

	'meta is provided a list of nodes with keys'() {
		class TestMeta implements WidgetMeta {
			nodes: any;

			constructor(props: WidgetMetaProperties) {
				this.nodes = props.nodes;
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta() {
				return this.meta(TestMeta);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);
		const meta = widget.getMeta();

		assert.isTrue(meta.nodes.size > 0);
		assert.isNotNull(meta.nodes.get('root'));
	},

	'meta accepts options'() {
		interface TestMetaOptions {
			rootKey: string;
		}

		class TestMeta implements WidgetMeta {
			nodes: any;
			options: TestMetaOptions;

			constructor(props: WidgetMetaProperties, options: TestMetaOptions) {
				this.nodes = props.nodes;
				this.options = options;
			}

			getRoot() {
				return this.nodes.get(this.options.rootKey);
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta() {
				return this.meta(TestMeta, {
					rootKey: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);
		const meta = widget.getMeta();

		assert.isTrue(meta.nodes.size > 0);
		assert.isNotNull(meta.getRoot());
	},

	'meta renders the node if it has to'() {
		class TestMeta implements WidgetMeta {
			props: WidgetMetaProperties;

			constructor(props: WidgetMetaProperties) {
				this.props = props;
			}

			has(key: string) {
				this.props.requireNode(key);
				return this.props.nodes.has(key);
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).has('greeting');
				this.meta(TestMeta).has('name');

				return v('div', {
					innerHTML: 'hello',
					key: 'greeting'
				}, [
					v('div', {
						innerHTML: 'world',
						key: 'name'
					})
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(renders, 2, 'expected two renders');
	},

	'multi-step render'() {
		class TestMeta implements WidgetMeta {
			props: WidgetMetaProperties;

			constructor(props: WidgetMetaProperties) {
				this.props = props;
			}

			has(key: string) {
				this.props.requireNode(key);
				return this.props.nodes.has(key);
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			nodes: any;

			render() {
				renders++;

				const test = this.meta(TestMeta);

				return v('div', {
					innerHTML: 'hello',
					key: 'greeting'
				}, [
					test.has('greeting') ? v('div', {
						innerHTML: 'world',
						key: 'name'
					}, [
						test.has('name') ? v('div', {
							innerHTML: '!',
							key: 'exclmation'
						}) : null
					]) : null
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(renders, 3, 'expected two renders');
	},

	'meta throws an error if a required node is not found'() {
		class TestMeta implements WidgetMeta {
			props: WidgetMetaProperties;

			constructor(props: WidgetMetaProperties) {
				this.props = props;
			}

			has(key: string) {
				const has = this.props.nodes.has(key);

				if (!has) {
					this.props.requireNode(key);
				}

				return has;
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).has('test');

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.throws(() => {
			resolveRAF();
		});
	}
});
