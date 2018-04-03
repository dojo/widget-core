const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '@dojo/shim/global';
import { stub, SinonStub } from 'sinon';
import Resize, { ContentRect } from '../../../src/meta/Resize';
import NodeHandler from '../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

// let rAF: any;
let resizeObserver: any;
let resizeCallback: ([]: any[]) => void;
const bindInstance = new WidgetBase();
let isFoo: SinonStub;
let isBar: SinonStub;

// function resolveRAF() {
// 	for (let i = 0; i < rAF.callCount; i++) {
// 		rAF.getCall(i).args[0]();
// 	}
// 	rAF.resetHistory();
// }

registerSuite('meta - Resize', {
	beforeEach() {
		isFoo = stub();
		isBar = stub();
		// rAF = stub(global, 'requestAnimationFrame');
		resizeObserver = stub().callsFake(function(callback: any) {
			const observer = {
				observe: stub()
			};
			resizeCallback = callback;
			return observer;
		});

		global.ResizeObserver = resizeObserver;
	},

	afterEach() {
		// rAF.restore();
		isFoo.reset();
		isBar.reset();
		resizeObserver.reset();
		global.ResizeObserver = undefined;
	},

	tests: {
		'Will return predicates defaulted to false if node not loaded'() {
			const nodeHandler = new NodeHandler();

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.deepEqual(resize.get('foo', { isFoo, isBar }), { isFoo: false, isBar: false });
			assert.isFalse(isFoo.called);
			assert.isFalse(isBar.called);
		},
		'Will create a new ResizeObserver when node exists'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			resize.get('foo', { isFoo, isBar });
			assert.isTrue(resizeObserver.calledOnce);
		},
		'Will call predicates when resize event is observed'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			const contentRect: Partial<ContentRect> = {
				width: 10
			};

			resize.get('foo', { isFoo, isBar });
			resizeCallback([{ contentRect }]);

			assert.isTrue(isFoo.firstCall.calledWith(contentRect));
			assert.isTrue(isBar.firstCall.calledWith(contentRect));
		},
		'Will only set up one observer per widget per key'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			resize.get('foo', { isFoo });
			resize.get('foo', { isBar });
			assert.isTrue(resizeObserver.calledOnce);
		},
		'Will call invalidate when predicates have changed'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			const contentRect: Partial<ContentRect> = {
				width: 10
			};

			isFoo.onFirstCall().returns(false);
			isFoo.onSecondCall().returns(true);

			resize.get('foo', { isFoo, isBar });

			resizeCallback([{ contentRect }]);
			resizeCallback([{ contentRect }]);

			const predicates = resize.get('foo', { isFoo, isBar });

			assert.isTrue(invalidate.calledTwice);
			assert.isTrue(predicates.isFoo);
		}

		// ,
		// 'Will accept a number key'() {
		// 	const nodeHandler = new NodeHandler();

		// 	const dimensions = new Dimensions({
		// 		invalidate: () => {},
		// 		nodeHandler,
		// 		bind: bindInstance
		// 	});

		// 	assert.deepEqual(dimensions.get(1234), defaultDimensions);
		// },
		// 'Will create event listener for node if not yet loaded'() {
		// 	const nodeHandler = new NodeHandler();
		// 	const onSpy = spy(nodeHandler, 'on');

		// 	const dimensions = new Dimensions({
		// 		invalidate: () => {},
		// 		nodeHandler,
		// 		bind: bindInstance
		// 	});

		// 	dimensions.get('foo');
		// 	assert.isTrue(onSpy.calledOnce);
		// 	assert.isTrue(onSpy.firstCall.calledWith('foo'));
		// },
		// 'Will call invalidate when awaited node is available'() {
		// 	const nodeHandler = new NodeHandler();
		// 	const onSpy = spy(nodeHandler, 'on');
		// 	const invalidateStub = stub();

		// 	const dimensions = new Dimensions({
		// 		invalidate: invalidateStub,
		// 		nodeHandler,
		// 		bind: bindInstance
		// 	});

		// 	dimensions.get('foo');
		// 	assert.isTrue(onSpy.calledOnce);
		// 	assert.isTrue(onSpy.firstCall.calledWith('foo'));

		// 	const element = document.createElement('div');
		// 	document.body.appendChild(element);
		// 	const getRectSpy = spy(element, 'getBoundingClientRect');

		// 	nodeHandler.add(element, 'foo');

		// 	resolveRAF();
		// 	assert.isTrue(invalidateStub.calledOnce);

		// 	onSpy.resetHistory();
		// 	dimensions.get('foo');

		// 	assert.isFalse(onSpy.called);
		// 	assert.isTrue(getRectSpy.calledOnce);
		// 	document.body.removeChild(element);
		// },
		// 'Will return element dimensions if node is loaded'() {
		// 	const nodeHandler = new NodeHandler();

		// 	const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
		// 	const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
		// 	const position = { bottom: 10, left: 10, right: 10, top: 10 };
		// 	const size = { width: 10, height: 10 };

		// 	const element = {
		// 		...offset,
		// 		...scroll,
		// 		getBoundingClientRect: stub().returns({
		// 			...position,
		// 			...size
		// 		})
		// 	};

		// 	nodeHandler.add(element as any, 'foo');

		// 	const dimensions = new Dimensions({
		// 		invalidate: () => {},
		// 		nodeHandler,
		// 		bind: bindInstance
		// 	});

		// 	assert.deepEqual(dimensions.get('foo'), {
		// 		offset: { height: 10, left: 10, top: 10, width: 10 },
		// 		scroll: { height: 10, left: 10, top: 10, width: 10 },
		// 		position,
		// 		size
		// 	});
		// }
	}
});
