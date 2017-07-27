import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';
import sendEvent from '../../support/sendEvent';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Hover from '../../../src/meta/Hover';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemeableMixin } from '../../../src/mixins/Themeable';

let rAF: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta/Hover',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'basic behaviour'() {
		const hovering: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				hovering.push(this.meta(Hover).get('root'));
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

		assert.deepEqual(hovering, [ false, false ], 'should have been called twice, both not hovering');

		document.body.removeChild(div);
	},

	'hovering'() {
		const hovering: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				hovering.push(this.meta(Hover).get('root'));
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

		sendEvent(div as Element, 'mouseenter', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true ]);

		sendEvent(div as Element, 'mouseleave', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true, false ]);

		document.body.removeChild(div);
	},

	'only state changes should invalidate'() {
		const hovering: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				hovering.push(this.meta(Hover).get('root'));
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

		sendEvent(div as Element, 'mouseenter', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true ]);

		sendEvent(div as Element, 'mouseenter', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true ]);

		sendEvent(div as Element, 'mouseleave', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true, false ]);

		sendEvent(div as Element, 'mouseleave', { selector: ':first-child' });

		resolveRAF();

		assert.deepEqual(hovering, [ false, false, true, false ]);

		document.body.removeChild(div);
	}
});
