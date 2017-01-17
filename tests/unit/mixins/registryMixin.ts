import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import registryMixin from '../../../src/mixins/registryMixin';
import FactoryRegistry from '../../../src/FactoryRegistry';

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
	observe: {
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
	}
});
