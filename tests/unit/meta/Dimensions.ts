import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Dimensions from '../../../src/meta/Dimensions';
import { stub } from 'sinon';
import global from '@dojo/core/global';

let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(0).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta - Dimensions',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'dimensions are blank on first render, set on second'(this: any) {
		const dimensions: any[] = [];

		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
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

		resolveRAF();

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
	},

	'dimensions has returns false for keys that dont exist'(this: any) {
		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
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
		resolveRAF();
		assert.isFalse(widget.getDimensions());
	},

	'dimensions has returns true for keys that exist'(this: any) {
		class TestWidget extends ProjectorMixin(WidgetBase)<any> {
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
		resolveRAF();

		assert.isTrue(widget.getDimensions());
	}
});
