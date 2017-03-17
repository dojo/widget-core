import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { ThemeableMixin, theme, ThemeableProperties } from '../../../src/mixins/Themeable';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { stub, SinonStub } from 'sinon';

import * as baseClasses1 from './../../support/styles/testWidget1.css';
import * as baseClasses2 from './../../support/styles/testWidget2.css';
import * as overrideClasses1 from './../../support/styles/overrideClasses1.css';
import * as overrideClasses2 from './../../support/styles/overrideClasses2.css';
import testTheme1 from './../../support/styles/theme1.css';
import testTheme2 from './../../support/styles/theme2.css';
import testTheme3 from './../../support/styles/theme3.css';

(<any> baseClasses1)[' _key'] = 'testPath1';
(<any> baseClasses2)[' _key'] = 'testPath2';

@theme(baseClasses1)
class Test extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

@theme(baseClasses2)
class TestWidget2 extends Test { }

let themeableInstance: Test;
let consoleStub: SinonStub;

registerSuite({
	name: 'themeManager',
	'classes function': {
		beforeEach() {
			consoleStub = stub(console, 'warn');
		},
		afterEach() {
			consoleStub.restore();
		},
		'should return baseClasses1 flagged classes via the classes function'() {
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should return negated classes for those that are not passed'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should ignore any new classes that do not exist in the baseClasses1 and show console error'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses1;
			const newClassName = 'newClassName';
			const flaggedClasses = themeableInstance.classes(class1, newClassName).get();

			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true
			});

			assert.isTrue(consoleStub.calledOnce);
			assert.strictEqual(consoleStub.firstCall.args[0], `Class name: ${newClassName} is not from 'registeredBaseThemeClasses', use chained 'fixed' method instead`);
		},
		'should split adjoined classes into multiple classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme3 });
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				testTheme3Class1: true,
				testTheme3AdjoinedClass1: true,
				[ baseClasses1.class2 ]: true
			});
		},
		'should remove adjoined classes when they are no longer provided'() {
			const { class1, class2 } = baseClasses1;
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme3 });
			let flaggedClasses = themeableInstance.classes(class1, class2).get();
			themeableInstance.setProperties({ theme: testTheme1 });
			flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				testTheme3Class1: false,
				testTheme3AdjoinedClass1: false,
				[ baseClasses1.class2 ]: true
			});
		},
		'should filter out null params passed to classes function'() {
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, null, class2, null).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'can invoke result instead of using .get()'() {
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2)();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		}
	},
	'classes.fixed chained function': {
		'should work without any classes passed to first function'() {
			themeableInstance = new Test();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		},
		'should pass through new classes'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses1;
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ fixedClassName ]: true
			});
		},
		'should filter out null params passed to fixed function'() {
			themeableInstance = new Test();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName, null).get();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		},
		'should negate any new classes that are not requested on second call'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses1;
			const fixedClassName = 'fixedClassName';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClasses1.class1 ]: true,
				[ fixedClassName ]: true
			}, `${fixedClassName} should be true on first call`);

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClasses1.class1 ]: true,
				[ fixedClassName ]: false
			}, `${fixedClassName} should be false on second call`);
		},
		'should split adjoined fixed classes into multiple classes'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses1;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClasses = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			});
		},
		'should remove adjoined fixed classes when they are no longer provided'() {
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses1;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClassesFirstCall = themeableInstance.classes(class1, class2).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			}, 'adjoined classed should both be true on first call');

			const flaggedClassesSecondCall = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true,
				'adjoinedClassName1': false,
				'adjoinedClassName2': false
			}, `adjoiend class names should be false on second call`);
		},
		'can invoke result instead of using .get()'() {
			themeableInstance = new Test();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName)();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		}
	},
	'setting a theme': {
		'should override basetheme classes with theme classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});
		},
		'should negate old theme class when a new theme is set'() {
			const { class1, class2 } = baseClasses1;
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			themeableInstance.classes(class1).get();
			themeableInstance.setProperties({ theme: testTheme2 });

			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: false,
				[ testTheme2.testPath1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});
		},
		'will not regenerate theme classes if theme changed property is not set'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'id' ]
			});

			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			}, 'theme2 classes should not be present');
		}
	},
	'setting override classes': {
		'should supplement basetheme classes with override classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ overrideClasses: overrideClasses1 });
			const { class1, class2 } = baseClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ overrideClasses1.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});
		},
		'should set override classes to false when they are changed'() {
			const { class1, class2 } = baseClasses1;
			themeableInstance = new Test();
			themeableInstance.setProperties({ overrideClasses: overrideClasses1 });
			themeableInstance.classes(class1, class2).get();
			themeableInstance.setProperties({ overrideClasses: overrideClasses2 });
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses1.class1 ]: true,
				[ overrideClasses1.class1 ]: false,
				[ overrideClasses2.class1 ]: true,
				[ baseClasses1.class2 ]: true
			});
		}
	},
	'Able to stack theme that get merged into the available classes'() {
		const { class1, class2 } = baseClasses1;
		const { class3, class4 } = baseClasses2;
		themeableInstance = new TestWidget2();
		const flaggedClasses = themeableInstance.classes(class1, class2, class3, class4).get();
		assert.deepEqual(flaggedClasses, {
			[ baseClasses1.class1 ]: true,
			[ baseClasses1.class2 ]: true,
			[ baseClasses2.class3 ]: true,
			[ baseClasses2.class4 ]: true
		});

	},
	'integration': {
		'should work as mixin to createWidgetBase'() {
			const fixedClassName = 'fixedClassName';

			class IntegrationTest extends Test {
				constructor() {
					super();
				}

				render() {
					const { class1 } = baseClasses1;
					return v('div', [
						v('div', { classes: this.classes(class1).fixed(fixedClassName) })
					]);
				}
			}

			const themeableWidget: any = new IntegrationTest();
			themeableWidget.setProperties({ theme: testTheme1 });

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, {
				[ testTheme1.testPath1.class1 ]: true,
				[ fixedClassName ]: true
			});

			themeableWidget.setProperties({ theme: testTheme2 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, {
				[ testTheme1.testPath1.class1 ]: false,
				[ testTheme2.testPath1.class1 ]: true,
				[ fixedClassName ]: true
			});
		}
	}
});
