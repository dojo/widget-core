
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import {
	ThemeableMixin,
	theme,
	ThemeableProperties,
	INJECTED_THEME_KEY,
	registerThemeInjector
} from '../../../src/mixins/Themeable';
import { Injector } from './../../../src/Injector';
import { WidgetBase } from '../../../src/WidgetBase';
import { Registry } from '../../../src/Registry';
import { v } from '../../../src/d';
import { stub, SinonStub } from 'sinon';

import * as baseThemeClasses1 from './../../support/styles/testWidget1.css';
import * as baseThemeClasses2 from './../../support/styles/testWidget2.css';
import * as baseThemeClasses3 from './../../support/styles/baseTheme3.css';
import * as extraClasses1 from './../../support/styles/extraClasses1.css';
import testTheme1 from './../../support/styles/theme1.css';
import testTheme2 from './../../support/styles/theme2.css';
import testTheme3 from './../../support/styles/theme3.css';

(<any> baseThemeClasses1)[' _key'] = 'testPath1';
(<any> baseThemeClasses2)[' _key'] = 'testPath2';
(<any> baseThemeClasses3)[' _key'] = 'testPath3';

let testRegistry: Registry;

@theme(baseThemeClasses1)
class TestWidget extends ThemeableMixin(WidgetBase)<any> { }

@theme(baseThemeClasses2)
class SubClassTestWidget extends TestWidget { }

@theme(baseThemeClasses1)
@theme(baseThemeClasses2)
class StackedTestWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

@theme(baseThemeClasses1)
@theme(baseThemeClasses3)
class DuplicateThemeClassWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

class NonDecoratorDuplicateThemeClassWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> {
	constructor() {
		super();
		theme(baseThemeClasses3)(this);
		theme(baseThemeClasses1)(this);
	}
}

let consoleStub: SinonStub;

