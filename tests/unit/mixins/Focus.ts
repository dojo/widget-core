const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';
import { v, w } from '../../../src/d';
import { WidgetBase } from '../../../src/WidgetBase';
import Focus from '../../../src/mixins/Focus';

describe('Focus Mixin', () => {
	describe('this.focus()', () => {
		it('should allow focus once per this.focus()', () => {
			class Focusable extends Focus(WidgetBase) {
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.focus('button');

			let result = widget.__render__();
			assert.isFunction((result as any).properties!.focus);

			widget.invalidate();
			result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});

		it('should not focus without a key', () => {
			class Focusable extends Focus(WidgetBase) {
				render() {
					return v('button', {});
				}
			}

			const widget = new Focusable();
			widget.focus('button');

			let result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});

		it('should not focus incorrect key', () => {
			class Focusable extends Focus(WidgetBase) {
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.focus('btn');

			let result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});

		it('can call focus twice', () => {
			class Focusable extends Focus(WidgetBase) {
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.focus('button');

			let result = widget.__render__();
			assert.isFunction((result as any).properties!.focus);

			widget.invalidate();
			widget.focus('button');
			result = widget.__render__();
			assert.isFunction((result as any).properties!.focus);
		});

		it('should set focus on child widgets', () => {
			class Child extends Focus(WidgetBase) {}

			class Parent extends Focus(WidgetBase) {
				render() {
					return w(Child, { key: 'child' });
				}
			}

			const widget = new Parent();
			widget.focus('child');
			let result = widget.__render__();
			assert.strictEqual((result as any).properties!.key, 'child');
			assert.isFunction((result as any).properties!.focus);
		});
	});

	describe('properties.focus', () => {
		it('should pass focus property to child', () => {
			class Focusable extends Focus(WidgetBase) {
				focusKey = 'button';
				render() {
					return v('button', { key: 'button' });
				}
			}

			const focusStub = stub().returns(true);
			const widget = new Focusable();
			widget.__setProperties__({ focus: focusStub });

			let result = widget.__render__();
			assert.isTrue((result as any).properties!.focus());
		});

		it('should not pass focus property with no focusKey', () => {
			class Focusable extends Focus(WidgetBase) {
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.__setProperties__({ focus: true });

			let result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});

		it('should not pass focus property with incorrect focusKey', () => {
			class Focusable extends Focus(WidgetBase) {
				focusKey = 'btn';
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.__setProperties__({ focus: true });

			let result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});

		it('should always pass focus property to child', () => {
			class Focusable extends Focus(WidgetBase) {
				focusKey = 'button';
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.__setProperties__({ focus: true });

			let result = widget.__render__();
			assert.isTrue((result as any).properties!.focus);

			widget.invalidate();
			result = widget.__render__();
			assert.isTrue((result as any).properties!.focus);
		});

		it('should diff focus function', () => {
			class Focusable extends Focus(WidgetBase) {
				focusKey = 'button';
				render() {
					return v('button', { key: 'button' });
				}
			}

			const widget = new Focusable();
			widget.__setProperties__({ focus: () => true });

			let result = widget.__render__();
			assert.isTrue((result as any).properties!.focus());

			widget.__setProperties__({ focus: () => false });
			result = widget.__render__();
			assert.isUndefined((result as any).properties!.focus);
		});
	});
});
