import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import cssTransistions from '../../../src/animations/cssTransitions';

registerSuite({
	name: 'animations/cssTransistions',

	'enter': {
		'transitionend'(this: any) {
			const dfd = this.async();
			const div = document.createElement('div');
			cssTransistions.enter(div, {}, 'foo');
			assert.lengthOf(div.classList, 1);
			assert.isTrue(div.classList.contains('foo'));

			setInterval(dfd.callback(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));

				const evt = new window.CustomEvent('transitionend', {
					bubbles: true,
					cancelable: true
				});
				div.dispatchEvent(evt);

				assert.lengthOf(div.classList, 0);
			}), 10);
		},

		'animationend'(this: any) {
			const dfd = this.async();
			const div = document.createElement('div');
			cssTransistions.enter(div, {}, 'foo');
			assert.lengthOf(div.classList, 1);
			assert.isTrue(div.classList.contains('foo'));

			setInterval(dfd.callback(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));

				const evt = new window.CustomEvent('animationend', {
					bubbles: true,
					cancelable: false
				});
				div.dispatchEvent(evt);

				assert.lengthOf(div.classList, 0);
			}), 10);
		}
	},

	'exit': {
		'transitionend'(this: any) {
			const dfd = this.async();
			const div = document.createElement('div');
			cssTransistions.exit(div, {}, 'foo', dfd.callback(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));
			}));

			assert.lengthOf(div.classList, 1);
			assert.isTrue(div.classList.contains('foo'));

			setInterval(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));

				const evt = new window.CustomEvent('transitionend', {
					bubbles: true,
					cancelable: true
				});
				div.dispatchEvent(evt);
			}, 10);
		},

		'animationend'(this: any) {
			const dfd = this.async();
			const div = document.createElement('div');
			cssTransistions.exit(div, {}, 'foo', dfd.callback(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));
			}));

			assert.lengthOf(div.classList, 1);
			assert.isTrue(div.classList.contains('foo'));

			setInterval(() => {
				assert.lengthOf(div.classList, 2);
				assert.isTrue(div.classList.contains('foo-active'));

				const evt = new window.CustomEvent('animationend', {
					bubbles: true,
					cancelable: false
				});
				div.dispatchEvent(evt);
			}, 10);
		}
	}
});