registerSuite('ThemeableMixin', {
	beforeEach() {
		testRegistry = new Registry();
		consoleStub = stub(console, 'warn');
	},
	afterEach() {
		consoleStub.restore();
	},
	tests: {
		'classes function': {
			'should return baseThemeClasses1 flagged classes via the classes function'() {
				const themeableInstance = new TestWidget();
				const { class1, class2 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(flaggedClasses, [ class1, class2 ]);
				assert.isFalse(consoleStub.called);
			},
			'should return negated classes for those that are not passed'() {
				const themeableInstance = new TestWidget();
				const { class1 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme(class1);
				assert.deepEqual(flaggedClasses, class1);
				assert.isFalse(consoleStub.called);
			},
			'should ignore any new classes that do not exist in the baseThemeClasses1 and show console error'() {
				const themeableInstance = new TestWidget();
				const { class1 } = baseThemeClasses1;
				const newClassName = 'newClassName';
				const flaggedClasses = themeableInstance.theme([class1, newClassName]);

				assert.deepEqual(flaggedClasses, [ class1, null ]);

				assert.isTrue(consoleStub.calledOnce);
				assert.strictEqual(consoleStub.firstCall.args[0], `Class name: '${newClassName}' not found in theme`);
			},
			'should split adjoined classes into multiple classes'() {
				const themeableInstance = new TestWidget();
				themeableInstance.__setProperties__({ theme: testTheme3 });
				const { class1, class2 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(flaggedClasses, [ 'testTheme3Class1 testTheme3AdjoinedClass1', class2 ]);
			},
			'should remove adjoined classes when they are no longer provided'() {
				const { class1, class2 } = baseThemeClasses1;
				const themeableInstance = new TestWidget();
				themeableInstance.__setProperties__({ theme: testTheme3 });
				let flaggedClasses = themeableInstance.theme([class1, class2]);
				themeableInstance.__setProperties__({ theme: testTheme1 });
				flaggedClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(flaggedClasses, [ testTheme1.testPath1.class1, baseThemeClasses1.class2 ]);
			},
			'should filter out falsy params passed to classes function'() {
				const themeableInstance = new TestWidget();
				const { class1, class2 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme([class1, null, class2, null, '']);
				assert.deepEqual(flaggedClasses,  [ class1, class2 ]);
				assert.isFalse(consoleStub.called);
			}
		},
		'setting a theme': {
			'should override base theme classes with theme classes'() {
				const themeableInstance = new TestWidget();
				themeableInstance.__setProperties__({ theme: testTheme1 });
				const { class1, class2 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(flaggedClasses, [ testTheme1.testPath1.class1, baseThemeClasses1.class2 ]);
			},
			'should return new theme classes when the theme is updated'() {
				const { class1, class2 } = baseThemeClasses1;
				const themeableInstance = new TestWidget();
				themeableInstance.__setProperties__({ theme: testTheme1 });
				let themeClasses: (string | null)[] | string | null  = themeableInstance.theme(class1);
				assert.deepEqual(themeClasses, testTheme1.testPath1.class1);
				themeableInstance.__setProperties__({ theme: testTheme2 });

				themeClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(themeClasses, [ testTheme2.testPath1.class1, baseThemeClasses1.class2 ]);
			}
		},
		'setting extra classes': {
			'should supplement base theme classes with extra classes'() {
				const themeableInstance = new TestWidget();
				themeableInstance.__setProperties__({ extraClasses: extraClasses1 });
				const { class1, class2 } = baseThemeClasses1;
				const flaggedClasses = themeableInstance.theme([class1, class2]);
				assert.deepEqual(flaggedClasses, [
					`${extraClasses1.class1} ${baseThemeClasses1.class1}`,
					baseThemeClasses1.class2
				]);
			}
		},
		'setting base theme classes': {
			'decorator': {
				'Themes get inherited from base classes and merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					const themeableInstance = new SubClassTestWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2, class3, class4]);
					assert.deepEqual(flaggedClasses, [ class1, class2, class3, class4 ]);
				},
				'Stacked themes get merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					const themeableInstance = new StackedTestWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2, class3, class4]);
					assert.deepEqual(flaggedClasses, [ class1, class2, class3, class4 ]);
				},
				'Can override classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class1: duplicateClass1 } = baseThemeClasses3;
					const themeableInstance = new DuplicateThemeClassWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2]);
					assert.deepEqual(flaggedClasses, [ duplicateClass1, class2 ]);
				}
			},
			'non decorator': {
				'Themes get inherited from base classes and merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					const themeableInstance = new SubClassTestWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2, class3, class4]);
					assert.deepEqual(flaggedClasses, [ class1, class2, class3, class4 ]);
				},
				'Stacked themes get merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					const themeableInstance = new StackedTestWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2, class3, class4]);
					assert.deepEqual(flaggedClasses, [ class1, class2, class3, class4 ]);
				},
				'Can override classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class1: duplicateClass1 } = baseThemeClasses3;
					const themeableInstance = new NonDecoratorDuplicateThemeClassWidget();
					const flaggedClasses = themeableInstance.theme([class1, class2]);
					assert.deepEqual(flaggedClasses, [ duplicateClass1, class2 ]);
				}
			}
		},
		'injecting a theme': {
			'theme can be injected by defining a ThemeInjector with registry'() {
				const injector = new Injector(testTheme1);
				testRegistry.defineInjector(INJECTED_THEME_KEY, injector);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}
				const themeableInstance = new InjectedTheme();
				themeableInstance.__setCoreProperties__({ bind: themeableInstance, baseRegistry: testRegistry });
				themeableInstance.__setProperties__({});
				const renderResult: any = themeableInstance.__render__();
				assert.deepEqual(renderResult.properties.classes, 'theme1Class1');
			},
			'theme will not be injected if a theme has been passed via a property'() {
				const injector = new Injector(testTheme1);
				testRegistry.defineInjector(INJECTED_THEME_KEY, injector);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}
				const themeableInstance = new InjectedTheme();
				themeableInstance.__setCoreProperties__({ bind: themeableInstance, baseRegistry: testRegistry });
				themeableInstance.__setProperties__({ theme: testTheme2 });
				const renderResult: any = themeableInstance.__render__();
				assert.deepEqual(renderResult.properties.classes, 'theme2Class1');
			},
			'does not attempt to inject if the ThemeInjector has not been defined in the registry'() {
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}

				}
				const themeableInstance = new InjectedTheme();
				const renderResult: any = themeableInstance.__render__();
				assert.deepEqual(renderResult.properties.classes, 'baseClass1');
			},
			'setting the theme invalidates and the new theme is used'() {
				const themeInjectorContext = registerThemeInjector(testTheme1, testRegistry);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}

				const testWidget = new InjectedTheme();
				testWidget.__setCoreProperties__({ bind: testWidget, baseRegistry: testRegistry });
				let renderResult: any = testWidget.__render__();
				assert.deepEqual(renderResult.properties.classes, baseThemeClasses1.class1);
				themeInjectorContext.set(testTheme2);
				testWidget.__setProperties__({});
				renderResult = testWidget.__render__();
				assert.deepEqual(renderResult.properties.classes, 'theme2Class1');
				themeInjectorContext.set(testTheme1);
				testWidget.__setProperties__({});
				renderResult = testWidget.__render__();
				assert.deepEqual(renderResult.properties.classes, 'theme1Class1');
				themeInjectorContext.set(testTheme1);
				testWidget.__setProperties__({ foo: 'bar' });
				renderResult = testWidget.__render__();
				assert.deepEqual(renderResult.properties.classes, 'theme1Class1');
			}
		},
		'integration': {
			'should work as mixin to createWidgetBase'() {
				const fixedClassName = 'fixedClassName';

				class IntegrationTest extends TestWidget {
					constructor() {
						super();
					}

					render() {
						const { class1 } = baseThemeClasses1;
						return v('div', [
							v('div', { classes: [ this.theme(class1), fixedClassName ] })
						]);
					}
				}

				const themeableWidget: any = new IntegrationTest();
				themeableWidget.__setProperties__({ theme: testTheme1 });

				const result = themeableWidget.__render__();
				assert.deepEqual(result.children![0].properties!.classes, [ testTheme1.testPath1.class1, fixedClassName ]);

				themeableWidget.__setProperties__({ theme: testTheme2 });

				const result2 = themeableWidget.__render__();
				assert.deepEqual(result2.children![0].properties!.classes, [ testTheme2.testPath1.class1, fixedClassName ]);
			}
		}
	}
});
