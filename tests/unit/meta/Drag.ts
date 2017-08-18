import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';
// import sendEvent from '../../support/sendEvent';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Drag, { DragResults } from '../../../src/meta/Drag';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemeableMixin } from '../../../src/mixins/Themeable';

let rAF: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

const emptyResults: DragResults = {
	delta: { x: 0, y: 0 },
	isDragging: false
};

registerSuite({
	name: 'meta/Drag',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'basic behaviour'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
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

		assert.deepEqual(dragResults, [ emptyResults, emptyResults ], 'should have been called twice, both empty results');

		document.body.removeChild(div);
	}
});
