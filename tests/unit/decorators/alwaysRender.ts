import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { diffProperty, WidgetBase } from './../../../src/WidgetBase';
import { alwaysRender } from './../../../src/decorators/alwaysRender';
import { auto } from './../../../src/diff';

registerSuite({
	name: 'decorators/alwaysRender',
	alwaysRender() {
		let renderCount = 0;

		@alwaysRender()
		class AlwaysRender extends WidgetBase {
			render() {
				renderCount++;
				return super.render();
			}
		}

		const widget = new AlwaysRender();
		widget.__render__();
		widget.__setProperties__({});
		widget.__render__();
		assert.strictEqual(renderCount, 2);
	},
	'alwaysRender on widgets with custom diff (`diffProperty`) throw an error'() {
		let renderCount = 0;

		@diffProperty('property', auto)
		@alwaysRender()
		class AlwaysRender extends WidgetBase {
			render() {
				renderCount++;
				return super.render();
			}
		}

		const widget = new AlwaysRender();
		assert.throws(() => {
			widget.__setProperties__({});
		}, Error, 'Widget marked as `alwayRender` but has custom diffs registered');
	}
});
