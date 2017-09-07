import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
// import { v } from '../../../src/d';
// import { ProjectorMixin } from '../../../src/main';
import Dimensions, { defaultDimensions } from '../../../src/meta/Dimensions';
// import { WidgetBase } from '../../../src/WidgetBase';
// import { ThemeableMixin } from './../../../src/mixins/Themeable';
import NodeHandler, { Type } from '../../../src/NodeHandler';

let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
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

	'Dimensions will call invalidate when nodehandler projector event fires'() {
		const nodeHandler = new NodeHandler();
		const invalidate = stub();

		new Dimensions({
			invalidate,
			nodeHandler
		});

		nodeHandler.emit({ type: Type.Projector });
		resolveRAF();
		assert.isTrue(invalidate.calledOnce);
	},
	'Will return default dimensions if node not loaded'() {
		const nodeHandler = new NodeHandler();
		// const element = document.createElement('div');
		// nodeHandler.add(element, { key: 'foo' });

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), defaultDimensions);
	},
	'Will return element dimensions if node is loaded'() {
		const nodeHandler = new NodeHandler();
		const element = document.createElement('div');
		nodeHandler.add(element, { key: 'foo' });

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), defaultDimensions);
	}
	// ,
	// 'Dimensions will call invalidate when nodehandler projector event fires'() {
	// 	const nodeHandler = new NodeHandler();
	// 	const element = document.createElement('div');
	// 	nodeHandler.add(element, { key: 'foo' });
	// 	const dimensions = new Dimensions({
	// 		invalidate: () => {},
	// 		nodeHandler
	// 	});
	// }
	// 	const dimensions: any[] = [];

	// 	class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase))<any> {
	// 		render() {
	// 			dimensions.push(this.meta(Dimensions).get('root'));
	// 			return v('div', {
	// 				innerHTML: 'hello world',
	// 				key: 'root'
	// 			});
	// 		}
	// 	}

	// 	const div = document.createElement('div');

	// 	document.body.appendChild(div);

	// 	const widget = new TestWidget();
	// 	widget.append(div);

	// 	resolveRAF();

	// 	assert.strictEqual(dimensions.length, 2);
	// 	assert.deepEqual(dimensions[0], {
	// 		offset: {
	// 			height: 0,
	// 			left: 0,
	// 			top: 0,
	// 			width: 0
	// 		},
	// 		position: {
	// 			bottom: 0,
	// 			left: 0,
	// 			right: 0,
	// 			top: 0
	// 		},
	// 		scroll: {
	// 			height: 0,
	// 			left: 0,
	// 			top: 0,
	// 			width: 0
	// 		},
	// 		size: {
	// 			height: 0,
	// 			width: 0
	// 		}
	// 	});
	// },

	// 'dimensions has returns false for keys that dont exist'(this: any) {
	// 	class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase))<any> {
	// 		render() {
	// 			this.meta(Dimensions);

	// 			return v('div', {
	// 				innerHTML: 'hello world',
	// 				key: 'root'
	// 			});
	// 		}

	// 		getDimensions() {
	// 			return this.meta(Dimensions).has('test');
	// 		}
	// 	}

	// 	const div = document.createElement('div');

	// 	document.body.appendChild(div);

	// 	const widget = new TestWidget();
	// 	widget.append(div);
	// 	resolveRAF();
	// 	assert.isFalse(widget.getDimensions());
	// },

	// 'dimensions has returns true for keys that exist'(this: any) {
	// 	class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase))<any> {
	// 		render() {
	// 			this.meta(Dimensions);

	// 			return v('div', {
	// 				innerHTML: 'hello world',
	// 				key: 'root'
	// 			});
	// 		}

	// 		getDimensions() {
	// 			return this.meta(Dimensions).has('root');
	// 		}
	// 	}

	// 	const div = document.createElement('div');

	// 	document.body.appendChild(div);

	// 	const widget = new TestWidget();
	// 	widget.append(div);
	// 	resolveRAF();

	// 	assert.isTrue(widget.getDimensions());
	// }
});
