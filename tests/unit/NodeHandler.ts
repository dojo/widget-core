import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';
import NodeHandler, { NodeEventType } from '../../src/NodeHandler';

const elementStub: SinonStub = stub();
const widgetStub: SinonStub = stub();
const projectorStub: SinonStub = stub();
let nodeHandler: NodeHandler;
let element: HTMLElement;

registerSuite({
	name: 'NodeHandler',
	beforeEach() {
		nodeHandler = new NodeHandler();
		element = document.createElement('div');
	},
	'add populates nodehandler map'() {
		nodeHandler.add(element, { key: 'foo' });
		assert.isTrue(nodeHandler.has('foo'));
	},
	'has returns undefined when element does not exist'() {
		assert.isFalse(nodeHandler.has('foo'));
	},
	'get returns elements that have been added'() {
		nodeHandler.add(element, { key: 'foo' });
		assert.equal(nodeHandler.get('foo'), element);
	},
	'clear removes nodes from map'() {
		nodeHandler.add(element, { key: 'foo' });
		assert.isTrue(nodeHandler.has('foo'));
		nodeHandler.clear();
		assert.isFalse(nodeHandler.has('foo'));
	},
	'events': {
		beforeEach() {
			elementStub.reset();
			widgetStub.reset();
			projectorStub.reset();

			nodeHandler.on('foo', elementStub);
			nodeHandler.on(NodeEventType.Widget, widgetStub);
			nodeHandler.on(NodeEventType.Projector, projectorStub);
		},
		'add emits event when element added'() {
			nodeHandler.add(element, { key: 'foo' });

			assert.isTrue(elementStub.calledOnce);
			assert.isTrue(widgetStub.notCalled);
			assert.isTrue(projectorStub.notCalled);
		},
		'add root emits Widget and element event'() {
			nodeHandler.addRoot(element, { key: 'foo' });

			assert.isTrue(widgetStub.calledOnce);
			assert.isTrue(elementStub.calledOnce);
			assert.isTrue(projectorStub.notCalled);
		},
		'add root without a key emits Widget event only'() {
			nodeHandler.addRoot(element, {});

			assert.isTrue(widgetStub.calledOnce);
			assert.isTrue(elementStub.notCalled);
			assert.isTrue(projectorStub.notCalled);
		},
		'add projector emits Projector event'() {
			nodeHandler.addProjector();

			assert.isTrue(widgetStub.notCalled);
			assert.isTrue(elementStub.notCalled);
			assert.isTrue(projectorStub.calledOnce);
		}
	}
});
