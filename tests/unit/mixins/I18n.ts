const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import i18n, { invalidate, switchLocale, systemLocale } from '@dojo/i18n/i18n';
import Map from '@dojo/shim/Map';
import { INJECTOR_KEY, I18nMixin, I18nProperties, registerI18nInjector } from '../../../src/mixins/I18n';
import { Registry } from '../../../src/Registry';
import { WidgetBase } from '../../../src/WidgetBase';
import bundle from '../../support/nls/greetings';
import { fetchCldrData } from '../../support/util';
import { v, w } from './../../../src/d';
import { ThemedMixin } from './../../../src/mixins/Themed';

class Localized extends I18nMixin(ThemedMixin(WidgetBase))<I18nProperties> {}

class LocalizedWithWidget extends I18nMixin(ThemedMixin(WidgetBase))<I18nProperties> {
	render() {
		return w(Localized, {}, [v('div', {})]);
	}
}

const overrideBundle = {
	locales: {
		es: () => ({
			hello: 'Hola',
			goodbye: 'Adiós',
			welcome: 'Bienvenido, {name}'
		})
	},
	messages: {
		hello: 'Hi!',
		goodbye: 'Bye!',
		welcome: 'Salutations, {name}!'
	}
};

let localized: any;

registerSuite('mixins/I18nMixin', {
	before() {
		return <Promise<any>>fetchCldrData();
	},

	afterEach() {
		invalidate();
		switchLocale(systemLocale);

		if (localized) {
			localized = null;
		}
	},

	tests: {
		api() {
			const localized = new Localized();
			assert(localized);
			assert.isFunction(localized.localizeBundle);
		},

		'.localizeBundle()': {
			'Returns blank messages when locale bundle not loaded'() {
				switchLocale('fr');

				localized = new Localized();
				const { format, isPlaceholder, messages } = localized.localizeBundle(bundle);

				assert.isTrue(isPlaceholder);
				assert.strictEqual(messages.hello, '');
				assert.strictEqual(messages.goodbye, '');
				assert.strictEqual(format('hello'), '');
			},

			'Returns default messages with second argument when locale bundle not loaded'() {
				switchLocale('fr');

				localized = new Localized();
				const { format, isPlaceholder, messages } = localized.localizeBundle(bundle, true);

				assert.isTrue(isPlaceholder);
				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
				assert.strictEqual(format('hello'), 'Hello');
			},

			'Returns default messages when bundle has no supported locales'() {
				switchLocale('fr');

				localized = new Localized();
				const { isPlaceholder, messages } = localized.localizeBundle({
					messages: {
						hello: 'Hello',
						goodbye: 'Goodbye'
					}
				});

				assert.isFalse(isPlaceholder);
				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
			},

			'Uses `properties.locale` when available'() {
				localized = new Localized();
				localized.__setProperties__({ locale: 'fr' });
				return i18n(bundle, 'fr').then(() => {
					const { isPlaceholder, messages } = localized.localizeBundle(bundle);
					assert.isFalse(isPlaceholder);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Uses default locale when no locale is set'() {
				switchLocale('fr');

				localized = new Localized();
				return i18n(bundle, 'fr').then(() => {
					const { isPlaceholder, messages } = localized.localizeBundle(bundle);
					assert.isFalse(isPlaceholder);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Returns an object with a `format` method'() {
				localized = new Localized();
				let { format } = localized.localizeBundle(bundle);

				assert.isFunction(format);
				assert.strictEqual(format('welcome', { name: 'Bill' }), 'Welcome, Bill!');

				switchLocale('fr');

				return i18n(bundle, 'fr').then(() => {
					format = localized.localizeBundle(bundle).format;
					assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
				});
			}
		},
		'.localizeBundle() with an override': {
			'Uses the `overrideBundle` property'(this: any) {
				const dfd = this.async();

				localized = new Localized();
				localized.__setProperties__({ overrideBundle });

				switchLocale('es');
				localized.localizeBundle(bundle);
				setTimeout(
					dfd.callback(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hola');
						assert.strictEqual(messages.goodbye, 'Adiós');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
					})
				);
			},
			'Merges locales with the base bundle when the override contains no messages'(this: any) {
				const dfd = this.async();
				localized = new Localized();
				localized.__setProperties__({ overrideBundle: { locales: overrideBundle.locales } });

				switchLocale('es');
				localized.localizeBundle(bundle);
				setTimeout(
					dfd.callback(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hola');
						assert.strictEqual(messages.goodbye, 'Adiós');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
					})
				);
			},
			'Preserves existing locale loaders when the override contains no messages'(this: any) {
				const dfd = this.async();
				localized = new Localized();
				localized.__setProperties__({ overrideBundle: { locales: overrideBundle.locales } });

				switchLocale('fr');
				localized.localizeBundle(bundle);
				setTimeout(
					dfd.callback(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Bonjour');
						assert.strictEqual(messages.goodbye, 'Au revoir');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
					})
				);
			},
			'Allows `overrideBundle` to be a `Map`'(this: any) {
				const dfd = this.async();
				const overrideBundleMap = new Map<any, any>();
				overrideBundleMap.set(bundle, overrideBundle);

				localized = new Localized();
				localized.__setProperties__({ overrideBundle: overrideBundleMap });

				switchLocale('es');
				localized.localizeBundle(bundle);
				setTimeout(
					dfd.callback(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hola');
						assert.strictEqual(messages.goodbye, 'Adiós');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
					})
				);
			},
			'Uses the base bundle when the `overrideBundle` map does not contain an override'(this: any) {
				const dfd = this.async();
				const overrideBundleMap = new Map<any, any>();

				localized = new Localized();
				localized.__setProperties__({ overrideBundle: overrideBundleMap });

				switchLocale('es');
				localized.localizeBundle(bundle);
				setTimeout(
					dfd.callback(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hello');
						assert.strictEqual(messages.goodbye, 'Goodbye');
						assert.strictEqual(format('hello'), 'Hello');
					})
				);
			}
		},
		'locale data can be injected by defining an Injector with a registry': {
			'defaults to the injector data'() {
				const injector = () => () => ({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({});

				const result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'ar');
				assert.strictEqual(result.properties!['dir'], 'rtl');
			},

			'does not override property values'() {
				const injector = () => () => ({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({ locale: 'fr', rtl: false });

				const result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'fr');
				assert.strictEqual(result.properties!['dir'], 'ltr');
			},

			'properties can be registered with helper'() {
				const registry = new Registry();
				const injector = registerI18nInjector({ locale: 'fr' }, registry);

				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({});

				let result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'fr');

				injector.set({ locale: 'jp' });
				localized.__setProperties__({});
				result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'jp');
			}
		},
		'does not decorate properties for wNode'() {
			class LocalizedExtended extends Localized {
				render() {
					return w(Localized, {});
				}
			}

			localized = new LocalizedExtended();
			localized.__setProperties__({ locale: 'ar-JO' });

			const result = localized.__render__();
			assert.isOk(result);
			assert.isUndefined(result.properties!['lang']);
		},
		"`properties.locale` updates the widget node's `lang` property": {
			'when non-empty'() {
				localized = new Localized();
				localized.__setProperties__({ locale: 'ar-JO' });

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['lang'], 'ar-JO');
			},

			'when empty'() {
				localized = new Localized();

				const result = localized.__render__();
				assert.isOk(result);
				assert.isNull(result.properties!['lang']);
			}
		},

		'`properties.rtl`': {
			'The `dir` attribute is "rtl" when true'() {
				localized = new Localized();
				localized.__setProperties__({ rtl: true });

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['dir'], 'rtl');
			},

			'The `dir` attribute is "ltr" when false'() {
				localized = new Localized();
				localized.__setProperties__({ rtl: false });

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['dir'], 'ltr');
			},

			'The `dir` attribute is not set when not a boolean.'() {
				localized = new Localized();

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties.dir, '');
			},

			'The `dir` attribute is added to the first VNode in the render'() {
				localized = new LocalizedWithWidget();
				localized.__setProperties__({ rtl: false });

				const result = localized.__render__();
				assert.isOk(result);
				assert.isUndefined(result.properties!['dir']);
				assert.strictEqual(result.children[0].properties!['dir'], 'ltr');
			}
		}
	}
});
