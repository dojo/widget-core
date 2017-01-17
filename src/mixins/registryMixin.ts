import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import FactoryRegistry from '../FactoryRegistry';

export interface RegistryMixinProperties {
	registry: FactoryRegistry;
}

export interface RegistryMixinOptions {
	properties: RegistryMixinProperties;
}

export interface RegistryMixin extends Evented {
}

export interface RegistryFactory extends ComposeFactory<RegistryMixin, RegistryMixinOptions> {}

export interface Registry extends RegistryMixin {
	readonly registry: FactoryRegistry;
	readonly properties: RegistryMixinProperties;
}

const internalRegistryMap = new WeakMap<Registry, FactoryRegistry>();

const registryFactory: RegistryFactory = createEvented.mixin({
	className: 'RegistryMixin',
	mixin: {
		get registry(this: Registry): FactoryRegistry {
			return internalRegistryMap.get(this);
		}
	},
	initialize(instance: Registry) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<RegistryMixin, RegistryMixinProperties>) => {
			if (includes(evt.changedPropertyKeys, 'registry')) {
				internalRegistryMap.set(instance, evt.properties.registry);
			}
		}));
		const { properties: { registry } } = instance;
		if (registry) {
			internalRegistryMap.set(instance, registry);
		}
	}
});

export default registryFactory;
