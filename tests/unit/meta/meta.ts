import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Base as MetaBase } from '../../../src/meta/Base';
import { stub, SinonStub, spy } from 'sinon';
import NodeHandler, { NodeEventType } from '../../../src/NodeHandler';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetBase } from '../../../src/WidgetBase';

let rAFStub: SinonStub;
let rICStub: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAFStub.callCount; i++) {
		rAFStub.getCall(i).args[0]();
	}
	rAFStub.reset();
}

function resolveRIC() {
	for (let i = 0; i < rAFStub.callCount; i++) {
		rAFStub.getCall(i).args[0]();
	}
	rAFStub.reset();
}

registerSuite({
	name: 'meta base',
	beforeEach() {
		rAFStub = stub(global, 'requestAnimationFrame').returns(1);
		rICStub = stub(global, 'requestIdleCallback').returns(1);
	},
	afterEach() {
		rAFStub.restore();
		rICStub.restore();
	},
	'has checks nodehandler for nodes'() {
		const nodeHandler = new NodeHandler();
		const element = document.createElement('div');
		nodeHandler.add(element, 'foo');
		const meta = new MetaBase({
			invalidate: () => {},
			nodeHandler
		});

		assert.isTrue(meta.has('foo'));
		assert.isFalse(meta.has('bar'));
	},
	'get node returns element from nodehandler'() {
		const nodeHandler = new NodeHandler();
		const invalidate = stub();
		const element = document.createElement('div');
		nodeHandler.add(element, 'foo');

		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
		}

		const meta = new MyMeta({
			invalidate,
			nodeHandler
		});

		const node = meta.callGetNode('foo');
		assert.equal(node, element);
	},
	'Will create event listener for node if not yet loaded'() {
		const nodeHandler = new NodeHandler();
		const invalidate = stub();
		const onSpy = spy(nodeHandler, 'on');

		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
		}

		const meta = new MyMeta({
			invalidate,
			nodeHandler
		});

		meta.callGetNode('foo');
		assert.isTrue(onSpy.calledOnce);
		assert.isTrue(onSpy.firstCall.calledWith('foo'));
	},
	'Will call invalidate when awaited node is available'() {
		const nodeHandler = new NodeHandler();
		const onSpy = spy(nodeHandler, 'on');
		const invalidate = stub();

		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
		}

		const meta = new MyMeta({
			invalidate,
			nodeHandler
		});

		meta.callGetNode('foo');
		assert.isTrue(onSpy.calledOnce);
		assert.isTrue(onSpy.firstCall.calledWith('foo'));

		const element = document.createElement('div');

		nodeHandler.add(element, 'foo');

		resolveRAF();
		resolveRIC();
		assert.isTrue(invalidate.calledOnce);

		onSpy.reset();
		meta.callGetNode('foo');

		assert.isFalse(onSpy.called);
	},
	'Will not add a second callback handle if one already exists'() {
		const nodeHandler = new NodeHandler();
		const onSpy = spy(nodeHandler, 'on');
		const invalidate = stub();

		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
		}

		const meta = new MyMeta({
			invalidate,
			nodeHandler
		});

		meta.callGetNode('foo');
		assert.isTrue(onSpy.calledOnce);
		assert.isTrue(onSpy.firstCall.calledWith('foo'));
		onSpy.reset();
		meta.callGetNode('foo');
		assert.isTrue(onSpy.notCalled);
		assert.isTrue(invalidate.notCalled);
	},
	'invalidate calls passed in invalidate function'() {
		const nodeHandler = new NodeHandler();
		const invalidate = stub();

		class MyMeta extends MetaBase {
			callInvalidate() {
				this.invalidate();
			}
		}

		const meta = new MyMeta({
			invalidate,
			nodeHandler
		});

		meta.callInvalidate();
		resolveRAF();
		resolveRIC();
		assert.isTrue(invalidate.calledOnce);
	},
	'integration with single root node'() {
		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
			getNodeHandler() {
				return this.nodeHandler;
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase) {
			render() {
				return v('div', { key: 'foo' }, [
					v('div', { key: 'bar' }, [ 'hello world' ])
				]);
			}

			getMeta() {
				return this.meta(MyMeta);
			}
		}

		const widget = new TestWidget();
		const meta = widget.getMeta();

		const nodeHandler = meta.getNodeHandler();
		const onFoo = stub();
		const onBar = stub();
		const onWidget = stub();

		nodeHandler.on('foo', onFoo);
		nodeHandler.on('bar', onBar);
		nodeHandler.on(NodeEventType.Widget, onWidget);

		const div = document.createElement('div');
		widget.append(div);

		assert.isTrue(meta.has('foo'), '1');
		assert.isTrue(meta.has('bar'), '2');
		assert.isTrue(onFoo.calledOnce, '3');
		assert.isTrue(onBar.calledOnce, '4');
		assert.isTrue(onWidget.calledOnce, '5');
		assert.isTrue(onFoo.calledBefore(onWidget), '6');
	},
	'integration with multiple root node'() {
		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
			getNodeHandler() {
				return this.nodeHandler;
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase) {
			render() {
				return [
					v('div', { key: 'foo' }),
					v('div', { key: 'bar' })
				];
			}

			getMeta() {
				return this.meta(MyMeta);
			}
		}

		const widget = new TestWidget();
		const meta = widget.getMeta();

		const nodeHandler = meta.getNodeHandler();
		const onFoo = stub();
		const onBar = stub();
		const onWidget = stub();
		const onProjector = stub();

		nodeHandler.on('foo', onFoo);
		nodeHandler.on('bar', onBar);
		nodeHandler.on(NodeEventType.Widget, onWidget);
		nodeHandler.on(NodeEventType.Projector, onProjector);

		const div = document.createElement('div');
		widget.append(div);

		assert.isTrue(meta.has('foo'));
		assert.isTrue(meta.has('bar'));
		assert.isTrue(onFoo.calledOnce);
		assert.isTrue(onBar.calledOnce);
		assert.isTrue(onWidget.calledOnce);
		assert.isTrue(onFoo.calledBefore(onWidget));
	}
});
