import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

function createTests(url: string) {
	return {
		'custom elements are registered'(this: any) {
			if (this.remote.session.capabilities.browserName === 'internet explorer' && this.remote.session.capabilities.version === '10') {
				this.skip('not compatible with IE 10');
			}

			return this.remote
				.get(url)
				.findByCssSelector('test-button > button');
		},
		'custom element initial properties are set correctly'(this: any) {
			if (this.remote.session.capabilities.browserName === 'internet explorer' && this.remote.session.capabilities.version === '10') {
				this.skip('not compatible with IE 10');
			}

			return this.remote
				.get(url)
				.findByCssSelector('test-button > button')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'hello world');
				});
		},
		'custom element event handlers are registered'(this: any) {
			if (this.remote.session.capabilities.browserName === 'internet explorer' && this.remote.session.capabilities.version === '10') {
				this.skip('not compatible with IE 10');
			}

			return this.remote
				.get(url)
				.findByCssSelector('test-button > button')
				.click()
				.end()
				.execute('return window.buttonClicked')
				.then((buttonClicked: boolean) => {
					assert.isTrue(buttonClicked);
				});
		},
		'setting custom element attribute updates properties'(this: any) {
			if (this.remote.session.capabilities.browserName === 'internet explorer' && this.remote.session.capabilities.version === '10') {
				this.skip('not compatible with IE 10');
			}

			return this.remote
				.get(url)
				.findByCssSelector('test-button > button')
				.end()
				.execute('document.querySelector("test-button").setAttribute("label", "greetings")')
				.execute('return document.querySelector("test-button > button").innerHTML')
				.then((text: string) => {
					assert.strictEqual(text, 'greetings world');
				});
		}
	};
}

registerSuite({
	name: 'registerCustomElement',

	'v1': createTests((<any> require).toUrl('./support/registerCustomElementV1.html'))
});
