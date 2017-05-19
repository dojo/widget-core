import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Dimensions from '../../../src/meta/Dimensions';
import CallbackMixin from '../../support/CallbackMixin';

registerSuite({
	name: 'meta - Dimensions',

	'dimensions are blank on first render, set on second'(this: any) {
		const dimensions: any[] = [];
		const dfd = this.async();

		class TestWidget extends CallbackMixin(2, dfd.callback(() => {
			assert.strictEqual(dimensions.length, 2);
			assert.deepEqual(dimensions[0], {
				bottom: 0,
				height: 0,
				left: 0,
				right: 0,
				scrollHeight: 0,
				scrollLeft: 0,
				scrollTop: 0,
				scrollWidth: 0,
				top: 0,
				width: 0
			});
		}), ProjectorMixin(WidgetBase))<any> {
			render() {
				dimensions.push(this.meta(Dimensions).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);
	},

	'dimensions has returns false for keys that dont exist'(this: any) {
		const dfd = this.async();

		class TestWidget extends CallbackMixin(2, dfd.callback(() => {
			assert.isFalse(widget.getDimensions());
		}), ProjectorMixin(WidgetBase))<any> {
			render() {
				this.meta(Dimensions);

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getDimensions() {
				return this.meta(Dimensions).has('test');
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);
	},

	'dimensions has returns true for keys that exist'(this: any) {
		const dfd = this.async();

		class TestWidget extends CallbackMixin(2, dfd.callback(() => {
			assert.isTrue(widget.getDimensions());
		}), ProjectorMixin(WidgetBase))<any> {
			render() {
				this.meta(Dimensions);

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getDimensions() {
				return this.meta(Dimensions).has('root');
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);
	}
});
