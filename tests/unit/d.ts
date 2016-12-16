import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetProps } from './../../src/interfaces';
import createWidgetBase from '../../src/createWidgetBase';
import { v, w, registry } from '../../src/d';
import FactoryRegistry from './../../src/FactoryRegistry';

class TestFactoryRegistry extends FactoryRegistry {
	clear() {
		this.registry.clear();
	}
}

registerSuite({
	name: 'd',
	'provides default factory registry'() {
		assert.isObject(registry);
	},
	w: {
		'create WNode wrapper'() {
			const options: WidgetProps = { id: 'id', tagName: 'header', hello: 'world' };
			const dNode = w(createWidgetBase, options);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.options, { id: 'id', tagName: 'header', props: options });
		},
		'create WNode wrapper using a factory label'() {
			registry.define('my-widget', createWidgetBase);
			const options: WidgetProps = { id: 'id', tagName: 'header', hello: 'world' };
			const dNode = w('my-widget', options);
			assert.deepEqual(dNode.factory, 'my-widget');
			assert.deepEqual(dNode.options, { id: 'id', tagName: 'header', props: options });
		},
		'create WNode wrapper with children'() {
			const options: WidgetProps = { id: 'id', tagName: 'header', hello: 'world' };
			const dNode = w(createWidgetBase, options, [ w(createWidgetBase, options) ]);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.options, { id: 'id', tagName: 'header', props: options });
			assert.lengthOf(dNode.children, 1);
		}
	},
	v: {
		'create HNode wrapper'() {
			const hNode = v('div');
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
		},
		'create HNode wrapper with options'() {
			const hNode = v('div', { innerHTML: 'Hello World' });
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
			const render = hNode.render();
			assert.equal(render.vnodeSelector, 'div');
			assert.equal(render.properties && render.properties.innerHTML, 'Hello World');
		},
		'create HNode wrapper with children'() {
			const hNode = v('div', {}, [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
		},
		'create HNode wrapper with children as options param'() {
			const hNode = v('div', [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
		},
		'create HNode wrapper with text node children'() {
			const hNode = v('div', {}, [ 'This Text Node', 'That Text Node' ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
		}
	}
});
