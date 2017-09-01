import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { VNode } from '@dojo/interfaces/vdom';
import { WidgetBase } from './../../../src/WidgetBase';
import { define } from './../../../src/decorators/registry';
import { v, w } from './../../../src/d';
import { WidgetRegistry } from './../../../src/WidgetRegistry';

registerSuite({
	name: 'decorators/registry',
	'register items against created default registry'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class TestWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
		}

		const widget = new TestWidget();
		const vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');
	},
	'register items against passed default registry'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class TestWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
		}

		const defaultRegistry = new WidgetRegistry();

		const widget = new TestWidget();
		widget.__setProperties__({ defaultRegistry } as any);
		const vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');
	},
	're-registers items when the default registry changes'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class TestWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
		}

		const defaultRegistry = new WidgetRegistry();

		const widget = new TestWidget();
		widget.__setProperties__({ defaultRegistry } as any);
		let vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');
		widget.__setProperties__({ defaultRegistry: new WidgetRegistry() } as any);
		vnode = widget.__render__() as VNode;
		assert.strictEqual(vnode.vnodeSelector, 'registry-item');
	},
	'supports the same widget being used twice'() {
		class RegistryWidget extends WidgetBase {
			render() {
				return v('registry-item');
			}
		}

		@define('registry-item', RegistryWidget)
		class RegistryItemWidget extends WidgetBase {
			render() {
				return w('registry-item', {});
			}
		}

		class TestWidget extends WidgetBase {
			render() {
				return [
					w(RegistryItemWidget, { key: '1' }),
					w(RegistryItemWidget, { key: '2' })
				];
			}
		}
		const widget = new TestWidget();
		let vnode = widget.__render__() as VNode[];
		assert.strictEqual(vnode[0].vnodeSelector, 'registry-item');
		assert.strictEqual(vnode[1].vnodeSelector, 'registry-item');
	}
});
