import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import registryMixin from '../../../src/mixins/registryMixin';
import FactoryRegistry from '../../../src/FactoryRegistry';
import createWidgetBase from '../../../src/createWidgetBase';
import { w } from '../../../src/d';
import { VNode } from '@dojo/interfaces/vdom';

const createRegistryWithProperties = compose({
	properties: <any> {},
	registry: <any> undefined
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(registryMixin);

registerSuite({
	name: 'mixins/registryMixin',
	property: {
		'passed registry is available via getter'() {
			const registry = new FactoryRegistry();
			const instance = createRegistryWithProperties({
				properties: { registry }
			});
			assert.equal(instance.registry, registry);
		},
		'passed registry updated on property change'() {
			const registry = new FactoryRegistry();
			const newRegistry = new FactoryRegistry();
			const instance = createRegistryWithProperties({
				properties: { registry }
			});
			assert.equal(instance.registry, registry);
			instance.emit({
				type: 'properties:changed',
				target: instance,
				properties: { registry: newRegistry },
				changedPropertyKeys: [ 'registry' ]
			});
			assert.equal(instance.registry, newRegistry);
		}
	},
	integration: {
		'works with widget base'() {
			const createWidgetWithRegistry = createWidgetBase.mixin(registryMixin);
			const createHeader = createWidgetBase.override({ tagName: 'header' });

			const registry = new FactoryRegistry();
			registry.define('my-header', createHeader);

			const instance = createWidgetWithRegistry({
				properties: { registry }
			});

			instance.children = [ w('my-header', {}) ];

			const result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

		}
	}
});
