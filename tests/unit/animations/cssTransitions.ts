import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import dispatchSyntheticEvent from '../../support/dispatchSyntheticEvent';
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

				dispatchSyntheticEvent(div, 'transitionend', { bubbles: true, cancelable: true });

				assert.lengthOf(div.classList, 0);
			}), 20);
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

				dispatchSyntheticEvent(div, 'animationend', { bubbles: true, cancelable: false });

				assert.lengthOf(div.classList, 0);
			}), 20);
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

				dispatchSyntheticEvent(div, 'transitionend', { bubbles: true, cancelable: true });
			}, 20);
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

				dispatchSyntheticEvent(div, 'animationend', { bubbles: true, cancelable: false });
			}, 20);
		}
	}
});
