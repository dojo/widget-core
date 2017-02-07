import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { RegistryMixin } from '../../../src/mixins/RegistryMixin';
import FactoryRegistry from '../../../src/FactoryRegistry';
import { WidgetBase } from '../../../src/WidgetBase';
import { w, v } from '../../../src/d';
import { VNode } from '@dojo/interfaces/vdom';

class TestWithRegistry extends RegistryMixin(WidgetBase) {}

registerSuite({
	name: 'mixins/RegistryMixin',
	property: {
		'passed registry is available via getter'() {
			const registry = new FactoryRegistry();
			const instance: any = new TestWithRegistry({
				properties: { registry }
			});
			assert.equal(instance.registry, registry);
		},
		'no passed registry, nothing available via getter'() {
			const instance: any = new TestWithRegistry({
				properties: {}
			});
			assert.equal(instance.registry, undefined);
		},
		'passed registry updated on property change'() {
			const registry = new FactoryRegistry();
			const newRegistry = new FactoryRegistry();
			const instance: any = new TestWithRegistry({
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
		},
		'different property passed on property change should not affect registy'() {
			const registry = new FactoryRegistry();
			const instance: any = new TestWithRegistry({
				properties: { registry }
			});
			assert.equal(instance.registry, registry);
			instance.emit({
				type: 'properties:changed',
				target: instance,
				properties: { foo: true },
				changedPropertyKeys: [ 'foo' ]
			});
			assert.equal(instance.registry, registry);
		}
	},
	integration: {
		'works with widget base'() {
			class IntegrationTest extends TestWithRegistry {
				render() {
					return v('div', [
						w('test', { id: `${Math.random()}` })
					]);
				}
			}
			class Header extends WidgetBase {
				render() {
					return v('header');
				}
			}
			class Span extends WidgetBase {
				render() {
					return v('span');
				}
			}

			const registry = new FactoryRegistry();
			registry.define('test', Header);

			const instance: any = new IntegrationTest({ properties: { registry } });

			let result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

			const newRegistry = new FactoryRegistry();
			newRegistry.define('test', Span);

			instance.setProperties({ registry: newRegistry });

			result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'span');
		}
	}
});
