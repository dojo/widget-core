import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Base as MetaBase } from '../../../src/meta/Base';
import { stub, SinonStub } from 'sinon';
import NodeHandler from '../../../src/NodeHandler';

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
	}
});
