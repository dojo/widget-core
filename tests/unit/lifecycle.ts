import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../src/WidgetBase';
import { v } from '../../src/d';
import { ProjectorMixin } from '../../src/mixins/Projector';
import { WidgetProperties, HNode } from '../../src/interfaces';

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
}

class WidgetA extends TesterWidget {
	public render(): HNode {
		return v('div', {
			key: 'div1'
		}, [
			v('div', {}, [
				v('div', {
					key: 'div2'
				}, ['This is a test'])
			])
		]);
	}
}

class WidgetB extends TesterWidget {
	public counter = 0;

	private incrementCounter(): void {
		this.counter++;
	}

	public render(): HNode {
		return v('div', {
			key: 'div1',
			afterCreate: this.incrementCounter.bind(this)
		}, [
			v('div', {
				afterCreate: this.incrementCounter.bind(this)
			}, [
				v('div', {
					key: 'div2',
					afterCreate: this.incrementCounter.bind(this)
				}, ['This is a test'])
			])
		]);
	}
}

registerSuite({
	name: 'WidgetBase Node Lifecycle',

	'on create'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		return projector.append().then(() => {
			assert.strictEqual(projector.created.length, 2);
			assert.strictEqual(projector.updated.length, 0);
		});
	},

	'on create order'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		return projector.append().then(() => {
			assert.strictEqual(projector.created[0].key, 'div2');
			assert.strictEqual(projector.created[1].key, 'div1');
		});
	},

	'on create with afterCreate'() {
		const Projector = ProjectorMixin(WidgetB);
		const projector = new Projector();
		return projector.append().then(() => {
			assert.strictEqual(projector.created.length, 2);
			assert.strictEqual(projector.counter, 3);
			assert.strictEqual(projector.updated.length, 0);
		});
	}
});
