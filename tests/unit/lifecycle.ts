import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../src/WidgetBase';
import { v } from '../../src/d';
import { ProjectorMixin } from '../../src/mixins/Projector';
import { WidgetProperties, HNode } from '../../src/interfaces';
import { VNode } from '@dojo/interfaces/vdom';
import { waitFor } from './waitFor';

class TesterWidget extends WidgetBase<WidgetProperties> {
	public created: Array<{key: string, element: Element}> = [];
	public updated: Array<{key: string, element: Element}> = [];

	protected onElementCreated(element: Element, key: string): void {
		this.created.push({
			key: key,
			element: element
		});
	}

	protected onElementUpdated(element: Element, key: string): void {
		this.updated.push({
			key: key,
			element: element
		});
	}

	public addExtra: boolean = false;
}

/**
 * Test widget that records the calls to the lifecycle methods.
 */
class WidgetA extends TesterWidget {
	public render(): HNode {
		const root: HNode = v('div', {
			key: 'div1'
		}, [
			v('div', {}, [
				v('div', {
					key: 'div2'
				}, ['This is a test'])
			])
		]);
		// if (this.addExtra) {
		// 	root.children.push(v('div', {
		// 		key: 'extra',
		// 		id: 'extra'
		// 	}))
		// }
		return root;
	}
}

/**
 * Test widget that adds afterCreate and afterUpdate callbacks to each vnode.
 */
class WidgetB extends TesterWidget {
	public afterCreateCounter = 0;
	public afterUpdateCounter = 0;

	private incrementCreateCounter(): void {
		this.afterCreateCounter++;
	}

	private incrementUpdateCounter(): void {
		this.afterCreateCounter++;
	}

	public render(): HNode {
		return v('div', {
			key: 'div1',
			afterCreate: this.incrementCreateCounter.bind(this),
			afterUpdate: this.incrementUpdateCounter.bind(this)
		}, [
			v('div', {
				afterCreate: this.incrementCreateCounter.bind(this),
				afterUpdate: this.incrementUpdateCounter.bind(this)
			}, [
				v('div', {
					key: 'div2',
					afterCreate: this.incrementCreateCounter.bind(this),
					afterUpdate: this.incrementUpdateCounter.bind(this)
				}, ['This is a test'])
			])
		]);
	}
}

let root: Element | undefined;

registerSuite({
	name: 'WidgetBase Node Lifecycle',

	beforeEach() {
		root = document.createElement('div');
	},

	afterEach() {
		if (root && root.parentNode) {
			root.parentNode.removeChild(root);
			root = undefined;
		}
	},

	'on create'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		return projector.append(root).then((handle) => {
			assert.strictEqual(projector.created.length, 2);
			assert.strictEqual(projector.updated.length, 0);
			handle.destroy();
		});
	},

	'on create order'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		return projector.append(root).then((handle) => {
			assert.strictEqual(projector.created[0].key, 'div2');
			assert.strictEqual(projector.created[1].key, 'div1');
			handle.destroy();
		});
	},

	'on create with afterCreate'() {
		const Projector = ProjectorMixin(WidgetB);
		const projector = new Projector();
		return projector.append(root).then((handle) => {
			assert.strictEqual(projector.created.length, 2);
			assert.strictEqual(projector.afterCreateCounter, 3);
			assert.strictEqual(projector.afterUpdateCounter, 0);
			assert.strictEqual(projector.updated.length, 0);
			handle.destroy();
		});
	},

	async 'on update'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		await projector.append(root);

		projector.addExtra = true;
		projector.invalidate();

		await waitFor((): boolean => {
			return document.getElementById('extra') != null;
		}, 'DOM update did not occur');

		assert.strictEqual(projector.created.length, 2);
		assert.strictEqual(projector.updated.length, 2);
	}
});
