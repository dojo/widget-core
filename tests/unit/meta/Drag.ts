import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';
import sendEvent from '../../support/sendEvent';
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

	'standard rendering'() {
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

		widget.destroy();
		document.body.removeChild(div);
	},

	'mouse dragging a node'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mousedown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mousemove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 55
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mouseup', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 45
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 10, y: 5 },
				isDragging: true
			}, {
				delta: { x: -5, y: -10 },
				isDragging: false
			}
		], 'the stack of should represent a drag state');

		widget.destroy();
		document.body.removeChild(div);
	},

	'touch dragging a node'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'touchstart', {
			eventInit: {
				bubbles: true,
				changedTouches: [ { screenX: 100, screenY: 50 } ]
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'touchmove', {
			eventInit: {
				bubbles: true,
				changedTouches: [ { screenX: 110, screenY: 55 } ]
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'touchend', {
			eventInit: {
				bubbles: true,
				changedTouches: [ { screenX: 105, screenY: 45 } ]
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 10, y: 5 },
				isDragging: true
			}, {
				delta: { x: -5, y: -10 },
				isDragging: false
			}
		], 'the stack of should represent a drag state');

		widget.destroy();
		document.body.removeChild(div);
	},

	'delta should be culmative between renders'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mousedown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mousemove', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 55
			}
		});

		sendEvent(div.firstChild as Element, 'mousemove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 60
			}
		});

		sendEvent(div.firstChild as Element, 'mousemove', {
			eventInit: {
				bubbles: true,
				pageX: 115,
				pageY: 65
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'mouseup', {
			eventInit: {
				bubbles: true,
				pageX: 120,
				pageY: 70
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 15, y: 15 },
				isDragging: true
			}, {
				delta: { x: 5, y: 5 },
				isDragging: false
			}
		], 'the stack of should represent a drag state');

		widget.destroy();
		document.body.removeChild(div);
	},

	'movement ignored when start event missing'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'touchmove', {
			eventInit: {
				bubbles: true,
				changedTouches: [ { screenX: 110, screenY: 55 } ]
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'touchend', {
			eventInit: {
				bubbles: true,
				changedTouches: [ { screenX: 105, screenY: 45 } ]
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults
		], 'the widget does not invalidate on ignored events');

		widget.destroy();
		document.body.removeChild(div);
	},

	'dragging on not a drag node'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				}, [
					v('div', {
						innerHTML: 'Hello World',
						key: 'child'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'mousedown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'mousemove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 55
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'mouseup', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 45
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults
		], 'there should not be drag information');

		widget.destroy();
		document.body.removeChild(div);
	}
});
