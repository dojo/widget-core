import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetMeta, WidgetMetaProperties, WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { stub } from 'sinon';

let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(0).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta base',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
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

	'meta renders the node if it has to'(this: any) {
		class TestMeta implements WidgetMeta {
			nodes: any;

			constructor(props: WidgetMetaProperties) {
				this.nodes = props.nodes;
				props.invalidate();
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta);

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();
		resolveRAF();

		assert.strictEqual(renders, 2, 'expected two renders');
	}
});
