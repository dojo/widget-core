import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetMeta, WidgetMetaProperties, WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import CallbackMixin from '../../support/CallbackMixin';

registerSuite({
	name: 'meta base',

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
		const dfd = this.async();

		class TestMeta implements WidgetMeta {
			nodes: any;

			requiresRender = true;

			constructor(props: WidgetMetaProperties) {
				this.nodes = props.nodes;
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(CallbackMixin(2, dfd.callback(() => {
			assert.strictEqual(renders, 2);
		}), WidgetBase))<any> {
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
	}
});
