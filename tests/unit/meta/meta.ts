import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Base as MetaBase } from '../../../src/meta/Base';
import { stub, SinonStub, spy } from 'sinon';
import NodeHandler from '../../../src/NodeHandler';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemeableMixin } from './../../../src/mixins/Themeable';

let rAFStub: SinonStub;
let cancelrAFStub: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAFStub.callCount; i++) {
		rAFStub.getCall(i).args[0]();
	}
	rAFStub.reset();
}

registerSuite({
	name: 'meta base',
	beforeEach() {
		rAFStub = stub(global, 'requestAnimationFrame').returns(1);
		cancelrAFStub = stub(global, 'cancelAnimationFrame');
	},
	afterEach() {
		rAFStub.restore();
		cancelrAFStub.restore();
	},
	'has checks nodehandler for nodes'() {
		const nodeHandler = new NodeHandler();
		const element = document.createElement('div');
		nodeHandler.add(element, { key: 'foo' });
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
		nodeHandler.add(element, { key: 'foo' });

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

		nodeHandler.add(element, { key: 'foo' });

		resolveRAF();
		assert.isTrue(invalidate.calledOnce);

		onSpy.reset();
		meta.callGetNode('foo');

		assert.isFalse(onSpy.called);
	},
	'Will throw error if node not available on second get'() {
		const nodeHandler = new NodeHandler();
		const onSpy = spy(nodeHandler, 'on');
		const invalidate = stub();
		let errorThrown = false;

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

		try {
			meta.callGetNode('foo');
		}
		catch (e) {
			errorThrown = true;
		}

		assert.isTrue(errorThrown);
		assert.isFalse(invalidate.called);
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
		assert.isTrue(invalidate.calledOnce);
	},
	'old invalidate calls are cancelled'() {
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
		meta.callInvalidate();
		meta.callInvalidate();
		resolveRAF();
		assert.isTrue(cancelrAFStub.calledThrice);
	},
	'integration'() {
		// class TestWidgetBase<P = any> extends ThemeableMixin(WidgetBase)<P> {}

		class MyMeta extends MetaBase {
			callGetNode(key: string) {
				return this.getNode(key);
			}
		}

		class TestWidget extends ProjectorMixin(WidgetBase) {
			render() {
				return v('div', { key: 'foo' }, [
					v('div', { 'key': 'bar' }, [ 'hello world' ])
				]);
			}

			getMeta() {
				return this.meta(MyMeta);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);
		const meta = widget.getMeta();

		assert.isTrue(meta.has('foo'));
		assert.isTrue(meta.has('bar'));
	}
});
