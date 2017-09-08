import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
import Dimensions from '../../../src/meta/Dimensions';
import NodeHandler, { Type } from '../../../src/NodeHandler';

let rAF: any;
const defaultDimensions = {
	offset: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	position: {
		bottom: 0,
		left: 0,
		right: 0,
		top: 0
	},
	scroll: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	size: {
		height: 0,
		width: 0
	}
};

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

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), defaultDimensions);
	},
	'Will return element dimensions if node is loaded'() {
		const nodeHandler = new NodeHandler();

		const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
		const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
		const position = { bottom: 10, left: 10, right: 10, top: 10 };
		const size = { width: 10, height: 10 };

		const element = {
			...offset,
			...scroll,
			getBoundingClientRect: stub().returns({
				...position,
				...size
			})
		};

		nodeHandler.add(element as any, { key: 'foo' });

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), {
			offset: { height: 10, left: 10, top: 10, width: 10 },
			scroll: { height: 10, left: 10, top: 10, width: 10 },
			position,
			size
		});
	}
});
